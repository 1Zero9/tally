/**
 * Bulk-creates synthetic Expense rows on the Demo Household only, for
 * measuring list performance at 1,000/10,000-record scale (per
 * docs/UI-IMPROVEMENTS.md §9). Every row is tagged with a recognizable
 * name prefix so it can be cleanly removed afterward — never touches the
 * real household or any of Demo Household's genuine showcase data.
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-load-test.ts 1000
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-load-test.ts --cleanup
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NAME_PREFIX = 'LoadTest-';
const CATEGORIES = ['utilities', 'entertainment', 'shopping', 'lifestyle', 'ai-tech', 'insurance'];
const CYCLES = ['monthly', 'once', 'annual', 'weekly', 'quarterly'] as const;

function dateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

async function getDemoHousehold() {
  const household = await prisma.household.findFirst({ where: { name: { contains: 'Demo' } } });
  if (!household) throw new Error('No Demo Household found — run scripts/seed-demo.ts first.');
  return household;
}

async function cleanup() {
  const household = await getDemoHousehold();
  const result = await prisma.expense.deleteMany({
    where: { householdId: household.id, name: { startsWith: NAME_PREFIX } },
  });
  console.log(`Deleted ${result.count} load-test expenses from Demo Household.`);
}

async function seed(count: number) {
  const household = await getDemoHousehold();
  const user = await prisma.user.findFirst({ where: { householdId: household.id } });

  const rows = Array.from({ length: count }, (_, i) => {
    const cycle = CYCLES[i % CYCLES.length];
    return {
      name: `${NAME_PREFIX}${i}`,
      vendor: `Synthetic Vendor ${i % 50}`,
      amount: Math.round((10 + (i % 200) * 3.37) * 100) / 100,
      currency: 'EUR',
      billingCycle: cycle,
      category: CATEGORIES[i % CATEGORIES.length],
      icon: 'Zap',
      color: '#3155D9',
      renewalDay: (i % 28) + 1,
      nextRenewalDate: dateStr((i % 60) - 30),
      isPaidThisCycle: i % 3 === 0,
      paymentMethod: 'Debit Card',
      isActive: true,
      isBill: cycle !== 'once',
      usageRating: 'high',
      householdId: household.id,
      createdById: user?.id,
    };
  });

  // createMany in batches — a single 10,000-row call is fine for Postgres,
  // but chunking keeps memory/roundtrip size predictable either way.
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await prisma.expense.createMany({ data: chunk });
    console.log(`Inserted ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log(`Seeded ${count} load-test expenses into Demo Household (${household.id}).`);
}

async function main() {
  if (process.argv.includes('--cleanup')) {
    await cleanup();
    return;
  }
  const countArg = process.argv.find((a) => /^\d+$/.test(a));
  const count = countArg ? Number(countArg) : 1000;
  await seed(count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
