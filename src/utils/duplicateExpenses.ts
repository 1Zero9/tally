import type { ExpenseItem } from '../types/expense';

/**
 * The fingerprint that repeats when the same record is added more than
 * once. For a recurring bill that's name + amount + cycle + currency —
 * each monthly copy has a different due date, which is exactly the tell.
 * A one-off is different: two €4.50 coffees on different days are separate
 * purchases, not a duplicate, so its date is part of the key and only a
 * same-date, same-amount one-off (the same charge pulled in from two
 * overlapping statement imports) counts as a duplicate.
 */
export const duplicateKey = (e: ExpenseItem) => {
  const base = `${e.name.trim().toLowerCase()}|${e.amount}|${e.billingCycle}|${e.currency}`;
  return e.billingCycle === 'once' ? `${base}|${e.nextRenewalDate}` : base;
};

export interface DuplicateGroup {
  key: string;
  items: ExpenseItem[];
}

/**
 * Groups of records that share the same fingerprint (see duplicateKey):
 * a recurring bill by name + amount + cycle + currency, a one-off by
 * those *and* its date. Two or more with a matching fingerprint is a
 * possible duplicate worth reviewing — the "Review & merge" flow is
 * non-destructive, so a household with two genuinely parallel identical
 * bills can simply choose not to merge them.
 */
export function groupPossibleDuplicates(expenses: ExpenseItem[]): DuplicateGroup[] {
  const byKey = new Map<string, ExpenseItem[]>();
  for (const e of expenses) {
    const k = duplicateKey(e);
    const arr = byKey.get(k);
    if (arr) arr.push(e);
    else byKey.set(k, [e]);
  }

  const groups: DuplicateGroup[] = [];
  for (const [key, items] of byKey) {
    if (items.length < 2) continue;
    groups.push({ key, items });
  }
  return groups;
}
