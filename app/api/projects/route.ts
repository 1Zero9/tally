import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { loadProject, loadProjects, serializeProject } from '@/src/lib/projects';

const STATUSES = ['planning', 'active', 'done'];

export async function GET() {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const projects = await loadProjects(auth.user.householdId);
    return NextResponse.json({ status: 'ok', projects: projects.map(serializeProject) });
  } catch (error: unknown) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json({ status: 'error', message: getErrorMessage(error, 'Database error') }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    if (!name) {
      return NextResponse.json({ status: 'error', message: 'A project name is required' }, { status: 400 });
    }
    const status = STATUSES.includes(body.status) ? body.status : 'active';

    const created = await prisma.project.create({
      data: {
        name,
        description: typeof body.description === 'string' ? body.description.trim().slice(0, 1000) || null : null,
        status,
        targetDate: typeof body.targetDate === 'string' && body.targetDate ? body.targetDate.slice(0, 10) : null,
        householdId: auth.user.householdId,
        createdById: auth.user.id,
      },
    });

    const full = await loadProject(created.id);
    return NextResponse.json({ status: 'ok', project: full ? serializeProject(full) : null });
  } catch (error: unknown) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ status: 'error', message: getErrorMessage(error, 'Failed to create project') }, { status: 500 });
  }
}
