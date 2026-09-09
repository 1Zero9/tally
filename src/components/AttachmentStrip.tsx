import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Paperclip, Upload, X, ExternalLink, Loader2 } from 'lucide-react';
import { getErrorMessage } from '../lib/errors';
import { ATTACHMENT_ALLOWED_TYPES, ATTACHMENT_MAX_BYTES, formatBytes, type AttachmentOwnerType } from '../lib/attachments';

interface AttachmentItem {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
}

interface AttachmentStripProps {
  ownerType: AttachmentOwnerType;
  ownerId: string;
  /** heading shown above the list */
  label?: string;
  /** Drop the per-file card chrome (border + tint) — for use inside an
   *  already-boxed container so it's not a box-in-a-box. */
  flat?: boolean;
}

const ACCEPT = Object.keys(ATTACHMENT_ALLOWED_TYPES).join(',');

/**
 * Reusable "files attached to this record" panel: lists the record's
 * attachments, uploads new ones, deletes. Files open through the
 * authenticated /api/attachments/[id] route (never a direct blob URL).
 */
export const AttachmentStrip: React.FC<AttachmentStripProps> = ({ ownerType, ownerId, label = 'Attachments', flat = false }) => {
  const [items, setItems] = useState<AttachmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/attachments?${ownerType}=${encodeURIComponent(ownerId)}`);
      const data = await res.json();
      if (data.status === 'ok') setItems(data.attachments);
    } catch {
      /* leave list as-is */
    } finally {
      setLoading(false);
    }
  }, [ownerType, ownerId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const upload = async (file: File) => {
    if (file.size > ATTACHMENT_MAX_BYTES) {
      setError(`"${file.name}" is over the ${ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB limit.`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('ownerType', ownerType);
      form.append('ownerId', ownerId);
      const res = await fetch('/api/attachments', { method: 'POST', body: form });
      const data = await res.json();
      if (data.status !== 'ok') throw new Error(data.message || 'Upload failed');
      setItems((prev) => [data.attachment, ...prev]);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not upload that file'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"? This deletes the file.`)) return;
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status !== 'ok') throw new Error(data.message || 'Delete failed');
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not remove that file'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
          <Paperclip size={13} /> {label}{items.length > 0 ? ` (${items.length})` : ''}
        </span>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 size={12} className="spin" /> : <Upload size={12} />} Add file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
      </div>

      {error && <p style={{ fontSize: '0.75rem', color: 'var(--ha-red)', margin: 0 }}>{error}</p>}

      {loading ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', margin: 0 }}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', margin: 0 }}>
          No files yet. Attach a statement, receipt or policy — PDF, image, CSV or text, up to {ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: flat ? 0 : '0.3rem' }}>
          {items.map((a, i) => (
            <li
              key={a.id}
              style={
                flat
                  ? {
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.4rem 0.15rem',
                      borderTop: i === 0 ? 'none' : '1px solid var(--ha-line)',
                    }
                  : {
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.4rem 0.6rem', borderRadius: 'var(--ha-radius-sm)',
                      border: '1px solid var(--ha-line)', backgroundColor: 'var(--ha-paper)',
                    }
              }
            >
              <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--ha-muted)', flexShrink: 0 }}>
                {ATTACHMENT_ALLOWED_TYPES[a.contentType] || 'FILE'}
              </span>
              <a
                href={`/api/attachments/${a.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ flex: 1, minWidth: 0, fontSize: '0.8rem', color: 'var(--ha-blue)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={a.fileName}
              >
                {a.fileName}
              </a>
              <span style={{ fontSize: '0.7rem', color: 'var(--ha-muted)', flexShrink: 0 }}>{formatBytes(a.size)}</span>
              <a href={`/api/attachments/${a.id}`} target="_blank" rel="noopener noreferrer" className="ha-icon-btn" style={{ flexShrink: 0 }} title="Open">
                <ExternalLink size={13} />
              </a>
              <button
                type="button"
                className="ha-icon-btn"
                style={{ flexShrink: 0, color: 'var(--ha-red)' }}
                onClick={() => remove(a.id, a.fileName)}
                title="Remove"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
