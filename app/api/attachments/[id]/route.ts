import { NextResponse } from 'next/server';
import { get, del } from '@vercel/blob';
import { prisma } from '@/src/lib/prisma';
import { getErrorMessage } from '@/src/lib/errors';
import { requireHouseholdUser } from '@/src/lib/auth';
import { isBlobConfigured } from '@/src/lib/attachments';

/**
 * GET /api/attachments/[id] — streams the file back through the app, after
 * an auth + household-ownership check. This is the only way an attachment
 * is ever served: the blob store is private, and the app's CSP blocks a
 * direct blob URL anyway.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment || attachment.householdId !== auth.user.householdId) {
    return NextResponse.json({ status: 'error', message: 'Attachment not found' }, { status: 404 });
  }
  if (!isBlobConfigured()) {
    return NextResponse.json({ status: 'error', message: 'File storage is not configured' }, { status: 503 });
  }

  try {
    const result = await get(attachment.blobKey, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result || result.stream == null) {
      return NextResponse.json({ status: 'error', message: 'The stored file is missing' }, { status: 404 });
    }
    const asciiName = attachment.fileName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
    return new Response(result.stream as unknown as BodyInit, {
      headers: {
        'Content-Type': attachment.contentType,
        'Content-Length': String(attachment.size),
        'Content-Disposition': `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
        // Auth-gated content — revalidate every time rather than let a
        // shared/proxy cache hold a file past a permission change or delete.
        'Cache-Control': 'private, no-cache',
        // Never let the browser MIME-sniff an uploaded file into something
        // it wasn't declared as.
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: unknown) {
    console.error('Failed to serve attachment:', error);
    return NextResponse.json({ status: 'error', message: getErrorMessage(error, 'Could not load that file') }, { status: 500 });
  }
}

/** DELETE /api/attachments/[id] — removes the row and the blob. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireHouseholdUser();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment || attachment.householdId !== auth.user.householdId) {
    return NextResponse.json({ status: 'error', message: 'Attachment not found' }, { status: 404 });
  }

  try {
    if (isBlobConfigured()) {
      await del(attachment.blobUrl, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch((e) => {
        // A missing blob shouldn't block removing the row.
        console.warn('Blob delete failed (continuing):', e);
      });
    }
    await prisma.attachment.delete({ where: { id } });
    return NextResponse.json({ status: 'ok', deletedId: id });
  } catch (error: unknown) {
    console.error('Failed to delete attachment:', error);
    return NextResponse.json({ status: 'error', message: getErrorMessage(error, 'Failed to delete that file') }, { status: 500 });
  }
}
