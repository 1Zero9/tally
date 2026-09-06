import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import type { HistoryPeriod } from '@/src/types/expense';

/**
 * The full real Transfer ledger for a period — every transfer, linked or
 * not — unlike /api/history which only aggregates transfers tied to a
 * tracked Expense/Income. Reports need the complete picture (an ad-hoc
 * "Log as transfer" spend with no link is still real spend), so this is
 * the one shared data source every report in the Reports tab aggregates
 * client-side from.
 */
export async function GET(request: Request) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || '12') as HistoryPeriod;

    let cutoffDate: string | null = null;
    if (period !== 'all') {
      const today = new Date();
      const monthsBack = Number(period) || 12;
      const cutoff = new Date(today.getFullYear(), today.getMonth() - (monthsBack - 1), 1);
      cutoffDate = cutoff.toISOString().split('T')[0];
    }

    const transfers = await prisma.transfer.findMany({
      where: {
        householdId: auth.user.householdId,
        ...(cutoffDate ? { date: { gte: cutoffDate } } : {}),
      },
      select: {
        id: true,
        date: true,
        amount: true,
        currency: true,
        externalLabel: true,
        fromAccountId: true,
        fromAccount: { select: { id: true, name: true } },
        toAccountId: true,
        toAccount: { select: { id: true, name: true } },
        linkedExpense: { select: { name: true, vendor: true, category: true } },
        linkedIncome: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const transactions = transfers.map((t) => {
      const direction: 'in' | 'out' | 'internal' =
        t.fromAccountId && t.toAccountId ? 'internal' : t.toAccountId ? 'in' : 'out';
      const label =
        t.linkedExpense?.vendor ||
        t.linkedExpense?.name ||
        t.linkedIncome?.name ||
        t.externalLabel ||
        'Transfer';

      return {
        id: t.id,
        date: t.date,
        amount: t.amount,
        currency: t.currency,
        direction,
        label,
        category: t.linkedExpense?.category || null,
        fromAccount: t.fromAccount,
        toAccount: t.toAccount,
      };
    });

    return NextResponse.json({ status: 'ok', transactions });
  } catch (error: unknown) {
    console.error('Failed to fetch report transactions:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Database error') },
      { status: 500 }
    );
  }
}
