import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { buildAliasPattern, detectRecurringCycle, sanitizeImportedText, findDuplicateRecurringExpense } from '@/src/lib/statementMatching';
import { advanceByCycle } from '@/src/lib/billing';
import { getCategoryMeta, isBuiltinCategory } from '@/src/data/categories';
import type { ExpenseCategory } from '@/src/types/expense';

const TX_INCLUDE = {
  matchedExpense: { select: { id: true, name: true, vendor: true, category: true } },
  matchedTransfer: { select: { id: true, externalLabel: true } },
} as const;

/**
 * Resolves a whole group of statement rows that share an identical merchant,
 * amount, currency and direction — and a regular date spacing — as ONE
 * recurring Expense, instead of the N separate one-off expenses that
 * resolving each row individually would create. Each occurrence still gets
 * its own backdated Transfer (so Insights/trend charts see the real
 * historical spend at the real dates), all linked to the single Expense.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const txIds: string[] = Array.isArray(body.txIds) ? body.txIds.filter((v: unknown) => typeof v === 'string') : [];
    if (txIds.length < 3) {
      return NextResponse.json({ status: 'error', message: 'Need at least 3 rows to treat as a recurring bill' }, { status: 400 });
    }

    const category = typeof body.category === 'string' ? (body.category as ExpenseCategory) : null;
    const customCategoryMatch = category && !isBuiltinCategory(category)
      ? await prisma.category.findFirst({ where: { id: category, householdId: auth.user.householdId } })
      : null;
    if (!category || (!isBuiltinCategory(category) && !customCategoryMatch)) {
      return NextResponse.json({ status: 'error', message: 'A valid category must be selected' }, { status: 400 });
    }

    // Owner: absent → importer; null/"" → household; a member id → that member.
    let ownerId: string | null = auth.user.id;
    if ('assignedUserId' in body) {
      const v = body.assignedUserId;
      if (v === null || v === '') ownerId = null;
      else if (typeof v === 'string') {
        const member = await prisma.user.findFirst({ where: { id: v, householdId: auth.user.householdId } });
        ownerId = member ? v : null;
      }
    }

    const statementImport = await prisma.statementImport.findUnique({ where: { id } });
    if (!statementImport || statementImport.householdId !== auth.user.householdId) {
      return NextResponse.json({ status: 'error', message: 'Statement import not found' }, { status: 404 });
    }

    const rows = await prisma.statementTransaction.findMany({
      where: { id: { in: txIds }, importId: id, householdId: auth.user.householdId, status: 'UNMATCHED' },
    });
    if (rows.length !== txIds.length) {
      return NextResponse.json({ status: 'error', message: 'Some rows were not found or have already been resolved — refresh and try again' }, { status: 400 });
    }

    const first = rows[0];
    const sameShape = rows.every((r) => r.amount === first.amount && r.currency === first.currency && r.direction === first.direction);
    if (!sameShape) {
      return NextResponse.json({ status: 'error', message: 'These rows aren\'t all the same amount — they can\'t be one recurring bill' }, { status: 400 });
    }
    if (first.direction !== 'DEBIT') {
      return NextResponse.json({ status: 'error', message: 'Only outgoing (debit) rows can become a recurring bill' }, { status: 400 });
    }

    const cycle = detectRecurringCycle(rows.map((r) => r.date));
    if (!cycle) {
      return NextResponse.json({ status: 'error', message: 'These dates aren\'t regularly spaced enough to confidently call this a recurring bill' }, { status: 400 });
    }

    const sortedRows = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    const lastRow = sortedRows[sortedRows.length - 1];

    const vendorName = typeof body.vendorName === 'string' && body.vendorName.trim() ? sanitizeImportedText(body.vendorName, 120) : first.vendorName || first.rawDescription;
    const customNote = typeof body.notes === 'string' ? sanitizeImportedText(body.notes, 500) : '';
    const meta = getCategoryMeta(category, customCategoryMatch ? [customCategoryMatch] : undefined);
    const dayOfMonth = new Date(lastRow.date).getDate();

    if (body.allowDuplicate !== true) {
      const existing = await prisma.expense.findMany({
        where: { householdId: auth.user.householdId, isActive: true, billingCycle: { not: 'once' } },
        select: { id: true, name: true, vendor: true, amount: true, currency: true, billingCycle: true, isActive: true },
      });
      const dup = findDuplicateRecurringExpense({ name: vendorName, amount: first.amount, currency: first.currency }, existing);
      if (dup) {
        return NextResponse.json({
          status: 'error',
          duplicateOf: dup,
          message: `You already track a recurring bill "${dup.name}". Link these charges to it, or add anyway.`,
        }, { status: 409 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          name: vendorName,
          vendor: vendorName,
          amount: first.amount,
          currency: first.currency,
          billingCycle: cycle,
          category,
          icon: meta.icon,
          color: meta.color,
          renewalDay: Number.isFinite(dayOfMonth) && dayOfMonth > 0 ? dayOfMonth : 1,
          nextRenewalDate: advanceByCycle(lastRow.date, cycle),
          isActive: true,
          isBill: true,
          isPaidThisCycle: true,
          lastPaidAt: new Date(lastRow.date),
          paymentAccountId: statementImport.accountId,
          notes: customNote ? `${customNote} (logged from statement import)` : `Recognized as a recurring bill from ${sortedRows.length} statement rows`,
          createdById: ownerId,
          householdId: auth.user.householdId,
          statementImportId: id,
        },
      });

      const updatedTransactions = [];
      for (const row of sortedRows) {
        const transfer = await tx.transfer.create({
          data: {
            amount: row.amount,
            currency: row.currency,
            date: row.date,
            note: 'Logged from statement import (recurring bill)',
            externalLabel: vendorName,
            fromAccountId: statementImport.accountId,
            linkedExpenseId: expense.id,
            createdById: auth.user.id,
            householdId: auth.user.householdId,
            statementImportId: id,
          },
        });

        const updated = await tx.statementTransaction.update({
          where: { id: row.id },
          data: { status: 'MATCHED', matchedExpenseId: expense.id, matchedTransferId: transfer.id, matchConfidence: 1 },
          include: TX_INCLUDE,
        });
        updatedTransactions.push(updated);
      }

      if (auth.user.householdId) {
        const pattern = buildAliasPattern(first.normalizedDescription);
        if (pattern) {
          await tx.merchantAlias.upsert({
            where: { householdId_pattern: { householdId: auth.user.householdId, pattern } },
            create: { householdId: auth.user.householdId, pattern, vendorName, category, expenseId: expense.id, matchCount: sortedRows.length },
            update: { vendorName, category, expenseId: expense.id, matchCount: { increment: sortedRows.length } },
          });
        }
      }

      return { expense, transactions: updatedTransactions };
    });

    return NextResponse.json({ status: 'ok', expense: result.expense, transactions: result.transactions, billingCycle: cycle });
  } catch (error: unknown) {
    console.error('Failed to resolve statement group as recurring bill:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to create recurring bill') },
      { status: 500 }
    );
  }
}
