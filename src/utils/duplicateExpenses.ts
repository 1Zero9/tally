import type { CurrencyCode, ExpenseItem, IncomeItem } from '../types/expense';
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
  return groupBy(expenses, duplicateKey);
}

/** Income equivalent of duplicateKey — same fingerprint idea, keyed on
 *  frequency (and pay date for a one-off). */
export const duplicateIncomeKey = (i: IncomeItem) => {
  const base = `${merchantFingerprint(i.name)}|${i.amount}|${i.frequency}|${i.currency}`;
  return i.frequency === 'once' ? `${base}|${i.nextPayDate ?? ''}` : base;
};

export interface DuplicateIncomeGroup {
  key: string;
  items: IncomeItem[];
}

export function groupPossibleDuplicateIncomes(incomes: IncomeItem[]): DuplicateIncomeGroup[] {
  return groupBy(incomes, duplicateIncomeKey);
}

function groupBy<T>(items: T[], keyOf: (t: T) => string): { key: string; items: T[] }[] {
  const byKey = new Map<string, T[]>();
  for (const it of items) {
    const k = keyOf(it);
    const arr = byKey.get(k);
    if (arr) arr.push(it);
    else byKey.set(k, [it]);
  }
  return [...byKey.entries()].filter(([, v]) => v.length >= 2).map(([key, items]) => ({ key, items }));
}

/**
 * The shape the merge dialog works on — an expense or income row flattened
 * to just what the dialog needs to render and pick a keeper. Each caller
 * maps its own records to this.
 */
export interface MergeCandidate {
  id: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  /** e.g. "/month" — from formatBillingCycle */
  cycleSuffix: string;
  /** dot colour for the group header; a muted default is used if omitted */
  colour?: string;
  /** one-line "Due 3 Oct 2026 · From … · Stephen · paused" style summary */
  subline: string;
  createdAt?: string;
  /** prefer this record as the one to keep (e.g. it's tied to a goal) */
  curated?: boolean;
}

export interface MergeGroup {
  key: string;
  items: MergeCandidate[];
}
