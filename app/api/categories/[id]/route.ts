import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { isBuiltinCategory } from '@/src/data/categories';

const HEX = /^#[0-9a-fA-F]{6}$/;

function cleanHex(raw: unknown): string | null {
  return typeof raw === 'string' && HEX.test(raw.trim()) ? raw.trim().toLowerCase() : null;
}

/** Whether `target` is a category id this household is allowed to reassign into. */
async function isValidReassignTarget(householdId: string, target: string): Promise<boolean> {
  if (isBuiltinCategory(target)) return true;
  const custom = await prisma.category.findFirst({
    where: { id: target, householdId, builtinKey: null },
  });
  return !!custom;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const householdId = auth.user.householdId!;
    const body = await request.json();

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || existing.householdId !== householdId) {
      return NextResponse.json({ status: 'error', message: 'Category not found' }, { status: 404 });
    }

    const data: Record<string, string> = {};

    const icon = typeof body.icon === 'string' && body.icon.trim() ? body.icon.trim().slice(0, 40) : null;
    if (icon) data.icon = icon;
    const color = cleanHex(body.color);
    if (color) data.color = color;
    const bgColor = cleanHex(body.bgColor);
    if (bgColor) data.bgColor = bgColor;
    const borderColor = cleanHex(body.borderColor);
    if (borderColor) data.borderColor = borderColor;

    // Name is only editable on standalone custom categories — an override row
    // always mirrors the built-in's canonical name.
    if (!existing.builtinKey && typeof body.name === 'string') {
      const name = body.name.trim().slice(0, 60);
      if (!name) {
        return NextResponse.json({ status: 'error', message: 'Category name cannot be empty' }, { status: 400 });
      }
      if (name.toLowerCase() !== existing.name.toLowerCase()) {
        const clash = await prisma.category.findFirst({
          where: {
            householdId,
            builtinKey: null,
            name: { equals: name, mode: 'insensitive' },
            id: { not: id },
          },
        });
        if (clash) {
          return NextResponse.json({ status: 'error', message: 'Another category already has that name' }, { status: 409 });
        }
      }
      data.name = name;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ status: 'ok', category: existing });
    }

    const category = await prisma.category.update({ where: { id }, data });
    return NextResponse.json({ status: 'ok', category });
  } catch (error: unknown) {
    console.error('Failed to update category:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to update category') },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const householdId = auth.user.householdId!;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || existing.householdId !== householdId) {
      return NextResponse.json({ status: 'error', message: 'Category not found' }, { status: 404 });
    }

    // An override row: deleting it just resets that built-in to its default
    // appearance — nothing references it by id, so no reassignment needed.
    if (existing.builtinKey) {
      await prisma.category.delete({ where: { id } });
      return NextResponse.json({ status: 'ok', deletedId: id, resetBuiltin: existing.builtinKey });
    }

    const [expenseCount, budgetForOld] = await Promise.all([
      prisma.expense.count({ where: { householdId, category: id } }),
      prisma.budget.findUnique({ where: { householdId_category: { householdId, category: id } } }),
    ]);
    const inUse = expenseCount > 0 || !!budgetForOld;

    let body: { reassignTo?: unknown } = {};
    try { body = await request.json(); } catch { /* no body */ }
    const reassignTo = typeof body.reassignTo === 'string' ? body.reassignTo.trim() : '';

    if (inUse && !reassignTo) {
      return NextResponse.json(
        { status: 'error', requiresReassign: true, expenseCount, message: 'This category is in use — choose a category to move its items to.' },
        { status: 409 }
      );
    }

    if (reassignTo) {
      if (reassignTo === id) {
        return NextResponse.json({ status: 'error', message: 'Pick a different category to move items to.' }, { status: 400 });
      }
      if (!(await isValidReassignTarget(householdId, reassignTo))) {
        return NextResponse.json({ status: 'error', message: 'That target category does not exist.' }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      if (reassignTo) {
        await tx.expense.updateMany({ where: { householdId, category: id }, data: { category: reassignTo } });
        await tx.merchantAlias.updateMany({ where: { householdId, category: id }, data: { category: reassignTo } });
        await tx.statementTransaction.updateMany({ where: { householdId, suggestedCategory: id }, data: { suggestedCategory: reassignTo } });

        if (budgetForOld) {
          const budgetForNew = await tx.budget.findUnique({
            where: { householdId_category: { householdId, category: reassignTo } },
          });
          if (budgetForNew) {
            // Target already has a budget — drop the orphaned one rather than
            // violating the one-budget-per-category constraint.
            await tx.budget.delete({ where: { id: budgetForOld.id } });
          } else {
            await tx.budget.update({ where: { id: budgetForOld.id }, data: { category: reassignTo } });
          }
        }
      }
      await tx.category.delete({ where: { id } });
    });

    return NextResponse.json({ status: 'ok', deletedId: id, reassignedTo: reassignTo || null });
  } catch (error: unknown) {
    console.error('Failed to delete category:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to delete category') },
      { status: 500 }
    );
  }
}
