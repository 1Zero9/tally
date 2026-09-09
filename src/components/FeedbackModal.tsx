import React, { useState, useEffect } from 'react';
import type { BugReportItem, BugSeverity, FeedbackType } from '../types/expense';
import { X, Bug, Lightbulb, Sparkles, Plus, Download, Trash2, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

const SEVERITY_OPTIONS: { id: BugSeverity; label: string }[] = [
  { id: 'LOW', label: 'Low' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'HIGH', label: 'High' },
  { id: 'CRITICAL', label: 'Critical' },
];

const AREA_OPTIONS: string[] = [
  'Overview',
  'Spending',
  'Bills',
  'Income',
  'Accounts',
  'Opportunities',
  'Transactions',
  'Progress',
  'Plans',
  'Money Map',
  'Admin',
  'Other',
];

const SEVERITY_BADGE_CLASS: Record<BugSeverity, string> = {
  LOW: 'ha-badge-neutral',
  MEDIUM: 'ha-badge-blue',
  HIGH: 'ha-badge-red',
  CRITICAL: 'ha-badge-red',
};

const TYPE_META: Record<FeedbackType, {
  label: string;
  labelPlural: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  badgeClass: string;
  placeholder: string;
  doneWord: string;
}> = {
  IDEA: { label: 'Idea', labelPlural: 'Ideas', icon: Lightbulb, badgeClass: 'ha-badge-blue', placeholder: "e.g. Let us split a bill's cost between two goals", doneWord: 'Done' },
  FEATURE: { label: 'Feature', labelPlural: 'Feature requests', icon: Sparkles, badgeClass: 'ha-badge-lime', placeholder: 'e.g. CSV export for the Money Map', doneWord: 'Done' },
  BUG: { label: 'Bug', labelPlural: 'Bugs', icon: Bug, badgeClass: 'ha-badge-red', placeholder: 'e.g. Add account modal closes on backdrop click and loses input', doneWord: 'Fixed' },
};

type TypeFilter = 'ALL' | FeedbackType;

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function buildMarkdown(items: BugReportItem[]): string {
  const renderItem = (b: BugReportItem, idx: number) => {
    const lines = [
      `### ${idx + 1}. ${b.title}`,
      '',
      `- **Priority:** ${b.severity}`,
      `- **Area:** ${b.area || '—'}`,
      `- **Reported:** ${formatDate(b.createdAt)}${b.createdBy?.name ? ` by ${b.createdBy.name}` : ''}`,
    ];
    if (b.description) {
      lines.push('', b.description.trim());
    }
    return lines.join('\n');
  };

  const sections: string[] = [
    '# Tally feedback',
    '',
    `Exported ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}`,
    '',
  ];

  (['IDEA', 'FEATURE', 'BUG'] as FeedbackType[]).forEach((type) => {
    const meta = TYPE_META[type];
    const ofType = items.filter((b) => b.type === type);
    if (ofType.length === 0) return;
    const open = ofType.filter((b) => b.status === 'OPEN');
    const done = ofType.filter((b) => b.status === 'FIXED');

    sections.push(`## ${meta.labelPlural} (${ofType.length})`, '');
    sections.push(`### Open (${open.length})`, '');
    if (open.length === 0) {
      sections.push('_None open._', '');
    } else {
      open.forEach((b, i) => sections.push(renderItem(b, i), ''));
    }
    if (done.length > 0) {
      sections.push(`### ${meta.doneWord} (${done.length})`, '');
      done.forEach((b, i) => sections.push(renderItem(b, i), ''));
    }
  });

  return sections.join('\n');
}

function downloadMarkdown(items: BugReportItem[]) {
  const content = buildMarkdown(items);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tally-feedback-${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [items, setItems] = useState<BugReportItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('');
  const [severity, setSeverity] = useState<BugSeverity>('MEDIUM');
  const [type, setType] = useState<FeedbackType>('BUG');

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/bugs');
      const data = await res.json();
      if (data.status === 'ok' && Array.isArray(data.bugs)) {
        setItems(data.bugs);
      }
    } catch (err) {
      console.error('Failed to load feedback items:', err);
    }
  };

  useEffect(() => {
    if (isOpen) fetchItems();
  }, [isOpen]);

  const { dialogRef, dialogProps } = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setArea('');
    setSeverity('MEDIUM');
    setIsAdding(false);
  };

  const openAddForm = () => {
    setType(typeFilter === 'ALL' ? 'BUG' : typeFilter);
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), area: area.trim(), severity, type }),
      });
      const data = await res.json();
      if (data.status === 'ok' && data.bug) {
        setItems((prev) => [data.bug, ...prev]);
        resetForm();
      }
    } catch (err) {
      console.error('Failed to save feedback item:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (item: BugReportItem) => {
    const nextStatus = item.status === 'OPEN' ? 'FIXED' : 'OPEN';
    setItems((prev) => prev.map((b) => (b.id === item.id ? { ...b, status: nextStatus } : b)));
    try {
      await fetch('/api/bugs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: nextStatus }),
      });
    } catch (err) {
      console.error('Failed to update feedback item:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((b) => b.id !== id));
    try {
      await fetch(`/api/bugs?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete feedback item:', err);
    }
  };

  const countByType = (t: TypeFilter) => (t === 'ALL' ? items.length : items.filter((b) => b.type === t).length);
  const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'IDEA', label: 'Ideas' },
    { id: 'FEATURE', label: 'Features' },
    { id: 'BUG', label: 'Bugs' },
  ];

  const visibleItems = typeFilter === 'ALL' ? items : items.filter((b) => b.type === typeFilter);
  const openItems = visibleItems.filter((b) => b.status === 'OPEN');
  const doneItems = visibleItems.filter((b) => b.status === 'FIXED');

  return (
    <div className="modal-overlay">
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '660px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--ha-line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Lightbulb size={20} color="var(--ha-blue)" />
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
                Feedback
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                Ideas, feature requests, and bugs — all in one place, exportable to Markdown
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div className="ha-ledger-status" role="group" aria-label="Filter by type">
            {TYPE_FILTERS.map(({ id, label }) => {
              const count = countByType(id);
              const isSelected = typeFilter === id;
              return (
                <button
                  key={id}
                  onClick={() => setTypeFilter(id)}
                  disabled={count === 0 && id !== 'ALL'}
                  className={isSelected ? 'is-active' : ''}
                  aria-pressed={isSelected}
                >
                  <span>{label}</span>
                  <span className="ha-ledger-status-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button onClick={openAddForm} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
              <Plus size={14} />
              <span>Add</span>
            </button>
            <button
              onClick={() => downloadMarkdown(items)}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem' }}
              disabled={items.length === 0}
            >
              <Download size={14} />
              <span>Export Markdown</span>
            </button>
          </div>
        </div>

        {isAdding && (
          <form
            onSubmit={handleSubmit}
            style={{
              margin: '1rem 1.5rem 0',
              padding: '1rem',
              borderRadius: 'var(--ha-radius-md)',
              backgroundColor: '#fafaf7',
              border: '1px solid var(--ha-line)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.3rem' }}>
                Type
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['IDEA', 'FEATURE', 'BUG'] as FeedbackType[]).map((t) => {
                  const meta = TYPE_META[t];
                  const Icon = meta.icon;
                  const isSelected = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.55rem 0.5rem',
                        borderRadius: 'var(--ha-radius-sm)',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--ha-blue)' : 'var(--ha-line)',
                        backgroundColor: isSelected ? 'var(--ha-blue-light)' : 'var(--ha-white)',
                        color: isSelected ? 'var(--ha-blue)' : 'var(--ha-ink)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Icon size={14} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.3rem' }}>
                {type === 'BUG' ? "What's wrong? *" : type === 'IDEA' ? "What's the idea? *" : 'What feature would help? *'}
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder={TYPE_META[type].placeholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="ha-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.3rem' }}>
                  Area / page (optional)
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="ha-input"
                >
                  <option value="">Select area…</option>
                  {AREA_OPTIONS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.3rem' }}>
                  Priority
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                  className="ha-input"
                >
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.3rem' }}>
                {type === 'BUG' ? 'Steps / details (optional)' : 'Details (optional)'}
              </label>
              <textarea
                placeholder={type === 'BUG' ? 'What did you do, what happened, what did you expect?' : 'Anything that helps explain it'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="ha-input"
                rows={3}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button type="button" onClick={resetForm} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8rem' }} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}

        <div style={{ padding: '1.25rem 1.5rem 1.5rem', maxHeight: '55vh', overflowY: 'auto' }}>
          {visibleItems.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--ha-muted)' }}>
              <Lightbulb size={28} color="var(--ha-muted)" style={{ marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.85rem' }}>
                {items.length === 0 ? "Nothing logged yet — add an idea, feature request, or bug." : 'Nothing here for this filter.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[...openItems, ...doneItems].map((item) => {
                const isExpanded = expandedId === item.id;
                const isDone = item.status === 'FIXED';
                const meta = TYPE_META[item.type];
                const TypeIcon = meta.icon;
                return (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid var(--ha-line)',
                      borderRadius: 'var(--ha-radius-sm)',
                      opacity: isDone ? 0.6 : 1,
                    }}
                  >
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      style={{
                        padding: '0.7rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.6rem',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        {item.severity === 'CRITICAL' && <AlertTriangle size={14} color="var(--ha-red)" style={{ flexShrink: 0 }} />}
                        <span style={{
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          color: 'var(--ha-ink)',
                          textDecoration: isDone ? 'line-through' : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {item.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        <span className={`ha-badge ${meta.badgeClass}`} style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <TypeIcon size={11} />
                          {meta.label}
                        </span>
                        <span className={`ha-badge ${SEVERITY_BADGE_CLASS[item.severity]}`} style={{ fontSize: '0.65rem' }}>
                          {item.severity}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleStatus(item); }}
                          className="btn btn-ghost"
                          style={{ padding: '0.3rem' }}
                          title={isDone ? 'Reopen' : `Mark ${meta.doneWord.toLowerCase()}`}
                        >
                          {isDone ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          className="btn btn-ghost"
                          style={{ padding: '0.3rem', color: 'var(--ha-red)' }}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 0.85rem 0.85rem', fontSize: '0.8rem', color: 'var(--ha-muted)' }}>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: item.description ? '0.5rem' : 0 }}>
                          {item.area && <span>Area: <strong style={{ color: 'var(--ha-ink)' }}>{item.area}</strong></span>}
                          <span>Reported: <strong style={{ color: 'var(--ha-ink)' }}>{formatDate(item.createdAt)}</strong>{item.createdBy?.name ? ` by ${item.createdBy.name}` : ''}</span>
                        </div>
                        {item.description && (
                          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{item.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
