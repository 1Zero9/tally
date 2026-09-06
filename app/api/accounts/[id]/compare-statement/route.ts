import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireAdmin } from '@/src/lib/auth';
import { matchAccountFields } from '@/src/lib/accountMatching';

/**
 * Compares account-level details read off an uploaded statement (account
 * number, sort code, IBAN, BIC) against the encrypted details already saved
 * for one of the household's accounts — without ever returning the
 * decrypted stored value itself, only a match/mismatch/not_set signal.
 * Admin-gated, same as the reveal endpoint, since it involves decrypting
 * stored credentials.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber : null;
    const sortCode = typeof body.sortCode === 'string' ? body.sortCode : null;
    const iban = typeof body.iban === 'string' ? body.iban : null;
    const bic = typeof body.bic === 'string' ? body.bic : null;

    const account = await prisma.account.findUnique({ where: { id } });
    if (!account || account.householdId !== auth.user.householdId) {
      return NextResponse.json({ status: 'error', message: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'ok',
      ...matchAccountFields({ accountNumber, sortCode, iban, bic }, account),
    });
  } catch (error: unknown) {
    console.error('Failed to compare statement account details:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to compare account details') },
      { status: 500 }
    );
  }
}
