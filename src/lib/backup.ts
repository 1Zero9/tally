import { prisma } from '@/src/lib/prisma';
import { Prisma } from '@prisma/client';

// A snapshot's payloadJson holds one plain array per table. Schema version 2
// (see DatabaseBackup.schemaVersion) — version 1 only had the first five.
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
  mapNodes?: Record<string, unknown>[];
  mapEdges?: Record<string, unknown>[];
}

export const CURRENT_BACKUP_SCHEMA_VERSION = 2;

/**
 * Snapshots every household-scoped financial/organizational table (Account,
 * Goal, Expense, Income, Transfer, StatementImport, StatementTransaction,
 * MerchantAlias, Category, Budget, MapNode, MapEdge) into a single
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
    mapNodes,
    mapEdges,
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
    prisma.mapNode.findMany({ where: { householdId } }),
    prisma.mapEdge.findMany({ where: { householdId } }),
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
    mapNodes,
    mapEdges,
  };
  const recordCount =
    accounts.length + goals.length + expenses.length + incomes.length + transfers.length +
    statementImports.length + statementTransactions.length + merchantAliases.length +
    categories.length + budgets.length + mapNodes.length + mapEdges.length;

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
