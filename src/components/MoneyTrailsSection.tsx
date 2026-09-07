import React, { useMemo, useState } from 'react';
import type { MoneyTrailItem, TransferItem, CurrencyCode } from '../types/expense';
import { formatCurrency } from '../utils/formatters';
import { CollapsibleSection } from './CollapsibleSection';
import { Route, Plus, Trash2, X, Check, Loader2, ArrowRight, Clock } from 'lucide-react';
import { transferKindLabel } from '../utils/transfers';

interface MoneyTrailsSectionProps {
  trails: MoneyTrailItem[];
  transfers: TransferItem[];
  currency: CurrencyCode;
  onChanged: () => void;
}

function endpointLabel(t: TransferItem, side: 'from' | 'to'): string {
  const account = side === 'from' ? t.fromAccount : t.toAccount;
  if (account) return account.name;
  if (t.externalLabel) return t.externalLabel;
  if (side === 'from' && t.linkedIncome) return t.linkedIncome.name;
  if (side === 'to' && t.linkedExpense) return t.linkedExpense.name;
  return 'External';
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a);
  if (Number.isNaN(ms)) return 0;
  return Math.round(ms / 86_400_000);
}

/** Adjacent hops where the money landed in an account and later left it. */
function restingPeriods(hops: TransferItem[]): { account: string; amount: number; currency: CurrencyCode; days: number; from: string; to: string }[] {
  const out: { account: string; amount: number; currency: CurrencyCode; days: number; from: string; to: string }[] = [];
  for (let i = 0; i < hops.length - 1; i++) {
    const arrive = hops[i];
    const leave = hops[i + 1];
    if (arrive.toAccountId && arrive.toAccountId === leave.fromAccountId) {
      out.push({
        account: arrive.toAccount?.name || 'account',
        amount: arrive.amount,
        currency: arrive.currency,
        days: daysBetween(arrive.date, leave.date),
        from: arrive.date,
        to: leave.date,
      });
    }
  }
  return out;
}

const MoneyTrailCard: React.FC<{
  trail: MoneyTrailItem;
  transfers: TransferItem[];
  currency: CurrencyCode;
  onChanged: () => void;
}> = ({ trail, transfers, currency, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(trail.name);
  const [notes, setNotes] = useState(trail.notes ?? '');
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const hops = trail.transfers; // already date-ordered by the API
  const memberIds = useMemo(() => new Set(hops.map((h) => h.id)), [hops]);

  const moneyIn = hops.filter((h) => !h.fromAccountId).reduce((s, h) => s + h.amount, 0);
  const moneyOut = hops.filter((h) => !h.toAccountId).reduce((s, h) => s + h.amount, 0);
  const resting = restingPeriods(hops);

  const addable = transfers
    .filter((t) => !memberIds.has(t.id))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const api = async (method: string, body?: unknown) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/trails/${trail.id}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (data.status === 'ok') onChanged();
      return data.status === 'ok';
    } finally {
      setBusy(false);
    }
  };

  const saveMeta = async () => {
    if (name.trim() === trail.name && (notes.trim() || '') === (trail.notes || '')) return;
    await api('PATCH', { name: name.trim(), notes: notes.trim() });
  };

  return (
    <div className="ha-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveMeta}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="ha-input"
            style={{ fontSize: '1rem', fontWeight: 700, padding: '0.3rem 0.5rem', border: '1px solid transparent', background: 'transparent' }}
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveMeta}
            placeholder="Add a note (optional)"
            className="ha-input"
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem', border: '1px solid transparent', background: 'transparent', color: 'var(--ha-muted)' }}
          />
        </div>
        <button
          onClick={() => { if (confirm(`Delete the "${trail.name}" trail? The transfers in it are kept — only the grouping is removed.`)) api('DELETE'); }}
          className="btn btn-ghost"
          style={{ padding: '0.35rem 0.45rem', color: 'var(--ha-red)' }}
          title="Delete trail"
          disabled={busy}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {hops.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--ha-muted)' }}>No hops yet — add the transfers that make up this trail.</p>
      ) : (
        <>
          {/* The path */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem', fontSize: '0.8rem' }}>
            <span className="ha-badge ha-badge-blue" style={{ whiteSpace: 'nowrap' }}>{endpointLabel(hops[0], 'from')}</span>
            {hops.map((h) => (
              <React.Fragment key={h.id}>
                <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', color: 'var(--ha-muted)', fontSize: '0.68rem', lineHeight: 1.2 }}>
                  <span className="tabular-nums" style={{ color: 'var(--ha-ink)', fontWeight: 600 }}>{formatCurrency(h.amount, h.currency)}</span>
                  <ArrowRight size={13} />
                  <span>{h.date}</span>
                </span>
                <span className="ha-badge ha-badge-blue" style={{ whiteSpace: 'nowrap' }}>{endpointLabel(h, 'to')}</span>
              </React.Fragment>
            ))}
          </div>

          {/* Where the money rested */}
          {resting.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {resting.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', color: 'var(--ha-muted)' }}>
                  <Clock size={12} style={{ flexShrink: 0 }} />
                  <span>
                    <strong style={{ color: 'var(--ha-ink)' }}>{formatCurrency(r.amount, r.currency)}</strong> sat in {r.account} for{' '}
                    {r.days === 0 ? 'under a day' : `${r.days} day${r.days === 1 ? '' : 's'}`} ({r.from} → {r.to})
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Endpoints summary */}
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--ha-muted)' }}>
            {moneyIn > 0 && <span>In: <strong style={{ color: 'var(--ha-ink)' }}>{formatCurrency(moneyIn, currency)}</strong></span>}
            {moneyOut > 0 && <span>Out: <strong style={{ color: 'var(--ha-ink)' }}>{formatCurrency(moneyOut, currency)}</strong></span>}
            <span>{hops.length} hop{hops.length === 1 ? '' : 's'}</span>
          </div>

          {/* Hop list with remove */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {hops.map((h) => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', padding: '0.3rem 0.4rem', borderRadius: 'var(--ha-radius-sm)', background: 'var(--ha-bg-subtle, #fafafa)' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  {h.date} · {endpointLabel(h, 'from')} <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /> {endpointLabel(h, 'to')} · <span className="tabular-nums">{formatCurrency(h.amount, h.currency)}</span>
                  {transferKindLabel(h) && <span style={{ color: '#B45309', fontWeight: 700 }}> · {transferKindLabel(h)}</span>}
                </span>
                <button
                  onClick={() => api('PATCH', { removeTransferIds: [h.id] })}
                  className="btn btn-ghost"
                  style={{ padding: '0.2rem 0.35rem' }}
                  title="Remove this hop from the trail"
                  disabled={busy}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add hops */}
      {adding ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--ha-line)', borderRadius: 'var(--ha-radius-sm)', padding: '0.6rem' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Add transfers to this trail
          </div>
          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {addable.length === 0 && <div style={{ fontSize: '0.78rem', color: 'var(--ha-muted)' }}>No other transfers to add.</div>}
            {addable.map((t) => {
              const on = picked.has(t.id);
              return (
                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', cursor: 'pointer', padding: '0.25rem 0.3rem' }}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setPicked((prev) => {
                      const next = new Set(prev);
                      if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                      return next;
                    })}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {t.date} · {endpointLabel(t, 'from')} <ArrowRight size={11} style={{ verticalAlign: 'middle' }} /> {endpointLabel(t, 'to')} · <span className="tabular-nums">{formatCurrency(t.amount, t.currency)}</span>
                    {t.trailId && <span style={{ color: 'var(--ha-amber, #B45309)' }}> · in another trail</span>}
                  </span>
                </label>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={async () => {
                if (picked.size === 0) { setAdding(false); return; }
                const ok = await api('PATCH', { addTransferIds: [...picked] });
                if (ok) { setPicked(new Set()); setAdding(false); }
              }}
              className="btn btn-primary"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem' }}
              disabled={busy}
            >
              {busy ? <Loader2 size={13} className="spin" /> : <Check size={13} />} Add {picked.size > 0 ? picked.size : ''}
            </button>
            <button onClick={() => { setAdding(false); setPicked(new Set()); }} className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="btn btn-secondary" style={{ alignSelf: 'flex-start', fontSize: '0.78rem', padding: '0.4rem 0.7rem' }}>
          <Plus size={13} /> Add hops
        </button>
      )}
    </div>
  );
};

export const MoneyTrailsSection: React.FC<MoneyTrailsSectionProps> = ({ trails, transfers, currency, onChanged }) => {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res = await fetch('/api/trails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setNewName('');
        setCreating(false);
        onChanged();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <CollapsibleSection
      id="money-trails"
      title={`Money trails (${trails.length})`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--ha-muted)', margin: 0 }}>
          Chain a set of transfers into one path — e.g. salary into BOI, swept to PTSB, moved back, then used to pay the card —
          to see where the money sat, and for how long, at each stop. Trails don&apos;t change any totals.
        </p>

        {creating ? (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setCreating(false); }}
              placeholder="Trail name — e.g. February card payment"
              className="ha-input"
              style={{ fontSize: '0.85rem' }}
            />
            <button onClick={create} disabled={busy || !newName.trim()} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
              {busy ? <Loader2 size={13} className="spin" /> : 'Create'}
            </button>
            <button onClick={() => setCreating(false)} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} className="btn btn-primary" style={{ alignSelf: 'flex-start', fontSize: '0.85rem' }}>
            <Route size={15} /> New trail
          </button>
        )}

        {trails.map((trail) => (
          <MoneyTrailCard key={trail.id} trail={trail} transfers={transfers} currency={currency} onChanged={onChanged} />
        ))}
      </div>
    </CollapsibleSection>
  );
};
