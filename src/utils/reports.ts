import type { CurrencyCode, CustomCategoryItem } from '../types/expense';
import { getCategoryMeta } from '../data/categories';
import { normalizeDescription } from '../lib/statementMatching';
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
 * Real spend for the period, ranked by category. Every tracked bill/expense
 * carries a category, so anything that reaches here without one is money
 * out via an unlinked transfer (an ad-hoc "Log as transfer", or spend
 * logged straight off a statement). Those are grouped under "Transfers
 * out" — a movement of money, not an expense we failed to categorise —
 * rather than dropped, so the ranking still accounts for the whole total.
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
    const key = t.category || 'transfers-out';
    const name = t.category ? getCategoryMeta(t.category, customCategories).name : 'Transfers out';
    const existing = totals.get(key) || { name, total: 0 };
    existing.total += converted;
    totals.set(key, existing);
  }

  return ranked(totals);
}

/* ------------------------------------------------------------------ *
 * Category trend — one category, split by merchant, over time.
 * "You did 1 shop in Lidl for €40, but 10 shops in SuperValu for €430."
 * ------------------------------------------------------------------ */

/**
 * Canonical merchant names for the messy raw labels that ad-hoc "Log as
 * transfer" spend carries (`TESCO STORES 3538 DUBLIN`, `SUPERVALU-KILLARNEY`,
 * `LIDL GL IRL DUBLIN`). Each entry's `match` tokens are tested against the
 * normalized (uppercase, de-noised) label; first hit wins. Anything with no
 * hit keeps its own cleaned label, so nothing is silently merged.
 */
const MERCHANT_CANON: { name: string; match: string[] }[] = [
  { name: 'Tesco', match: ['TESCO'] },
  { name: 'Lidl', match: ['LIDL'] },
  { name: 'Aldi', match: ['ALDI'] },
  { name: 'SuperValu', match: ['SUPERVALU', 'SUPER VALU'] },
  { name: 'Dunnes Stores', match: ['DUNNES'] },
  { name: 'Marks & Spencer', match: ['MARKS SPENCER', 'M&S', 'MARKS AND SPENCER', 'MARKSSPENCER'] },
  { name: 'Centra', match: ['CENTRA'] },
  { name: 'SPAR', match: ['SPAR'] },
  { name: 'Applegreen', match: ['APPLEGREEN'] },
  { name: 'Circle K', match: ['CIRCLE K', 'CIRCLEK'] },
  { name: 'Iceland', match: ['ICELAND'] },
  { name: 'Boots', match: ['BOOTS'] },
  { name: 'Amazon', match: ['AMAZON', 'AMZN'] },
];

const TITLE_STOPWORDS = new Set(['THE', 'AND', 'FOR', 'OF', 'TO', 'AT', 'ON', 'IN']);

function titleCaseLabel(raw: string): string {
  const cleaned = (raw || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Unlabelled';
  return cleaned
    .split(' ')
    .map((w) => {
      // Keep short all-caps tokens as acronyms (M&S, IRL, ESB) but not
      // common English stopwords that just happen to be short.
      if (w.length <= 3 && w === w.toUpperCase() && !TITLE_STOPWORDS.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

/** Collapses a raw transaction label to a stable, human merchant name. */
export function canonicalMerchant(label: string): string {
  const norm = normalizeDescription(label || '');
  for (const m of MERCHANT_CANON) {
    if (m.match.some((token) => norm.includes(token))) return m.name;
  }
  return titleCaseLabel(label);
}

export type TrendBucket = 'week' | 'month';

export interface CategoryTrendPoint {
  key: string;
  label: string;
  total: number;
  tripCount: number;
  byMerchant: Record<string, { total: number; tripCount: number }>;
}

export interface CategoryMerchantStat {
  name: string;
  total: number;
  tripCount: number;
  avgBasket: number;
  sharePct: number;
  firstHalfPerBucket: number;
  secondHalfPerBucket: number;
  changePct: number | null;
}

export interface CategoryTrendResult {
  points: CategoryTrendPoint[];
  merchants: CategoryMerchantStat[];
  total: number;
  tripCount: number;
  bucketCount: number;
}

/** Monday-anchored ISO week key + a short "6 Sep" style label. */
function weekBucket(dateStr: string): { key: string; label: string } {
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sun
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  const key = d.toISOString().slice(0, 10);
  const label = `${d.getUTCDate()} ${MONTH_LABELS[d.getUTCMonth()]}`;
  return { key, label };
}

/**
 * One category's real spend, split by canonical merchant, bucketed by week
 * or month. Every bucket carries both a euro total and a trip count per
 * merchant, so the UI can show that a handful of big shops at one store can
 * outweigh many small ones elsewhere (or vice versa). Internal transfers and
 * income are excluded, same as every other report here.
 */
export function groupCategoryMerchantTrend(
  transactions: ReportTransaction[],
  categoryId: string,
  bucket: TrendBucket,
  targetCurrency: CurrencyCode
): CategoryTrendResult {
  const rows = transactions.filter((t) => isRealSpend(t) && t.category === categoryId);

  const pointMap = new Map<string, CategoryTrendPoint>();
  const merchantTotals = new Map<string, { total: number; tripCount: number }>();

  for (const t of rows) {
    const converted = convertCurrency(t.amount, t.currency || 'EUR', targetCurrency);
    const merchant = canonicalMerchant(t.label);
    const b = bucket === 'week' ? weekBucket(t.date) : { key: monthKey(t.date), label: monthLabel(monthKey(t.date)) };

    let point = pointMap.get(b.key);
    if (!point) {
      point = { key: b.key, label: b.label, total: 0, tripCount: 0, byMerchant: {} };
      pointMap.set(b.key, point);
    }
    point.total += converted;
    point.tripCount += 1;
    const pm = point.byMerchant[merchant] || { total: 0, tripCount: 0 };
    pm.total += converted;
    pm.tripCount += 1;
    point.byMerchant[merchant] = pm;

    const mt = merchantTotals.get(merchant) || { total: 0, tripCount: 0 };
    mt.total += converted;
    mt.tripCount += 1;
    merchantTotals.set(merchant, mt);
  }

  const points = Array.from(pointMap.values()).sort((a, b) => a.key.localeCompare(b.key));
  const bucketCount = points.length;
  const grandTotal = points.reduce((sum, p) => sum + p.total, 0);
  const grandTrips = points.reduce((sum, p) => sum + p.tripCount, 0);

  // Split the timeline in half to give each merchant a crude direction of travel.
  const midKey = bucketCount > 1 ? points[Math.floor(bucketCount / 2)].key : null;
  const firstBuckets = midKey ? points.filter((p) => p.key < midKey) : [];
  const secondBuckets = midKey ? points.filter((p) => p.key >= midKey) : points;

  const sumHalf = (buckets: CategoryTrendPoint[], name: string) =>
    buckets.reduce((sum, p) => sum + (p.byMerchant[name]?.total || 0), 0);

  const merchants: CategoryMerchantStat[] = Array.from(merchantTotals.entries())
    .map(([name, v]) => {
      const firstPerBucket = firstBuckets.length ? sumHalf(firstBuckets, name) / firstBuckets.length : 0;
      const secondPerBucket = secondBuckets.length ? sumHalf(secondBuckets, name) / secondBuckets.length : 0;
      const changePct = firstPerBucket > 0
        ? Math.round(((secondPerBucket - firstPerBucket) / firstPerBucket) * 1000) / 10
        : null;
      return {
        name,
        total: Math.round(v.total * 100) / 100,
        tripCount: v.tripCount,
        avgBasket: v.tripCount > 0 ? Math.round((v.total / v.tripCount) * 100) / 100 : 0,
        sharePct: grandTotal > 0 ? Math.round((v.total / grandTotal) * 1000) / 10 : 0,
        firstHalfPerBucket: Math.round(firstPerBucket * 100) / 100,
        secondHalfPerBucket: Math.round(secondPerBucket * 100) / 100,
        changePct,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    points,
    merchants,
    total: Math.round(grandTotal * 100) / 100,
    tripCount: grandTrips,
    bucketCount,
  };
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
