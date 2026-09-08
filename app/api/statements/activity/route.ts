import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';

/**
 * A flat, newest-first feed of every statement row that's been resolved
 * (matched / logged / ignored / flagged duplicate) across ALL of the
 * household's imports — so a mistake made weeks ago can be found and undone
 * without remembering which statement it came from. Derived straight from
 * StatementTransaction rows; "undo" is the existing per-row reset action
 * (POST /api/statements/[id]/transactions/[txId]/resolve, action: "reset").
 */

const LIMIT = 200;

export async function GET(request: Request) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || LIMIT, LIMIT);

    const rows = await prisma.statementTransaction.findMany({
      where: { householdId: auth.user.householdId, status: { not: 'UNMATCHED' } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        import: { select: { id: true, label: true } },
        matchedExpense: { select: { id: true, name: true, billingCycle: true, category: true, statementImportId: true } },
        matchedTransfer: {
          select: {
            id: true,
            externalLabel: true,
            statementImportId: true,
            fromAccount: { select: { name: true } },
            toAccount: { select: { name: true } },
            linkedIncome: { select: { id: true, name: true } },
          },
        },
      },
    });

    const items = rows.map((r) => {
      const createdHere =
        (r.matchedExpense && r.matchedExpense.statementImportId === r.importId) ||
        (r.matchedTransfer && r.matchedTransfer.statementImportId === r.importId) ||
        false;

      let action: string;
      let target: string | null = null;
      if (r.status === 'IGNORED') {
        action = 'Ignored';
      } else if (r.status === 'DUPLICATE') {
        action = 'Marked duplicate';
      } else if (r.matchedExpense) {
        const recurring = r.matchedExpense.billingCycle && r.matchedExpense.billingCycle !== 'once';
        action = createdHere
          ? (recurring ? 'Added as recurring bill' : 'Added as expense')
          : 'Linked to a bill';
        target = r.matchedExpense.name;
      } else if (r.matchedTransfer) {
        if (r.matchedTransfer.linkedIncome) {
          action = createdHere ? 'Added as income' : 'Linked to income';
          target = r.matchedTransfer.linkedIncome.name;
        } else {
          action = 'Logged as transfer';
          const from = r.matchedTransfer.fromAccount?.name;
          const to = r.matchedTransfer.toAccount?.name;
          target = from && to ? `${from} → ${to}` : r.matchedTransfer.externalLabel || null;
        }
      } else {
        action = 'Matched';
      }

      return {
        id: r.id,
        importId: r.importId,
        importLabel: r.import?.label ?? 'a statement',
        date: r.date,
        updatedAt: r.updatedAt,
        merchant: r.vendorName || r.rawDescription,
        amount: r.amount,
        currency: r.currency,
        direction: r.direction,
        status: r.status,
        action,
        target,
        createdHere,
      };
    });

    return NextResponse.json({ status: 'ok', activity: items });
  } catch (error: unknown) {
    console.error('Failed to fetch statement activity:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Database error') },
      { status: 500 }
    );
  }
}
