import React, { useMemo, useState } from 'react';
import {
  X, Plus, Pencil, Trash2, RotateCcw, Check, Loader2,
  Tag, Home, Zap, Car, Fuel, ShoppingCart, Utensils, Coffee, Plane, Train,
  Bus, Heart, HeartPulse, Stethoscope, Pill, Dog, Cat, Baby, GraduationCap,
  BookOpen, Dumbbell, Bike, Music, Film, Tv, Gamepad2, Gift, Shirt, Scissors,
  Wrench, Hammer, Leaf, TreePine, Droplet, Flame, Wifi, Phone, Smartphone,
  Laptop, CreditCard, Landmark, PiggyBank, Wallet, Receipt, Briefcase,
  Building2, Church, Plug, Bot, Cloud, Umbrella, ShieldCheck, Sparkles,
  Star, MapPin, Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CustomCategoryItem, ExpenseItem } from '../types/expense';
import {
  CATEGORY_LIST, CATEGORY_COLOR_PRESETS, getCategoryMeta, getCustomCategories,
  getBuiltinOverride,
} from '../data/categories';
import { useModalA11y } from '../hooks/useModalA11y';

const ICON_MAP: Record<string, LucideIcon> = {
  Tag, Home, Zap, Car, Fuel, ShoppingCart, Utensils, Coffee, Plane, Train,
  Bus, Heart, HeartPulse, Stethoscope, Pill, Dog, Cat, Baby, GraduationCap,
  BookOpen, Dumbbell, Bike, Music, Film, Tv, Gamepad2, Gift, Shirt, Scissors,
  Wrench, Hammer, Leaf, TreePine, Droplet, Flame, Wifi, Phone, Smartphone,
  Laptop, CreditCard, Landmark, PiggyBank, Wallet, Receipt, Briefcase,
  Building2, Church, Plug, Bot, Cloud, Umbrella, ShieldCheck, Sparkles,
  Star, MapPin, Package,
};
const ICON_NAMES = Object.keys(ICON_MAP);

function IconGlyph({ name, size = 15, color }: { name: string; size?: number; color?: string }) {
  const Cmp = ICON_MAP[name] || Tag;
  return <Cmp size={size} color={color} />;
}

interface Draft {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const BLANK_DRAFT: Draft = {
  name: '',
  icon: 'Tag',
  color: CATEGORY_COLOR_PRESETS[0].color,
  bgColor: CATEGORY_COLOR_PRESETS[0].bgColor,
  borderColor: CATEGORY_COLOR_PRESETS[0].borderColor,
};

interface CategoryFormProps {
  draft: Draft;
  onDraftChange: (d: Draft) => void;
  showName: boolean;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
  saveLabel: string;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  draft, onDraftChange, showName, onSave, onCancel, saving, error, saveLabel,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.75rem', border: '1px solid var(--ha-line)', borderRadius: 'var(--ha-radius-sm)', backgroundColor: 'var(--ha-bg-subtle, #fafafa)' }}>
    {showName && (
      <input
        autoFocus
        className="ha-input"
        placeholder="Category name, e.g. Tolls"
        value={draft.name}
        maxLength={60}
        onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSave(); } if (e.key === 'Escape') onCancel(); }}
      />
    )}

    <div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.35rem' }}>Colour</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {CATEGORY_COLOR_PRESETS.map((p) => {
          const active = p.color.toLowerCase() === draft.color.toLowerCase();
          return (
            <button
              key={p.color}
              type="button"
              title={p.name}
              onClick={() => onDraftChange({ ...draft, color: p.color, bgColor: p.bgColor, borderColor: p.borderColor })}
              style={{
                width: '26px', height: '26px', borderRadius: '50%', backgroundColor: p.color,
                border: active ? '2px solid var(--ha-ink)' : '2px solid transparent',
                boxShadow: '0 0 0 1px var(--ha-line)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {active && <Check size={13} color="#fff" />}
            </button>
          );
        })}
      </div>
    </div>

    <div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.35rem' }}>Icon</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: '140px', overflowY: 'auto' }}>
        {ICON_NAMES.map((n) => {
          const active = n === draft.icon;
          return (
            <button
              key={n}
              type="button"
              title={n}
              onClick={() => onDraftChange({ ...draft, icon: n })}
              style={{
                width: '30px', height: '30px', borderRadius: 'var(--ha-radius-sm)',
                border: active ? '2px solid var(--ha-blue)' : '1px solid var(--ha-line)',
                backgroundColor: active ? draft.bgColor : 'var(--ha-white)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IconGlyph name={n} size={15} color={active ? draft.color : 'var(--ha-muted)'} />
            </button>
          );
        })}
      </div>
    </div>

    {error && <div style={{ fontSize: '0.75rem', color: 'var(--ha-red)' }}>{error}</div>}

    <div style={{ display: 'flex', gap: '0.4rem' }}>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || (showName && !draft.name.trim())}
        className="btn btn-primary"
        style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
      >
        {saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />} {saveLabel}
      </button>
      <button type="button" onClick={onCancel} className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}>
        Cancel
      </button>
    </div>
  </div>
);

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryRows: CustomCategoryItem[];
  expenses: ExpenseItem[];
  /** Called after any successful create/update/delete so the parent can
   *  refetch categories (and expenses, which a reassignment mutates). */
  onChanged: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen, onClose, categoryRows, expenses, onChanged,
}) => {
  const { dialogRef, dialogProps } = useModalA11y(isOpen, onClose);

  const [editingId, setEditingId] = useState<string | null>(null); // custom category id
  const [editingBuiltin, setEditingBuiltin] = useState<string | null>(null); // builtin key
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(BLANK_DRAFT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState('');
  // Set when the server rejects a delete for reassignment even though no
  // bills reference the category locally (e.g. a budget still points at it).
  const [forceReassign, setForceReassign] = useState(false);

  const custom = useMemo(() => getCustomCategories(categoryRows), [categoryRows]);

  const billCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) m.set(e.category, (m.get(e.category) || 0) + 1);
    return m;
  }, [expenses]);

  if (!isOpen) return null;

  const resetForms = () => {
    setEditingId(null);
    setEditingBuiltin(null);
    setAdding(false);
    setDeletingId(null);
    setReassignTo('');
    setForceReassign(false);
    setError('');
    setDraft(BLANK_DRAFT);
  };

  const api = async (url: string, method: string, body?: unknown) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      return { ok: res.ok && data.status === 'ok', data };
    } catch {
      return { ok: false, data: { message: 'Network error' } };
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async () => {
    const { ok, data } = await api('/api/categories', 'POST', {
      name: draft.name.trim(), icon: draft.icon,
      color: draft.color, bgColor: draft.bgColor, borderColor: draft.borderColor,
    });
    if (ok) { resetForms(); onChanged(); }
    else setError(data.message || 'Failed to create category');
  };

  const handleEditCustom = async () => {
    if (!editingId) return;
    const { ok, data } = await api(`/api/categories/${editingId}`, 'PATCH', {
      name: draft.name.trim(), icon: draft.icon,
      color: draft.color, bgColor: draft.bgColor, borderColor: draft.borderColor,
    });
    if (ok) { resetForms(); onChanged(); }
    else setError(data.message || 'Failed to save changes');
  };

  const handleSaveBuiltin = async () => {
    if (!editingBuiltin) return;
    const { ok, data } = await api('/api/categories', 'POST', {
      builtinKey: editingBuiltin, icon: draft.icon,
      color: draft.color, bgColor: draft.bgColor, borderColor: draft.borderColor,
    });
    if (ok) { resetForms(); onChanged(); }
    else setError(data.message || 'Failed to save appearance');
  };

  const handleResetBuiltin = async (key: string) => {
    const override = getBuiltinOverride(categoryRows, key);
    if (!override) return;
    const { ok, data } = await api(`/api/categories/${override.id}`, 'DELETE');
    if (ok) onChanged();
    else setError(data.message || 'Failed to reset');
  };

  const handleDelete = async (id: string) => {
    const body = reassignTo ? { reassignTo } : undefined;
    const { ok, data } = await api(`/api/categories/${id}`, 'DELETE', body);
    if (ok) { resetForms(); onChanged(); return; }
    if (data.requiresReassign) {
      // Surface the reassignment picker and let the user choose a target.
      setDeletingId(id);
      setForceReassign(true);
      setError(data.message || 'Choose a category to move existing items to.');
      return;
    }
    setError(data.message || 'Failed to delete category');
  };

  const startEditCustom = (c: CustomCategoryItem) => {
    resetForms();
    setEditingId(c.id);
    setDraft({ name: c.name, icon: c.icon, color: c.color, bgColor: c.bgColor, borderColor: c.borderColor });
  };

  const startEditBuiltin = (key: string) => {
    resetForms();
    const meta = getCategoryMeta(key, categoryRows);
    setEditingBuiltin(key);
    setDraft({ name: meta.name, icon: meta.icon, color: meta.color, bgColor: meta.bgColor, borderColor: meta.borderColor });
  };

  // Every category a user could move items into (excludes the one being deleted).
  const reassignOptions = [
    ...CATEGORY_LIST.map((c) => ({ id: c.id, name: c.name })),
    ...custom.map((c) => ({ id: c.id, name: c.name })),
  ].filter((o) => o.id !== deletingId);

  return (
    <div className="modal-overlay">
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--ha-line)' }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>Categories</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              Add your own, or recolour the built-in ones
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>

          {/* Custom categories */}
          <div>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.7rem' }}>
              Your categories
            </h4>

            {custom.length === 0 && !adding && (
              <p style={{ fontSize: '0.82rem', color: 'var(--ha-muted)', marginBottom: '0.7rem' }}>
                No custom categories yet. Add one for anything the built-in set doesn&apos;t cover.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {custom.map((c) => {
                const count = billCounts.get(c.id) || 0;
                if (editingId === c.id) {
                  return (
                    <CategoryForm
                      key={c.id}
                      draft={draft}
                      onDraftChange={setDraft}
                      showName
                      onSave={handleEditCustom}
                      onCancel={resetForms}
                      saving={busy}
                      error={error}
                      saveLabel="Save changes"
                    />
                  );
                }
                return (
                  <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.6rem 0.75rem', border: '1px solid var(--ha-line)', borderRadius: 'var(--ha-radius-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ width: '26px', height: '26px', borderRadius: 'var(--ha-radius-sm)', backgroundColor: c.bgColor, border: `1px solid ${c.borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconGlyph name={c.icon} size={14} color={c.color} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ha-ink)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--ha-muted)' }}>
                          {count === 0 ? 'Not used yet' : `${count} bill${count === 1 ? '' : 's'}`}
                        </div>
                      </div>
                      <button onClick={() => startEditCustom(c)} className="btn btn-ghost" style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem' }} title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => { resetForms(); setDeletingId(c.id); }} className="btn btn-ghost" style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem', color: 'var(--ha-red)' }} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {deletingId === c.id && (() => {
                      const needsReassign = count > 0 || forceReassign;
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px dashed var(--ha-line)', paddingTop: '0.5rem' }}>
                          {needsReassign ? (
                            <>
                              <div style={{ fontSize: '0.78rem', color: 'var(--ha-ink)' }}>
                                {count > 0
                                  ? `Move ${count} bill${count === 1 ? '' : 's'} to:`
                                  : 'Move anything still using this category to:'}
                              </div>
                              <select className="ha-input" value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} style={{ fontSize: '0.8rem' }}>
                                <option value="">— Choose a category —</option>
                                {reassignOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                              </select>
                            </>
                          ) : (
                            <div style={{ fontSize: '0.78rem', color: 'var(--ha-muted)' }}>This category isn&apos;t used by any bills.</div>
                          )}
                          {error && <div style={{ fontSize: '0.75rem', color: 'var(--ha-red)' }}>{error}</div>}
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={busy || (needsReassign && !reassignTo)}
                              className="btn btn-primary"
                              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', backgroundColor: 'var(--ha-red)', borderColor: 'var(--ha-red)' }}
                            >
                              {busy ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />} {needsReassign ? 'Move & delete' : 'Delete'}
                            </button>
                            <button onClick={resetForms} className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}>Cancel</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

              {adding ? (
                <CategoryForm
                  draft={draft}
                  onDraftChange={setDraft}
                  showName
                  onSave={handleAdd}
                  onCancel={resetForms}
                  saving={busy}
                  error={error}
                  saveLabel="Add category"
                />
              ) : (
                <button
                  onClick={() => { resetForms(); setAdding(true); setDraft(BLANK_DRAFT); }}
                  className="btn btn-secondary"
                  style={{ alignSelf: 'flex-start', fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
                >
                  <Plus size={14} /> New category
                </button>
              )}
            </div>
          </div>

          {/* Built-in categories */}
          <div style={{ borderTop: '1px solid var(--ha-line)', paddingTop: '1.1rem' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.3rem' }}>
              Built-in categories
            </h4>
            <p style={{ fontSize: '0.76rem', color: 'var(--ha-muted)', marginBottom: '0.7rem' }}>
              You can change the colour and icon. The name is fixed.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {CATEGORY_LIST.map((base) => {
                const override = getBuiltinOverride(categoryRows, base.id);
                const meta = getCategoryMeta(base.id, categoryRows);
                if (editingBuiltin === base.id) {
                  return (
                    <CategoryForm
                      key={base.id}
                      draft={draft}
                      onDraftChange={setDraft}
                      showName={false}
                      onSave={handleSaveBuiltin}
                      onCancel={resetForms}
                      saving={busy}
                      error={error}
                      saveLabel="Save appearance"
                    />
                  );
                }
                return (
                  <div key={base.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', border: '1px solid var(--ha-line)', borderRadius: 'var(--ha-radius-sm)' }}>
                    <span style={{ width: '26px', height: '26px', borderRadius: 'var(--ha-radius-sm)', backgroundColor: meta.bgColor, border: `1px solid ${meta.borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconGlyph name={meta.icon} size={14} color={meta.color} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ha-ink)' }}>{base.name}</div>
                      {override && <div style={{ fontSize: '0.74rem', color: 'var(--ha-muted)' }}>Custom appearance</div>}
                    </div>
                    {override && (
                      <button onClick={() => handleResetBuiltin(base.id)} disabled={busy} className="btn btn-ghost" style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem' }} title="Reset to default">
                        <RotateCcw size={13} />
                      </button>
                    )}
                    <button onClick={() => startEditBuiltin(base.id)} className="btn btn-ghost" style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem' }} title="Customise">
                      <Pencil size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
