import React, { useState } from 'react';
import { X, Loader2, GitMerge, Check, Search } from 'lucide-react';
import type { CustomCategoryItem, ExpenseItem } from '../types/expense';
import type { DuplicateGroup } from '../utils/duplicateExpenses';
import { formatCurrency, formatBillingCycle, formatDate } from '../utils/formatters';
import { getCategoryMeta } from '../data/categories';
import { useOverlayClose } from '../hooks/useOverlayClose';

interface MergeDuplicatesModalProps {
  groups: DuplicateGroup[];
  customCategories?: CustomCategoryItem[];
  onClose: () => void;
  /** Called after a successful merge so the parent can refetch. */
  onMerged: () => void;
}

/** The record most worth keeping — one tied to a goal or a tracked
 *  contract, otherwise the oldest. */
function pickKeeper(items: ExpenseItem[]): string {
  const curated = items.find((e) => e.linkedGoalId || e.contractEndDate);
  if (curated) return curated.id;
  const oldest = [...items].sort((a, b) =>
    (a.createdAt || '').localeCompare(b.createdAt || '')
  )[0];
  return (oldest || items[0]).id;
}

export const MergeDuplicatesModal: React.FC<MergeDuplicatesModalProps> = ({
  groups,
  customCategories = [],
  onClose,
  onMerged,
}) => {
  const overlayHandlers = useOverlayClose(onClose);
  const [keepBy, setKeepBy] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.map((g) => [g.key, pickKeeper(g.items)]))
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const setKeep = (groupKey: string, id: string) =>
    setKeepBy((prev) => ({ ...prev, [groupKey]: id }));

  const mergeGroup = async (group: DuplicateGroup) => {
    const keepId = keepBy[group.key] || pickKeeper(group.items);
    const mergeIds = group.items.map((i) => i.id).filter((id) => id !== keepId);
    if (mergeIds.length === 0) return;
    setBusyKey(group.key);
    setError(null);
    try {
      const res = await fetch('/api/expenses/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepId, mergeIds }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setDoneKeys((prev) => new Set(prev).add(group.key));
        onMerged();
      } else {
        setError(data.message || 'Could not merge those records.');
      }
    } catch {
      setError('Could not merge those records — please try again.');
    } finally {
      setBusyKey(null);
    }
  };

  const q = query.trim().toLowerCase();
  const pending = groups.filter((g) => !doneKeys.has(g.key));
  const visibleGroups = q
    ? pending.filter((g) => {
        const s = g.items[0];
        return s.name.toLowerCase().includes(q) || (s.vendor?.toLowerCase().includes(q) ?? false);
      })
    : pending;
  const allDone = pending.length === 0;

  return (
    <div className="modal-overlay" {...overlayHandlers}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--ha-line)' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ha-ink)' }}>Merge duplicates</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              Records that look like the same bill added more than once. Pick one to keep — its payments, matched statement rows, receipts and links move onto it; the rest are deleted.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!allDone && pending.length > 3 && (
          <div style={{ padding: '0.85rem 1.5rem 0' }}>
            <div className="ha-ledger-search">
              <Search size={15} color="var(--ha-muted)" style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search these"
                aria-label="Search duplicates"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ha-input"
                style={{ paddingLeft: '2.2rem', paddingRight: query ? '2rem' : '0.85rem', width: '100%', fontSize: '0.85rem' }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{ position: 'absolute', right: '0.6rem', background: 'none', border: 'none', color: 'var(--ha-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ padding: '1rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', maxHeight: '65vh', overflowY: 'auto' }}>
          {error && (
            <div style={{ fontSize: '0.8rem', color: 'var(--ha-red)', backgroundColor: 'var(--ha-red-tint)', borderRadius: 'var(--ha-radius-sm)', padding: '0.5rem 0.75rem' }}>
              {error}
            </div>
          )}

          {allDone ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--ha-muted)', fontSize: '0.9rem' }}>
              <Check size={22} style={{ color: 'var(--ha-blue)', marginBottom: '0.5rem' }} />
              <div>All duplicates merged.</div>
              <button onClick={onClose} className="btn btn-primary" style={{ fontSize: '0.8rem', marginTop: '1rem' }}>Done</button>
            </div>
          ) : visibleGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--ha-muted)', fontSize: '0.85rem' }}>
              None of the {pending.length} groups match &ldquo;{query.trim()}&rdquo;.
            </div>
          ) : (
            visibleGroups.map((group) => {
              const sample = group.items[0];
              const cat = getCategoryMeta(sample.category, customCategories);
              const keepId = keepBy[group.key] || pickKeeper(group.items);
              const busy = busyKey === group.key;
              return (
                <div key={group.key} style={{ border: '1px solid var(--ha-line)', borderRadius: 'var(--ha-radius-md)', overflow: 'hidden' }}>
                  <div style={{ padding: '0.6rem 0.85rem', backgroundColor: '#fafaf7', borderBottom: '1px solid var(--ha-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--ha-ink)', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: sample.color || cat.color, display: 'inline-block' }} />
                      {sample.name}
                    </span>
                    <span className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--ha-muted)' }}>
                      {formatCurrency(sample.amount, sample.currency)}{formatBillingCycle(sample.billingCycle)} · {group.items.length} copies
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {group.items.map((item) => (
                      <label
                        key={item.id}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.6rem 0.85rem', borderBottom: '1px solid var(--ha-line)', cursor: 'pointer', backgroundColor: item.id === keepId ? 'var(--ha-blue-light)' : undefined }}
                      >
                        <input
                          type="radio"
                          name={`keep-${group.key}`}
                          checked={item.id === keepId}
                          onChange={() => setKeep(group.key, item.id)}
                          style={{ marginTop: '2px' }}
                        />
                        <span style={{ fontSize: '0.8rem', lineHeight: 1.45 }}>
                          <span style={{ color: 'var(--ha-ink)', fontWeight: 600 }}>
                            {item.id === keepId ? 'Keep this one' : 'Merge in'}
                          </span>
                          <br />
                          <span style={{ color: 'var(--ha-muted)' }}>
                            Due {formatDate(item.nextRenewalDate)}
                            {' · '}
                            {item.statementImport?.label
                              ? `From “${item.statementImport.label}”`
                              : item.statementImportId
                                ? 'From a statement import'
                                : 'Added manually'}
                            {item.createdBy?.name ? ` · ${item.createdBy.name.split(' ')[0]}` : ''}
                            {item.linkedGoalId ? ' · linked to a goal' : ''}
                            {item.contractEndDate ? ' · has a contract end date' : ''}
                            {!item.isActive ? ' · paused' : ''}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <div style={{ padding: '0.6rem 0.85rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => mergeGroup(group)}
                      disabled={busy}
                      className="btn btn-primary"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem' }}
                    >
                      {busy ? <Loader2 size={13} className="spin" /> : <GitMerge size={13} />}
                      {' '}Merge {group.items.length - 1} into the kept record
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
