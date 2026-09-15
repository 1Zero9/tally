import { describe, it, expect, vi } from 'vitest';
import type { Prisma } from '@prisma/client';

// backup.ts also exports createHouseholdSnapshot/pruneAutomaticSnapshots,
// which call the real `prisma` client at module scope — mock it so this
// file can import the module without a database, even though the
// functions under test here (remapCategory/restoreLegacyExpenses/
// restoreHouseholdSnapshot) take an injected `tx` and never touch it.
vi.mock('@/src/lib/prisma', () => ({ prisma: {} }));

import {
  remapCategory,
  restoreLegacyExpenses,
  restoreHouseholdSnapshot,
  type BackupPayload,
} from '../backup';

// restoreHouseholdSnapshot/restoreLegacyExpenses are DB-agnostic — they take
// a Prisma transaction client and only ever call `.create`/`.deleteMany` on
// it. This project has no separate local dev database (AGENTS.md), so a
// real integration test isn't a safe or available option here; this fake tx
// verifies the id-remap *logic* itself (what gets read from the old payload,
// what gets written, how old ids resolve to new ones) without asserting
// anything about actual Postgres/production behaviour.
function makeFakeTx() {
  const created: Record<string, Array<{ id: string } & Record<string, unknown>>> = {};
  const deleted: string[] = [];
  let counter = 0;

  const modelNames = [
    'account', 'category', 'statementImport', 'goal', 'expense', 'income',
    'moneyTrail', 'transfer', 'project', 'projectItem', 'projectItemLink',
    'budget', 'merchantAlias', 'statementTransaction',
  ] as const;

  const tx = {} as Prisma.TransactionClient;
  for (const name of modelNames) {
    created[name] = [];
    (tx as unknown as Record<string, unknown>)[name] = {
      deleteMany: vi.fn(async () => {
        deleted.push(name);
        return { count: 0 };
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `new-${name}-${++counter}`, ...data };
        created[name].push(row);
        return row;
      }),
    };
  }
  return { tx, created, deleted };
}

describe('remapCategory', () => {
  it('passes a built-in category key through unchanged', () => {
    expect(remapCategory('utilities', new Map())).toBe('utilities');
  });

  it('remaps a custom category id through the id map', () => {
    const map = new Map([['old-cat-1', 'new-cat-1']]);
    expect(remapCategory('old-cat-1', map)).toBe('new-cat-1');
  });

  it('falls back to the raw value when the custom id has no mapping', () => {
    expect(remapCategory('orphan-cat', new Map())).toBe('orphan-cat');
  });

  it('passes null/empty through unchanged', () => {
    expect(remapCategory(null, new Map())).toBeNull();
  });
});

describe('restoreLegacyExpenses (schema version 1 — bare Expense array)', () => {
  it('deletes existing expenses and recreates each record under the new household', async () => {
    const { tx, created, deleted } = makeFakeTx();
    const records = [
      { name: 'Netflix', amount: 15.99, category: 'streaming' },
      {}, // missing fields should fall back to defaults
    ];

    const count = await restoreLegacyExpenses(tx, 'household-new', 'user-new', records);

    expect(count).toBe(2);
    expect(deleted).toEqual(['expense']);
    expect(created.expense).toHaveLength(2);
    expect(created.expense[0]).toMatchObject({
      name: 'Netflix',
      amount: 15.99,
      category: 'streaming',
      householdId: 'household-new',
      createdById: 'user-new',
    });
    // Falls back to defaults rather than writing undefined/garbage.
    expect(created.expense[1]).toMatchObject({
      name: 'Untitled',
      amount: 0,
      category: 'utilities',
      billingCycle: 'monthly',
    });
  });
});

describe('restoreHouseholdSnapshot — schema version 2 shape (no trails/projects)', () => {
  it('remaps account/category/goal cross-references onto newly created rows', async () => {
    const { tx, created } = makeFakeTx();
    const payload: BackupPayload = {
      accounts: [{ id: 'old-acct-1', name: 'Current account' }],
      categories: [{ id: 'old-cat-1', name: 'Groceries' }],
      goals: [{ id: 'old-goal-1', name: 'Holiday', linkedAccountId: 'old-acct-1' }],
      expenses: [
        {
          id: 'old-exp-1',
          name: 'Electricity',
          category: 'old-cat-1',
          paymentAccountId: 'old-acct-1',
          linkedGoalId: 'old-goal-1',
        },
      ],
      budgets: [{ id: 'old-budget-1', category: 'old-cat-1', monthlyLimit: 200 }],
    };

    const result = await restoreHouseholdSnapshot(tx, 'household-new', 'user-new', payload);

    expect(result.accounts).toBe(1);
    expect(result.categories).toBe(1);
    expect(result.goals).toBe(1);
    expect(result.expenses).toBe(1);
    expect(result.budgets).toBe(1);
    // moneyTrails/projects are absent from a v2 payload — must resolve to
    // zero, not throw, since payload.moneyTrails etc. are undefined.
    expect(result.moneyTrails).toBe(0);
    expect(result.projects).toBe(0);

    const newAccountId = created.account[0].id;
    const newCategoryId = created.category[0].id;

    expect(created.goal[0].linkedAccountId).toBe(newAccountId);
    expect(created.expense[0].paymentAccountId).toBe(newAccountId);
    expect(created.expense[0].linkedGoalId).toBe(created.goal[0].id);
    // Custom category id remapped, not left pointing at the deleted old id.
    expect(created.expense[0].category).toBe(newCategoryId);
    expect(created.budget[0].category).toBe(newCategoryId);
  });

  it('drops a cross-reference whose target was not in the snapshot instead of writing a dangling old id', async () => {
    const { tx, created } = makeFakeTx();
    const payload: BackupPayload = {
      expenses: [{ id: 'old-exp-1', name: 'Orphaned', paymentAccountId: 'never-existed' }],
    };

    await restoreHouseholdSnapshot(tx, 'household-new', 'user-new', payload);

    expect(created.expense[0].paymentAccountId).toBeNull();
  });

  it('remaps statement transaction match links onto the recreated expense/transfer rows', async () => {
    const { tx, created } = makeFakeTx();
    const payload: BackupPayload = {
      accounts: [{ id: 'old-acct-1', name: 'Current account' }],
      statementImports: [{ id: 'old-import-1', label: 'March statement', accountId: 'old-acct-1' }],
      expenses: [{ id: 'old-exp-1', name: 'Electricity' }],
      transfers: [{ id: 'old-transfer-1', amount: 10, fromAccountId: 'old-acct-1' }],
      statementTransactions: [
        {
          id: 'old-tx-1',
          importId: 'old-import-1',
          matchedExpenseId: 'old-exp-1',
          matchedTransferId: 'old-transfer-1',
          rawDescription: 'ESB ELECTRIC',
        },
      ],
    };

    const result = await restoreHouseholdSnapshot(tx, 'household-new', 'user-new', payload);

    expect(result.statementTransactions).toBe(1);
    expect(created.statementTransaction[0].matchedExpenseId).toBe(created.expense[0].id);
    expect(created.statementTransaction[0].matchedTransferId).toBe(created.transfer[0].id);
    expect(created.statementTransaction[0].importId).toBe(created.statementImport[0].id);
  });

  it('drops a statement transaction whose parent import did not survive the restore', async () => {
    const { tx, created } = makeFakeTx();
    const payload: BackupPayload = {
      statementTransactions: [{ id: 'old-tx-1', importId: 'missing-import', rawDescription: 'x' }],
    };

    const result = await restoreHouseholdSnapshot(tx, 'household-new', 'user-new', payload);

    expect(result.statementTransactions).toBe(0);
    expect(created.statementTransaction).toHaveLength(0);
  });
});

describe('restoreHouseholdSnapshot — schema version 3 adds moneyTrails', () => {
  it('remaps a transfer trailId onto the recreated MoneyTrail', async () => {
    const { tx, created } = makeFakeTx();
    const payload: BackupPayload = {
      moneyTrails: [{ id: 'old-trail-1', name: 'Payday sweep' }],
      transfers: [{ id: 'old-transfer-1', amount: 50, trailId: 'old-trail-1' }],
    };

    const result = await restoreHouseholdSnapshot(tx, 'household-new', 'user-new', payload);

    expect(result.moneyTrails).toBe(1);
    expect(created.transfer[0].trailId).toBe(created.moneyTrail[0].id);
  });
});

describe('restoreHouseholdSnapshot — schema version 4 adds projects/items/links', () => {
  it('remaps a project item link through to the recreated expense', async () => {
    const { tx, created } = makeFakeTx();
    const payload: BackupPayload = {
      expenses: [{ id: 'old-exp-1', name: 'Kitchen tiles' }],
      projects: [{ id: 'old-proj-1', name: 'Kitchen reno' }],
      projectItems: [{ id: 'old-item-1', projectId: 'old-proj-1', label: 'Tiles', estimatedAmount: 500 }],
      projectItemLinks: [{ id: 'old-link-1', projectItemId: 'old-item-1', expenseId: 'old-exp-1', amountOverride: 480 }],
    };

    const result = await restoreHouseholdSnapshot(tx, 'household-new', 'user-new', payload);

    expect(result.projects).toBe(1);
    expect(result.projectItems).toBe(1);
    expect(result.projectItemLinks).toBe(1);
    expect(created.projectItem[0].projectId).toBe(created.project[0].id);
    expect(created.projectItemLink[0].projectItemId).toBe(created.projectItem[0].id);
    expect(created.projectItemLink[0].expenseId).toBe(created.expense[0].id);
    expect(created.projectItemLink[0].amountOverride).toBe(480);
  });

  it('skips a project item whose parent project did not survive the restore', async () => {
    const { tx, created } = makeFakeTx();
    const payload: BackupPayload = {
      projectItems: [{ id: 'old-item-1', projectId: 'missing-project', label: 'Orphan item' }],
    };

    const result = await restoreHouseholdSnapshot(tx, 'household-new', 'user-new', payload);

    expect(result.projectItems).toBe(0);
    expect(created.projectItem).toHaveLength(0);
  });

  it('drops a project item link whose target expense/transfer did not survive the restore', async () => {
    const { tx, created } = makeFakeTx();
    const payload: BackupPayload = {
      projects: [{ id: 'old-proj-1', name: 'Kitchen reno' }],
      projectItems: [{ id: 'old-item-1', projectId: 'old-proj-1', label: 'Tiles' }],
      projectItemLinks: [{ id: 'old-link-1', projectItemId: 'old-item-1', expenseId: 'never-existed' }],
    };

    const result = await restoreHouseholdSnapshot(tx, 'household-new', 'user-new', payload);

    expect(result.projectItemLinks).toBe(0);
    expect(created.projectItemLink).toHaveLength(0);
  });

  it('restores a full v4-shaped payload (every table populated) in one pass without cross-reference drift', async () => {
    const { tx, created } = makeFakeTx();
    const payload: BackupPayload = {
      accounts: [{ id: 'a1', name: 'Current' }],
      categories: [{ id: 'c1', name: 'Home' }],
      goals: [{ id: 'g1', name: 'Emergency fund', linkedAccountId: 'a1' }],
      expenses: [{ id: 'e1', name: 'Broadband', category: 'c1', paymentAccountId: 'a1', linkedGoalId: 'g1' }],
      incomes: [{ id: 'i1', name: 'Salary', depositAccountId: 'a1' }],
      moneyTrails: [{ id: 't1', name: 'Sweep' }],
      transfers: [{ id: 'tr1', fromAccountId: 'a1', linkedExpenseId: 'e1', linkedIncomeId: 'i1', trailId: 't1' }],
      statementImports: [{ id: 'si1', accountId: 'a1' }],
      statementTransactions: [{ id: 'st1', importId: 'si1', matchedExpenseId: 'e1', matchedTransferId: 'tr1' }],
      merchantAliases: [{ id: 'ma1', category: 'c1', expenseId: 'e1' }],
      budgets: [{ id: 'b1', category: 'c1' }],
      projects: [{ id: 'p1', name: 'Reno' }],
      projectItems: [{ id: 'pi1', projectId: 'p1' }],
      projectItemLinks: [{ id: 'pl1', projectItemId: 'pi1', expenseId: 'e1', transferId: 'tr1' }],
    };

    const result = await restoreHouseholdSnapshot(tx, 'household-new', 'user-new', payload);

    // Every table in the v4 payload produced exactly one restored row.
    for (const count of Object.values(result)) expect(count).toBe(1);

    expect(created.merchantAlias[0].category).toBe(created.category[0].id);
    expect(created.merchantAlias[0].expenseId).toBe(created.expense[0].id);
    expect(created.income[0].depositAccountId).toBe(created.account[0].id);
    expect(created.transfer[0].linkedIncomeId).toBe(created.income[0].id);
  });
});
