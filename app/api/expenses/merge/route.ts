import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { logAudit } from '@/src/lib/audit';

/**
 * Merge duplicate expense records into one. Everything that pointed at a
 * merged record — real transfers, matched statement rows, learned merchant
 * aliases, project links, receipt attachments — is re-pointed at the
 * keeper, then the merged records are deleted. Used by the "Duplicates"
 * cleanup in the Expenses list.
 */
export async function POST(request: Request) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;
  const householdId = auth.user.householdId as string;

  try {
    const body = await request.json();
    const keepId = typeof body.keepId === 'string' ? body.keepId : '';
    const rawMergeIds: string[] = Array.isArray(body.mergeIds)
      ? body.mergeIds.filter((v: unknown): v is string => typeof v === 'string' && v !== keepId)
      : [];
    const mergeIds: string[] = [...new Set(rawMergeIds)];

    if (!keepId || mergeIds.length === 0) {
      return NextResponse.json({ status: 'error', message: 'Pick a record to keep and at least one to merge into it.' }, { status: 400 });
    }

    const ids = [keepId, ...mergeIds];
    const rows = await prisma.expense.findMany({
      where: { id: { in: ids }, householdId },
      select: { id: true, name: true },
    });
    if (rows.length !== ids.length) {
      return NextResponse.json({ status: 'error', message: 'One or more of those records no longer exist.' }, { status: 404 });
    }
    const keeper = rows.find((r) => r.id === keepId)!;

    await prisma.$transaction([
      prisma.transfer.updateMany({ where: { linkedExpenseId: { in: mergeIds } }, data: { linkedExpenseId: keepId } }),
      prisma.statementTransaction.updateMany({ where: { matchedExpenseId: { in: mergeIds } }, data: { matchedExpenseId: keepId } }),
      prisma.merchantAlias.updateMany({ where: { expenseId: { in: mergeIds } }, data: { expenseId: keepId } }),
      prisma.projectItemLink.updateMany({ where: { expenseId: { in: mergeIds } }, data: { expenseId: keepId } }),
      prisma.attachment.updateMany({ where: { expenseId: { in: mergeIds } }, data: { expenseId: keepId } }),
      // Plain string column, no FK — orphans are harmless but tidy them up.
      prisma.sentReminder.deleteMany({ where: { expenseId: { in: mergeIds } } }),
      prisma.expense.deleteMany({ where: { id: { in: mergeIds }, householdId } }),
    ]);

    logAudit({
      householdId,
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'DELETE',
      entityType: 'Expense',
      entityLabel: `Merged ${mergeIds.length} duplicate${mergeIds.length === 1 ? '' : 's'} into "${keeper.name}"`,
    });

    return NextResponse.json({ status: 'ok', keptId: keepId, mergedCount: mergeIds.length });
  } catch (error: unknown) {
    console.error('Failed to merge expenses:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to merge records') },
      { status: 500 }
    );
  }
}
