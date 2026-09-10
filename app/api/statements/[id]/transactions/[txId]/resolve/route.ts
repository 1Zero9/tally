import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { buildAliasPattern, sanitizeImportedText, findDuplicateRecurringExpense, findDuplicateIncome } from '@/src/lib/statementMatching';
import { getCategoryMeta, isBuiltinCategory } from '@/src/data/categories';
import { advanceByCycle } from '@/src/lib/billing';
import type { BillingCycle, ExpenseCategory } from '@/src/types/expense';

const TX_INCLUDE = {
  matchedExpense: { select: { id: true, name: true, vendor: true, category: true } },
  matchedTransfer: {
    select: {
      id: true,
      externalLabel: true,
      fromAccount: { select: { name: true } },
      toAccount: { select: { name: true } },
      linkedIncome: { select: { id: true, name: true } },
    },
  },
} as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; txId: string }> }
) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { id, txId } = await params;
    const body = await request.json();
    const action = body.action as string;

    const tx = await prisma.statementTransaction.findUnique({ where: { id: txId } });
    if (!tx || tx.householdId !== auth.user.householdId || tx.importId !== id) {
      return NextResponse.json({ status: 'error', message: 'Statement transaction not found' }, { status: 404 });
    }

    // Idempotency guard. These actions each create a new Expense / Income /
    // Transfer and re-point the row at it. If the row is already resolved —
    // a double-click, a retried request, or a stale "resolve all" batch
    // re-sending a row a sibling call already handled — running the action
    // again would create a SECOND record and silently orphan the first
    // (which "Undo" can then no longer clean up). Treat it as a no-op and
    // hand back the row exactly as it stands.
    const CREATES_RECORD = new Set([
      'categorize', 'add_bill', 'add_income', 'log_transfer', 'link_income', 'link_expense', 'confirm',
    ]);
    if (CREATES_RECORD.has(action) && tx.status !== 'UNMATCHED') {
      const current = await prisma.statementTransaction.findUnique({ where: { id: txId }, include: TX_INCLUDE });
      return NextResponse.json({ status: 'ok', transaction: current, alreadyResolved: true });
    }

    // Owner for any Expense / Income this resolve creates. `assignedUserId`:
    // absent → the importer; null or "" → the whole household; a member id →
    // that member (validated). Transfers stay owned by the importer.
    let ownerId: string | null = auth.user.id;
    if ('assignedUserId' in body) {
      const v = body.assignedUserId;
      if (v === null || v === '') {
        ownerId = null;
      } else if (typeof v === 'string') {
        const member = await prisma.user.findFirst({ where: { id: v, householdId: auth.user.householdId } });
        ownerId = member ? v : null;
      }
    }

    if (action === 'ignore') {
      const updated = await prisma.statementTransaction.update({
        where: { id: txId },
        data: { status: 'IGNORED', matchedExpenseId: null, matchedTransferId: null, matchConfidence: null },
        include: TX_INCLUDE,
      });
      return NextResponse.json({ status: 'ok', transaction: updated });
    }

    if (action === 'reset') {
      // If this row created its own Expense/Transfer at resolve time (stamped
      // with this import's id), undoing the row should remove that record too
      // — otherwise "Undo" leaves an orphan bill/transfer behind. A row that
      // was merely *linked* to a pre-existing record (no statementImportId
      // stamp) just gets unlinked.
      if (tx.matchedTransferId) {
        const linked = await prisma.transfer.findFirst({
          where: { id: tx.matchedTransferId, householdId: auth.user.householdId, statementImportId: id },
        });
        if (linked) {
          await prisma.transfer.delete({ where: { id: linked.id } });
          if (linked.linkedIncomeId) {
            // If the Income was itself created by this import ("Add as
            // income"), remove it entirely; otherwise it's a pre-existing
            // record that was only marked received — just flip that back.
            const removed = await prisma.income.deleteMany({
              where: { id: linked.linkedIncomeId, householdId: auth.user.householdId, statementImportId: id },
            });
            if (removed.count === 0) {
              await prisma.income.updateMany({
                where: { id: linked.linkedIncomeId, householdId: auth.user.householdId },
                data: { isReceivedThisCycle: false, lastReceivedAt: null },
              });
            }
          }
        }
      }
      if (tx.matchedExpenseId) {
        await prisma.expense.deleteMany({ where: { id: tx.matchedExpenseId, householdId: auth.user.householdId, statementImportId: id } });
      }
      const updated = await prisma.statementTransaction.update({
        where: { id: txId },
        data: { status: 'UNMATCHED', matchedExpenseId: null, matchedTransferId: null, matchConfidence: null },
        include: TX_INCLUDE,
      });
      return NextResponse.json({ status: 'ok', transaction: updated });
    }

    if (action === 'confirm' && !tx.matchedExpenseId && tx.matchedTransferId) {
      // A suggested transfer match (not an expense) — the Transfer already
      // exists, so confirming just accepts the suggested link.
      const updated = await prisma.statementTransaction.update({
        where: { id: txId },
        data: { status: 'MATCHED', matchConfidence: tx.matchConfidence ?? 1 },
        include: TX_INCLUDE,
      });
      return NextResponse.json({ status: 'ok', transaction: updated });
    }

    if (action === 'confirm' || action === 'link_expense') {
      const expenseId = action === 'confirm' ? tx.matchedExpenseId : body.expenseId;
      if (!expenseId) {
        return NextResponse.json({ status: 'error', message: 'An expense must be selected' }, { status: 400 });
      }

      const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
      if (!expense || expense.householdId !== auth.user.householdId) {
        return NextResponse.json({ status: 'error', message: 'Expense not found' }, { status: 404 });
      }

      const updated = await prisma.statementTransaction.update({
        where: { id: txId },
        data: { status: 'MATCHED', matchedExpenseId: expense.id, matchedTransferId: null, matchConfidence: 1 },
        include: TX_INCLUDE,
      });

      if (body.learnAlias !== false) {
        const pattern = buildAliasPattern(tx.normalizedDescription);
        if (pattern && auth.user.householdId) {
          await prisma.merchantAlias.upsert({
            where: { householdId_pattern: { householdId: auth.user.householdId, pattern } },
            create: {
              householdId: auth.user.householdId,
              pattern,
              vendorName: expense.vendor || expense.name,
              category: expense.category,
              expenseId: expense.id,
              matchCount: 1,
            },
            update: {
              expenseId: expense.id,
              vendorName: expense.vendor || expense.name,
              category: expense.category,
              matchCount: { increment: 1 },
            },
          });
        }
      }

      return NextResponse.json({ status: 'ok', transaction: updated });
    }

    if (action === 'rename_merchant') {
      const vendorName = typeof body.vendorName === 'string' ? sanitizeImportedText(body.vendorName, 120) : '';
      if (!vendorName) {
        return NextResponse.json({ status: 'error', message: 'Enter a name for this merchant' }, { status: 400 });
      }

      const updated = await prisma.statementTransaction.update({
        where: { id: txId },
        data: { vendorName },
        include: TX_INCLUDE,
      });

      if (auth.user.householdId) {
        // `groupTxIds` (a group rename): rename exactly those rows and learn
        // an alias for every distinct merchant pattern among them — the
        // review list may group several near-identical descriptions (e.g.
        // POS lines differing only by terminal number) under one heading.
        // Otherwise (a single-row rename): apply to every row that shares
        // this exact normalized description, across imports too.
        const groupTxIds: string[] = Array.isArray(body.groupTxIds)
          ? body.groupTxIds.filter((v: unknown): v is string => typeof v === 'string')
          : [];

        if (groupTxIds.length > 0) {
          await prisma.statementTransaction.updateMany({
            where: { householdId: auth.user.householdId, id: { in: groupTxIds } },
            data: { vendorName },
          });
          const rows = await prisma.statementTransaction.findMany({
            where: { householdId: auth.user.householdId, id: { in: groupTxIds } },
            select: { normalizedDescription: true },
          });
          const patterns = new Set<string>();
          for (const r of rows) {
            const p = buildAliasPattern(r.normalizedDescription);
            if (p) patterns.add(p);
          }
          for (const pattern of patterns) {
            await prisma.merchantAlias.upsert({
              where: { householdId_pattern: { householdId: auth.user.householdId, pattern } },
              create: { householdId: auth.user.householdId, pattern, vendorName, matchCount: 1 },
              update: { vendorName },
            });
          }
        } else {
          await prisma.statementTransaction.updateMany({
            where: {
              householdId: auth.user.householdId,
              normalizedDescription: tx.normalizedDescription,
              id: { not: txId },
            },
            data: { vendorName },
          });

          const pattern = buildAliasPattern(tx.normalizedDescription);
          if (pattern) {
            await prisma.merchantAlias.upsert({
              where: { householdId_pattern: { householdId: auth.user.householdId, pattern } },
              create: { householdId: auth.user.householdId, pattern, vendorName, matchCount: 1 },
              update: { vendorName },
            });
          }
        }
      }

      return NextResponse.json({ status: 'ok', transaction: updated });
    }

    if (action === 'log_transfer') {
      const vendorName = typeof body.vendorName === 'string' && body.vendorName.trim() ? sanitizeImportedText(body.vendorName, 120) : tx.vendorName || tx.rawDescription;
      const customNote = typeof body.notes === 'string' ? sanitizeImportedText(body.notes, 500) : '';

      // The statement's own account sits on the side the row's direction
      // implies (money out of it for a DEBIT, into it for a CREDIT); the
      // caller picks the account on the *other* side, or leaves it external.
      const statementImport = await prisma.statementImport.findUnique({ where: { id: tx.importId } });
      const statementAccountId = statementImport?.accountId ?? null;

      const pickedRaw = typeof body.counterpartyAccountId === 'string' ? body.counterpartyAccountId.trim() : '';
      let counterpartyAccountId: string | null = null;
      if (pickedRaw) {
        const owned = await prisma.account.findFirst({ where: { id: pickedRaw, householdId: auth.user.householdId } });
        if (!owned) {
          return NextResponse.json({ status: 'error', message: 'That account does not exist' }, { status: 400 });
        }
        counterpartyAccountId = owned.id;
      }

      const fromAccountId = tx.direction === 'CREDIT' ? counterpartyAccountId : statementAccountId;
      const toAccountId = tx.direction === 'CREDIT' ? statementAccountId : counterpartyAccountId;

      const transfer = await prisma.transfer.create({
        data: {
          amount: tx.amount,
          currency: tx.currency,
          date: tx.date,
          note: customNote ? `${customNote} (logged from statement import)` : 'Logged from statement import',
          // Only meaningful when a side is external (no account) — mirrors
          // the manual Flow transfer form.
          externalLabel: (!fromAccountId || !toAccountId) ? vendorName : null,
          fromAccountId,
          toAccountId,
          createdById: auth.user.id,
          householdId: auth.user.householdId,
          statementImportId: id,
        },
      });

      const updated = await prisma.statementTransaction.update({
        where: { id: txId },
        data: { status: 'MATCHED', matchedTransferId: transfer.id, matchedExpenseId: null, matchConfidence: 1 },
        include: TX_INCLUDE,
      });

      if (body.learnAlias && auth.user.householdId) {
        const pattern = buildAliasPattern(tx.normalizedDescription);
        if (pattern) {
          await prisma.merchantAlias.upsert({
            where: { householdId_pattern: { householdId: auth.user.householdId, pattern } },
            create: { householdId: auth.user.householdId, pattern, vendorName, matchCount: 1 },
            update: { vendorName, matchCount: { increment: 1 } },
          });
        }
      }

      return NextResponse.json({ status: 'ok', transaction: updated, transfer });
    }

    if (action === 'link_income') {
      const incomeId = typeof body.incomeId === 'string' ? body.incomeId : null;
      if (!incomeId) {
        return NextResponse.json({ status: 'error', message: 'An income must be selected' }, { status: 400 });
      }

      const income = await prisma.income.findUnique({ where: { id: incomeId } });
      if (!income || income.householdId !== auth.user.householdId) {
        return NextResponse.json({ status: 'error', message: 'Income not found' }, { status: 404 });
      }

      const statementImport = await prisma.statementImport.findUnique({ where: { id: tx.importId } });

      // Same shape as log_transfer — a real, dated Transfer at the
      // statement's actual amount, not the Income's usual figure — plus
      // linkedIncomeId so it reconciles against the household's Income
      // record instead of sitting as an unlinked "money in" entry.
      const transfer = await prisma.transfer.create({
        data: {
          amount: tx.amount,
          currency: tx.currency,
          date: tx.date,
          note: 'Logged from statement import',
          externalLabel: income.name,
          toAccountId: statementImport?.accountId ?? null,
          linkedIncomeId: income.id,
          createdById: auth.user.id,
          householdId: auth.user.householdId,
          statementImportId: id,
        },
      });

      const updated = await prisma.statementTransaction.update({
        where: { id: txId },
        data: { status: 'MATCHED', matchedTransferId: transfer.id, matchedExpenseId: null, matchConfidence: 1 },
        include: TX_INCLUDE,
      });

      // Honest "this really happened" update, same as manually marking an
      // income received — just sourced from the statement's real figures.
      await prisma.income.update({
        where: { id: income.id },
        data: { isReceivedThisCycle: true, lastReceivedAt: new Date(tx.date) },
      });

      return NextResponse.json({ status: 'ok', transaction: updated, transfer });
    }

    // Create a brand-new Income record straight from this credit row, then
    // link it — the money-in equivalent of "Add as expense". Lets the first
    // statement import stand up an income the household hadn't entered yet.
    if (action === 'add_income') {
      if (tx.direction !== 'CREDIT') {
        return NextResponse.json({ status: 'error', message: 'Only a money-in row can be added as income' }, { status: 400 });
      }

      const name = typeof body.name === 'string' && body.name.trim()
        ? sanitizeImportedText(body.name, 120)
        : (tx.vendorName || tx.rawDescription || 'Income');

      const ALLOWED_FREQ = ['weekly', 'monthly', 'quarterly', 'annual', 'once'];
      const frequency = typeof body.frequency === 'string' && ALLOWED_FREQ.includes(body.frequency)
        ? body.frequency
        : 'monthly';

      const parsedAmount = Number(body.amount);
      const amount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : tx.amount;

      if (body.allowDuplicate !== true) {
        const existing = await prisma.income.findMany({
          where: { householdId: auth.user.householdId, isActive: true },
          select: { id: true, name: true, amount: true, currency: true, frequency: true, isActive: true },
        });
        const dup = findDuplicateIncome({ name, amount, currency: tx.currency }, existing);
        if (dup) {
          return NextResponse.json({
            status: 'error',
            duplicateOf: dup,
            message: `You already track income "${dup.name}". Link this credit to it, or add anyway.`,
          }, { status: 409 });
        }
      }

      const statementImport = await prisma.statementImport.findUnique({ where: { id: tx.importId } });

      const income = await prisma.income.create({
        data: {
          name,
          amount,
          currency: tx.currency,
          frequency,
          nextPayDate: tx.date,
          category: 'salary',
          isActive: true,
          isReceivedThisCycle: true,
          lastReceivedAt: new Date(tx.date),
          depositAccountId: statementImport?.accountId ?? null,
          notes: 'Created from statement import',
          statementImportId: id,
          createdById: ownerId,
          householdId: auth.user.householdId,
        },
      });

      const transfer = await prisma.transfer.create({
        data: {
          amount: tx.amount,
          currency: tx.currency,
          date: tx.date,
          note: 'Logged from statement import',
          externalLabel: income.name,
          toAccountId: statementImport?.accountId ?? null,
          linkedIncomeId: income.id,
          createdById: auth.user.id,
          householdId: auth.user.householdId,
          statementImportId: id,
        },
      });

      const updated = await prisma.statementTransaction.update({
        where: { id: txId },
        data: { status: 'MATCHED', matchedTransferId: transfer.id, matchedExpenseId: null, matchConfidence: 1 },
        include: TX_INCLUDE,
      });

      return NextResponse.json({ status: 'ok', transaction: updated, transfer, income });
    }

    if (action === 'categorize') {
      const category = typeof body.category === 'string' ? (body.category as ExpenseCategory) : null;
      const customCategoryMatch = category && !isBuiltinCategory(category)
        ? await prisma.category.findFirst({ where: { id: category, householdId: auth.user.householdId } })
        : null;
      if (!category || (!isBuiltinCategory(category) && !customCategoryMatch)) {
        return NextResponse.json({ status: 'error', message: 'A valid category must be selected' }, { status: 400 });
      }

      const vendorName = typeof body.vendorName === 'string' && body.vendorName.trim() ? sanitizeImportedText(body.vendorName, 120) : tx.vendorName || tx.rawDescription;
      const customNote = typeof body.notes === 'string' ? sanitizeImportedText(body.notes, 500) : '';
      const meta = getCategoryMeta(category, customCategoryMatch ? [customCategoryMatch] : undefined);
      const statementImport = await prisma.statementImport.findUnique({ where: { id: tx.importId } });
      const dayOfMonth = new Date(tx.date).getDate();

      const expense = await prisma.expense.create({
        data: {
          name: vendorName,
          vendor: vendorName,
          amount: tx.amount,
          currency: tx.currency,
          billingCycle: 'once',
          // Incidental one-off spend — belongs in Spending, not the Bills
          // renewal schedule.
          isBill: false,
          category,
          icon: meta.icon,
          color: meta.color,
          renewalDay: Number.isFinite(dayOfMonth) && dayOfMonth > 0 ? dayOfMonth : 1,
          nextRenewalDate: tx.date,
          isActive: true,
          isPaidThisCycle: true,
          lastPaidAt: new Date(tx.date),
          paymentAccountId: statementImport?.accountId ?? null,
          notes: customNote ? `${customNote} (logged from statement import)` : 'Logged from statement import',
          createdById: ownerId,
          householdId: auth.user.householdId,
          statementImportId: id,
        },
      });

      const updated = await prisma.statementTransaction.update({
        where: { id: txId },
        data: { status: 'MATCHED', matchedExpenseId: expense.id, matchedTransferId: null, matchConfidence: 1 },
        include: TX_INCLUDE,
      });

      if (body.learnAlias !== false && auth.user.householdId) {
        const pattern = buildAliasPattern(tx.normalizedDescription);
        if (pattern) {
          await prisma.merchantAlias.upsert({
            where: { householdId_pattern: { householdId: auth.user.householdId, pattern } },
            create: { householdId: auth.user.householdId, pattern, vendorName, category, matchCount: 1 },
            update: { vendorName, category, matchCount: { increment: 1 } },
          });
        }
      }

      return NextResponse.json({ status: 'ok', transaction: updated, expense });
    }

    // Create a NEW recurring bill from this money-out row and link it — the
    // subscription equivalent of "Add as expense" (which only ever makes a
    // one-off). The row's charge counts as this cycle's payment; the bill's
    // next renewal is advanced one cycle on.
    if (action === 'add_bill') {
      if (tx.direction !== 'DEBIT') {
        return NextResponse.json({ status: 'error', message: 'Only a money-out row can be added as a bill' }, { status: 400 });
      }

      const category = typeof body.category === 'string' ? (body.category as ExpenseCategory) : null;
      const customCategoryMatch = category && !isBuiltinCategory(category)
        ? await prisma.category.findFirst({ where: { id: category, householdId: auth.user.householdId } })
        : null;
      if (!category || (!isBuiltinCategory(category) && !customCategoryMatch)) {
        return NextResponse.json({ status: 'error', message: 'A valid category must be selected' }, { status: 400 });
      }

      const ALLOWED_CYCLES: BillingCycle[] = ['weekly', 'monthly', 'quarterly', 'annual'];
      const billingCycle: BillingCycle = ALLOWED_CYCLES.includes(body.billingCycle as BillingCycle)
        ? (body.billingCycle as BillingCycle)
        : 'monthly';

      const parsedAmount = Number(body.amount);
      const amount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : tx.amount;

      const vendorName = typeof body.vendorName === 'string' && body.vendorName.trim()
        ? sanitizeImportedText(body.vendorName, 120)
        : tx.vendorName || tx.rawDescription;
      const meta = getCategoryMeta(category, customCategoryMatch ? [customCategoryMatch] : undefined);
      const statementImport = await prisma.statementImport.findUnique({ where: { id: tx.importId } });
      const dayOfMonth = new Date(tx.date).getDate();

      if (body.allowDuplicate !== true) {
        const existing = await prisma.expense.findMany({
          where: { householdId: auth.user.householdId, isActive: true, billingCycle: { not: 'once' } },
          select: { id: true, name: true, vendor: true, amount: true, currency: true, billingCycle: true, isActive: true },
        });
        const dup = findDuplicateRecurringExpense({ name: vendorName, amount, currency: tx.currency }, existing);
        if (dup) {
          return NextResponse.json({
            status: 'error',
            duplicateOf: dup,
            message: `You already track a recurring bill "${dup.name}". Link this charge to it, or add anyway.`,
          }, { status: 409 });
        }
      }

      const expense = await prisma.expense.create({
        data: {
          name: vendorName,
          vendor: vendorName,
          amount,
          currency: tx.currency,
          billingCycle,
          category,
          icon: meta.icon,
          color: meta.color,
          renewalDay: Number.isFinite(dayOfMonth) && dayOfMonth > 0 ? dayOfMonth : 1,
          nextRenewalDate: advanceByCycle(tx.date, billingCycle),
          isActive: true,
          isBill: true,
          isPaidThisCycle: true,
          lastPaidAt: new Date(tx.date),
          paymentAccountId: statementImport?.accountId ?? null,
          notes: 'Created from statement import',
          createdById: ownerId,
          householdId: auth.user.householdId,
          statementImportId: id,
        },
      });

      const updated = await prisma.statementTransaction.update({
        where: { id: txId },
        data: { status: 'MATCHED', matchedExpenseId: expense.id, matchedTransferId: null, matchConfidence: 1 },
        include: TX_INCLUDE,
      });

      if (body.learnAlias !== false && auth.user.householdId) {
        const pattern = buildAliasPattern(tx.normalizedDescription);
        if (pattern) {
          await prisma.merchantAlias.upsert({
            where: { householdId_pattern: { householdId: auth.user.householdId, pattern } },
            create: { householdId: auth.user.householdId, pattern, vendorName, category, expenseId: expense.id, matchCount: 1 },
            update: { vendorName, category, expenseId: expense.id, matchCount: { increment: 1 } },
          });
        }
      }

      return NextResponse.json({ status: 'ok', transaction: updated, expense });
    }

    return NextResponse.json({ status: 'error', message: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Failed to resolve statement transaction:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to update transaction') },
      { status: 500 }
    );
  }
}
