import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const statementImport = await prisma.statementImport.findUnique({
      where: { id },
      include: { account: { select: { id: true, name: true, type: true, institution: true } } },
    });
    if (!statementImport || statementImport.householdId !== auth.user.householdId) {
      return NextResponse.json({ status: 'error', message: 'Statement import not found' }, { status: 404 });
    }

    const transactions = await prisma.statementTransaction.findMany({
      where: { importId: id },
      orderBy: { date: 'desc' },
      include: {
        matchedExpense: { select: { id: true, name: true, vendor: true, category: true } },
        matchedTransfer: {
          select: {
            id: true,
            externalLabel: true,
            fromAccount: { select: { name: true } },
            toAccount: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ status: 'ok', import: statementImport, transactions });
  } catch (error: unknown) {
    console.error('Failed to fetch statement transactions:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Database error') },
      { status: 500 }
    );
  }
}
