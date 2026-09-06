import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireAdmin } from '@/src/lib/auth';
import { matchAccountFields, type AccountFieldMatches } from '@/src/lib/accountMatching';

type MatchedField = keyof AccountFieldMatches;

/**
 * Cross-references account-level details read off an uploaded statement
 * against EVERY account already saved in the household, so the import flow
 * can suggest (or auto-select, when unambiguous) which one it belongs to —
 * rather than only checking the single account the user has already
 * manually picked (see the per-account compare-statement endpoint, which
 * remains the "confirm what I picked" follow-up check). Admin-gated, same
 * reason as compare-statement: this decrypts stored credentials to compare
 * them, even though it never returns the decrypted value itself.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber : null;
    const sortCode = typeof body.sortCode === 'string' ? body.sortCode : null;
    const iban = typeof body.iban === 'string' ? body.iban : null;
    const bic = typeof body.bic === 'string' ? body.bic : null;

    if (!accountNumber && !sortCode && !iban && !bic) {
      return NextResponse.json({ status: 'ok', candidates: [] });
    }

    const accounts = await prisma.account.findMany({
      where: { householdId: auth.user.householdId },
      select: { id: true, name: true, accountNumberEnc: true, routingNumberEnc: true, ibanEnc: true, bicEnc: true },
    });

    const candidates = accounts
      .map((account) => {
        const matches = matchAccountFields({ accountNumber, sortCode, iban, bic }, account);
        const matchedFields = (Object.keys(matches) as MatchedField[]).filter((f) => matches[f] === 'match');
        const hasMismatch = (Object.keys(matches) as MatchedField[]).some((f) => matches[f] === 'mismatch');
        return { accountId: account.id, accountName: account.name, matchedFields, hasMismatch };
      })
      // A mismatched field is a stronger negative signal than simply
      // missing data — an account with any real mismatch is disqualified,
      // even if another field happens to match.
      .filter((c) => c.matchedFields.length > 0 && !c.hasMismatch)
      .sort((a, b) => b.matchedFields.length - a.matchedFields.length)
      .map(({ accountId, accountName, matchedFields }) => ({ accountId, accountName, matchedFields }));

    return NextResponse.json({ status: 'ok', candidates });
  } catch (error: unknown) {
    console.error('Failed to match statement to an account:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to match account details') },
      { status: 500 }
    );
  }
}
