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

export async function GET() {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const trails = await prisma.moneyTrail.findMany({
      where: { householdId: auth.user.householdId },
      orderBy: { createdAt: 'desc' },
      include: {
        transfers: {
          include: TRANSFER_INCLUDE,
          // Chronological — a trail is a path, so the hop order matters.
          orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    return NextResponse.json({ status: 'ok', trails });
  } catch (error: unknown) {
    console.error('Failed to fetch money trails:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Database error') },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    if (!name) {
      return NextResponse.json({ status: 'error', message: 'A trail name is required' }, { status: 400 });
    }
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null;
    const transferIds: string[] = Array.isArray(body.transferIds)
      ? body.transferIds.filter((x: unknown): x is string => typeof x === 'string')
      : [];

    const trail = await prisma.moneyTrail.create({
      data: {
        name,
        notes,
        householdId: auth.user.householdId,
        createdById: auth.user.id,
      },
    });

    if (transferIds.length > 0) {
      await prisma.transfer.updateMany({
        where: { id: { in: transferIds }, householdId: auth.user.householdId },
        data: { trailId: trail.id },
      });
    }

    const full = await prisma.moneyTrail.findUnique({
      where: { id: trail.id },
      include: {
        transfers: { include: TRANSFER_INCLUDE, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
      },
    });

    return NextResponse.json({ status: 'ok', trail: full });
  } catch (error: unknown) {
    console.error('Failed to create money trail:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to create trail') },
      { status: 500 }
    );
  }
}
