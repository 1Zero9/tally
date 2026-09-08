import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { askAboutHouseholdData, isAiConfigured } from '@/src/lib/ai';
import { getMonthlyEquivalent } from '@/src/utils/calculations';
import type { BillingCycle } from '@/src/types/expense';
import { HELP_GUIDE_SECTIONS } from '@/src/data/helpGuide';
import { classifyQuestion, lookupKbAnswer, bumpKbHit, rememberKbAnswer } from '@/src/lib/assistantKb';

export async function POST(request: Request) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  if (!isAiConfigured()) {
    return NextResponse.json(
      { status: 'error', message: 'The AI assistant is not set up yet. Ask an admin to add a GOOGLE_AI_API_KEY.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const question = (body.question || '').trim();
    if (!question) {
      return NextResponse.json(
        { status: 'error', message: 'Please ask a question.' },
        { status: 400 }
      );
    }
    if (question.length > 500) {
      return NextResponse.json(
        { status: 'error', message: 'Question is too long.' },
        { status: 400 }
      );
    }

    // App-usage ("how do I…") answers don't depend on live figures, so a
    // previously-vetted answer to the same question is reused straight from
    // the internal KB — no model call. Money questions are never cached.
    const kind = classifyQuestion(question);
    if (kind === 'help') {
      const hit = await lookupKbAnswer(auth.user.householdId, question);
      if (hit) {
        void bumpKbHit(hit.id);
        return NextResponse.json({ status: 'ok', answer: hit.answer, cached: true, kind });
      }
    }

    const expenses = await prisma.expense.findMany({
      where: { householdId: auth.user.householdId, isPending: false },
      select: {
        name: true,
        amount: true,
        currency: true,
        billingCycle: true,
        category: true,
        renewalDay: true,
        nextRenewalDate: true,
        isPaidThisCycle: true,
        isActive: true,
        paymentMethod: true,
        usageRating: true,
        isVariable: true,
      },
    });

    const incomes = await prisma.income.findMany({
      where: { householdId: auth.user.householdId },
      select: {
        name: true,
        amount: true,
        currency: true,
        frequency: true,
        category: true,
        isActive: true,
      },
    });

    const expenseContext = expenses.map((e) => ({
      ...e,
      monthlyEquivalent: Math.round(getMonthlyEquivalent(e.amount, e.billingCycle as BillingCycle) * 100) / 100,
    }));

    const incomeContext = incomes.map((i) => ({
      ...i,
      monthlyEquivalent: Math.round(getMonthlyEquivalent(i.amount, i.frequency as BillingCycle) * 100) / 100,
    }));

    const monthlyIncome = incomeContext.filter((i) => i.isActive).reduce((s, i) => s + i.monthlyEquivalent, 0);
    const monthlyExpenses = expenseContext.filter((e) => e.isActive).reduce((s, e) => s + e.monthlyEquivalent, 0);

    const context = {
      expenses: expenseContext,
      income: incomeContext,
      summary: {
        monthlyIncome: Math.round(monthlyIncome * 100) / 100,
        monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
        netMonthly: Math.round((monthlyIncome - monthlyExpenses) * 100) / 100,
      },
    };

    const helpGuide = HELP_GUIDE_SECTIONS
      .filter((s) => !s.adminOnly || auth.user.role === 'ADMIN')
      .map((s) => ({ topic: s.title, details: s.body }));

    const answer = await askAboutHouseholdData(question, context, helpGuide);

    if (kind === 'help') {
      void rememberKbAnswer(auth.user.householdId, auth.user.id, question, answer);
    }

    return NextResponse.json({ status: 'ok', answer, cached: false, kind });
  } catch (error: unknown) {
    console.error('Assistant ask failed:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to get an answer right now') },
      { status: 500 }
    );
  }
}
