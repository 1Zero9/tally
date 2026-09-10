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
  it('flags matching recurring bills whatever their source', () => {
    const fromImports = groupPossibleDuplicates([
      base({ statementImportId: 'jan' }),
      base({ statementImportId: 'feb' }),
      base({ statementImportId: 'mar' }),
    ]);
    expect(fromImports).toHaveLength(1);
    expect(fromImports[0].items).toHaveLength(3);

    // Three added in one review session from a single import — the case
    // the old "needs more than one source" rule used to miss.
    expect(groupPossibleDuplicates([
      base({ statementImportId: 'jan' }),
      base({ statementImportId: 'jan' }),
      base({ statementImportId: 'jan' }),
    ])).toHaveLength(1);

    // Manual + imported, and manual + manual.
    expect(groupPossibleDuplicates([base({}), base({ statementImportId: 'jan' })])).toHaveLength(1);
    expect(groupPossibleDuplicates([base({}), base({})])).toHaveLength(1);
  });

  it('keeps different amounts / cycles apart', () => {
    const groups = groupPossibleDuplicates([
      base({ statementImportId: 'jan', amount: 79 }),
      base({ statementImportId: 'feb', amount: 82 }),
    ]);
    expect(groups).toHaveLength(0);
  });

  it('does not flag same-price one-offs on different days as duplicates', () => {
    const groups = groupPossibleDuplicates([
      base({ name: 'Starbucks', amount: 4.5, billingCycle: 'once', nextRenewalDate: '2026-07-02', statementImportId: 'jul' }),
      base({ name: 'Starbucks', amount: 4.5, billingCycle: 'once', nextRenewalDate: '2026-07-09', statementImportId: 'jul' }),
      base({ name: 'Starbucks', amount: 4.5, billingCycle: 'once', nextRenewalDate: '2026-08-01', statementImportId: 'aug' }),
    ]);
    expect(groups).toHaveLength(0);
  });

  it('does flag a same-date one-off pulled from two overlapping imports', () => {
    const groups = groupPossibleDuplicates([
      base({ name: 'Starbucks', amount: 4.5, billingCycle: 'once', nextRenewalDate: '2026-07-02', statementImportId: 'jul-a' }),
      base({ name: 'Starbucks', amount: 4.5, billingCycle: 'once', nextRenewalDate: '2026-07-02', statementImportId: 'jul-b' }),
    ]);
    expect(groups).toHaveLength(1);
  });
});
