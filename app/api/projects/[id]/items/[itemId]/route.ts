import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { loadProject, serializeProject } from '@/src/lib/projects';

async function ownedItem(projectId: string, itemId: string, householdId: string | null) {
  const item = await prisma.projectItem.findUnique({ where: { id: itemId }, include: { project: true } });
  if (!item || item.projectId !== projectId || item.project.householdId !== householdId) return null;
  return item;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { id, itemId } = await params;
    const householdId = auth.user.householdId;
    if (!(await ownedItem(id, itemId, householdId))) {
      return NextResponse.json({ status: 'error', message: 'Line item not found' }, { status: 404 });
    }

    const body = await request.json();

    const data: Record<string, string | number | null> = {};
    if (typeof body.label === 'string') {
      const label = body.label.trim().slice(0, 160);
      if (!label) return NextResponse.json({ status: 'error', message: 'A line-item name is required' }, { status: 400 });
      data.label = label;
    }
    if (body.estimatedAmount !== undefined) {
      const n = Number(body.estimatedAmount);
      data.estimatedAmount = Number.isFinite(n) && n >= 0 ? n : 0;
    }
    if (typeof body.notes === 'string') data.notes = body.notes.trim().slice(0, 500) || null;

    const removeLinkIds: string[] = Array.isArray(body.removeLinkIds)
      ? body.removeLinkIds.filter((x: unknown): x is string => typeof x === 'string')
      : [];

    type AddLink = { expenseId?: string; transferId?: string; amountOverride?: number };
    const addLinks: AddLink[] = Array.isArray(body.addLinks) ? body.addLinks : [];

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.projectItem.update({ where: { id: itemId }, data });
      }
      if (removeLinkIds.length > 0) {
        await tx.projectItemLink.deleteMany({ where: { id: { in: removeLinkIds }, projectItemId: itemId } });
      }
      for (const l of addLinks) {
        const expenseId = typeof l.expenseId === 'string' ? l.expenseId : null;
        const transferId = typeof l.transferId === 'string' ? l.transferId : null;
        if ((expenseId && transferId) || (!expenseId && !transferId)) continue;

        if (expenseId) {
          const e = await tx.expense.findFirst({ where: { id: expenseId, householdId } });
          if (!e) continue;
        } else if (transferId) {
          const t = await tx.transfer.findFirst({ where: { id: transferId, householdId } });
          if (!t) continue;
        }

        const override = Number(l.amountOverride);
        await tx.projectItemLink.create({
          data: {
            projectItemId: itemId,
            expenseId,
            transferId,
            amountOverride: Number.isFinite(override) && override > 0 ? override : null,
          },
        });
      }
    });

    const full = await loadProject(id);
    return NextResponse.json({ status: 'ok', project: full ? serializeProject(full) : null });
  } catch (error: unknown) {
    console.error('Failed to update project item:', error);
    return NextResponse.json({ status: 'error', message: getErrorMessage(error, 'Failed to update line item') }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { id, itemId } = await params;
    if (!(await ownedItem(id, itemId, auth.user.householdId))) {
      return NextResponse.json({ status: 'error', message: 'Line item not found' }, { status: 404 });
    }
    await prisma.projectItem.delete({ where: { id: itemId } });

    const full = await loadProject(id);
    return NextResponse.json({ status: 'ok', project: full ? serializeProject(full) : null });
  } catch (error: unknown) {
    console.error('Failed to delete project item:', error);
    return NextResponse.json({ status: 'error', message: getErrorMessage(error, 'Failed to delete line item') }, { status: 500 });
  }
}
