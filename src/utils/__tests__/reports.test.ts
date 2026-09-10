import { describe, it, expect } from 'vitest';
import { bucketTransactionsByMonth, groupSpendByCategory, groupSpendByVendor, groupCategoryMerchantTrend, canonicalMerchant, isRealSpend, isRealIncome, type ReportTransaction } from '../reports';

function tx(overrides: Partial<ReportTransaction>): ReportTransaction {
  return {
    id: Math.random().toString(36),
    date: '2026-09-10',
    amount: 100,
    currency: 'EUR',
    direction: 'out',
    label: 'Test vendor',
    category: null,
    fromAccount: null,
    toAccount: null,
    ...overrides,
  };
}

describe('isRealSpend / isRealIncome', () => {
  it('treats only "out" as spend and only "in" as income', () => {
    expect(isRealSpend(tx({ direction: 'out' }))).toBe(true);
    expect(isRealSpend(tx({ direction: 'in' }))).toBe(false);
    expect(isRealSpend(tx({ direction: 'internal' }))).toBe(false);
    expect(isRealIncome(tx({ direction: 'in' }))).toBe(true);
    expect(isRealIncome(tx({ direction: 'out' }))).toBe(false);
    expect(isRealIncome(tx({ direction: 'internal' }))).toBe(false);
  });
});

describe('bucketTransactionsByMonth', () => {
  it('sums spend and income per month and excludes internal transfers', () => {
    const transactions = [
      tx({ date: '2026-09-01', amount: 50, direction: 'out' }),
      tx({ date: '2026-09-15', amount: 30, direction: 'out' }),
      tx({ date: '2026-09-20', amount: 200, direction: 'in' }),
      tx({ date: '2026-09-25', amount: 999, direction: 'internal', fromAccount: { id: 'a', name: 'A' }, toAccount: { id: 'b', name: 'B' } }),
      tx({ date: '2026-08-01', amount: 10, direction: 'out' }),
    ];

    const months = bucketTransactionsByMonth(transactions, 'EUR');
    const sep = months.find((m) => m.month === '2026-09');
    const aug = months.find((m) => m.month === '2026-08');

    expect(sep?.spending).toBe(80);
    expect(sep?.income).toBe(200);
    expect(aug?.spending).toBe(10);
  });

  it('converts currency before summing', () => {
    const transactions = [tx({ amount: 100, currency: 'USD', direction: 'out' })];
    const months = bucketTransactionsByMonth(transactions, 'EUR');
    expect(months[0].spending).not.toBe(100);
    expect(months[0].spending).toBeGreaterThan(0);
  });
});

describe('groupSpendByCategory', () => {
  it('ranks categories descending and groups category-less spend as transfers out', () => {
    const transactions = [
      tx({ amount: 60, direction: 'out', category: 'utilities' }),
      tx({ amount: 40, direction: 'out', category: 'utilities' }),
      tx({ amount: 50, direction: 'out', category: null }),
      tx({ amount: 500, direction: 'in', category: 'utilities' }),
    ];
    const rows = groupSpendByCategory(transactions, 'EUR');
    expect(rows[0].key).toBe('utilities');
    expect(rows[0].total).toBe(100);
    expect(rows.find((r) => r.key === 'transfers-out')?.total).toBe(50);
    const totalPct = rows.reduce((sum, r) => sum + r.percentage, 0);
    expect(Math.round(totalPct)).toBe(100);
  });
});

describe('groupSpendByVendor', () => {
  it('ranks vendors by total spend, ignoring income and internal transfers', () => {
    const transactions = [
      tx({ amount: 20, direction: 'out', label: 'Netflix' }),
      tx({ amount: 15.99, direction: 'out', label: 'Netflix' }),
      tx({ amount: 200, direction: 'out', label: 'Landlord' }),
      tx({ amount: 1000, direction: 'in', label: 'Employer' }),
    ];
    const rows = groupSpendByVendor(transactions, 'EUR');
    expect(rows[0].name).toBe('Landlord');
    expect(rows[0].total).toBe(200);
    expect(rows.find((r) => r.name === 'Netflix')?.total).toBeCloseTo(35.99, 2);
    expect(rows.find((r) => r.name === 'Employer')).toBeUndefined();
  });
});

describe('canonicalMerchant', () => {
  it('collapses messy store labels to one canonical name', () => {
    expect(canonicalMerchant('TESCO STORES 3538 DUBLIN')).toBe('Tesco');
    expect(canonicalMerchant('tesco-express-6244')).toBe('Tesco');
    expect(canonicalMerchant('SUPERVALU KILLARNEY')).toBe('SuperValu');
    expect(canonicalMerchant('LIDL GL IRL DUBLIN 4')).toBe('Lidl');
  });

  it('keeps a cleaned label for unknown merchants rather than merging them', () => {
    expect(canonicalMerchant('THE LOCAL DELI')).toBe('The Local Deli');
    expect(canonicalMerchant('THE LOCAL CAFE')).not.toBe(canonicalMerchant('THE LOCAL DELI'));
  });
});

describe('groupCategoryMerchantTrend', () => {
  const rows: ReportTransaction[] = [
    tx({ date: '2026-09-01', amount: 40, category: 'shopping', label: 'LIDL DUBLIN' }),
    tx({ date: '2026-09-02', amount: 43, category: 'shopping', label: 'SUPERVALU KILLARNEY' }),
    tx({ date: '2026-09-03', amount: 47, category: 'shopping', label: 'SUPERVALU KILLARNEY' }),
    tx({ date: '2026-09-15', amount: 50, category: 'shopping', label: 'SUPERVALU KILLARNEY' }),
    tx({ date: '2026-09-16', amount: 30, category: 'shopping', label: 'SUPERVALU KILLARNEY' }),
    tx({ date: '2026-09-10', amount: 999, category: 'utilities', label: 'ESB' }),
    tx({ date: '2026-09-10', amount: 999, direction: 'in', category: 'shopping', label: 'Refund' }),
  ];

  it('splits one category by merchant with per-merchant trip counts', () => {
    const res = groupCategoryMerchantTrend(rows, 'shopping', 'week', 'EUR');
    const supervalu = res.merchants.find((m) => m.name === 'SuperValu');
    const lidl = res.merchants.find((m) => m.name === 'Lidl');

    expect(res.merchants[0].name).toBe('SuperValu'); // ranked by total
    expect(supervalu?.tripCount).toBe(4);
    expect(supervalu?.total).toBe(170);
    expect(supervalu?.avgBasket).toBe(42.5);
    expect(lidl?.tripCount).toBe(1);
    expect(lidl?.total).toBe(40);
    expect(res.tripCount).toBe(5); // income + other category excluded
    expect(res.total).toBe(210);
  });

  it('buckets by week and stacks merchants inside each bucket', () => {
    const res = groupCategoryMerchantTrend(rows, 'shopping', 'week', 'EUR');
    expect(res.points.length).toBe(2);
    const wk1 = res.points[0];
    expect(wk1.tripCount).toBe(3);
    expect(wk1.byMerchant['Lidl'].tripCount).toBe(1);
    expect(wk1.byMerchant['SuperValu'].tripCount).toBe(2);
  });

  it('returns an empty result for a category with no spend', () => {
    const res = groupCategoryMerchantTrend(rows, 'travel', 'month', 'EUR');
    expect(res.points).toEqual([]);
    expect(res.merchants).toEqual([]);
    expect(res.total).toBe(0);
  });
});
