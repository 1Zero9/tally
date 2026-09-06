import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { getMonthlyEquivalent, getEffectiveAmount } from '@/src/utils/calculations';
import { rolloverIfDue } from '@/src/lib/billing';
import { getCategoryMeta } from '@/src/data/categories';
import type { BillingCycle } from '@/src/types/expense';

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = dateStr.split('-').map(Number);
  const due = new Date(year, (month || 1) - 1, day || 1);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET() {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const expenses = await prisma.expense.findMany({
      where: { householdId: auth.user.householdId },
    });

    const incomes = await prisma.income.findMany({
      where: { householdId: auth.user.householdId },
    });

    const customCategories = await prisma.category.findMany({
      where: { householdId: auth.user.householdId },
    });

    // Planned/pending expenses stand alone and must not affect any figures here.
    const liveExpenses = expenses.filter((e) => !e.isPending);
    const active = liveExpenses.filter((e) => e.isActive);

    // Most bills here are direct debit — they leave the account automatically.
    // What matters isn't "paid/overdue", it's "what's coming, and when".
    // Compute the true next due date (without persisting) so the forecast is accurate
    // even if nobody has opened the ledger in a while.
    const withNextDue = active.map((e) => {
      const rollover = rolloverIfDue({
        nextRenewalDate: e.nextRenewalDate,
        billingCycle: e.billingCycle as BillingCycle,
        isPaidThisCycle: e.isPaidThisCycle,
      });
      return { ...e, nextDueDate: rollover.nextRenewalDate };
    });

    const monthlyTotal = active.reduce(
      (sum, e) => sum + getMonthlyEquivalent(getEffectiveAmount(e), e.billingCycle as BillingCycle),
      0
    );

    const toForecastItem = (e: (typeof withNextDue)[number]) => ({
      id: e.id,
      name: e.name,
      amount: e.amount,
      currency: e.currency,
      dueDate: e.nextDueDate,
      daysUntil: daysUntil(e.nextDueDate),
      paymentMethod: e.paymentMethod,
    });

    const next7Days = withNextDue
      .filter((e) => daysUntil(e.nextDueDate) >= 0 && daysUntil(e.nextDueDate) <= 7)
      .map(toForecastItem)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    const next30Days = withNextDue
      .filter((e) => daysUntil(e.nextDueDate) >= 0 && daysUntil(e.nextDueDate) <= 30)
      .map(toForecastItem)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    const categoryTotals: Record<string, number> = {};
    active.forEach((e) => {
      const monthly = getMonthlyEquivalent(getEffectiveAmount(e), e.billingCycle as BillingCycle);
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + monthly;
    });

    const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const topCategory = topCategoryEntry
      ? {
          category: topCategoryEntry[0],
          name: getCategoryMeta(topCategoryEntry[0], customCategories).name,
          monthlyAmount: topCategoryEntry[1],
          percentage: monthlyTotal > 0 ? Math.round((topCategoryEntry[1] / monthlyTotal) * 1000) / 10 : 0,
        }
      : null;

    // Savings opportunity: monthly-billed services with an amount worth switching to annual.
    const annualOpportunities = active
      .filter((e) => e.billingCycle === 'monthly' && getEffectiveAmount(e) > 8)
      .map((e) => {
        const effective = getEffectiveAmount(e);
        return { id: e.id, name: e.name, monthlyAmount: effective, estAnnualSavings: Math.round(effective * 2 * 100) / 100 };
      });
    const potentialAnnualSavings = annualOpportunities.reduce((sum, o) => sum + o.estAnnualSavings, 0);

    const pausedMonthlySavings = liveExpenses
      .filter((e) => !e.isActive)
      .reduce((sum, e) => sum + getMonthlyEquivalent(getEffectiveAmount(e), e.billingCycle as BillingCycle), 0);

    const activeIncomes = incomes.filter((i) => i.isActive);
    const monthlyIncome = activeIncomes.reduce(
      (sum, i) => sum + getMonthlyEquivalent(i.amount, i.frequency as BillingCycle),
      0
    );
    const netMonthly = monthlyIncome - monthlyTotal;

    return NextResponse.json({
      status: 'ok',
      insights: {
        monthlyTotal: Math.round(monthlyTotal * 100) / 100,
        annualTotal: Math.round(monthlyTotal * 12 * 100) / 100,
        activeCount: active.length,
        pausedCount: liveExpenses.length - active.length,
        pausedMonthlySavings: Math.round(pausedMonthlySavings * 100) / 100,
        next7Days,
        next7DaysTotal: Math.round(next7Days.reduce((s, o) => s + o.amount, 0) * 100) / 100,
        next30Days,
        next30DaysTotal: Math.round(next30Days.reduce((s, o) => s + o.amount, 0) * 100) / 100,
        topCategory,
        potentialAnnualSavings: Math.round(potentialAnnualSavings * 100) / 100,
        annualOpportunities,
        monthlyIncome: Math.round(monthlyIncome * 100) / 100,
        netMonthly: Math.round(netMonthly * 100) / 100,
        hasIncome: activeIncomes.length > 0,
      },
    });
  } catch (error: unknown) {
    console.error('Failed to compute insights:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to compute insights') },
      { status: 500 }
    );
  }
}
