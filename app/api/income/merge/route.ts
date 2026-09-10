import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { logAudit } from '@/src/lib/audit';

/**
 * Merge duplicate income records into one — re-points every real Transfer
 * that reconciled against a merged record at the keeper, then deletes the
 * merged records. Mirrors POST /api/expenses/merge; income has fewer
 * things pointing at it (just linked transfers).
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
    const rows = await prisma.income.findMany({
      where: { id: { in: ids }, householdId },
      select: { id: true, name: true },
    });
    if (rows.length !== ids.length) {
      return NextResponse.json({ status: 'error', message: 'One or more of those records no longer exist.' }, { status: 404 });
    }
    const keeper = rows.find((r) => r.id === keepId)!;

    await prisma.$transaction([
      prisma.transfer.updateMany({ where: { linkedIncomeId: { in: mergeIds } }, data: { linkedIncomeId: keepId } }),
      prisma.income.deleteMany({ where: { id: { in: mergeIds }, householdId } }),
    ]);

    logAudit({
      householdId,
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'DELETE',
      entityType: 'Income',
      entityLabel: `Merged ${mergeIds.length} duplicate${mergeIds.length === 1 ? '' : 's'} into "${keeper.name}"`,
    });

    return NextResponse.json({ status: 'ok', keptId: keepId, mergedCount: mergeIds.length });
  } catch (error: unknown) {
    console.error('Failed to merge income:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to merge records') },
      { status: 500 }
    );
  }
}
