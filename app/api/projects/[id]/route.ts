import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { loadProject, serializeProject } from '@/src/lib/projects';

const STATUSES = ['planning', 'active', 'done'];

async function ownedProject(id: string, householdId: string | null) {
  const p = await prisma.project.findUnique({ where: { id } });
  return p && p.householdId === householdId ? p : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    if (!(await ownedProject(id, auth.user.householdId))) {
      return NextResponse.json({ status: 'error', message: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, string | null> = {};
    if (typeof body.name === 'string') {
      const name = body.name.trim().slice(0, 120);
      if (!name) return NextResponse.json({ status: 'error', message: 'A project name is required' }, { status: 400 });
      data.name = name;
    }
    if (typeof body.description === 'string') data.description = body.description.trim().slice(0, 1000) || null;
    if (typeof body.status === 'string' && STATUSES.includes(body.status)) data.status = body.status;
    if (typeof body.targetDate === 'string') data.targetDate = body.targetDate ? body.targetDate.slice(0, 10) : null;

    if (Object.keys(data).length > 0) {
      await prisma.project.update({ where: { id }, data });
    }

    const full = await loadProject(id);
    return NextResponse.json({ status: 'ok', project: full ? serializeProject(full) : null });
  } catch (error: unknown) {
    console.error('Failed to update project:', error);
    return NextResponse.json({ status: 'error', message: getErrorMessage(error, 'Failed to update project') }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    if (!(await ownedProject(id, auth.user.householdId))) {
      return NextResponse.json({ status: 'error', message: 'Project not found' }, { status: 404 });
    }
    // Items + links cascade; the linked Expense/Transfer records are untouched.
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ status: 'ok', deletedId: id });
  } catch (error: unknown) {
    console.error('Failed to delete project:', error);
    return NextResponse.json({ status: 'error', message: getErrorMessage(error, 'Failed to delete project') }, { status: 500 });
  }
}
