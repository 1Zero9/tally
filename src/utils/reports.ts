import type { CurrencyCode, CustomCategoryItem } from '../types/expense';
import { getCategoryMeta } from '../data/categories';
import { convertCurrency } from './calculations';

export type ReportDirection = 'in' | 'out' | 'internal';

export interface ReportTransaction {
  id: string;
  date: string;
  amount: number;
  currency: CurrencyCode;
  direction: ReportDirection;
  label: string;
  category: string | null;
  fromAccount: { id: string; name: string } | null;
  toAccount: { id: string; name: string } | null;
}

export interface ReportMonthPoint {
  month: string;
  label: string;
  spending: number;
  income: number;
}

export interface ReportRankedRow {
  key: string;
  name: string;
  total: number;
  percentage: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_LABELS[(m || 1) - 1]} ${y}`;
}

/**
 * True real spend leaving the household — money out with no matching
 * internal destination account. A transfer between two of the household's
 * own accounts (direction 'internal') never counts as spend or income here,
 * matching the rule already used everywhere else in Tally (see AGENTS.md /
 * the Flow docs): moving money around doesn't spend it.
 */
export function isRealSpend(t: ReportTransaction): boolean {
  return t.direction === 'out';
}

export function isRealIncome(t: ReportTransaction): boolean {
  return t.direction === 'in';
}

/**
 * Buckets the full transaction set into monthly spend/income totals, same
 * shape as /api/history's MonthlyHistoryPoint but built from the complete
 * Transfer ledger (ad-hoc/unlinked transfers included) rather than only
 * transfers linked to a tracked Expense/Income.
 */
export function bucketTransactionsByMonth(
  transactions: ReportTransaction[],
  targetCurrency: CurrencyCode
): ReportMonthPoint[] {
  const monthMap = new Map<string, { spending: number; income: number }>();

  for (const t of transactions) {
    if (t.direction === 'internal') continue;
    const key = monthKey(t.date);
    const entry = monthMap.get(key) || { spending: 0, income: 0 };
    const converted = convertCurrency(t.amount, t.currency || 'EUR', targetCurrency);
    if (isRealSpend(t)) entry.spending += converted;
    if (isRealIncome(t)) entry.income += converted;
    monthMap.set(key, entry);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => ({
      month: key,
      label: monthLabel(key),
      spending: Math.round(val.spending * 100) / 100,
      income: Math.round(val.income * 100) / 100,
    }));
}

function ranked(totals: Map<string, { name: string; total: number }>): ReportRankedRow[] {
  const grand = Array.from(totals.values()).reduce((sum, v) => sum + v.total, 0);
  return Array.from(totals.entries())
    .map(([key, v]) => ({
      key,
      name: v.name,
      total: Math.round(v.total * 100) / 100,
      percentage: grand > 0 ? Math.round((v.total / grand) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Real spend for the period, ranked by category. Transactions with no
 * linked expense (so no category) are grouped under "Uncategorized" rather
 * than dropped, so the ranking still accounts for the whole spend total.
 */
export function groupSpendByCategory(
  transactions: ReportTransaction[],
  targetCurrency: CurrencyCode,
  customCategories: CustomCategoryItem[] = []
): ReportRankedRow[] {
  const totals = new Map<string, { name: string; total: number }>();

  for (const t of transactions) {
    if (!isRealSpend(t)) continue;
    const converted = convertCurrency(t.amount, t.currency || 'EUR', targetCurrency);
    const key = t.category || 'uncategorized';
    const name = t.category ? getCategoryMeta(t.category, customCategories).name : 'Uncategorized';
    const existing = totals.get(key) || { name, total: 0 };
    existing.total += converted;
    totals.set(key, existing);
  }

  return ranked(totals);
}

/**
 * Real spend for the period, ranked by vendor/merchant — the first place
 * vendor-level spend is aggregated anywhere in Tally. The label is whatever
 * the transaction resolved to server-side (linked expense's vendor/name,
 * linked income's name, or the transfer's own external label).
 */
export function groupSpendByVendor(
  transactions: ReportTransaction[],
  targetCurrency: CurrencyCode
): ReportRankedRow[] {
  const totals = new Map<string, { name: string; total: number }>();

  for (const t of transactions) {
    if (!isRealSpend(t)) continue;
    const converted = convertCurrency(t.amount, t.currency || 'EUR', targetCurrency);
    const existing = totals.get(t.label) || { name: t.label, total: 0 };
    existing.total += converted;
    totals.set(t.label, existing);
  }

  return ranked(totals);
}
