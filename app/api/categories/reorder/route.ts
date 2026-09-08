import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { isBuiltinCategory, CATEGORIES } from '@/src/data/categories';

/**
 * Sets the household's combined category order. Body: { orderedIds: string[] }
 * — the full list of built-in keys and custom category ids in the desired
 * order. Every id gets an explicit sortOrder; built-ins that lacked an
 * override row get one created (carrying their canonical appearance).
 */
export async function POST(request: Request) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const householdId = auth.user.householdId!;
    const body = await request.json();
    const orderedIds: string[] = Array.isArray(body.orderedIds)
      ? body.orderedIds.filter((x: unknown): x is string => typeof x === 'string')
      : [];
    if (orderedIds.length === 0) {
      return NextResponse.json({ status: 'error', message: 'orderedIds is required' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const id = orderedIds[i];
        if (isBuiltinCategory(id)) {
          const base = CATEGORIES[id];
          await tx.category.upsert({
            where: { householdId_builtinKey: { householdId, builtinKey: id } },
            create: {
              householdId,
              builtinKey: id,
              name: base.name,
              icon: base.icon,
              color: base.color,
              bgColor: base.bgColor,
              borderColor: base.borderColor,
              sortOrder: i,
              createdById: auth.user.id,
            },
            update: { sortOrder: i },
          });
        } else {
          await tx.category.updateMany({
            where: { id, householdId, builtinKey: null },
            data: { sortOrder: i },
          });
        }
      }
    });

    const categories = await prisma.category.findMany({
      where: { householdId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ status: 'ok', categories });
  } catch (error: unknown) {
    console.error('Failed to reorder categories:', error);
    return NextResponse.json({ status: 'error', message: getErrorMessage(error, 'Failed to save order') }, { status: 500 });
  }
}
