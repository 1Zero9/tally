import { prisma } from '@/src/lib/prisma';
import type { Prisma } from '@prisma/client';

const projectInclude = {
  items: {
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      links: {
        orderBy: { createdAt: 'asc' },
        include: {
          expense: { select: { id: true, name: true, amount: true, currency: true, nextRenewalDate: true } },
          transfer: {
            select: {
              id: true, amount: true, currency: true, date: true, externalLabel: true,
              fromAccount: { select: { name: true } },
              toAccount: { select: { name: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProjectInclude;

type ProjectWithGraph = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

export async function loadProject(id: string): Promise<ProjectWithGraph | null> {
  return prisma.project.findUnique({ where: { id }, include: projectInclude });
}

export async function loadProjects(householdId: string | null): Promise<ProjectWithGraph[]> {
  return prisma.project.findMany({
    where: { householdId },
    orderBy: { createdAt: 'desc' },
    include: projectInclude,
  });
}

/** Flatten a project's nested graph into the client-facing shape, resolving
 *  each link to its record's label / date / amount. */
export function serializeProject(p: ProjectWithGraph) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    targetDate: p.targetDate,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    items: p.items.map((it) => ({
      id: it.id,
      label: it.label,
      estimatedAmount: it.estimatedAmount,
      currency: it.currency,
      notes: it.notes,
      sortOrder: it.sortOrder,
      links: it.links
        .map((l) => {
          if (l.expense) {
            return {
              id: l.id,
              amountOverride: l.amountOverride,
              kind: 'expense' as const,
              recordId: l.expense.id,
              label: l.expense.name,
              date: l.expense.nextRenewalDate,
              amount: l.expense.amount,
              currency: l.expense.currency,
            };
          }
          if (l.transfer) {
            const from = l.transfer.fromAccount?.name;
            const to = l.transfer.toAccount?.name;
            return {
              id: l.id,
              amountOverride: l.amountOverride,
              kind: 'transfer' as const,
              recordId: l.transfer.id,
              label: from && to ? `${from} → ${to}` : l.transfer.externalLabel || 'Transfer',
              date: l.transfer.date,
              amount: l.transfer.amount,
              currency: l.transfer.currency,
            };
          }
          return null;
        })
        .filter((x): x is NonNullable<typeof x> => x != null),
    })),
  };
}
