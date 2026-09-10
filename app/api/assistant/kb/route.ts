import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireAdmin } from '@/src/lib/auth';
import { logAudit } from '@/src/lib/audit';

/**
 * The Tally Agent caches the answers it gives to "how do I" style
 * app-usage questions, per household, so a close repeat is served without
 * a model call. Those cached answers don't refresh when the help guide
 * changes — this clears the household's cache so the next such question
 * is answered fresh against the current guide. Money questions are never
 * cached, so nothing about the household's own data is affected.
 */
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const count = await prisma.assistantKbEntry.count({
    where: { householdId: auth.user.householdId },
  });
  return NextResponse.json({ status: 'ok', count });
}

export async function DELETE() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { count } = await prisma.assistantKbEntry.deleteMany({
      where: { householdId: auth.user.householdId },
    });

    if (count > 0) {
      logAudit({
        householdId: auth.user.householdId as string,
        actorId: auth.user.id,
        actorName: auth.user.name,
        action: 'DELETE',
        entityType: 'AssistantKbEntry',
        entityLabel: `Cleared assistant answer cache (${count} entr${count === 1 ? 'y' : 'ies'})`,
      });
    }

    return NextResponse.json({ status: 'ok', cleared: count });
  } catch (error: unknown) {
    console.error('Failed to clear assistant cache:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Database error') },
      { status: 500 }
    );
  }
}
