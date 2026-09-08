import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { loadProject, serializeProject } from '@/src/lib/projects';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.householdId !== auth.user.householdId) {
      return NextResponse.json({ status: 'error', message: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const label = typeof body.label === 'string' ? body.label.trim().slice(0, 160) : '';
    if (!label) {
      return NextResponse.json({ status: 'error', message: 'A line-item name is required' }, { status: 400 });
    }
    const estimatedAmount = Number(body.estimatedAmount);
    const count = await prisma.projectItem.count({ where: { projectId: id } });

    await prisma.projectItem.create({
      data: {
        projectId: id,
        label,
        estimatedAmount: Number.isFinite(estimatedAmount) && estimatedAmount >= 0 ? estimatedAmount : 0,
        currency: typeof body.currency === 'string' && body.currency ? body.currency : 'EUR',
        notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) || null : null,
        sortOrder: count,
      },
    });

    const full = await loadProject(id);
    return NextResponse.json({ status: 'ok', project: full ? serializeProject(full) : null });
  } catch (error: unknown) {
    console.error('Failed to add project item:', error);
    return NextResponse.json({ status: 'error', message: getErrorMessage(error, 'Failed to add line item') }, { status: 500 });
  }
}
