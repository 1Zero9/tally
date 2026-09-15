import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireAdmin } from '@/src/lib/auth';
import { Prisma } from '@prisma/client';
import {
  createHouseholdSnapshot,
  restoreHouseholdSnapshot,
  restoreLegacyExpenses,
  type BackupPayload,
} from '@/src/lib/backup';
import { logAudit } from '@/src/lib/audit';

// Older backups (pre-expansion) have payloadJson as a bare array of Expense
// rows — the legacy branch in PUT below handles those so they stay
// restorable.

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const backups = await prisma.databaseBackup.findMany({
      where: { householdId: auth.user.householdId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return NextResponse.json({
      status: 'ok',
      backups,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch backups:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Database error') },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const householdId = auth.user.householdId as string;
    const notes = body.notes || `Snapshot created on ${new Date().toLocaleString()}`;

    const backup = await createHouseholdSnapshot(householdId, auth.user.id, notes, false);

    return NextResponse.json({
      status: 'ok',
      backup,
    });
  } catch (error: unknown) {
    console.error('Failed to create backup:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Backup failed') },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    if (!body.backupId) {
      return NextResponse.json(
        { status: 'error', message: 'Missing backupId' },
        { status: 400 }
      );
    }

    const backup = await prisma.databaseBackup.findUnique({
      where: { id: body.backupId },
    });

    if (!backup || !backup.payloadJson || backup.householdId !== auth.user.householdId) {
      return NextResponse.json(
        { status: 'error', message: 'Backup not found' },
        { status: 404 }
      );
    }

    const householdId = auth.user.householdId;
    const createdById = auth.user.id;

    // Legacy backups: payloadJson is a bare array of Expense rows.
    if (Array.isArray(backup.payloadJson)) {
      const records = backup.payloadJson as Prisma.JsonArray as Record<string, unknown>[];
      const restoredCount = await prisma.$transaction((tx) =>
        restoreLegacyExpenses(tx, householdId, createdById, records)
      );

      logAudit({
        householdId,
        actorId: auth.user.id,
        actorName: auth.user.name,
        action: 'BACKUP_RESTORE',
        entityType: 'DatabaseBackup',
        entityLabel: `${backup.notes || 'Legacy snapshot'} — ${restoredCount} expenses restored`,
      });

      return NextResponse.json({ status: 'ok', restoredCount });
    }

    const payload = backup.payloadJson as unknown as BackupPayload;
    if (typeof payload !== 'object' || payload === null) {
      return NextResponse.json(
        { status: 'error', message: 'Backup payload is invalid' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction((tx) =>
      restoreHouseholdSnapshot(tx, householdId, createdById, payload)
    );

    const restoredCount = Object.values(result).reduce((sum, n) => sum + n, 0);

    logAudit({
      householdId,
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'BACKUP_RESTORE',
      entityType: 'DatabaseBackup',
      entityLabel: `${backup.notes || 'Snapshot'} — ${restoredCount} records restored`,
    });

    return NextResponse.json({
      status: 'ok',
      restoredCount,
      breakdown: result,
    });
  } catch (error: unknown) {
    console.error('Failed to restore backup:', error);
    return NextResponse.json(
      { status: 'error', message: getErrorMessage(error, 'Restore failed') },
      { status: 500 }
    );
  }
}
