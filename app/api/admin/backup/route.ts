import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireAdmin } from '@/src/lib/auth';
import { Prisma } from '@prisma/client';
import { createHouseholdSnapshot, type BackupPayload } from '@/src/lib/backup';
import { logAudit } from '@/src/lib/audit';
import { isBuiltinCategory } from '@/src/data/categories';

// Older backups (pre-expansion) have payloadJson as a bare array of Expense
// rows — the legacy branch in PUT below handles those so they stay
// restorable.

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const backups = await prisma.databaseBackup.findMany({
      where: { householdId: auth.user.householdId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return NextResponse.json({
      status: 'ok',
      backups,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch backups:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Database error') },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const householdId = auth.user.householdId as string;
    const notes = body.notes || `Snapshot created on ${new Date().toLocaleString()}`;

    const backup = await createHouseholdSnapshot(householdId, auth.user.id, notes, false);

    return NextResponse.json({
      status: 'ok',
      backup,
    });
  } catch (error: unknown) {
    console.error('Failed to create backup:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Backup failed') },
      { status: 500 }
    );
  }
}

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
function remapCategory(raw: string | null, categoryIdMap: Map<string, string>): string | null {
  if (!raw) return raw;
  if (isBuiltinCategory(raw)) return raw;
  return categoryIdMap.get(raw) || raw;
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    if (!body.backupId) {
      return NextResponse.json(
        { status: 'error', message: 'Missing backupId' },
        { status: 400 }
      );
    }

    const backup = await prisma.databaseBackup.findUnique({
      where: { id: body.backupId },
    });

    if (!backup || !backup.payloadJson || backup.householdId !== auth.user.householdId) {
      return NextResponse.json(
        { status: 'error', message: 'Backup not found' },
        { status: 404 }
      );
    }

    const householdId = auth.user.householdId;
    const createdById = auth.user.id;

    // Legacy backups: payloadJson is a bare array of Expense rows.
    if (Array.isArray(backup.payloadJson)) {
      const records = backup.payloadJson as Prisma.JsonArray as Record<string, unknown>[];
      const restoredCount = await prisma.$transaction(async (tx) => {
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
      });

      logAudit({
        householdId,
        actorId: auth.user.id,
        actorName: auth.user.name,
        action: 'BACKUP_RESTORE',
        entityType: 'DatabaseBackup',
        entityLabel: `${backup.notes || 'Legacy snapshot'} — ${restoredCount} expenses restored`,
      });

      return NextResponse.json({ status: 'ok', restoredCount });
    }

    const payload = backup.payloadJson as unknown as BackupPayload;
    if (typeof payload !== 'object' || payload === null) {
      return NextResponse.json(
        { status: 'error', message: 'Backup payload is invalid' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Delete this household's rows across every backed-up table before
      // recreating, children first — explicitly, rather than relying on
      // schema cascades (MapNode/MapEdge and StatementTransaction/
      // StatementImport ARE onDelete: Cascade from Account/StatementImport
      // respectively; deleting them ourselves here means we control exactly
      // what happens and then restore them from the snapshot, instead of an
      // uncontrolled cascade silently wiping the custom Money Map or
      // statement history as a side effect of deleting accounts).
      await tx.mapEdge.deleteMany({ where: { householdId } });
      await tx.mapNode.deleteMany({ where: { householdId } });
      await tx.statementTransaction.deleteMany({ where: { householdId } });
      await tx.statementImport.deleteMany({ where: { householdId } });
      await tx.merchantAlias.deleteMany({ where: { householdId } });
      await tx.budget.deleteMany({ where: { householdId } });
      await tx.category.deleteMany({ where: { householdId } });
      await tx.transfer.deleteMany({ where: { householdId } });
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

      const transferIdMap = new Map<string, string>();
      for (const item of payload.transfers || []) {
        const oldFrom = typeof item.fromAccountId === 'string' ? item.fromAccountId : null;
        const oldTo = typeof item.toAccountId === 'string' ? item.toAccountId : null;
        const oldExpense = typeof item.linkedExpenseId === 'string' ? item.linkedExpenseId : null;
        const oldIncome = typeof item.linkedIncomeId === 'string' ? item.linkedIncomeId : null;
        const oldStatementImportId = typeof item.statementImportId === 'string' ? item.statementImportId : null;
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
            householdId,
            createdById,
          },
        });
        if (typeof item.id === 'string') transferIdMap.set(item.id, created.id);
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

      const mapNodeIdMap = new Map<string, string>();
      for (const item of payload.mapNodes || []) {
        const oldAccountId = typeof item.accountId === 'string' ? item.accountId : null;
        const created = await tx.mapNode.create({
          data: {
            label: str(item.label, 'Untitled') as string,
            kind: str(item.kind, 'CUSTOM') as string,
            color: str(item.color),
            x: num(item.x, 0),
            y: num(item.y, 0),
            accountId: oldAccountId ? accountIdMap.get(oldAccountId) || null : null,
            householdId,
            createdById,
          },
        });
        if (typeof item.id === 'string') mapNodeIdMap.set(item.id, created.id);
      }

      let mapEdgeCount = 0;
      for (const item of payload.mapEdges || []) {
        const oldFromNode = typeof item.fromNodeId === 'string' ? item.fromNodeId : null;
        const oldToNode = typeof item.toNodeId === 'string' ? item.toNodeId : null;
        const newFromNode = oldFromNode ? mapNodeIdMap.get(oldFromNode) : undefined;
        const newToNode = oldToNode ? mapNodeIdMap.get(oldToNode) : undefined;
        // fromNodeId/toNodeId are required — an edge whose endpoint didn't
        // survive restore (shouldn't happen with a consistent snapshot) is
        // skipped rather than creating a dangling/invalid edge.
        if (!newFromNode || !newToNode) continue;
        await tx.mapEdge.create({
          data: {
            label: str(item.label),
            amount: numOrNull(item.amount),
            currency: str(item.currency),
            fromNodeId: newFromNode,
            toNodeId: newToNode,
            householdId,
          },
        });
        mapEdgeCount += 1;
      }

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
        categories: categoryIdMap.size,
        budgets: budgetIdMap.size,
        mapNodes: mapNodeIdMap.size,
        mapEdges: mapEdgeCount,
        statementImports: statementImportIdMap.size,
        statementTransactions: statementTransactionCount,
        merchantAliases: merchantAliasIdMap.size,
      };
    });

    const restoredCount = Object.values(result).reduce((sum, n) => sum + n, 0);

    logAudit({
      householdId,
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'BACKUP_RESTORE',
      entityType: 'DatabaseBackup',
      entityLabel: `${backup.notes || 'Snapshot'} — ${restoredCount} records restored`,
    });

    return NextResponse.json({
      status: 'ok',
      restoredCount,
      breakdown: result,
    });
  } catch (error: unknown) {
    console.error('Failed to restore backup:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Restore failed') },
      { status: 500 }
    );
  }
}
