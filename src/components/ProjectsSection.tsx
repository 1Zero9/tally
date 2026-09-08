import React, { useMemo, useState } from 'react';
import type { ProjectRecord, ProjectLineItem, ExpenseItem, TransferItem, CurrencyCode, ProjectStatus } from '../types/expense';
import { formatCurrency } from '../utils/formatters';
import { convertCurrency } from '../utils/calculations';
import { CollapsibleSection } from './CollapsibleSection';
import { Hammer, Plus, Trash2, X, Check, Loader2, Link2, Pencil, Search, ChevronRight } from 'lucide-react';

interface ProjectsSectionProps {
  projects: ProjectRecord[];
  expenses: ExpenseItem[];
  transfers: TransferItem[];
  currency: CurrencyCode;
  onChanged: () => void;
}

const STATUS_LABEL: Record<ProjectStatus, string> = { planning: 'Planning', active: 'Active', done: 'Done' };
const STATUS_STYLE: Record<ProjectStatus, { bg: string; fg: string }> = {
  planning: { bg: '#eef2fc', fg: '#3155D9' },
  active: { bg: '#fdf2e3', fg: '#B45309' },
  done: { bg: '#e9f6ee', fg: '#15803D' },
};

const Bar: React.FC<{ pct: number }> = ({ pct }) => (
  <div style={{ marginTop: '0.45rem', height: '7px', borderRadius: '999px', backgroundColor: 'var(--ha-line)', overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, borderRadius: '999px', backgroundColor: pct > 100 ? 'var(--ha-red)' : 'var(--ha-lime)', transition: 'width 0.3s ease' }} />
  </div>
);

interface LinkableRow {
  kind: 'expense' | 'transfer';
  id: string;
  label: string;
  date: string;
  amount: number;
  currency: CurrencyCode;
}

interface Totals { est: number; actual: number }

function projectTotals(project: ProjectRecord, currency: CurrencyCode): Totals {
  let est = 0;
  let actual = 0;
  for (const it of project.items) {
    est += convertCurrency(it.estimatedAmount, it.currency, currency);
    for (const l of it.links) actual += convertCurrency(l.amountOverride ?? l.amount, l.currency, currency);
  }
  return { est, actual };
}

const ProjectCard: React.FC<{
  project: ProjectRecord;
  linkables: LinkableRow[];
  currency: CurrencyCode;
  onChanged: () => void;
}> = ({ project, linkables, currency, onChanged }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(project.name);
  const [addingItem, setAddingItem] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newEst, setNewEst] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editEst, setEditEst] = useState('');
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkPicks, setLinkPicks] = useState<Set<string>>(new Set());
  const [linkAmount, setLinkAmount] = useState('');

  const itemActual = (it: ProjectLineItem) =>
    it.links.reduce((s, l) => s + convertCurrency(l.amountOverride ?? l.amount, l.currency, currency), 0);
  const { est: estTotal, actual: actualTotal } = projectTotals(project, currency);
  const variance = actualTotal - estTotal;
  const status = project.status as ProjectStatus;

  const api = async (url: string, method: string, body?: unknown) => {
    setBusy(true);
    try {
      const res = await fetch(url, {
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

  const base = `/api/projects/${project.id}`;

  const addItem = async () => {
    if (!newLabel.trim()) return;
    const ok = await api(`${base}/items`, 'POST', { label: newLabel.trim(), estimatedAmount: Number(newEst) || 0 });
    if (ok) { setNewLabel(''); setNewEst(''); setAddingItem(false); }
  };

  const saveItem = async (itemId: string) => {
    const ok = await api(`${base}/items/${itemId}`, 'PATCH', { label: editLabel.trim(), estimatedAmount: Number(editEst) || 0 });
    if (ok) setEditingItemId(null);
  };

  const addLinks = async (itemId: string) => {
    if (linkPicks.size === 0) { setLinkingItemId(null); return; }
    const override = Number(linkAmount) > 0 ? Number(linkAmount) : undefined;
    const payload = [...linkPicks].map((key) => {
      const [kind, id] = key.split(':');
      return kind === 'expense' ? { expenseId: id, amountOverride: override } : { transferId: id, amountOverride: override };
    });
    const ok = await api(`${base}/items/${itemId}`, 'PATCH', { addLinks: payload });
    if (ok) { setLinkPicks(new Set()); setLinkAmount(''); setLinkingItemId(null); }
  };

  const linkedRecordIds = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const it of project.items) m.set(it.id, new Set(it.links.map((l) => `${l.kind}:${l.recordId}`)));
    return m;
  }, [project.items]);

  return (
    <div className="ha-card" style={{ overflow: 'hidden' }}>
      {/* Collapsed header row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.7rem',
          padding: '0.85rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          borderBottom: open ? '1px solid var(--ha-line)' : 'none',
        }}
      >
        <ChevronRight size={15} color="var(--ha-muted)" style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }} />
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ha-ink)', flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project.name}
        </span>
        <span className="ha-badge" style={{ fontSize: '0.66rem', fontWeight: 700, backgroundColor: STATUS_STYLE[status].bg, color: STATUS_STYLE[status].fg, flexShrink: 0 }}>
          {STATUS_LABEL[status]}
        </span>
        <span className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', flexShrink: 0 }}>
          {formatCurrency(actualTotal, currency)} / {formatCurrency(estTotal, currency)}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--ha-muted)', flexShrink: 0 }}>
          {project.items.length} item{project.items.length === 1 ? '' : 's'}
        </span>
      </button>

      {open && (
        <div style={{ padding: '0.9rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Settings row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => { if (name.trim() && name.trim() !== project.name) api(base, 'PATCH', { name: name.trim() }); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className="ha-input"
              style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0.35rem 0.5rem', flex: '1 1 180px', minWidth: 0 }}
            />
            <select value={project.status} onChange={(e) => api(base, 'PATCH', { status: e.target.value })} className="ha-input" style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem', width: 'auto' }}>
              {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <input type="date" value={project.targetDate ?? ''} onChange={(e) => api(base, 'PATCH', { targetDate: e.target.value })} className="ha-input" style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem', width: 'auto' }} title="Target date" />
            <button
              onClick={() => { if (confirm(`Delete the "${project.name}" project? Line items are removed; the linked expenses/transfers are kept.`)) api(base, 'DELETE'); }}
              className="btn btn-ghost" style={{ padding: '0.35rem 0.45rem', color: 'var(--ha-red)' }} disabled={busy} title="Delete project"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Budget summary */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--ha-muted)' }}>
              <span><strong style={{ color: 'var(--ha-ink)' }}>{formatCurrency(actualTotal, currency)}</strong> spent of {formatCurrency(estTotal, currency)} budget</span>
              <span style={{ color: variance > 0 ? 'var(--ha-red)' : variance < 0 ? 'var(--ha-lime)' : 'var(--ha-muted)', fontWeight: 600 }}>
                {variance === 0 ? 'on budget' : variance > 0 ? `${formatCurrency(variance, currency)} over` : `${formatCurrency(-variance, currency)} under`}
              </span>
            </div>
            <Bar pct={estTotal > 0 ? (actualTotal / estTotal) * 100 : 0} />
          </div>

          {/* Line items */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {project.items.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', margin: '0 0 0.5rem' }}>No line items yet.</p>
            )}
            {project.items.map((it) => {
              const actual = itemActual(it);
              const est = convertCurrency(it.estimatedAmount, it.currency, currency);
              const over = actual - est;
              if (editingItemId === it.id) {
                return (
                  <div key={it.id} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', padding: '0.5rem 0', borderBottom: '1px solid var(--ha-line)' }}>
                    <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="ha-input" style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem', flex: '1 1 160px' }} placeholder="Line item" />
                    <input value={editEst} onChange={(e) => setEditEst(e.target.value)} type="number" step="0.01" className="ha-input" style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem', width: '6.5rem' }} placeholder="Estimate" />
                    <button onClick={() => saveItem(it.id)} disabled={busy} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}><Check size={12} /> Save</button>
                    <button onClick={() => setEditingItemId(null)} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}>Cancel</button>
                  </div>
                );
              }
              return (
                <div key={it.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--ha-line)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--ha-ink)' }}>{it.label}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--ha-muted)', marginTop: '1px' }}>
                        Estimate <span className="tabular-nums">{formatCurrency(est, currency)}</span>
                        {' · '}Spent <span className="tabular-nums" style={{ color: 'var(--ha-ink)', fontWeight: 600 }}>{formatCurrency(actual, currency)}</span>
                        {it.links.length > 0 && (
                          <span style={{ color: over > 0 ? 'var(--ha-red)' : 'var(--ha-lime)', fontWeight: 600 }}>
                            {' · '}{over > 0 ? `${formatCurrency(over, currency)} over` : over < 0 ? `${formatCurrency(-over, currency)} left` : 'on estimate'}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => { setEditingItemId(it.id); setEditLabel(it.label); setEditEst(String(it.estimatedAmount)); }} className="btn btn-ghost" style={{ padding: '0.2rem 0.35rem', flexShrink: 0 }} title="Edit"><Pencil size={12} /></button>
                    <button onClick={() => api(`${base}/items/${it.id}`, 'DELETE')} disabled={busy} className="btn btn-ghost" style={{ padding: '0.2rem 0.35rem', color: 'var(--ha-red)', flexShrink: 0 }} title="Delete line item"><X size={12} /></button>
                  </div>

                  {it.links.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                      {it.links.map((l) => (
                        <span key={l.id} className="ha-badge ha-badge-neutral" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          {l.date} · {l.label} · {formatCurrency(l.amountOverride ?? l.amount, l.currency)}
                          <button onClick={() => api(`${base}/items/${it.id}`, 'PATCH', { removeLinkIds: [l.id] })} disabled={busy} style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--ha-muted)', padding: 0, display: 'inline-flex' }} title="Unlink"><X size={11} /></button>
                        </span>
                      ))}
                    </div>
                  )}

                  {linkingItemId === it.id ? (
                    <div style={{ marginTop: '0.45rem', border: '1px solid var(--ha-line)', borderRadius: 'var(--ha-radius-sm)', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={13} color="var(--ha-muted)" style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)' }} />
                        <input value={linkSearch} onChange={(e) => setLinkSearch(e.target.value)} placeholder="Search a spend or transfer to link" className="ha-input" style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem 0.35rem 1.7rem', width: '100%' }} />
                      </div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        {linkables
                          .filter((r) => !linkedRecordIds.get(it.id)?.has(`${r.kind}:${r.id}`))
                          .filter((r) => {
                            const q = linkSearch.trim().toLowerCase();
                            return !q || `${r.label} ${r.date}`.toLowerCase().includes(q);
                          })
                          .slice(0, 60)
                          .map((r) => {
                            const key = `${r.kind}:${r.id}`;
                            const on = linkPicks.has(key);
                            return (
                              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', padding: '0.2rem 0.25rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={on} onChange={() => setLinkPicks((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; })} />
                                <span style={{ flex: 1, minWidth: 0 }}>
                                  {r.date} · {r.label} · <span className="tabular-nums">{formatCurrency(r.amount, r.currency)}</span>
                                  <span style={{ color: 'var(--ha-muted)' }}> · {r.kind}</span>
                                </span>
                              </label>
                            );
                          })}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input value={linkAmount} onChange={(e) => setLinkAmount(e.target.value)} type="number" step="0.01" placeholder="Amount for this item (optional)" className="ha-input" style={{ fontSize: '0.76rem', padding: '0.35rem 0.5rem', flex: '1 1 200px' }} />
                        <button onClick={() => addLinks(it.id)} disabled={busy} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}>
                          {busy ? <Loader2 size={12} className="spin" /> : <Check size={12} />} Link {linkPicks.size || ''}
                        </button>
                        <button onClick={() => { setLinkingItemId(null); setLinkPicks(new Set()); setLinkAmount(''); }} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}>Cancel</button>
                      </div>
                      <p style={{ fontSize: '0.68rem', color: 'var(--ha-muted)', margin: 0 }}>
                        Leave the amount blank to use the record&apos;s full amount. Set it to split one payment across several line items.
                      </p>
                    </div>
                  ) : (
                    <button onClick={() => { setLinkingItemId(it.id); setLinkSearch(''); setLinkPicks(new Set()); setLinkAmount(''); }} className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.25rem 0.4rem', marginTop: '0.3rem' }}>
                      <Link2 size={11} /> Link a real spend
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {addingItem ? (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <input autoFocus value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Line item — e.g. Paint & materials" className="ha-input" style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem', flex: '1 1 180px' }} onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }} />
              <input value={newEst} onChange={(e) => setNewEst(e.target.value)} type="number" step="0.01" placeholder="Estimate" className="ha-input" style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem', width: '7rem' }} />
              <button onClick={addItem} disabled={busy || !newLabel.trim()} className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem' }}>Add</button>
              <button onClick={() => setAddingItem(false)} className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem' }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setAddingItem(true)} className="btn btn-secondary" style={{ alignSelf: 'flex-start', fontSize: '0.78rem', padding: '0.4rem 0.7rem' }}>
              <Plus size={13} /> Add line item
            </button>
          )}
        </div>
      )}
    </div>
  );
};

type StatusFilter = 'all' | ProjectStatus;
const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'planning', label: 'Planning' },
  { id: 'done', label: 'Done' },
];

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({ projects, expenses, transfers, currency, onChanged }) => {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const linkables: LinkableRow[] = useMemo(() => {
    const rows: LinkableRow[] = [];
    for (const e of expenses) {
      if (e.isPending) continue;
      rows.push({ kind: 'expense', id: e.id, label: e.name, date: e.nextRenewalDate, amount: e.amount, currency: e.currency });
    }
    for (const t of transfers) {
      const from = t.fromAccount?.name;
      const to = t.toAccount?.name;
      rows.push({ kind: 'transfer', id: t.id, label: from && to ? `${from} → ${to}` : t.externalLabel || 'Transfer', date: t.date, amount: t.amount, currency: t.currency });
    }
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [expenses, transfers]);

  const grand = useMemo(() => {
    let est = 0;
    let actual = 0;
    for (const p of projects) {
      const t = projectTotals(p, currency);
      est += t.est;
      actual += t.actual;
    }
    return { est, actual };
  }, [projects, currency]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, statusFilter, search]);

  const isFiltered = statusFilter !== 'all' || !!search.trim();

  const create = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim() }) });
      const data = await res.json();
      if (data.status === 'ok') { setNewName(''); setCreating(false); onChanged(); }
    } finally {
      setBusy(false);
    }
  };

  return (
    <CollapsibleSection
      id="home-projects"
      defaultOpen={false}
      bodyStyle={{ padding: '1.25rem 1.5rem' }}
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><Hammer size={15} /> Home projects ({projects.length})</span>}
    >
      <p style={{ fontSize: '0.82rem', color: 'var(--ha-muted)', margin: '0 0 0.75rem' }}>
        A mini project manager for a refurb, a patio, anything discrete. Break it into line items with an estimated cost, then
        link the real spend as it lands on your statements.
      </p>

      {projects.length > 0 && (
        <div style={{ fontSize: '0.82rem', color: 'var(--ha-muted)', marginBottom: '0.75rem' }}>
          {projects.length} project{projects.length === 1 ? '' : 's'} ·{' '}
          <strong style={{ color: 'var(--ha-ink)' }}>{formatCurrency(grand.actual, currency)}</strong> spent of {formatCurrency(grand.est, currency)} budgeted
        </div>
      )}

      {creating ? (
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem' }}>
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setCreating(false); }} placeholder="Project name — e.g. Main bedroom refurb" className="ha-input" style={{ fontSize: '0.85rem' }} />
          <button onClick={create} disabled={busy || !newName.trim()} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>{busy ? <Loader2 size={13} className="spin" /> : 'Create'}</button>
          <button onClick={() => setCreating(false)} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="btn btn-primary" style={{ marginBottom: '0.85rem', fontSize: '0.85rem' }}>
          <Hammer size={15} /> New project
        </button>
      )}

      {projects.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map((f) => {
              const active = statusFilter === f.id;
              return (
                <button key={f.id} onClick={() => setStatusFilter(f.id)} className="ha-chip" style={{ fontSize: '0.76rem', backgroundColor: active ? 'var(--ha-blue)' : 'var(--ha-white)', color: active ? 'var(--ha-white)' : 'var(--ha-ink)', border: '1px solid var(--ha-line)', cursor: 'pointer' }}>
                  {f.label}
                </button>
              );
            })}
          </div>
          <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: '260px' }}>
            <Search size={13} color="var(--ha-muted)" style={{ position: 'absolute', left: '0.55rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects" className="ha-input" style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem 0.35rem 1.7rem', width: '100%' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {visible.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: 'var(--ha-muted)', margin: 0 }}>
            {isFiltered ? 'No projects match these filters.' : 'No projects yet.'}
          </p>
        ) : (
          visible.map((p) => (
            <ProjectCard key={p.id} project={p} linkables={linkables} currency={currency} onChanged={onChanged} />
          ))
        )}
      </div>
    </CollapsibleSection>
  );
};
