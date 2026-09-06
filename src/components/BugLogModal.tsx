import React, { useState, useEffect } from 'react';
import type { BugReportItem, BugSeverity } from '../types/expense';
import { X, Bug, Plus, Download, Trash2, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
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
  'Insights',
  'Flow',
  'Goals',
  'Planned',
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

interface BugLogModalProps {
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

function buildMarkdown(bugs: BugReportItem[]): string {
  const open = bugs.filter((b) => b.status === 'OPEN');
  const fixed = bugs.filter((b) => b.status === 'FIXED');

  const renderBug = (b: BugReportItem, idx: number) => {
    const lines = [
      `### ${idx + 1}. ${b.title}`,
      '',
      `- **Severity:** ${b.severity}`,
      `- **Area:** ${b.area || '—'}`,
      `- **Reported:** ${formatDate(b.createdAt)}${b.createdBy?.name ? ` by ${b.createdBy.name}` : ''}`,
    ];
    if (b.description) {
      lines.push('', b.description.trim());
    }
    return lines.join('\n');
  };

  const sections: string[] = [
    '# Tally bug log',
    '',
    `Exported ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}`,
    '',
  ];

  sections.push(`## Open (${open.length})`, '');
  if (open.length === 0) {
    sections.push('_No open bugs._', '');
  } else {
    open.forEach((b, i) => sections.push(renderBug(b, i), ''));
  }

  if (fixed.length > 0) {
    sections.push(`## Fixed (${fixed.length})`, '');
    fixed.forEach((b, i) => sections.push(renderBug(b, i), ''));
  }

  return sections.join('\n');
}

function downloadMarkdown(bugs: BugReportItem[]) {
  const content = buildMarkdown(bugs);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tally-bug-log-${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const BugLogModal: React.FC<BugLogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [bugs, setBugs] = useState<BugReportItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('');
  const [severity, setSeverity] = useState<BugSeverity>('MEDIUM');

  const fetchBugs = async () => {
    try {
      const res = await fetch('/api/bugs');
      const data = await res.json();
      if (data.status === 'ok' && Array.isArray(data.bugs)) {
        setBugs(data.bugs);
      }
    } catch (err) {
      console.error('Failed to load bug reports:', err);
    }
  };

  useEffect(() => {
    if (isOpen) fetchBugs();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), area: area.trim(), severity }),
      });
      const data = await res.json();
      if (data.status === 'ok' && data.bug) {
        setBugs((prev) => [data.bug, ...prev]);
        resetForm();
      }
    } catch (err) {
      console.error('Failed to save bug report:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (bug: BugReportItem) => {
    const nextStatus = bug.status === 'OPEN' ? 'FIXED' : 'OPEN';
    setBugs((prev) => prev.map((b) => (b.id === bug.id ? { ...b, status: nextStatus } : b)));
    try {
      await fetch('/api/bugs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bug.id, status: nextStatus }),
      });
    } catch (err) {
      console.error('Failed to update bug report:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setBugs((prev) => prev.filter((b) => b.id !== id));
    try {
      await fetch(`/api/bugs?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete bug report:', err);
    }
  };

  const openBugs = bugs.filter((b) => b.status === 'OPEN');
  const fixedBugs = bugs.filter((b) => b.status === 'FIXED');

  return (
    <div className="modal-overlay">
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--ha-line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bug size={20} color="var(--ha-blue)" />
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
                Bug log
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                Jot down issues as you spot them, then export to Markdown
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={() => setIsAdding((v) => !v)}
            className="btn btn-primary"
            style={{ fontSize: '0.82rem' }}
          >
            <Plus size={14} />
            <span>Report bug</span>
          </button>
          <button
            onClick={() => downloadMarkdown(bugs)}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem' }}
            disabled={bugs.length === 0}
          >
            <Download size={14} />
            <span>Export Markdown</span>
          </button>
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
                What&apos;s wrong? *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Add account modal closes on backdrop click and loses input"
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
                  Severity
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
                Steps / details (optional)
              </label>
              <textarea
                placeholder="What did you do, what happened, what did you expect?"
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
                {isSaving ? 'Saving…' : 'Save bug'}
              </button>
            </div>
          </form>
        )}

        <div style={{ padding: '1.25rem 1.5rem 1.5rem', maxHeight: '55vh', overflowY: 'auto' }}>
          {bugs.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--ha-muted)' }}>
              <Bug size={28} color="var(--ha-muted)" style={{ marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.85rem' }}>No bugs logged yet. Nice — or you just haven&apos;t found one.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[...openBugs, ...fixedBugs].map((bug) => {
                const isExpanded = expandedId === bug.id;
                const isFixed = bug.status === 'FIXED';
                return (
                  <div
                    key={bug.id}
                    style={{
                      border: '1px solid var(--ha-line)',
                      borderRadius: 'var(--ha-radius-sm)',
                      opacity: isFixed ? 0.6 : 1,
                    }}
                  >
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : bug.id)}
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
                        {bug.severity === 'CRITICAL' && <AlertTriangle size={14} color="var(--ha-red)" style={{ flexShrink: 0 }} />}
                        <span style={{
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          color: 'var(--ha-ink)',
                          textDecoration: isFixed ? 'line-through' : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {bug.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        <span className={`ha-badge ${SEVERITY_BADGE_CLASS[bug.severity]}`} style={{ fontSize: '0.65rem' }}>
                          {bug.severity}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleStatus(bug); }}
                          className="btn btn-ghost"
                          style={{ padding: '0.3rem' }}
                          title={isFixed ? 'Reopen' : 'Mark fixed'}
                        >
                          {isFixed ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(bug.id); }}
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
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: bug.description ? '0.5rem' : 0 }}>
                          {bug.area && <span>Area: <strong style={{ color: 'var(--ha-ink)' }}>{bug.area}</strong></span>}
                          <span>Reported: <strong style={{ color: 'var(--ha-ink)' }}>{formatDate(bug.createdAt)}</strong>{bug.createdBy?.name ? ` by ${bug.createdBy.name}` : ''}</span>
                        </div>
                        {bug.description && (
                          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{bug.description}</p>
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
