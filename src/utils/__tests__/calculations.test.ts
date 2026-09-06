import { describe, it, expect } from 'vitest';
import { getEffectiveAmount, getMonthlyEquivalent, getMonthlyContribution } from '../calculations';

describe('getEffectiveAmount', () => {
  it('returns the full amount when no reimbursement is set', () => {
    expect(getEffectiveAmount({ amount: 60 })).toBe(60);
  });

  it('returns the full amount while a reimbursement is only expected, not received', () => {
    expect(getEffectiveAmount({ amount: 60, reimbursementReceived: null })).toBe(60);
  });

  it('subtracts a received reimbursement to get the net cost', () => {
    expect(getEffectiveAmount({ amount: 60, reimbursementReceived: 45 })).toBe(15);
  });

  it('clamps at 0 rather than going negative if the reimbursement exceeds the amount', () => {
    expect(getEffectiveAmount({ amount: 60, reimbursementReceived: 100 })).toBe(0);
  });

  it('ignores a zero or negative reimbursementReceived (treats as not received)', () => {
    expect(getEffectiveAmount({ amount: 60, reimbursementReceived: 0 })).toBe(60);
  });
});

describe('getMonthlyEquivalent (unchanged: pure recurring rate, date-independent)', () => {
  it('still returns 0 for a one-off, regardless of date', () => {
    expect(getMonthlyEquivalent(500, 'once')).toBe(0);
  });

  it('returns the amount unchanged for monthly', () => {
    expect(getMonthlyEquivalent(50, 'monthly')).toBe(50);
  });
});

describe('getMonthlyContribution', () => {
  const referenceDate = new Date(2026, 8, 15); // 2026-09-15

  it('a recurring bill contributes its steady-state rate regardless of its own date', () => {
    const item = { amount: 60, billingCycle: 'monthly' as const, nextRenewalDate: '2026-01-01' };
    expect(getMonthlyContribution(item, referenceDate)).toBe(60);
  });

  it('a one-off dated in the current month contributes its full amount', () => {
    const item = { amount: 210, billingCycle: 'once' as const, nextRenewalDate: '2026-09-03' };
    expect(getMonthlyContribution(item, referenceDate)).toBe(210);
  });

  it('a one-off dated in a past month contributes nothing', () => {
    const item = { amount: 210, billingCycle: 'once' as const, nextRenewalDate: '2026-08-30' };
    expect(getMonthlyContribution(item, referenceDate)).toBe(0);
  });

  it('a one-off dated in a future month contributes nothing yet', () => {
    const item = { amount: 210, billingCycle: 'once' as const, nextRenewalDate: '2026-10-01' };
    expect(getMonthlyContribution(item, referenceDate)).toBe(0);
  });

  it('a one-off in the current month, exactly on the month boundary (the 1st), still counts', () => {
    const item = { amount: 100, billingCycle: 'once' as const, nextRenewalDate: '2026-09-01' };
    expect(getMonthlyContribution(item, referenceDate)).toBe(100);
  });

  it('a one-off in the current month, on the last day, still counts', () => {
    const item = { amount: 100, billingCycle: 'once' as const, nextRenewalDate: '2026-09-30' };
    expect(getMonthlyContribution(item, referenceDate)).toBe(100);
  });

  it('nets off a received reimbursement on a one-off dated this month', () => {
    const item = { amount: 60, billingCycle: 'once' as const, nextRenewalDate: '2026-09-03', reimbursementReceived: 45 };
    expect(getMonthlyContribution(item, referenceDate)).toBe(15);
  });

  it('a one-off dated a different month still contributes 0 even with a reimbursement on record', () => {
    const item = { amount: 60, billingCycle: 'once' as const, nextRenewalDate: '2026-08-03', reimbursementReceived: 45 };
    expect(getMonthlyContribution(item, referenceDate)).toBe(0);
  });

  it('nets off a received reimbursement on a recurring bill too', () => {
    const item = { amount: 60, billingCycle: 'monthly' as const, nextRenewalDate: '2026-01-01', reimbursementReceived: 45 };
    expect(getMonthlyContribution(item, referenceDate)).toBe(15);
  });

  it('a pending (not-yet-received) reimbursement does not reduce the contribution', () => {
    const item = { amount: 60, billingCycle: 'once' as const, nextRenewalDate: '2026-09-03', reimbursementExpected: 45 };
    expect(getMonthlyContribution(item, referenceDate)).toBe(60);
  });
});
