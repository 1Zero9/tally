import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { logAudit } from '@/src/lib/audit';

/**
 * "Undo this import" — reverses a statement import as a unit: deletes
 * every Expense/Transfer/Income it created (stamped via statementImportId,
 * see the schema note on those models), then the import itself (which
 * cascades its StatementTransaction rows). Deliberately separate from the
 * plain "delete import" action (DELETE /api/statements/[id]), which keeps
 * already-logged records on purpose — this one removes everything.
 *
 * GET returns a preview (record counts) for the confirmation dialog
 * without deleting anything; POST performs the actual undo.
 */
async function loadImportAndCounts(id: string, householdId: string | null) {
  const statementImport = await prisma.statementImport.findUnique({ where: { id } });
  if (!statementImport || statementImport.householdId !== householdId) return null;

  const [expenseCount, transferCount, incomeCount, transactionCount] = await Promise.all([
    prisma.expense.count({ where: { statementImportId: id } }),
    prisma.transfer.count({ where: { statementImportId: id } }),
    prisma.income.count({ where: { statementImportId: id } }),
    prisma.statementTransaction.count({ where: { importId: id } }),
  ]);

  return { statementImport, expenseCount, transferCount, incomeCount, transactionCount };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const result = await loadImportAndCounts(id, auth.user.householdId);
    if (!result) {
      return NextResponse.json({ status: 'error', message: 'Statement import not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'ok',
      label: result.statementImport.label,
      expenseCount: result.expenseCount,
      transferCount: result.transferCount,
      incomeCount: result.incomeCount,
      transactionCount: result.transactionCount,
    });
  } catch (error: unknown) {
    console.error('Failed to preview statement import undo:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Database error') },
      { status: 500 }
    );
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const result = await loadImportAndCounts(id, auth.user.householdId);
    if (!result) {
      return NextResponse.json({ status: 'error', message: 'Statement import not found' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.expense.deleteMany({ where: { statementImportId: id } }),
      prisma.transfer.deleteMany({ where: { statementImportId: id } }),
      prisma.income.deleteMany({ where: { statementImportId: id } }),
      prisma.statementImport.delete({ where: { id } }),
    ]);

    logAudit({
      householdId: auth.user.householdId as string,
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'STATEMENT_IMPORT_UNDO',
      entityType: 'StatementImport',
      entityLabel: `${result.statementImport.label} — ${result.expenseCount} expense(s), ${result.transferCount} transfer(s), ${result.incomeCount} income(s) removed`,
    });

    return NextResponse.json({
      status: 'ok',
      expenseCount: result.expenseCount,
      transferCount: result.transferCount,
      incomeCount: result.incomeCount,
      transactionCount: result.transactionCount,
    });
  } catch (error: unknown) {
    console.error('Failed to undo statement import:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to undo import') },
      { status: 500 }
    );
  }
}
