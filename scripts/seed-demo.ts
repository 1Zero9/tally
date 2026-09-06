/**
 * Creates a completely separate "Demo Household" with rich, realistic data
 * across every feature area — accounts, bills, income, Flow transfers,
 * goals, budgets, a statement import, and a custom Money Map layout — so
 * the app can be shown to a spouse, a friend, or anyone else being asked
 * for feature feedback, without touching the real household's data at all.
 *
 * Deliberately NOT run automatically (not wired into postinstall or the
 * regular db:seed script) — this creates a second, independent Household
 * and User row, on demand, only when explicitly invoked:
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-demo.ts
 *
 * Safe to re-run: it always creates a brand-new Demo Household (never
 * touches the real one), so running it twice just leaves two demo
 * households behind rather than corrupting anything — delete the old one
 * from Admin -> Database Snapshots... actually there's no in-app "delete
 * household" yet, so re-running this script is really a one-time thing;
 * if you want to regenerate the demo, delete the previous Demo Household
 * directly (see the bottom of this file for the one-liner).
 */
import { PrismaClient, Role, AccountType } from '@prisma/client';
import { normalizeDescription, buildAliasPattern } from '../src/lib/statementMatching';

const prisma = new PrismaClient();

const DEMO_USER_EMAIL = 'onezeronine+demo@gmail.com';

function dateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

async function main() {
  console.log('Creating Demo Household...');

  const household = await prisma.household.create({
    data: { name: 'Demo Household (Showcase)' },
  });

  const user = await prisma.user.create({
    data: {
      email: DEMO_USER_EMAIL,
      name: 'Demo Admin',
      role: Role.ADMIN,
      householdId: household.id,
    },
  });

  const createdById = user.id;
  const householdId = household.id;

  // --- Accounts -------------------------------------------------------
  const checking = await prisma.account.create({
    data: {
      name: 'AIB Current Account', institution: 'AIB', type: AccountType.CHECKING, currency: 'EUR',
      balance: 3245.67, balanceAsOf: dateStr(0), householdId, createdById,
    },
  });
  const savings = await prisma.account.create({
    data: {
      name: 'AIB Savings', institution: 'AIB', type: AccountType.SAVINGS, currency: 'EUR',
      balance: 18400, balanceAsOf: dateStr(0), householdId, createdById,
    },
  });
  const creditCard = await prisma.account.create({
    data: {
      name: 'AIB Credit Card', institution: 'AIB', type: AccountType.CREDIT_CARD, currency: 'EUR',
      balance: 620.45, balanceAsOf: dateStr(0), householdId, createdById,
    },
  });
  const carLoan = await prisma.account.create({
    data: {
      name: 'Car Loan', institution: 'Credit Union', type: AccountType.LOAN, currency: 'EUR',
      balance: 7200, balanceAsOf: dateStr(0),
      originalAmount: 12000, interestRate: 6.5, termMonths: 60, payoffDate: dateStr(365 * 3),
      householdId, createdById,
    },
  });
  const revolut = await prisma.account.create({
    data: {
      name: 'Revolut', institution: 'Revolut', type: AccountType.DEBIT_CARD, currency: 'EUR',
      balance: 85.3, balanceAsOf: dateStr(0), householdId, createdById,
    },
  });
  console.log('Accounts created:', [checking, savings, creditCard, carLoan, revolut].map((a) => a.name).join(', '));

  // --- Custom category --------------------------------------------------
  const petCareCategory = await prisma.category.create({
    data: { name: 'Pet Care', icon: 'Dog', color: '#0E7490', bgColor: '#e7f5f8', borderColor: '#bfe3ea', householdId, createdById },
  });

  // --- Goals (create before the linked expense below) -------------------
  await prisma.goal.create({
    data: {
      name: 'Emergency Fund', targetAmount: 20000, currentAmount: 12000, currency: 'EUR',
      linkedAccountId: savings.id, householdId, createdById,
    },
  });
  await prisma.goal.create({
    data: {
      name: 'Summer Holiday', targetAmount: 3000, currentAmount: 1400, currency: 'EUR',
      targetDate: dateStr(150), householdId, createdById,
    },
  });
  const schoolFeesGoal = await prisma.goal.create({
    data: {
      name: 'School Fees Fund', targetAmount: 2550, currentAmount: 850, currency: 'EUR',
      notes: 'Saving termly towards the next school fees instalment', householdId, createdById,
    },
  });
  console.log('Goals created.');

  // --- Expenses (all 9 built-in categories + the custom one) -----------
  type ExpenseSeed = Parameters<typeof prisma.expense.create>[0]['data'];
  const expenseSeeds: ExpenseSeed[] = [
    { name: 'Netflix', vendor: 'Netflix', amount: 15.99, currency: 'EUR', billingCycle: 'monthly', category: 'entertainment', icon: 'Tv', color: '#F04E3E', renewalDay: 18, nextRenewalDate: dateStr(12), isPaidThisCycle: false, paymentMethod: 'Credit Card', usageRating: 'high', paymentAccountId: creditCard.id },
    { name: 'Spotify Family', vendor: 'Spotify', amount: 17.99, currency: 'EUR', billingCycle: 'monthly', category: 'entertainment', icon: 'Tv', color: '#F04E3E', renewalDay: 5, nextRenewalDate: dateStr(-1), isPaidThisCycle: true, lastPaidAt: new Date(), paymentMethod: 'Credit Card', usageRating: 'high', paymentAccountId: creditCard.id },
    { name: 'ChatGPT Plus', vendor: 'OpenAI', amount: 22.99, currency: 'EUR', billingCycle: 'monthly', category: 'ai-tech', icon: 'Bot', color: '#3155D9', renewalDay: 3, nextRenewalDate: dateStr(-3), isPaidThisCycle: true, lastPaidAt: new Date(), paymentMethod: 'Credit Card', usageRating: 'high', paymentAccountId: creditCard.id },
    { name: 'iCloud+ Storage', vendor: 'Apple', amount: 2.99, currency: 'EUR', billingCycle: 'monthly', category: 'ai-tech', icon: 'Bot', color: '#3155D9', renewalDay: 21, nextRenewalDate: dateStr(15), isPaidThisCycle: false, paymentMethod: 'Credit Card', usageRating: 'low', notes: 'Barely used since switching to Google Photos', paymentAccountId: creditCard.id },
    { name: 'Electricity (Energia)', vendor: 'Energia', amount: 145, currency: 'EUR', billingCycle: 'monthly', category: 'utilities', icon: 'Zap', color: '#1a3299', renewalDay: 8, nextRenewalDate: dateStr(2), isPaidThisCycle: false, paymentMethod: 'SEPA Direct Debit', usageRating: 'high', paymentAccountId: checking.id },
    { name: 'Broadband (Eir Fibre)', vendor: 'Eir', amount: 55, currency: 'EUR', billingCycle: 'monthly', category: 'utilities', icon: 'Zap', color: '#1a3299', renewalDay: 8, nextRenewalDate: dateStr(2), isPaidThisCycle: false, paymentMethod: 'SEPA Direct Debit', usageRating: 'high', paymentAccountId: checking.id },
    { name: 'Mobile (Three, x2 lines)', vendor: 'Three', amount: 40, currency: 'EUR', billingCycle: 'monthly', category: 'utilities', icon: 'Zap', color: '#1a3299', renewalDay: 15, nextRenewalDate: dateStr(9), isPaidThisCycle: false, paymentMethod: 'SEPA Direct Debit', usageRating: 'high', paymentAccountId: checking.id },
    { name: 'TV Licence', vendor: 'An Post', amount: 160, currency: 'EUR', billingCycle: 'annual', category: 'housing', icon: 'Home', color: '#676B73', renewalDay: 1, nextRenewalDate: dateStr(200), isPaidThisCycle: true, lastPaidAt: new Date(), paymentMethod: 'SEPA Direct Debit', usageRating: 'high', paymentAccountId: checking.id },
    { name: 'Mortgage', vendor: 'AIB', amount: 1450, currency: 'EUR', billingCycle: 'monthly', category: 'big-ticket', icon: 'Landmark', color: '#B45309', renewalDay: 1, nextRenewalDate: dateStr(-6), isPaidThisCycle: true, lastPaidAt: new Date(), paymentMethod: 'SEPA Direct Debit', usageRating: 'high', paymentAccountId: checking.id },
    { name: 'Car Loan Repayment', vendor: 'Credit Union', amount: 245, currency: 'EUR', billingCycle: 'monthly', category: 'big-ticket', icon: 'Landmark', color: '#B45309', renewalDay: 20, nextRenewalDate: dateStr(14), isPaidThisCycle: false, paymentMethod: 'Standing Order', usageRating: 'high', paymentAccountId: checking.id },
    { name: 'Car Insurance', vendor: 'AXA', amount: 680, currency: 'EUR', billingCycle: 'annual', category: 'insurance', icon: 'ShieldCheck', color: '#0E7490', renewalDay: 1, nextRenewalDate: dateStr(35), contractEndDate: dateStr(35), isPaidThisCycle: false, paymentMethod: 'Credit Card', usageRating: 'high', notes: 'Renews soon — worth shopping around', paymentAccountId: creditCard.id },
    { name: 'Motor Tax', vendor: 'NDLS', amount: 280, currency: 'EUR', billingCycle: 'annual', category: 'insurance', icon: 'ShieldCheck', color: '#0E7490', renewalDay: 1, nextRenewalDate: dateStr(80), isPaidThisCycle: false, paymentMethod: 'Debit Card', usageRating: 'high', paymentAccountId: checking.id },
    { name: 'School Fees', vendor: null, amount: 850, currency: 'EUR', billingCycle: 'termly', category: 'education', icon: 'GraduationCap', color: '#3155D9', renewalDay: 1, nextRenewalDate: dateStr(60), isPaidThisCycle: false, paymentMethod: 'Bank Transfer', usageRating: 'high', paymentAccountId: checking.id, linkedGoalId: schoolFeesGoal.id },
    { name: 'GAA Membership (Finn)', vendor: 'St. Vincent’s GAA', amount: 120, currency: 'EUR', billingCycle: 'annual', category: 'lifestyle', icon: 'Dumbbell', color: '#202124', renewalDay: 1, nextRenewalDate: dateStr(220), isPaidThisCycle: true, lastPaidAt: new Date(), paymentMethod: 'Cash', usageRating: 'high', paymentAccountId: null },
    { name: 'Swimming Lessons', vendor: null, amount: 60, currency: 'EUR', billingCycle: 'monthly', category: 'lifestyle', icon: 'Dumbbell', color: '#202124', renewalDay: 10, nextRenewalDate: dateStr(4), isPaidThisCycle: false, paymentMethod: 'Debit Card', usageRating: 'high', paymentAccountId: checking.id },
    { name: 'Gym Membership', vendor: null, amount: 45, currency: 'EUR', billingCycle: 'monthly', category: 'lifestyle', icon: 'Dumbbell', color: '#202124', renewalDay: 6, nextRenewalDate: dateStr(0), isPaidThisCycle: false, paymentMethod: 'Credit Card', usageRating: 'low', notes: 'Went twice since January', paymentAccountId: creditCard.id },
    { name: 'Groceries', vendor: null, amount: 620, currency: 'EUR', billingCycle: 'monthly', category: 'shopping', icon: 'ShoppingCart', color: '#8A5CF6', renewalDay: 1, nextRenewalDate: dateStr(-10), isPaidThisCycle: true, lastPaidAt: new Date(), paymentMethod: 'Debit Card', usageRating: 'high', isVariable: true, paymentAccountId: checking.id },
    { name: 'Pet Food & Vet', vendor: null, amount: 40, currency: 'EUR', billingCycle: 'monthly', category: petCareCategory.id, icon: petCareCategory.icon, color: petCareCategory.color, renewalDay: 12, nextRenewalDate: dateStr(6), isPaidThisCycle: false, paymentMethod: 'Debit Card', usageRating: 'high', paymentAccountId: checking.id },
    { name: 'Car Service', vendor: 'Local Garage', amount: 210, currency: 'EUR', billingCycle: 'once', category: 'big-ticket', icon: 'Landmark', color: '#B45309', renewalDay: 1, nextRenewalDate: dateStr(-18), isPaidThisCycle: true, lastPaidAt: new Date(dateStr(-18)), isBill: false, paymentMethod: 'Debit Card', usageRating: 'high', paymentAccountId: checking.id },
    // Planned (not-yet-active) expense — doesn't affect any totals until activated.
    { name: 'New Laptop', vendor: null, amount: 1400, currency: 'EUR', billingCycle: 'once', category: 'ai-tech', icon: 'Bot', color: '#3155D9', renewalDay: 1, nextRenewalDate: dateStr(60), isPending: true, isBill: false, notes: 'Waiting for a Black Friday deal', paymentMethod: 'Credit Card', usageRating: 'high', paymentAccountId: null },
  ].map((e) => ({ ...e, householdId, createdById } as ExpenseSeed));

  const createdExpenses: Record<string, Awaited<ReturnType<typeof prisma.expense.create>>> = {};
  for (const seed of expenseSeeds) {
    const created = await prisma.expense.create({ data: seed });
    createdExpenses[created.name] = created;
  }
  console.log('Expenses created:', Object.keys(createdExpenses).length);

  // --- Budgets: one green, one amber, one red -------------------------
  await prisma.budget.createMany({
    data: [
      { category: 'utilities', monthlyLimit: 300, currency: 'EUR', householdId, createdById }, // ~240/mo -> green
      { category: 'shopping', monthlyLimit: 700, currency: 'EUR', householdId, createdById }, // 620/mo -> amber
      { category: 'entertainment', monthlyLimit: 30, currency: 'EUR', householdId, createdById }, // 33.98/mo -> red
    ],
  });
  console.log('Budgets created.');

  // --- Income ------------------------------------------------------------
  const salaryPrimary = await prisma.income.create({
    data: {
      name: 'Salary — Primary', amount: 4200, currency: 'EUR', frequency: 'monthly', category: 'salary',
      nextPayDate: dateStr(24), isReceivedThisCycle: true, lastReceivedAt: new Date(dateStr(-6)),
      depositAccountId: checking.id, householdId, createdById,
    },
  });
  const salaryPartner = await prisma.income.create({
    data: {
      name: 'Salary — Partner', amount: 2950, currency: 'EUR', frequency: 'monthly', category: 'salary',
      nextPayDate: dateStr(27), isReceivedThisCycle: true, lastReceivedAt: new Date(dateStr(-3)),
      depositAccountId: checking.id, householdId, createdById,
    },
  });
  console.log('Income created.');

  // --- Transfers (Flow ledger) — three months of realistic movement ----
  const transferSeeds: Parameters<typeof prisma.transfer.create>[0]['data'][] = [];

  // Income landing, last 3 months
  for (const monthsAgo of [2, 1, 0]) {
    transferSeeds.push({ amount: 4200, currency: 'EUR', date: dateStr(-6 - monthsAgo * 30), externalLabel: 'Salary — Primary', linkedIncomeId: salaryPrimary.id, toAccountId: checking.id, householdId, createdById });
    transferSeeds.push({ amount: 2950, currency: 'EUR', date: dateStr(-3 - monthsAgo * 30), externalLabel: 'Salary — Partner', linkedIncomeId: salaryPartner.id, toAccountId: checking.id, householdId, createdById });
  }

  // Internal top-ups / sweeps between the household's own accounts (never
  // counted as spend) — this is exactly the BOI/Revolut-style scenario.
  for (const monthsAgo of [2, 1, 0]) {
    transferSeeds.push({ amount: 150, currency: 'EUR', date: dateStr(-8 - monthsAgo * 30), fromAccountId: checking.id, toAccountId: revolut.id, note: 'Monthly Revolut top-up', householdId, createdById });
    transferSeeds.push({ amount: 500, currency: 'EUR', date: dateStr(-2 - monthsAgo * 30), fromAccountId: checking.id, toAccountId: savings.id, note: 'Savings sweep', householdId, createdById });
  }

  // Real spend leaving Revolut once it's topped up — this is the only side
  // that should ever become an expense; the top-up above never does.
  transferSeeds.push({ amount: 4.5, currency: 'EUR', date: dateStr(-5), fromAccountId: revolut.id, externalLabel: 'Coffee', householdId, createdById });
  transferSeeds.push({ amount: 30, currency: 'EUR', date: dateStr(-9), fromAccountId: revolut.id, externalLabel: 'Kids’ spending money', householdId, createdById });
  transferSeeds.push({ amount: 22, currency: 'EUR', date: dateStr(-40), fromAccountId: revolut.id, externalLabel: 'Kids’ spending money', householdId, createdById });

  // Bill payments linked back to their recurring Expense.
  const linkPaid = (expenseName: string, daysAgo: number) => {
    const exp = createdExpenses[expenseName];
    if (!exp) return;
    transferSeeds.push({ amount: exp.amount, currency: exp.currency, date: dateStr(daysAgo), externalLabel: exp.vendor || exp.name, linkedExpenseId: exp.id, fromAccountId: exp.paymentAccountId, householdId, createdById });
  };
  linkPaid('Spotify Family', -1);
  linkPaid('ChatGPT Plus', -3);
  linkPaid('TV Licence', -20);
  linkPaid('Mortgage', -6);
  linkPaid('Mortgage', -36);
  linkPaid('GAA Membership (Finn)', -45);
  linkPaid('Groceries', -10);
  linkPaid('Car Service', -18);

  // Car loan repayment (the loan itself is tracked as an Account, not an
  // Expense a Transfer links to) and credit card payoff — plain external
  // labels, no Expense link.
  transferSeeds.push({ amount: 245, currency: 'EUR', date: dateStr(-15), fromAccountId: checking.id, externalLabel: 'Car loan repayment', householdId, createdById });
  transferSeeds.push({ amount: 400, currency: 'EUR', date: dateStr(-12), fromAccountId: checking.id, toAccountId: creditCard.id, note: 'Credit card payoff', householdId, createdById });

  for (const seed of transferSeeds) {
    await prisma.transfer.create({ data: seed });
  }
  console.log('Transfers created:', transferSeeds.length);

  // --- Statement import (with balance reconciliation + a mix of resolutions) ---
  const openingBalance = 3000;
  const rows: { raw: string; amount: number; direction: 'DEBIT' | 'CREDIT'; date: string }[] = [
    { raw: 'SALARY ACME CORP LTD', amount: 4200, direction: 'CREDIT', date: dateStr(-6) },
    { raw: 'POS ELECTRICITY IE ENERGIA', amount: 145, direction: 'DEBIT', date: dateStr(-5) },
    { raw: 'EIR FIBRE DD', amount: 55, direction: 'DEBIT', date: dateStr(-5) },
    { raw: 'NETFLIX.COM', amount: 15.99, direction: 'DEBIT', date: dateStr(-4) },
    { raw: 'TO REVOLUT TOP UP', amount: 150, direction: 'DEBIT', date: dateStr(-3) },
    { raw: 'POS13SEP COSTA COFFEE DUBLIN', amount: 4.5, direction: 'DEBIT', date: dateStr(-2) },
    { raw: 'SPAR SHOP DUBLIN 4', amount: 25, direction: 'DEBIT', date: dateStr(-1) },
  ];
  const signedTotal = rows.reduce((sum, r) => sum + (r.direction === 'CREDIT' ? r.amount : -r.amount), 0);
  const closingBalance = openingBalance + signedTotal;

  const statementImport = await prisma.statementImport.create({
    data: {
      label: 'AIB Current Account — last 7 days',
      fileName: 'aib-current-statement.csv',
      accountId: checking.id,
      openingBalance,
      closingBalance,
      statementPeriod: `${dateStr(-7)} – ${dateStr(0)}`,
      householdId, createdById,
    },
  });

  const resolutions: Record<string, { status: 'MATCHED' | 'UNMATCHED' | 'IGNORED'; matchedExpenseId?: string; matchedTransferId?: string; vendorName?: string; suggestedCategory?: string }> = {
    'POS ELECTRICITY IE ENERGIA': { status: 'MATCHED', matchedExpenseId: createdExpenses['Electricity (Energia)'].id, vendorName: 'Energia', suggestedCategory: 'utilities' },
    'EIR FIBRE DD': { status: 'MATCHED', matchedExpenseId: createdExpenses['Broadband (Eir Fibre)'].id, vendorName: 'Eir', suggestedCategory: 'utilities' },
    'NETFLIX.COM': { status: 'MATCHED', matchedExpenseId: createdExpenses['Netflix'].id, vendorName: 'Netflix', suggestedCategory: 'entertainment' },
    'POS13SEP COSTA COFFEE DUBLIN': { status: 'UNMATCHED' },
    'SPAR SHOP DUBLIN 4': { status: 'IGNORED' },
  };

  // The salary credit and the Revolut top-up debit match transfers already
  // logged above (income landing, and the internal top-up) rather than
  // creating new ones.
  const mostRecentSalaryTransfer = await prisma.transfer.findFirst({ where: { householdId, linkedIncomeId: salaryPrimary.id }, orderBy: { date: 'desc' } });
  const mostRecentTopUpTransfer = await prisma.transfer.findFirst({ where: { householdId, fromAccountId: checking.id, toAccountId: revolut.id }, orderBy: { date: 'desc' } });

  for (const row of rows) {
    const normalizedDescription = normalizeDescription(row.raw);
    const resolution = resolutions[row.raw];
    let status: 'MATCHED' | 'UNMATCHED' | 'IGNORED' = 'UNMATCHED';
    let matchedExpenseId: string | undefined;
    let matchedTransferId: string | undefined;
    let vendorName: string | undefined;
    let suggestedCategory: string | undefined;

    if (row.raw === 'SALARY ACME CORP LTD') {
      status = 'MATCHED';
      matchedTransferId = mostRecentSalaryTransfer?.id;
    } else if (row.raw === 'TO REVOLUT TOP UP') {
      status = 'MATCHED';
      matchedTransferId = mostRecentTopUpTransfer?.id;
      vendorName = 'Revolut';
    } else if (resolution) {
      status = resolution.status;
      matchedExpenseId = resolution.matchedExpenseId;
      vendorName = resolution.vendorName;
      suggestedCategory = resolution.suggestedCategory;
    }

    await prisma.statementTransaction.create({
      data: {
        importId: statementImport.id,
        householdId,
        date: row.date,
        rawDescription: row.raw,
        normalizedDescription,
        amount: row.amount,
        currency: 'EUR',
        direction: row.direction,
        status,
        matchConfidence: status === 'MATCHED' ? 1 : null,
        matchedExpenseId,
        matchedTransferId,
        vendorName,
        suggestedCategory,
      },
    });

    // Learn a MerchantAlias for the confirmed bill matches, same as the
    // real "confirm" action does — so the Merchant Aliases feature has
    // something to show too.
    if (matchedExpenseId) {
      const pattern = buildAliasPattern(normalizedDescription);
      if (pattern) {
        await prisma.merchantAlias.create({
          data: { householdId, pattern, vendorName: vendorName || normalizedDescription, category: suggestedCategory, expenseId: matchedExpenseId, matchCount: 1 },
        });
      }
    }
  }
  console.log(`Statement import created — opening ${openingBalance}, closing ${closingBalance.toFixed(2)} (reconciles exactly).`);

  // --- Custom Money Map layout ------------------------------------------
  const nodeChecking = await prisma.mapNode.create({ data: { label: 'AIB Current', kind: 'ACCOUNT', accountId: checking.id, x: 400, y: 200, color: '#3155D9', householdId, createdById } });
  const nodeSavings = await prisma.mapNode.create({ data: { label: 'AIB Savings', kind: 'ACCOUNT', accountId: savings.id, x: 700, y: 100, color: '#0E7490', householdId, createdById } });
  const nodeRevolut = await prisma.mapNode.create({ data: { label: 'Revolut', kind: 'ACCOUNT', accountId: revolut.id, x: 700, y: 300, color: '#8A5CF6', householdId, createdById } });
  const nodeIncome = await prisma.mapNode.create({ data: { label: 'Income', kind: 'CUSTOM', x: 100, y: 200, color: '#0E7490', householdId, createdById } });
  const nodeBills = await prisma.mapNode.create({ data: { label: 'Bills & Spending', kind: 'CUSTOM', x: 400, y: 400, color: '#B45309', householdId, createdById } });

  await prisma.mapEdge.createMany({
    data: [
      { fromNodeId: nodeIncome.id, toNodeId: nodeChecking.id, label: 'Salary', amount: 7150, currency: 'EUR', householdId },
      { fromNodeId: nodeChecking.id, toNodeId: nodeSavings.id, label: 'Savings sweep', amount: 500, currency: 'EUR', householdId },
      { fromNodeId: nodeChecking.id, toNodeId: nodeRevolut.id, label: 'Top-up', amount: 150, currency: 'EUR', householdId },
      { fromNodeId: nodeChecking.id, toNodeId: nodeBills.id, label: 'Bills', amount: 2600, currency: 'EUR', householdId },
    ],
  });
  console.log('Custom Money Map layout created.');

  console.log('\nDemo Household ready.');
  console.log('Household ID:', household.id);
  console.log('Sign in as:', DEMO_USER_EMAIL);
  console.log('\nTo remove this demo household later:');
  console.log(`  DELETE FROM "Household" WHERE id = '${household.id}';  -- cascades everything above`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
