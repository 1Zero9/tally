import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { analyzeMoneyFlow, isAiConfigured } from '@/src/lib/ai';
import { getMonthlyEquivalent, getMonthlyContribution } from '@/src/utils/calculations';
import type { BillingCycle } from '@/src/types/expense';

const ACCOUNT_SELECT = { id: true, name: true, type: true, institution: true } as const;

export async function POST() {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  if (!isAiConfigured()) {
    return NextResponse.json(
      { status: 'error', message: 'The AI assistant is not set up yet. Ask an admin to add a GOOGLE_AI_API_KEY.' },
      { status: 503 }
    );
  }

  try {
    const accounts = await prisma.account.findMany({
      where: { householdId: auth.user.householdId },
      select: {
        id: true,
        name: true,
        type: true,
        institution: true,
        currency: true,
        isActive: true,
        originalAmount: true,
        interestRate: true,
      },
    });

    const transfers = await prisma.transfer.findMany({
      where: { householdId: auth.user.householdId },
      orderBy: { date: 'desc' },
      take: 200,
      select: {
        amount: true,
        currency: true,
        date: true,
        note: true,
        externalLabel: true,
        fromAccount: { select: ACCOUNT_SELECT },
        toAccount: { select: ACCOUNT_SELECT },
        linkedExpense: { select: { id: true, name: true } },
        linkedIncome: { select: { id: true, name: true } },
      },
    });

    const goals = await prisma.goal.findMany({
      where: { householdId: auth.user.householdId, isActive: true },
      select: {
        name: true,
        targetAmount: true,
        currentAmount: true,
        currency: true,
        targetDate: true,
        linkedAccount: { select: { id: true, name: true } },
      },
    });

    const expenses = await prisma.expense.findMany({
      where: { householdId: auth.user.householdId, isActive: true, isPending: false },
      select: {
        name: true,
        amount: true,
        currency: true,
        billingCycle: true,
        category: true,
        renewalDay: true,
        nextRenewalDate: true,
        reimbursementReceived: true,
        paymentAccount: { select: { id: true, name: true } },
      },
    });

    const incomes = await prisma.income.findMany({
      where: { householdId: auth.user.householdId, isActive: true },
      select: {
        name: true,
        amount: true,
        currency: true,
        frequency: true,
        depositAccount: { select: { id: true, name: true } },
      },
    });

    const expenseContext = expenses.map((e) => ({
      ...e,
      monthlyEquivalent: Math.round(getMonthlyContribution({ ...e, billingCycle: e.billingCycle as BillingCycle }) * 100) / 100,
    }));

    const incomeContext = incomes.map((i) => ({
      ...i,
      monthlyEquivalent: Math.round(getMonthlyEquivalent(i.amount, i.frequency as BillingCycle) * 100) / 100,
    }));

    const context = {
      accounts,
      transfers,
      goals,
      recurringExpenses: expenseContext,
      recurringIncome: incomeContext,
    };

    const analysis = await analyzeMoneyFlow(context);

    return NextResponse.json({ status: 'ok', analysis });
  } catch (error: unknown) {
    console.error('Money-flow analysis failed:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to analyse money flow right now') },
      { status: 500 }
    );
  }
}
