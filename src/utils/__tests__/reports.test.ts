import { describe, it, expect } from 'vitest';
import { bucketTransactionsByMonth, groupSpendByCategory, groupSpendByVendor, isRealSpend, isRealIncome, type ReportTransaction } from '../reports';

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
  it('ranks categories descending and groups uncategorized spend', () => {
    const transactions = [
      tx({ amount: 60, direction: 'out', category: 'utilities' }),
      tx({ amount: 40, direction: 'out', category: 'utilities' }),
      tx({ amount: 50, direction: 'out', category: null }),
      tx({ amount: 500, direction: 'in', category: 'utilities' }),
    ];
    const rows = groupSpendByCategory(transactions, 'EUR');
    expect(rows[0].key).toBe('utilities');
    expect(rows[0].total).toBe(100);
    expect(rows.find((r) => r.key === 'uncategorized')?.total).toBe(50);
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
