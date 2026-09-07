import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';

const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VALID_STATUSES = ['OPEN', 'FIXED'];
const VALID_TYPES = ['IDEA', 'FEATURE', 'BUG'];

export async function GET() {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const bugs = await prisma.bugReport.findMany({
      where: { householdId: auth.user.householdId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ status: 'ok', bugs });
  } catch (error: unknown) {
    console.error('Failed to fetch bug reports from PostgreSQL:', error);
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

    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ status: 'error', message: 'Bug title is required' }, { status: 400 });
    }

    const severity = VALID_SEVERITIES.includes(body.severity) ? body.severity : 'MEDIUM';
    const type = VALID_TYPES.includes(body.type) ? body.type : 'BUG';

    const newBug = await prisma.bugReport.create({
      data: {
        title: body.title.trim(),
        description: body.description?.trim() || null,
        area: body.area?.trim() || null,
        type,
        severity,
        status: 'OPEN',
        createdById: auth.user.id,
        householdId: auth.user.householdId,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ status: 'ok', bug: newBug });
  } catch (error: unknown) {
    console.error('Failed to create bug report:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to create record') },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ status: 'error', message: 'Missing bug id' }, { status: 400 });
    }

    const existing = await prisma.bugReport.findUnique({ where: { id: body.id } });
    if (!existing || existing.householdId !== auth.user.householdId) {
      return NextResponse.json({ status: 'error', message: 'Bug report not found' }, { status: 404 });
    }

    const severity = body.severity !== undefined
      ? (VALID_SEVERITIES.includes(body.severity) ? body.severity : existing.severity)
      : existing.severity;
    const status = body.status !== undefined
      ? (VALID_STATUSES.includes(body.status) ? body.status : existing.status)
      : existing.status;
    const type = body.type !== undefined
      ? (VALID_TYPES.includes(body.type) ? body.type : existing.type)
      : existing.type;

    const updated = await prisma.bugReport.update({
      where: { id: body.id },
      data: {
        title: body.title !== undefined ? body.title.trim() || existing.title : existing.title,
        description: body.description !== undefined ? body.description?.trim() || null : existing.description,
        area: body.area !== undefined ? body.area?.trim() || null : existing.area,
        type,
        severity,
        status,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ status: 'ok', bug: updated });
  } catch (error: unknown) {
    console.error('Failed to update bug report:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to update record') },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ status: 'error', message: 'Missing id query parameter' }, { status: 400 });
    }

    const existing = await prisma.bugReport.findUnique({ where: { id } });
    if (!existing || existing.householdId !== auth.user.householdId) {
      return NextResponse.json({ status: 'error', message: 'Bug report not found' }, { status: 404 });
    }

    await prisma.bugReport.delete({ where: { id } });

    return NextResponse.json({ status: 'ok', deletedId: id });
  } catch (error: unknown) {
    console.error('Failed to delete bug report:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Failed to delete record') },
      { status: 500 }
    );
  }
}
