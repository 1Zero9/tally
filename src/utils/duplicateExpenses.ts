import type { ExpenseItem } from '../types/expense';

/** The fingerprint that repeats when the same bill is added more than once. */
export const duplicateKey = (e: ExpenseItem) =>
  `${e.name.trim().toLowerCase()}|${e.amount}|${e.billingCycle}|${e.currency}`;

/** Where a record came from — a specific import, or manual entry. */
const originOf = (e: ExpenseItem) => e.statementImportId ?? 'manual';

export interface DuplicateGroup {
  key: string;
  items: ExpenseItem[];
}

/**
 * Groups of records that share name + amount + billing cycle + currency
 * *and* came from more than one source (different statement imports, or a
 * mix of imported and manual). Requiring multiple sources keeps two
 * genuinely parallel identical bills entered together — like two phone
 * lines on the same plan — from being treated as duplicates.
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
    if (new Set(items.map(originOf)).size < 2) continue;
    groups.push({ key, items });
  }
  return groups;
}
