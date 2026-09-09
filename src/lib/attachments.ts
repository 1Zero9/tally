/**
 * Shared config + helpers for file attachments (statement PDFs, receipts,
 * insurance policies…). Bytes live in a private Vercel Blob store; rows in
 * the Attachment table. Files are only ever served back through the
 * authenticated /api/attachments/[id] route, never a direct blob URL.
 */

/** Per-file size cap. */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Total bytes one household may store across all attachments. */
export const ATTACHMENT_HOUSEHOLD_CEILING_BYTES = 250 * 1024 * 1024; // 250 MB

/** Accepted MIME types → a short label, for display. */
export const ATTACHMENT_ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WEBP',
  'image/heic': 'HEIC',
  'text/csv': 'CSV',
  'text/plain': 'TXT',
};

export type AttachmentOwnerType = 'expense' | 'account' | 'statementImport';
export const ATTACHMENT_OWNER_TYPES: AttachmentOwnerType[] = ['expense', 'account', 'statementImport'];

/** True if the token needed to read/write the blob store is configured. */
export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/** Strips path separators and non-printing characters from a filename. */
export function safeFileName(raw: string): string {
  const base = (raw || 'file')
    .split('')
    .filter((ch) => ch.charCodeAt(0) >= 0x20 && ch.charCodeAt(0) !== 0x7f)
    .join('')
    .replace(/[\\/]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return base.slice(0, 160) || 'file';
}

/** Human-readable size, e.g. "1.4 MB". */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
