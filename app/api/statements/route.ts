import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import {
  normalizeDescription,
  matchTransaction,
  findRecurringUnmatched,
  sanitizeImportedText,
  duplicateKey,
  type StatementTxDirection,
  type MatchResult,
} from '@/src/lib/statementMatching';

// Extends MatchResult's status with the import-time-only 'DUPLICATE' case
// (never returned by matchTransaction itself — assigned directly when a row
// matches something already imported from an earlier statement).
type ImportMatchResult = Omit<MatchResult, 'status'> & { status: MatchResult['status'] | 'DUPLICATE' };

export async function GET() {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const imports = await prisma.statementImport.findMany({
      where: { householdId: auth.user.householdId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        account: { select: { id: true, name: true, type: true, institution: true } },
        transactions: { select: { status: true, date: true } },
      },
    });

    const results = imports.map(({ transactions, ...rest }) => {
      // The real span the import covers, straight off the rows — always
      // present (CSV and PDF alike) and independent of the free-text label.
      const dates = transactions.map((t) => t.date).filter(Boolean).sort();
      return {
        ...rest,
        total: transactions.length,
        matched: transactions.filter((t) => t.status === 'MATCHED').length,
        unmatched: transactions.filter((t) => t.status === 'UNMATCHED').length,
        ignored: transactions.filter((t) => t.status === 'IGNORED').length,
        duplicate: transactions.filter((t) => t.status === 'DUPLICATE').length,
        coversFrom: dates[0] ?? null,
        coversTo: dates[dates.length - 1] ?? null,
      };
    });

    return NextResponse.json({ status: 'ok', imports: results });
  } catch (error: unknown) {
    console.error('Failed to fetch statement imports:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Database error') },
      { status: 500 }
    );
  }
}

interface IncomingRow {
  date: string;
  rawDescription: string;
  amount: number;
  currency?: string;
  direction?: string;
}

export async function POST(request: Request) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const label =
      typeof body.label === 'string' && body.label.trim()
        ? body.label.trim()
        : `Statement import — ${new Date().toLocaleDateString('en-GB')}`;
    const fileName = typeof body.fileName === 'string' ? body.fileName : null;
    const rawRows: IncomingRow[] = Array.isArray(body.transactions) ? body.transactions : [];

    let accountId: string | null = typeof body.accountId === 'string' && body.accountId ? body.accountId : null;
    if (accountId) {
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      if (!account || account.householdId !== auth.user.householdId) {
        accountId = null;
      }
    }

    const rows = rawRows.filter(
      (r) => r && typeof r.date === 'string' && r.date && typeof r.rawDescription === 'string' && r.rawDescription.trim() && typeof r.amount === 'number' && !Number.isNaN(r.amount) && r.amount !== 0
    );

    if (rows.length === 0) {
      return NextResponse.json({ status: 'error', message: 'No valid transactions to import.' }, { status: 400 });
    }
    if (rows.length > 2000) {
      return NextResponse.json(
        { status: 'error', message: 'That statement has too many rows (max 2000 per import).' },
        { status: 400 }
      );
    }

    const [expenses, transfers, aliases, priorTransactions] = await Promise.all([
      prisma.expense.findMany({
        where: {
          householdId: auth.user.householdId,
          isActive: true,
          // Scoped to the chosen account when known — an expense either
          // isn't linked to any account yet, or must match this one, so we
          // don't cross-match a bill paid from a different account.
          ...(accountId ? { OR: [{ paymentAccountId: accountId }, { paymentAccountId: null }] } : {}),
        },
        select: { id: true, name: true, vendor: true, amount: true, currency: true, renewalDay: true },
      }),
      prisma.transfer.findMany({
        where: {
          householdId: auth.user.householdId,
          // A transfer only makes sense as a match for this statement if it
          // actually touches the account the statement came from.
          ...(accountId ? { OR: [{ fromAccountId: accountId }, { toAccountId: accountId }] } : {}),
        },
        select: { id: true, amount: true, currency: true, date: true, externalLabel: true },
      }),
      prisma.merchantAlias.findMany({
        where: { householdId: auth.user.householdId },
        select: { id: true, pattern: true, vendorName: true, expenseId: true, category: true },
      }),
      prisma.statementTransaction.findMany({
        where: {
          householdId: auth.user.householdId,
          // Scoped to the same account when known — an identical-looking
          // transaction on a different account is a coincidence, not a
          // re-imported duplicate. No date cutoff: a household's lifetime
          // statement history is small enough to scan in full, and a bounded
          // window can silently miss a duplicate from an older re-upload.
          ...(accountId ? { import: { accountId } } : {}),
        },
        select: { date: true, amount: true, currency: true, direction: true, normalizedDescription: true },
      }),
    ]);

    const seenKeys = new Set(priorTransactions.map((t) => duplicateKey(t)));

    const openingBalance = typeof body.openingBalance === 'number' && Number.isFinite(body.openingBalance) ? body.openingBalance : null;
    const closingBalance = typeof body.closingBalance === 'number' && Number.isFinite(body.closingBalance) ? body.closingBalance : null;
    const statementPeriod = typeof body.statementPeriod === 'string' && body.statementPeriod.trim() ? body.statementPeriod.trim() : null;

    const statementImport = await prisma.statementImport.create({
      data: {
        label,
        fileName,
        accountId,
        createdById: auth.user.id,
        householdId: auth.user.householdId,
        openingBalance,
        closingBalance,
        statementPeriod,
      },
    });

    const prepared = rows.map((r) => {
      // Sanitize before anything else touches it — this text may end up in
      // Expense/Transfer records and later inside AI prompt contexts, so
      // strip control chars and cap length at the point of entry.
      const rawDescription = sanitizeImportedText(r.rawDescription, 200);
      const normalizedDescription = normalizeDescription(rawDescription);
      const direction: StatementTxDirection = r.direction === 'CREDIT' ? 'CREDIT' : 'DEBIT';
      const currency = r.currency || 'EUR';
      const amount = Math.abs(r.amount);

      const key = duplicateKey({ date: r.date, amount, currency, direction, normalizedDescription });
      const isDuplicate = seenKeys.has(key);
      // Record it either way so a repeat within this same upload (the same
      // file dropped in twice, or a genuinely repeated line) is also caught,
      // not just repeats against a prior import.
      seenKeys.add(key);

      const match: ImportMatchResult = isDuplicate
        ? { status: 'DUPLICATE' }
        : matchTransaction(
            { normalizedDescription, amount, currency, date: r.date, direction },
            { expenses, transfers, aliases }
          );
      return { row: { ...r, rawDescription }, normalizedDescription, direction, currency, amount, match };
    });

    const recurringFlags = findRecurringUnmatched(
      prepared.map((p, idx) => ({ id: String(idx), normalizedDescription: p.normalizedDescription, status: p.match.status }))
    );

    const created = await prisma.$transaction(
      prepared.map((p, idx) =>
        prisma.statementTransaction.create({
          data: {
            importId: statementImport.id,
            householdId: auth.user.householdId,
            date: p.row.date,
            rawDescription: p.row.rawDescription,
            normalizedDescription: p.normalizedDescription,
            amount: p.amount,
            currency: p.currency,
            direction: p.direction,
            status: p.match.status,
            matchedExpenseId: p.match.matchedExpenseId || null,
            matchedTransferId: p.match.matchedTransferId || null,
            matchConfidence: p.match.matchConfidence ?? null,
            suggestedCategory: p.match.suggestedCategory ?? null,
            vendorName: p.match.suggestedVendorName ?? null,
            notes: p.match.status === 'DUPLICATE'
              ? 'Matches a transaction already imported from an earlier statement — likely an overlapping date range. Reset if this isn\'t actually a duplicate.'
              : recurringFlags.has(String(idx))
                ? 'Appears more than once and looks untracked — worth checking.'
                : null,
          },
          include: {
            matchedExpense: { select: { id: true, name: true, vendor: true, category: true } },
            matchedTransfer: { select: { id: true, externalLabel: true } },
          },
        })
      )
    );

    return NextResponse.json({ status: 'ok', import: statementImport, transactions: created });
  } catch (error: unknown) {
    console.error('Failed to import statement:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to import statement') },
      { status: 500 }
    );
  }
}
