import { prisma } from '@/src/lib/prisma';
import { Prisma } from '@prisma/client';
import { isBuiltinCategory } from '@/src/data/categories';

// A snapshot's payloadJson holds one plain array per table. Schema version 4
// (see DatabaseBackup.schemaVersion) — version 1 only had the first five;
// version 2 added statementImports…budgets (and the since-removed map
// tables); version 3 added moneyTrails; version 4 adds projects +
// projectItems + projectItemLinks. Backups from v2/v3/v4 may still carry
// `mapNodes` / `mapEdges` arrays — they are simply ignored on restore now
// that the "My map" feature is gone.
export interface BackupPayload {
  accounts?: Record<string, unknown>[];
  goals?: Record<string, unknown>[];
  expenses?: Record<string, unknown>[];
  incomes?: Record<string, unknown>[];
  transfers?: Record<string, unknown>[];
  statementImports?: Record<string, unknown>[];
  statementTransactions?: Record<string, unknown>[];
  merchantAliases?: Record<string, unknown>[];
  categories?: Record<string, unknown>[];
  budgets?: Record<string, unknown>[];
  moneyTrails?: Record<string, unknown>[];
  projects?: Record<string, unknown>[];
  projectItems?: Record<string, unknown>[];
  projectItemLinks?: Record<string, unknown>[];
}

export const CURRENT_BACKUP_SCHEMA_VERSION = 4;

/**
 * Snapshots every household-scoped financial/organizational table (Account,
 * Goal, Expense, Income, Transfer, StatementImport, StatementTransaction,
 * MerchantAlias, Category, Budget, MoneyTrail, Project,
 * ProjectItem, ProjectItemLink) into a single
 * DatabaseBackup row. Deliberately excludes AuditLog (an append-only
 * historical trail — restoring it would fabricate history, not recover it)
 * and BugReport (household notes, not financial data). Shared by the
 * admin-triggered POST /api/admin/backup route and the daily
 * GET /api/cron/backup route — the only difference between a manual and
 * an automatic snapshot is `isAutomatic` and who (if anyone) triggered it.
 *
 * All reads run inside one $transaction so the snapshot is a single
 * consistent point in time, not up to 12 independently-timed reads that
 * could straddle a write happening mid-snapshot.
 */
export async function createHouseholdSnapshot(
  householdId: string,
  createdById: string | null,
  notes: string,
  isAutomatic = false
) {
  const [
    accounts,
    goals,
    expenses,
    incomes,
    transfers,
    statementImports,
    statementTransactions,
    merchantAliases,
    categories,
    budgets,
    moneyTrails,
    projects,
    projectItems,
    projectItemLinks,
  ] = await prisma.$transaction([
    prisma.account.findMany({ where: { householdId } }),
    prisma.goal.findMany({ where: { householdId } }),
    prisma.expense.findMany({ where: { householdId } }),
    prisma.income.findMany({ where: { householdId } }),
    prisma.transfer.findMany({ where: { householdId } }),
    prisma.statementImport.findMany({ where: { householdId } }),
    prisma.statementTransaction.findMany({ where: { householdId } }),
    prisma.merchantAlias.findMany({ where: { householdId } }),
    prisma.category.findMany({ where: { householdId } }),
    prisma.budget.findMany({ where: { householdId } }),
    prisma.moneyTrail.findMany({ where: { householdId } }),
    prisma.project.findMany({ where: { householdId } }),
    prisma.projectItem.findMany({ where: { project: { householdId } } }),
    prisma.projectItemLink.findMany({ where: { projectItem: { project: { householdId } } } }),
  ]);

  const payload: BackupPayload = {
    accounts,
    goals,
    expenses,
    incomes,
    transfers,
    statementImports,
    statementTransactions,
    merchantAliases,
    categories,
    budgets,
    moneyTrails,
    projects,
    projectItems,
    projectItemLinks,
  };
  const recordCount =
    accounts.length + goals.length + expenses.length + incomes.length + transfers.length +
    statementImports.length + statementTransactions.length + merchantAliases.length +
    categories.length + budgets.length + moneyTrails.length +
    projects.length + projectItems.length + projectItemLinks.length;

  return prisma.databaseBackup.create({
    data: {
      createdById,
      householdId,
      payloadJson: payload as unknown as Prisma.InputJsonValue,
      recordCount,
      notes,
      isAutomatic,
      schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    },
  });
}

/**
 * Deletes a household's oldest automatic snapshots beyond `keep` (default
 * 14, roughly two weeks of daily snapshots). Manual snapshots are never
 * touched here — only ones with isAutomatic: true count towards the cap.
 */
export async function pruneAutomaticSnapshots(householdId: string, keep = 14) {
  const stale = await prisma.databaseBackup.findMany({
    where: { householdId, isAutomatic: true },
    orderBy: { createdAt: 'desc' },
    skip: keep,
    select: { id: true },
  });

  if (stale.length === 0) return 0;

  await prisma.databaseBackup.deleteMany({
    where: { id: { in: stale.map((b) => b.id) } },
  });

  return stale.length;
}

// --- Restore ---------------------------------------------------------
//
// Moved here (verbatim in behaviour) from the PUT handler in
// app/api/admin/backup/route.ts so the id-remap logic is unit-testable
// against a fake transaction client instead of only against a real
// database — this project has no separate local dev database (AGENTS.md),
// so restore correctness previously had no automated coverage at all.
// The route now just opens prisma.$transaction(...) and calls these.

function str(v: unknown, fallback: string | null = null): string | null {
  return v === undefined || v === null ? fallback : String(v);
}
function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function numOrNull(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

// Expense/Budget/MerchantAlias `category` fields hold either a built-in
// category key (a fixed string like "utilities", stable forever) or a
// household-defined custom Category's id — which changes on restore since
// every table gets recreated with new ids. Only the latter needs remapping.
export function remapCategory(raw: string | null, categoryIdMap: Map<string, string>): string | null {
  if (!raw) return raw;
  if (isBuiltinCategory(raw)) return raw;
  return categoryIdMap.get(raw) || raw;
}

/**
 * Legacy branch: pre-expansion backups whose payloadJson is a bare array of
 * Expense rows (schema version predates the `schemaVersion` column).
 */
export async function restoreLegacyExpenses(
  tx: Prisma.TransactionClient,
  householdId: string,
  createdById: string,
  records: Record<string, unknown>[]
): Promise<number> {
  await tx.expense.deleteMany({ where: { householdId } });
  for (const item of records) {
    await tx.expense.create({
      data: {
        name: str(item.name, 'Untitled') as string,
        amount: num(item.amount, 0),
        currency: str(item.currency, 'EUR') as string,
        billingCycle: str(item.billingCycle, 'monthly') as string,
        category: str(item.category, 'utilities') as string,
        icon: str(item.icon, 'Zap') as string,
        color: str(item.color, '#3155D9') as string,
        renewalDay: num(item.renewalDay, 1),
        nextRenewalDate: str(item.nextRenewalDate, new Date().toISOString().split('T')[0]) as string,
        isPaidThisCycle: bool(item.isPaidThisCycle),
        paymentMethod: str(item.paymentMethod, 'SEPA Direct Debit') as string,
        isActive: bool(item.isActive, true),
        notes: str(item.notes),
        contractEndDate: str(item.contractEndDate),
        usageRating: str(item.usageRating, 'high'),
        householdId,
        createdById,
      },
    });
  }
  return records.length;
}

export interface RestoreResult {
  accounts: number;
  goals: number;
  expenses: number;
  incomes: number;
  transfers: number;
  moneyTrails: number;
  projects: number;
  projectItems: number;
  projectItemLinks: number;
  categories: number;
  budgets: number;
  statementImports: number;
  statementTransactions: number;
  merchantAliases: number;
}

/**
 * Restores a full household snapshot (schema versions 2–4; version 4 is a
 * strict superset — earlier snapshots simply have empty `moneyTrails`/
 * `projects*` arrays). Deletes the household's rows across every
 * backed-up table (children first, explicitly rather than relying on
 * schema cascades), then recreates everything in dependency order,
 * building an old-id → new-id map at each step so every cross-reference —
 * including a statement row's matchedExpenseId/matchedTransferId —
 * resolves to the newly-created rows. Must run inside the caller's
 * prisma.$transaction so a partial restore can never be left in place.
 */
export async function restoreHouseholdSnapshot(
  tx: Prisma.TransactionClient,
  householdId: string,
  createdById: string,
  payload: BackupPayload
): Promise<RestoreResult> {
  await tx.statementTransaction.deleteMany({ where: { householdId } });
  await tx.statementImport.deleteMany({ where: { householdId } });
  await tx.merchantAlias.deleteMany({ where: { householdId } });
  await tx.budget.deleteMany({ where: { householdId } });
  await tx.category.deleteMany({ where: { householdId } });
  await tx.transfer.deleteMany({ where: { householdId } });
  await tx.moneyTrail.deleteMany({ where: { householdId } });
  // Project → ProjectItem → ProjectItemLink all cascade from Project.
  await tx.project.deleteMany({ where: { householdId } });
  await tx.goal.deleteMany({ where: { householdId } });
  await tx.expense.deleteMany({ where: { householdId } });
  await tx.income.deleteMany({ where: { householdId } });
  await tx.account.deleteMany({ where: { householdId } });

  const accountIdMap = new Map<string, string>();
  for (const item of payload.accounts || []) {
    const created = await tx.account.create({
      data: {
        name: str(item.name, 'Untitled account') as string,
        institution: str(item.institution),
        type: (str(item.type, 'OTHER') as Prisma.AccountCreateInput['type']),
        currency: str(item.currency, 'EUR') as string,
        notes: str(item.notes),
        isActive: bool(item.isActive, true),
        balance: numOrNull(item.balance),
        balanceAsOf: str(item.balanceAsOf),
        accountNumberEnc: str(item.accountNumberEnc),
        routingNumberEnc: str(item.routingNumberEnc),
        ibanEnc: str(item.ibanEnc),
        bicEnc: str(item.bicEnc),
        loginUsernameEnc: str(item.loginUsernameEnc),
        loginPasswordEnc: str(item.loginPasswordEnc),
        loginUrlEnc: str(item.loginUrlEnc),
        securityNotesEnc: str(item.securityNotesEnc),
        originalAmount: numOrNull(item.originalAmount),
        interestRate: numOrNull(item.interestRate),
        termMonths: item.termMonths === undefined || item.termMonths === null ? null : Math.round(num(item.termMonths, 0)),
        payoffDate: str(item.payoffDate),
        householdId,
        createdById,
      },
    });
    if (typeof item.id === 'string') accountIdMap.set(item.id, created.id);
  }

  const categoryIdMap = new Map<string, string>();
  for (const item of payload.categories || []) {
    const created = await tx.category.create({
      data: {
        name: str(item.name, 'Untitled category') as string,
        icon: str(item.icon, 'Tag') as string,
        color: str(item.color, '#676B73') as string,
        bgColor: str(item.bgColor, '#f1f2f4') as string,
        borderColor: str(item.borderColor, '#e7e8ea') as string,
        // Preserve built-in overrides (rename/recolour) and the list order.
        builtinKey: typeof item.builtinKey === 'string' ? item.builtinKey : null,
        sortOrder: typeof item.sortOrder === 'number' ? Math.trunc(item.sortOrder) : null,
        householdId,
        createdById,
      },
    });
    if (typeof item.id === 'string') categoryIdMap.set(item.id, created.id);
  }

  const statementImportIdMap = new Map<string, string>();
  for (const item of payload.statementImports || []) {
    const oldAccountId = typeof item.accountId === 'string' ? item.accountId : null;
    const created = await tx.statementImport.create({
      data: {
        label: str(item.label, 'Statement import') as string,
        fileName: str(item.fileName),
        accountId: oldAccountId ? accountIdMap.get(oldAccountId) || null : null,
        openingBalance: numOrNull(item.openingBalance),
        closingBalance: numOrNull(item.closingBalance),
        statementPeriod: str(item.statementPeriod),
        householdId,
        createdById,
      },
    });
    if (typeof item.id === 'string') statementImportIdMap.set(item.id, created.id);
  }

  const goalIdMap = new Map<string, string>();
  for (const item of payload.goals || []) {
    const oldAccountId = typeof item.linkedAccountId === 'string' ? item.linkedAccountId : null;
    const created = await tx.goal.create({
      data: {
        name: str(item.name, 'Untitled goal') as string,
        targetAmount: num(item.targetAmount, 0),
        currentAmount: num(item.currentAmount, 0),
        currency: str(item.currency, 'EUR') as string,
        targetDate: str(item.targetDate),
        notes: str(item.notes),
        isActive: bool(item.isActive, true),
        linkedAccountId: oldAccountId ? accountIdMap.get(oldAccountId) || null : null,
        householdId,
        createdById,
      },
    });
    if (typeof item.id === 'string') goalIdMap.set(item.id, created.id);
  }

  const expenseIdMap = new Map<string, string>();
  for (const item of payload.expenses || []) {
    const oldAccountId = typeof item.paymentAccountId === 'string' ? item.paymentAccountId : null;
    const oldGoalId = typeof item.linkedGoalId === 'string' ? item.linkedGoalId : null;
    const oldStatementImportId = typeof item.statementImportId === 'string' ? item.statementImportId : null;
    const created = await tx.expense.create({
      data: {
        name: str(item.name, 'Untitled') as string,
        vendor: str(item.vendor),
        amount: num(item.amount, 0),
        currency: str(item.currency, 'EUR') as string,
        billingCycle: str(item.billingCycle, 'monthly') as string,
        category: remapCategory(str(item.category, 'utilities'), categoryIdMap) as string,
        icon: str(item.icon, 'Zap') as string,
        color: str(item.color, '#3155D9') as string,
        renewalDay: num(item.renewalDay, 1),
        nextRenewalDate: str(item.nextRenewalDate, new Date().toISOString().split('T')[0]) as string,
        isPaidThisCycle: bool(item.isPaidThisCycle),
        lastPaidAt: item.lastPaidAt ? new Date(item.lastPaidAt as string) : null,
        paymentMethod: str(item.paymentMethod, 'SEPA Direct Debit') as string,
        isActive: bool(item.isActive, true),
        isPending: bool(item.isPending),
        notes: str(item.notes),
        contractEndDate: str(item.contractEndDate),
        vendorEmail: str(item.vendorEmail),
        usageRating: str(item.usageRating, 'high'),
        isVariable: bool(item.isVariable),
        isBill: bool(item.isBill, true),
        originalAmount: numOrNull(item.originalAmount),
        originalCurrency: str(item.originalCurrency),
        exchangeRate: numOrNull(item.exchangeRate),
        rateDate: str(item.rateDate),
        reimbursementExpected: numOrNull(item.reimbursementExpected),
        reimbursementReceived: numOrNull(item.reimbursementReceived),
        reimbursementReceivedDate: str(item.reimbursementReceivedDate),
        paymentAccountId: oldAccountId ? accountIdMap.get(oldAccountId) || null : null,
        linkedGoalId: oldGoalId ? goalIdMap.get(oldGoalId) || null : null,
        statementImportId: oldStatementImportId ? statementImportIdMap.get(oldStatementImportId) || null : null,
        householdId,
        createdById,
      },
    });
    if (typeof item.id === 'string') expenseIdMap.set(item.id, created.id);
  }

  const incomeIdMap = new Map<string, string>();
  for (const item of payload.incomes || []) {
    const oldAccountId = typeof item.depositAccountId === 'string' ? item.depositAccountId : null;
    const created = await tx.income.create({
      data: {
        name: str(item.name, 'Untitled') as string,
        amount: num(item.amount, 0),
        currency: str(item.currency, 'EUR') as string,
        frequency: str(item.frequency, 'monthly') as string,
        nextPayDate: str(item.nextPayDate),
        category: str(item.category, 'salary') as string,
        isActive: bool(item.isActive, true),
        notes: str(item.notes),
        isReceivedThisCycle: bool(item.isReceivedThisCycle),
        lastReceivedAt: item.lastReceivedAt ? new Date(item.lastReceivedAt as string) : null,
        depositAccountId: oldAccountId ? accountIdMap.get(oldAccountId) || null : null,
        householdId,
        createdById,
      },
    });
    if (typeof item.id === 'string') incomeIdMap.set(item.id, created.id);
  }

  // Trails before transfers, so a transfer's trailId can be remapped.
  const trailIdMap = new Map<string, string>();
  for (const item of payload.moneyTrails || []) {
    const created = await tx.moneyTrail.create({
      data: {
        name: str(item.name, 'Trail') as string,
        notes: str(item.notes),
        householdId,
        createdById,
      },
    });
    if (typeof item.id === 'string') trailIdMap.set(item.id, created.id);
  }

  const transferIdMap = new Map<string, string>();
  for (const item of payload.transfers || []) {
    const oldFrom = typeof item.fromAccountId === 'string' ? item.fromAccountId : null;
    const oldTo = typeof item.toAccountId === 'string' ? item.toAccountId : null;
    const oldExpense = typeof item.linkedExpenseId === 'string' ? item.linkedExpenseId : null;
    const oldIncome = typeof item.linkedIncomeId === 'string' ? item.linkedIncomeId : null;
    const oldStatementImportId = typeof item.statementImportId === 'string' ? item.statementImportId : null;
    const oldTrailId = typeof item.trailId === 'string' ? item.trailId : null;
    const created = await tx.transfer.create({
      data: {
        amount: num(item.amount, 0),
        currency: str(item.currency, 'EUR') as string,
        date: str(item.date, new Date().toISOString().split('T')[0]) as string,
        note: str(item.note),
        externalLabel: str(item.externalLabel),
        fromAccountId: oldFrom ? accountIdMap.get(oldFrom) || null : null,
        toAccountId: oldTo ? accountIdMap.get(oldTo) || null : null,
        linkedExpenseId: oldExpense ? expenseIdMap.get(oldExpense) || null : null,
        linkedIncomeId: oldIncome ? incomeIdMap.get(oldIncome) || null : null,
        statementImportId: oldStatementImportId ? statementImportIdMap.get(oldStatementImportId) || null : null,
        trailId: oldTrailId ? trailIdMap.get(oldTrailId) || null : null,
        householdId,
        createdById,
      },
    });
    if (typeof item.id === 'string') transferIdMap.set(item.id, created.id);
  }

  // Projects → items → links. Links point at Expense/Transfer rows, so this
  // has to run after those loops above.
  let projectCount = 0;
  let projectItemCount = 0;
  let projectLinkCount = 0;
  const projectIdMap = new Map<string, string>();
  for (const item of payload.projects || []) {
    const created = await tx.project.create({
      data: {
        name: str(item.name, 'Project') as string,
        description: str(item.description),
        status: str(item.status, 'active') as string,
        targetDate: str(item.targetDate),
        householdId,
        createdById,
      },
    });
    if (typeof item.id === 'string') projectIdMap.set(item.id, created.id);
    projectCount += 1;
  }
  const projectItemIdMap = new Map<string, string>();
  for (const item of payload.projectItems || []) {
    const oldProjectId = typeof item.projectId === 'string' ? item.projectId : null;
    const newProjectId = oldProjectId ? projectIdMap.get(oldProjectId) : undefined;
    if (!newProjectId) continue;
    const created = await tx.projectItem.create({
      data: {
        projectId: newProjectId,
        label: str(item.label, 'Item') as string,
        estimatedAmount: num(item.estimatedAmount, 0),
        currency: str(item.currency, 'EUR') as string,
        notes: str(item.notes),
        sortOrder: Math.trunc(num(item.sortOrder, 0)),
      },
    });
    if (typeof item.id === 'string') projectItemIdMap.set(item.id, created.id);
    projectItemCount += 1;
  }
  for (const item of payload.projectItemLinks || []) {
    const oldItemId = typeof item.projectItemId === 'string' ? item.projectItemId : null;
    const newItemId = oldItemId ? projectItemIdMap.get(oldItemId) : undefined;
    if (!newItemId) continue;
    const oldExpenseId = typeof item.expenseId === 'string' ? item.expenseId : null;
    const oldTransferId = typeof item.transferId === 'string' ? item.transferId : null;
    const newExpenseId = oldExpenseId ? expenseIdMap.get(oldExpenseId) || null : null;
    const newTransferId = oldTransferId ? transferIdMap.get(oldTransferId) || null : null;
    // A link whose target didn't survive the restore is dropped.
    if (!newExpenseId && !newTransferId) continue;
    const override = num(item.amountOverride, NaN);
    await tx.projectItemLink.create({
      data: {
        projectItemId: newItemId,
        expenseId: newExpenseId,
        transferId: newTransferId,
        amountOverride: Number.isFinite(override) ? override : null,
      },
    });
    projectLinkCount += 1;
  }

  const budgetIdMap = new Map<string, string>();
  for (const item of payload.budgets || []) {
    const created = await tx.budget.create({
      data: {
        category: remapCategory(str(item.category, 'utilities'), categoryIdMap) as string,
        monthlyLimit: num(item.monthlyLimit, 0),
        currency: str(item.currency, 'EUR') as string,
        householdId,
        createdById,
      },
    });
    if (typeof item.id === 'string') budgetIdMap.set(item.id, created.id);
  }

  // "My map" (MapNode / MapEdge) was removed; older snapshots may still
  // carry those arrays — they are ignored on restore.

  const merchantAliasIdMap = new Map<string, string>();
  for (const item of payload.merchantAliases || []) {
    const oldExpenseId = typeof item.expenseId === 'string' ? item.expenseId : null;
    const created = await tx.merchantAlias.create({
      data: {
        pattern: str(item.pattern, '') as string,
        vendorName: str(item.vendorName, 'Unknown') as string,
        category: remapCategory(str(item.category), categoryIdMap),
        matchCount: num(item.matchCount, 1),
        expenseId: oldExpenseId ? expenseIdMap.get(oldExpenseId) || null : null,
        householdId,
      },
    });
    if (typeof item.id === 'string') merchantAliasIdMap.set(item.id, created.id);
  }

  let statementTransactionCount = 0;
  for (const item of payload.statementTransactions || []) {
    const oldImportId = typeof item.importId === 'string' ? item.importId : null;
    const newImportId = oldImportId ? statementImportIdMap.get(oldImportId) : undefined;
    // importId is required — a row whose parent import didn't survive
    // restore (shouldn't happen with a consistent snapshot) is skipped.
    if (!newImportId) continue;
    const oldMatchedExpenseId = typeof item.matchedExpenseId === 'string' ? item.matchedExpenseId : null;
    const oldMatchedTransferId = typeof item.matchedTransferId === 'string' ? item.matchedTransferId : null;
    await tx.statementTransaction.create({
      data: {
        date: str(item.date, new Date().toISOString().split('T')[0]) as string,
        rawDescription: str(item.rawDescription, '') as string,
        normalizedDescription: str(item.normalizedDescription, '') as string,
        amount: num(item.amount, 0),
        currency: str(item.currency, 'EUR') as string,
        direction: (str(item.direction, 'DEBIT') as Prisma.StatementTransactionCreateInput['direction']),
        status: (str(item.status, 'UNMATCHED') as Prisma.StatementTransactionCreateInput['status']),
        matchConfidence: numOrNull(item.matchConfidence),
        notes: str(item.notes),
        suggestedCategory: remapCategory(str(item.suggestedCategory), categoryIdMap),
        vendorName: str(item.vendorName),
        importId: newImportId,
        matchedExpenseId: oldMatchedExpenseId ? expenseIdMap.get(oldMatchedExpenseId) || null : null,
        matchedTransferId: oldMatchedTransferId ? transferIdMap.get(oldMatchedTransferId) || null : null,
        householdId,
      },
    });
    statementTransactionCount += 1;
  }

  return {
    accounts: accountIdMap.size,
    goals: goalIdMap.size,
    expenses: expenseIdMap.size,
    incomes: incomeIdMap.size,
    transfers: transferIdMap.size,
    moneyTrails: trailIdMap.size,
    projects: projectCount,
    projectItems: projectItemCount,
    projectItemLinks: projectLinkCount,
    categories: categoryIdMap.size,
    budgets: budgetIdMap.size,
    statementImports: statementImportIdMap.size,
    statementTransactions: statementTransactionCount,
    merchantAliases: merchantAliasIdMap.size,
  };
}
