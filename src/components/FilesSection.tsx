import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderOpen, ExternalLink, Trash2, Search, ArrowUpRight } from 'lucide-react';
import type { TabId } from './Navbar';
import { getErrorMessage } from '../lib/errors';
import { formatDate } from '../utils/formatters';
import {
  ATTACHMENT_ALLOWED_TYPES,
  ATTACHMENT_HOUSEHOLD_CEILING_BYTES,
  formatBytes,
} from '../lib/attachments';

interface FileRow {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
  owner: { type: 'expense' | 'account' | 'statementImport'; id: string; label: string } | null;
}

interface FilesSectionProps {
  onNavigate: (tab: TabId) => void;
}

type TypeFilter = 'all' | 'pdf' | 'image' | 'csv' | 'text';
type OwnerFilter = 'all' | 'expense' | 'account' | 'statementImport';
type DateFilter = 'all' | '30' | '90' | 'year';

const TYPE_GROUP: Record<string, TypeFilter> = {
  'application/pdf': 'pdf',
  'image/png': 'image', 'image/jpeg': 'image', 'image/webp': 'image', 'image/heic': 'image',
  'text/csv': 'csv',
  'text/plain': 'text',
};

const OWNER_LABEL: Record<OwnerFilter, string> = {
  all: 'All', expense: 'Expenses', account: 'Accounts', statementImport: 'Statements',
};
const OWNER_TAB: Record<string, TabId> = { expense: 'all', account: 'accounts', statementImport: 'flow' };

export const FilesSection: React.FC<FilesSectionProps> = ({ onNavigate }) => {
  const [rows, setRows] = useState<FileRow[]>([]);
  const [usage, setUsage] = useState<{ bytes: number; count: number }>({ bytes: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/attachments?all=1');
      const data = await res.json();
      if (data.status !== 'ok') throw new Error(data.message || 'Failed to load files');
      setRows(data.attachments);
      setUsage(data.usage || { bytes: 0, count: 0 });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not load your files'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"? This deletes the file.`)) return;
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status !== 'ok') throw new Error(data.message || 'Delete failed');
      setRows((prev) => prev.filter((r) => r.id !== id));
      setUsage((u) => ({ bytes: Math.max(0, u.bytes - (rows.find((r) => r.id === id)?.size || 0)), count: Math.max(0, u.count - 1) }));
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not remove that file'));
    }
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff =
      dateFilter === '30' ? now - 30 * 864e5 :
      dateFilter === '90' ? now - 90 * 864e5 :
      dateFilter === 'year' ? new Date(new Date().getFullYear(), 0, 1).getTime() :
      0;
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== 'all' && (TYPE_GROUP[r.contentType] || 'text') !== typeFilter) return false;
      if (ownerFilter !== 'all' && r.owner?.type !== ownerFilter) return false;
      if (cutoff && new Date(r.createdAt).getTime() < cutoff) return false;
      if (q && !r.fileName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, typeFilter, ownerFilter, dateFilter, query]);

  const pctUsed = Math.min(100, Math.round((usage.bytes / ATTACHMENT_HOUSEHOLD_CEILING_BYTES) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div className="ha-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="ha-badge ha-badge-blue">Document store</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1, marginTop: '0.55rem' }}>Files</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', marginTop: '0.25rem', maxWidth: '640px' }}>
              Every document attached anywhere in Tally — imported statements, scanned receipts, and anything you&apos;ve added to a bill or account.
            </p>
          </div>
          <div style={{ textAlign: 'right', minWidth: '160px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--ha-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Storage used</div>
            <div className="tabular-nums" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
              {formatBytes(usage.bytes)} <span style={{ fontWeight: 400, color: 'var(--ha-muted)' }}>/ {ATTACHMENT_HOUSEHOLD_CEILING_BYTES / (1024 * 1024)} MB</span>
            </div>
            <div style={{ height: '5px', backgroundColor: 'var(--ha-line)', borderRadius: '999px', overflow: 'hidden', marginTop: '0.35rem' }}>
              <div style={{ height: '100%', width: `${pctUsed}%`, backgroundColor: pctUsed > 90 ? 'var(--ha-red)' : 'var(--ha-blue)' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="ha-card" style={{ padding: '1.1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {(['all', 'pdf', 'image', 'csv', 'text'] as TypeFilter[]).map((t) => (
              <button key={t} className={`ha-chip${typeFilter === t ? ' active' : ''}`} style={{ fontSize: '0.76rem' }} onClick={() => setTypeFilter(t)}>
                {t === 'all' ? 'All types' : t.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', minWidth: '200px' }}>
            <Search size={14} color="var(--ha-muted)" style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              className="ha-input"
              placeholder="Search filenames"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem 0.4rem 1.9rem', width: '100%' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(['all', 'expense', 'account', 'statementImport'] as OwnerFilter[]).map((o) => (
            <button key={o} className={`ha-chip${ownerFilter === o ? ' active' : ''}`} style={{ fontSize: '0.76rem' }} onClick={() => setOwnerFilter(o)}>
              {OWNER_LABEL[o]}
            </button>
          ))}
          <span style={{ width: '1px', backgroundColor: 'var(--ha-line)', margin: '0 0.3rem' }} />
          {(['all', '30', '90', 'year'] as DateFilter[]).map((d) => (
            <button key={d} className={`ha-chip${dateFilter === d ? ' active' : ''}`} style={{ fontSize: '0.76rem' }} onClick={() => setDateFilter(d)}>
              {d === 'all' ? 'Any date' : d === 'year' ? 'This year' : `Last ${d} days`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="ha-card" style={{ padding: '1rem 1.25rem', color: 'var(--ha-red)', fontSize: '0.85rem' }}>{error}</div>
      )}

      <div className="ha-card" style={{ padding: '0.5rem 0' }}>
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.85rem' }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--ha-muted)' }}>
            <FolderOpen size={28} style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
              {rows.length === 0 ? 'No files yet' : 'Nothing matches those filters'}
            </p>
            <p style={{ fontSize: '0.82rem', maxWidth: '440px', margin: '0.35rem auto 0', lineHeight: 1.5 }}>
              {rows.length === 0
                ? 'Import a statement or scan a receipt and the original lands here automatically. You can also attach a file to any bill or account from its editor.'
                : 'Try a wider date range or clear a filter.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ha-line)', textAlign: 'left', color: 'var(--ha-muted)' }}>
                  <th style={{ padding: '0.5rem 1rem', fontWeight: 600 }}>File</th>
                  <th style={{ padding: '0.5rem 1rem', fontWeight: 600 }}>Linked to</th>
                  <th style={{ padding: '0.5rem 1rem', fontWeight: 600, textAlign: 'right' }}>Size</th>
                  <th style={{ padding: '0.5rem 1rem', fontWeight: 600 }}>Added by</th>
                  <th style={{ padding: '0.5rem 1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Date</th>
                  <th style={{ padding: '0.5rem 1rem' }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--ha-line)' }}>
                    <td style={{ padding: '0.55rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <span style={{ fontSize: '0.64rem', fontWeight: 700, color: 'var(--ha-muted)', flexShrink: 0 }}>
                          {ATTACHMENT_ALLOWED_TYPES[r.contentType] || 'FILE'}
                        </span>
                        <a
                          href={`/api/attachments/${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--ha-blue)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px', display: 'inline-block' }}
                          title={r.fileName}
                        >
                          {r.fileName}
                        </a>
                      </span>
                    </td>
                    <td style={{ padding: '0.55rem 1rem' }}>
                      {r.owner ? (
                        <button
                          onClick={() => onNavigate(OWNER_TAB[r.owner!.type] || 'overview')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', color: 'var(--ha-ink)', cursor: 'pointer', padding: 0, fontSize: '0.82rem' }}
                          title={`Go to ${OWNER_LABEL[r.owner.type as OwnerFilter]}`}
                        >
                          {r.owner.label} <ArrowUpRight size={12} color="var(--ha-muted)" />
                        </button>
                      ) : (
                        <span style={{ color: 'var(--ha-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="tabular-nums" style={{ padding: '0.55rem 1rem', textAlign: 'right', color: 'var(--ha-muted)', whiteSpace: 'nowrap' }}>{formatBytes(r.size)}</td>
                    <td style={{ padding: '0.55rem 1rem', color: 'var(--ha-muted)' }}>{r.uploadedBy?.name || '—'}</td>
                    <td style={{ padding: '0.55rem 1rem', color: 'var(--ha-muted)', whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td>
                    <td style={{ padding: '0.55rem 1rem', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <a href={`/api/attachments/${r.id}`} target="_blank" rel="noopener noreferrer" className="ha-icon-btn" title="Open"><ExternalLink size={14} /></a>
                      <button className="ha-icon-btn" style={{ color: 'var(--ha-red)' }} onClick={() => remove(r.id, r.fileName)} title="Remove"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
