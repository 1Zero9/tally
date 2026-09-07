import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';

const ACCOUNT_SELECT = { id: true, name: true, type: true, institution: true } as const;

const TRANSFER_INCLUDE = {
  fromAccount: { select: ACCOUNT_SELECT },
  toAccount: { select: ACCOUNT_SELECT },
  linkedExpense: { select: { id: true, name: true } },
  linkedIncome: { select: { id: true, name: true } },
} as const;

function asStringArray(x: unknown): string[] {
  return Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : [];
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const householdId = auth.user.householdId;

    const trail = await prisma.moneyTrail.findUnique({ where: { id } });
    if (!trail || trail.householdId !== householdId) {
      return NextResponse.json({ status: 'error', message: 'Trail not found' }, { status: 404 });
    }

    const body = await request.json();
    const data: { name?: string; notes?: string | null } = {};
    if (typeof body.name === 'string') {
      const name = body.name.trim().slice(0, 120);
      if (!name) {
        return NextResponse.json({ status: 'error', message: 'A trail name is required' }, { status: 400 });
      }
      data.name = name;
    }
    if (typeof body.notes === 'string') {
      data.notes = body.notes.trim().slice(0, 1000) || null;
    }

    const addTransferIds = asStringArray(body.addTransferIds);
    const removeTransferIds = asStringArray(body.removeTransferIds);

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.moneyTrail.update({ where: { id }, data });
      }
      if (addTransferIds.length > 0) {
        await tx.transfer.updateMany({
          where: { id: { in: addTransferIds }, householdId },
          data: { trailId: id },
        });
      }
      if (removeTransferIds.length > 0) {
        await tx.transfer.updateMany({
          where: { id: { in: removeTransferIds }, householdId, trailId: id },
          data: { trailId: null },
        });
      }
    });

    const full = await prisma.moneyTrail.findUnique({
      where: { id },
      include: {
        transfers: { include: TRANSFER_INCLUDE, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
      },
    });

    return NextResponse.json({ status: 'ok', trail: full });
  } catch (error: unknown) {
    console.error('Failed to update money trail:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to update trail') },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const trail = await prisma.moneyTrail.findUnique({ where: { id } });
    if (!trail || trail.householdId !== auth.user.householdId) {
      return NextResponse.json({ status: 'error', message: 'Trail not found' }, { status: 404 });
    }

    // The member transfers stand on their own — deleting the trail only
    // removes the grouping (Transfer.trailId is SetNull on delete).
    await prisma.moneyTrail.delete({ where: { id } });

    return NextResponse.json({ status: 'ok', deletedId: id });
  } catch (error: unknown) {
    console.error('Failed to delete money trail:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to delete trail') },
      { status: 500 }
    );
  }
}
