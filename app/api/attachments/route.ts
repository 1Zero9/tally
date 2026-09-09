import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import {
  ATTACHMENT_ALLOWED_TYPES,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_HOUSEHOLD_CEILING_BYTES,
  ATTACHMENT_OWNER_TYPES,
  isBlobConfigured,
  safeFileName,
  type AttachmentOwnerType,
} from '@/src/lib/attachments';

const SELECT = {
  id: true,
  fileName: true,
  contentType: true,
  size: true,
  createdAt: true,
  expenseId: true,
  accountId: true,
  statementImportId: true,
  uploadedBy: { select: { id: true, name: true } },
} as const;

/** Confirms the owner record exists and belongs to this household. */
async function ownerExists(type: AttachmentOwnerType, id: string, householdId: string): Promise<boolean> {
  if (type === 'expense') return !!(await prisma.expense.findFirst({ where: { id, householdId } }));
  if (type === 'account') return !!(await prisma.account.findFirst({ where: { id, householdId } }));
  return !!(await prisma.statementImport.findFirst({ where: { id, householdId } }));
}

/** GET /api/attachments?expense=<id> | ?account=<id> | ?statementImport=<id> */
export async function GET(request: Request) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const where: Record<string, string> = { householdId: auth.user.householdId };
  const expenseId = searchParams.get('expense');
  const accountId = searchParams.get('account');
  const statementImportId = searchParams.get('statementImport');
  if (expenseId) where.expenseId = expenseId;
  else if (accountId) where.accountId = accountId;
  else if (statementImportId) where.statementImportId = statementImportId;
  else return NextResponse.json({ status: 'error', message: 'A record to list attachments for is required' }, { status: 400 });

  try {
    const attachments = await prisma.attachment.findMany({
      where,
      select: SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ status: 'ok', attachments });
  } catch (error: unknown) {
    console.error('Failed to list attachments:', error);
    return NextResponse.json({ status: 'error', message: getErrorMessage(error, 'Database error') }, { status: 500 });
  }
}

/** POST /api/attachments — multipart: file, ownerType, ownerId */
export async function POST(request: Request) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  if (!isBlobConfigured()) {
    return NextResponse.json(
      { status: 'error', message: 'File storage is not set up yet. Ask an admin to add a BLOB_READ_WRITE_TOKEN.' },
      { status: 503 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    const ownerType = String(form.get('ownerType') || '') as AttachmentOwnerType;
    const ownerId = String(form.get('ownerId') || '');

    if (!(file instanceof File)) {
      return NextResponse.json({ status: 'error', message: 'No file was uploaded' }, { status: 400 });
    }
    if (!ATTACHMENT_OWNER_TYPES.includes(ownerType) || !ownerId) {
      return NextResponse.json({ status: 'error', message: 'A valid record to attach to is required' }, { status: 400 });
    }
    if (!ATTACHMENT_ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { status: 'error', message: `That file type isn't supported. Allowed: ${Object.values(ATTACHMENT_ALLOWED_TYPES).join(', ')}.` },
        { status: 400 },
      );
    }
    if (file.size <= 0 || file.size > ATTACHMENT_MAX_BYTES) {
      return NextResponse.json(
        { status: 'error', message: `Files must be between 1 byte and ${ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB.` },
        { status: 400 },
      );
    }

    if (!(await ownerExists(ownerType, ownerId, auth.user.householdId))) {
      return NextResponse.json({ status: 'error', message: 'That record was not found' }, { status: 404 });
    }

    const used = await prisma.attachment.aggregate({
      where: { householdId: auth.user.householdId },
      _sum: { size: true },
    });
    if ((used._sum.size ?? 0) + file.size > ATTACHMENT_HOUSEHOLD_CEILING_BYTES) {
      return NextResponse.json(
        { status: 'error', message: `This would exceed your ${ATTACHMENT_HOUSEHOLD_CEILING_BYTES / (1024 * 1024)} MB storage limit. Delete some files first.` },
        { status: 400 },
      );
    }

    const cleanName = safeFileName(file.name);
    const key = `households/${auth.user.householdId}/${ownerType}/${crypto.randomUUID()}-${cleanName}`;
    const blob = await put(key, file, {
      access: 'private',
      addRandomSuffix: false,
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const created = await prisma.attachment.create({
      data: {
        fileName: cleanName,
        contentType: file.type,
        size: file.size,
        blobKey: blob.pathname,
        blobUrl: blob.url,
        householdId: auth.user.householdId,
        uploadedById: auth.user.id,
        expenseId: ownerType === 'expense' ? ownerId : null,
        accountId: ownerType === 'account' ? ownerId : null,
        statementImportId: ownerType === 'statementImport' ? ownerId : null,
      },
      select: SELECT,
    });

    return NextResponse.json({ status: 'ok', attachment: created });
  } catch (error: unknown) {
    console.error('Failed to upload attachment:', error);
    return NextResponse.json({ status: 'error', message: getErrorMessage(error, 'Failed to upload that file') }, { status: 500 });
  }
}
