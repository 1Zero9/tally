import type { AccountType, TransferItem } from '../types/expense';

const DEBT_TYPES: AccountType[] = ['CREDIT_CARD', 'LOAN'];

export function isDebtAccountType(type: AccountType | null | undefined): boolean {
  return !!type && DEBT_TYPES.includes(type);
}

/**
 * A short semantic label for a transfer when "A → B" undersells what it is.
 * Currently the only case: cash moving from an ordinary account into a
 * credit-card or loan account isn't a plain move — it's a payment against a
 * balance. Returns null when nothing more specific applies.
 */
export function transferKindLabel(
  t: Pick<TransferItem, 'fromAccountId' | 'fromAccount' | 'toAccount'>
): string | null {
  const toType = t.toAccount?.type;
  const fromIsDebt = isDebtAccountType(t.fromAccount?.type);
  if (t.fromAccountId && isDebtAccountType(toType) && !fromIsDebt) {
    return toType === 'LOAN' ? 'Loan payment' : 'Card payment';
  }
  return null;
}
