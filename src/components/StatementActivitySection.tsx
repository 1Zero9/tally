import React, { useEffect, useMemo, useState } from 'react';
import type { StatementActivityItem } from '../types/expense';
import { formatCurrency } from '../utils/formatters';
import { CollapsibleSection } from './CollapsibleSection';
import { RotateCcw, Loader2, Search, History } from 'lucide-react';

interface StatementActivitySectionProps {
  /** Any value that changes when statement-derived data changes, so the feed re-pulls. */
  reloadSignal: number;
  onChanged: () => void;
}

type KindFilter = 'all' | 'bill' | 'expense' | 'transfer' | 'income' | 'ignored';

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'bill', label: 'Bills' },
  { id: 'expense', label: 'Expenses' },
  { id: 'transfer', label: 'Transfers' },
  { id: 'income', label: 'Income' },
  { id: 'ignored', label: 'Ignored' },
];

function kindOf(action: string): KindFilter {
  const a = action.toLowerCase();
  if (a.includes('ignored') || a.includes('duplicate')) return 'ignored';
  if (a.includes('bill')) return 'bill';
  if (a.includes('income')) return 'income';
  if (a.includes('transfer')) return 'transfer';
  if (a.includes('expense')) return 'expense';
  return 'expense';
}

export const StatementActivitySection: React.FC<StatementActivitySectionProps> = ({ reloadSignal, onChanged }) => {
  const [items, setItems] = useState<StatementActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');

  const fetchActivity = async () => {
    setError('');
    try {
      const res = await fetch('/api/statements/activity');
      const data = await res.json();
      if (data.status === 'ok' && Array.isArray(data.activity)) {
        setItems(data.activity as StatementActivityItem[]);
      } else {
        setError(data.message || 'Failed to load statement activity');
      }
    } catch {
      setError('Failed to load statement activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [reloadSignal]);

  const undo = async (item: StatementActivityItem) => {
    const what = item.action.toLowerCase().startsWith('added')
      ? ` This deletes the ${item.action.replace('Added as ', '')} it created.`
      : item.action.toLowerCase().startsWith('linked')
        ? ' The linked record itself is kept.'
        : '';
    if (!confirm(`Undo "${item.merchant}" (${item.action})?${what}\n\nThe statement row goes back to "needs review".`)) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/statements/${item.importId}/transactions/${item.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        await fetchActivity();
        onChanged();
      } else {
        alert(data.message || 'Failed to undo');
      }
    } finally {
      setBusyId(null);
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (kindFilter !== 'all' && kindOf(it.action) !== kindFilter) return false;
      if (q) {
        const hay = `${it.merchant} ${it.action} ${it.target ?? ''} ${it.importLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, kindFilter]);

  const isFiltered = !!search.trim() || kindFilter !== 'all';

  return (
    <CollapsibleSection
      id="statement-activity"
      defaultOpen={false}
      bodyStyle={{ padding: '1.25rem 1.5rem' }}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <History size={15} /> Statement activity{items.length ? ` (${isFiltered ? `${visible.length} of ${items.length}` : items.length})` : ''}
        </span>
      }
    >
      <p style={{ fontSize: '0.82rem', color: 'var(--ha-muted)', margin: '0 0 0.85rem' }}>
        Everything you&apos;ve added, logged or ignored from a statement, newest first — across every import. Undo anything that
        was processed by mistake without hunting for which statement it came from.
      </p>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)' }}>
          <Loader2 size={18} className="spin" />
        </div>
      ) : error ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--ha-red)', fontSize: '0.85rem' }}>
          {error} — <button onClick={fetchActivity} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>retry</button>
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.85rem' }}>
          Nothing resolved from a statement yet.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '0.85rem' }}>
            <div style={{ position: 'relative', maxWidth: '320px' }}>
              <Search size={14} color="var(--ha-muted)" style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search merchant, action or statement"
                className="ha-input"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem 0.4rem 1.9rem', width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {KIND_FILTERS.map((f) => {
                const active = kindFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setKindFilter(f.id)}
                    className="ha-chip"
                    style={{
                      fontSize: '0.76rem',
                      backgroundColor: active ? 'var(--ha-blue)' : 'var(--ha-white)',
                      color: active ? 'var(--ha-white)' : 'var(--ha-ink)',
                      border: '1px solid var(--ha-line)',
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {visible.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.85rem' }}>
              Nothing matches these filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {visible.map((it) => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--ha-line)' }}>
                  <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>{it.merchant}</span>
                      <span className="ha-badge" style={{ backgroundColor: '#eef2fc', color: '#3155D9', fontSize: '0.68rem', fontWeight: 700 }}>{it.action}</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                      {it.date} · <span className="tabular-nums">{formatCurrency(it.amount, it.currency)}</span>
                      {it.target ? ` · ${it.target}` : ''} · from “{it.importLabel}”
                    </div>
                  </div>
                  <button
                    onClick={() => undo(it)}
                    disabled={busyId === it.id}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.76rem', padding: '0.3rem 0.55rem', flexShrink: 0 }}
                    title="Undo this — sends the row back to needs-review"
                  >
                    {busyId === it.id ? <Loader2 size={12} className="spin" /> : <RotateCcw size={12} />} Undo
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </CollapsibleSection>
  );
};
