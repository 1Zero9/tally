import type { ExpenseItem } from '../types/expense';
import { normalizeDescription } from '../lib/statementMatching';

/**
 * A stable merchant fingerprint for a bill name — its meaningful words,
 * with statement noise dropped (transaction/terminal codes like "P44DA5",
 * two-letter tokens, digit runs). This collapses
 * "PAYPAL *SPOTIFY*P44DA5 35314369001 SW" and
 * "PAYPAL *SPOTIFY*P43CCA 35314369001 SW" to the same thing, so two
 * imports of one subscription line up even when the raw descriptor
 * differs. Falls back to the plain lower-cased name when nothing
 * meaningful survives.
 */
export function merchantFingerprint(name: string): string {
  const words = normalizeDescription(name)
    .split(' ')
    .filter((t) => t.length >= 3 && /^[A-Z&']+$/.test(t))
    .slice(0, 4);
  return words.length ? words.join(' ') : name.trim().toLowerCase();
}

/**
 * The fingerprint that repeats when the same record is added more than
 * once. For a recurring bill that's merchant + amount + cycle + currency —
 * each monthly copy has a different due date, which is exactly the tell.
 * A one-off is different: two €4.50 coffees on different days are separate
 * purchases, not a duplicate, so its date is part of the key and only a
 * same-date, same-amount one-off (the same charge pulled in from two
 * overlapping statement imports) counts as a duplicate.
 */
export const duplicateKey = (e: ExpenseItem) => {
  const base = `${merchantFingerprint(e.name)}|${e.amount}|${e.billingCycle}|${e.currency}`;
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
