import type { ExpenseCategory, ExpenseItem, SpendingSummary, CurrencyCode, IncomeItem, IncomeSummary, CustomCategoryItem } from '../types/expense';
import { CURRENCIES } from './currencies';
import { getCategoryMeta } from '../data/categories';

/**
 * The amount an expense actually counts as, for every spend total/budget/
 * category breakdown in the app: the full amount until a reimbursement is
 * actually received (the money is genuinely out of pocket until then), then
 * just the net cost afterward. Structurally typed (not ExpenseItem-specific)
 * so it works against raw Prisma Expense rows server-side too, with no cast.
 * Deliberately not applied to forward-looking "what's due" figures (a claim
 * hasn't happened yet) or to a single row's own displayed amount (which
 * always shows what was actually charged, like a bank statement would).
 */
export function getEffectiveAmount(item: { amount: number; reimbursementReceived?: number | null }): number {
  if (item.reimbursementReceived != null && item.reimbursementReceived > 0) {
    return Math.max(0, item.amount - item.reimbursementReceived);
  }
  return item.amount;
}

/**
 * Normalizes any billing cycle into a monthly cost.
 */
export function getMonthlyEquivalent(amount: number, cycle: ExpenseItem['billingCycle']): number {
  switch (cycle) {
    case 'once':
      // A single one-off payment isn't a recurring monthly commitment,
      // so it's excluded from the recurring monthly/annual run-rate.
      return 0;
    case 'weekly':
      return (amount * 52) / 12;
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'termly':
      return (amount * 3) / 12; // 3 terms a year
    case 'annual':
      return amount / 12;
    default:
      return amount;
  }
}

/**
 * Normalizes any billing cycle into an annual cost.
 */
export function getAnnualEquivalent(amount: number, cycle: ExpenseItem['billingCycle']): number {
  return getMonthlyEquivalent(amount, cycle) * 12;
}

/**
 * Converts an amount from one currency to target currency relative to EUR.
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode = 'EUR',
  to: CurrencyCode = 'EUR'
): number {
  if (from === to) return amount;
  const fromRate = CURRENCIES[from]?.rateAgainstEUR || 1.0;
  const toRate = CURRENCIES[to]?.rateAgainstEUR || 1.0;

  // Convert to EUR base, then to target
  const inEUR = amount / fromRate;
  return inEUR * toRate;
}

/**
 * Computes complete analytics summary for all items.
 */
export function calculateSpendingSummary(
  expenses: ExpenseItem[],
  displayCurrency: CurrencyCode = 'EUR',
  customCategories: CustomCategoryItem[] = []
): SpendingSummary {
  let monthlyTotal = 0;
  let activeCount = 0;
  let pausedCount = 0;
  let pausedMonthlySavings = 0;

  const categoryTotals: Record<string, number> = {
    entertainment: 0,
    'ai-tech': 0,
    utilities: 0,
    housing: 0,
    education: 0,
    lifestyle: 0,
    shopping: 0,
    'big-ticket': 0,
    insurance: 0,
  };

  expenses.forEach((item) => {
    // Convert item amount to selected display currency
    const amountInDisplay = convertCurrency(getEffectiveAmount(item), item.currency, displayCurrency);
    const monthlyAmount = getMonthlyEquivalent(amountInDisplay, item.billingCycle);

    if (item.isActive) {
      activeCount += 1;
      monthlyTotal += monthlyAmount;
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + monthlyAmount;
    } else {
      pausedCount += 1;
      pausedMonthlySavings += monthlyAmount;
    }
  });

  const annualTotal = monthlyTotal * 12;
  const weeklyTotal = (monthlyTotal * 12) / 52;
  const dailyAverage = monthlyTotal / 30.4375;

  // Find top category
  let topCategory: SpendingSummary['topCategory'] = null;
  let maxSpend = 0;

  Object.entries(categoryTotals).forEach(([catKey, amount]) => {
    const cat = catKey as ExpenseCategory;
    if (amount > maxSpend) {
      maxSpend = amount;
      const pct = monthlyTotal > 0 ? (amount / monthlyTotal) * 100 : 0;
      topCategory = {
        category: cat,
        name: getCategoryMeta(cat, customCategories).name,
        amount,
        percentage: Math.round(pct * 10) / 10,
      };
    }
  });

  return {
    monthlyTotal,
    annualTotal,
    weeklyTotal,
    dailyAverage,
    activeCount,
    pausedCount,
    pausedMonthlySavings,
    topCategory,
    aiTechMonthly: categoryTotals['ai-tech'],
    utilitiesMonthly: categoryTotals['utilities'],
    streamingMonthly: categoryTotals['entertainment'],
    housingMonthly: categoryTotals['housing'],
    educationMonthly: categoryTotals['education'],
    lifestyleMonthly: categoryTotals['lifestyle'],
    shoppingMonthly: categoryTotals['shopping'],
  };
}

/**
 * Computes total household income, normalized to monthly/annual figures.
 */
export function calculateIncomeSummary(
  incomes: IncomeItem[],
  displayCurrency: CurrencyCode = 'EUR'
): IncomeSummary {
  let monthlyTotal = 0;
  let activeCount = 0;

  incomes.forEach((item) => {
    if (!item.isActive) return;
    const amountInDisplay = convertCurrency(item.amount, item.currency, displayCurrency);
    monthlyTotal += getMonthlyEquivalent(amountInDisplay, item.frequency);
    activeCount += 1;
  });

  return {
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    activeCount,
  };
}

/**
 * Calculates days remaining until the next renewal.
 */
export function getDaysUntilRenewal(renewalDateStr: string, cycle?: ExpenseItem['billingCycle']): number {
  if (!renewalDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = renewalDateStr.split('-').map(Number);
  let renewal = new Date(year, month - 1, day);
  renewal.setHours(0, 0, 0, 0);

  // One-off payments have a fixed date that never recurs, so if it's in
  // the past we report the real (negative) day count instead of rolling
  // it forward to a fictional future month.
  if (cycle === 'once') {
    const diffTime = renewal.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // If renewal date is in the past, roll forward to next month/cycle
  if (renewal < today) {
    renewal = new Date(today.getFullYear(), today.getMonth(), day);
    if (renewal < today) {
      renewal = new Date(today.getFullYear(), today.getMonth() + 1, day);
    }
  }

  const diffTime = renewal.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
