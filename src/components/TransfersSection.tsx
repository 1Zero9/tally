import React, { useMemo, useState } from 'react';
import type { TransferItem } from '../types/expense';
import { formatCurrency } from '../utils/formatters';
import { Edit2, Trash2, Plus, ArrowRight, ArrowLeftRight, Search } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { transferKindLabel } from '../utils/transfers';

interface TransfersSectionProps {
  transfers: TransferItem[];
  onEditTransfer: (transfer: TransferItem) => void;
  onDeleteTransfer: (id: string) => void;
  onOpenAddModal: () => void;
}

type KindFilter = 'all' | 'in' | 'out' | 'internal' | 'payment';
type SortBy = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in', label: 'Money in' },
  { id: 'out', label: 'Money out' },
  { id: 'internal', label: 'Between accounts' },
  { id: 'payment', label: 'Card / loan payments' },
];

function sideLabel(account: TransferItem['fromAccount'], externalLabel: string | null | undefined, fallback: string) {
  if (account) return account.name;
  return externalLabel || fallback;
}

function classify(t: TransferItem): 'in' | 'out' | 'internal' {
  if (t.fromAccountId && t.toAccountId) return 'internal';
  if (t.toAccountId) return 'in';
  return 'out';
}

export const TransfersSection: React.FC<TransfersSectionProps> = ({
  transfers,
  onEditTransfer,
  onDeleteTransfer,
  onOpenAddModal,
}) => {
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');

  const accountOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of transfers) {
      if (t.fromAccount) seen.set(t.fromAccount.id, t.fromAccount.name);
      if (t.toAccount) seen.set(t.toAccount.id, t.toAccount.name);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [transfers]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = transfers.filter((t) => {
      if (accountFilter && t.fromAccountId !== accountFilter && t.toAccountId !== accountFilter) return false;

      if (kindFilter === 'payment') {
        if (!transferKindLabel(t)) return false;
      } else if (kindFilter !== 'all') {
        if (classify(t) !== kindFilter) return false;
      }

      if (q) {
        const from = sideLabel(t.fromAccount, t.externalLabel, t.linkedIncome?.name || 'External').toLowerCase();
        const to = sideLabel(t.toAccount, t.externalLabel, t.linkedExpense?.name || 'External').toLowerCase();
        const hay = `${from} ${to} ${t.note ?? ''} ${t.externalLabel ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc': return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
        case 'amount-desc': return b.amount - a.amount;
        case 'amount-asc': return a.amount - b.amount;
        case 'date-desc':
        default: return a.date > b.date ? -1 : a.date < b.date ? 1 : 0;
      }
    });
    return filtered;
  }, [transfers, search, accountFilter, kindFilter, sortBy]);

  const isFiltered = !!search.trim() || !!accountFilter || kindFilter !== 'all';
  const clearFilters = () => { setSearch(''); setAccountFilter(''); setKindFilter('all'); };

  const title = isFiltered
    ? `Transfers (${visible.length} of ${transfers.length})`
    : `Transfers (${transfers.length})`;

  return (
    <div id="transaction-ledger" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', scrollMarginTop: '9rem' }}>
      <CollapsibleSection id="transfers-ledger" title={title}>
        {transfers.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--ha-muted)' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--ha-blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <ArrowLeftRight size={24} color="var(--ha-blue)" />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.35rem' }}>
              No money movements logged yet
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              Log a transfer — salary landing in an account, a sweep into savings, or a direct debit going out — to start building the money map.
            </p>
            <button onClick={onOpenAddModal} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              <Plus size={15} />
              <span>+ Log first transfer</span>
            </button>
          </div>
        ) : (
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
                  <Search size={14} color="var(--ha-muted)" style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search account, payee or note"
                    className="ha-input"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem 0.4rem 1.9rem', width: '100%' }}
                  />
                </div>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="ha-input"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.55rem' }}
                >
                  <option value="">All accounts</option>
                  {accountOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="ha-input"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.55rem' }}
                  title="Sort order"
                >
                  <option value="date-desc">Sort: Newest first</option>
                  <option value="date-asc">Sort: Oldest first</option>
                  <option value="amount-desc">Sort: Amount high → low</option>
                  <option value="amount-asc">Sort: Amount low → high</option>
                </select>
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
                {isFiltered && (
                  <button onClick={clearFilters} className="btn btn-ghost" style={{ fontSize: '0.76rem', padding: '0.3rem 0.5rem' }}>
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {visible.length === 0 ? (
              <div style={{ padding: '2.5rem 2rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.85rem' }}>
                No transfers match these filters.
              </div>
            ) : visible.map((item) => {
              const fromLabel = sideLabel(item.fromAccount, item.externalLabel, item.linkedIncome?.name || 'External');
              const toLabel = sideLabel(item.toAccount, item.externalLabel, item.linkedExpense?.name || 'External');
              const kindLabel = transferKindLabel(item);

              return (
                <div key={item.id} className="ha-ledger-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 320px' }}>
                    <span className="ha-color-marker" style={{ backgroundColor: !item.fromAccount ? 'var(--ha-lime)' : !item.toAccount ? 'var(--ha-red)' : 'var(--ha-blue)' }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.9rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                        <span>{fromLabel}</span>
                        <ArrowRight size={13} color="var(--ha-muted)" />
                        <span>{toLabel}</span>
                        {kindLabel && (
                          <span className="ha-badge" style={{ backgroundColor: '#fdf2e3', color: '#B45309', fontSize: '0.68rem', fontWeight: 700 }}>
                            {kindLabel}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.75rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                        <span>{item.date}</span>
                        {item.note && (
                          <>
                            <span>•</span>
                            <span style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: '110px' }}>
                    <div className="tabular-nums" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                      {formatCurrency(item.amount, item.currency)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem' }}>
                    <button
                      onClick={() => onEditTransfer(item)}
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem 0.45rem' }}
                      title="Edit record"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteTransfer(item.id)}
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem 0.45rem', color: 'var(--ha-red)' }}
                      title="Delete record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
};
