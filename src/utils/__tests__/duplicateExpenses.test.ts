import { describe, it, expect } from 'vitest';
import { groupPossibleDuplicates } from '../duplicateExpenses';
import type { ExpenseItem } from '../../types/expense';

const base = (over: Partial<ExpenseItem>): ExpenseItem => ({
  id: Math.random().toString(36).slice(2),
  name: 'Sky Digital',
  amount: 79,
  currency: 'EUR',
  billingCycle: 'monthly',
  category: 'entertainment',
  icon: 'Tv',
  color: '#000',
  renewalDay: 2,
  nextRenewalDate: '2026-10-02',
  isPaidThisCycle: false,
  paymentMethod: 'SEPA Direct Debit',
  isActive: true,
  ...over,
});

describe('groupPossibleDuplicates', () => {
  it('flags same name+amount+cycle from different imports', () => {
    const groups = groupPossibleDuplicates([
      base({ statementImportId: 'jan' }),
      base({ statementImportId: 'feb' }),
      base({ statementImportId: 'mar' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(3);
  });

  it('does not flag two identical bills from the same single import', () => {
    const groups = groupPossibleDuplicates([
      base({ statementImportId: 'jan' }),
      base({ statementImportId: 'jan' }),
    ]);
    expect(groups).toHaveLength(0);
  });

  it('does not flag two identical bills both entered manually', () => {
    const groups = groupPossibleDuplicates([base({}), base({})]);
    expect(groups).toHaveLength(0);
  });

  it('flags a manual + imported identical pair', () => {
    const groups = groupPossibleDuplicates([
      base({}),
      base({ statementImportId: 'jan' }),
    ]);
    expect(groups).toHaveLength(1);
  });

  it('keeps different amounts / cycles apart', () => {
    const groups = groupPossibleDuplicates([
      base({ statementImportId: 'jan', amount: 79 }),
      base({ statementImportId: 'feb', amount: 82 }),
    ]);
    expect(groups).toHaveLength(0);
  });
});
