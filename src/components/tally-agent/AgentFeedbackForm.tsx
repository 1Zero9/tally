import React, { useState } from 'react';
import { getErrorMessage } from '../../lib/errors';
import type { FeedbackType } from '../../types/expense';

interface AgentFeedbackFormProps {
  defaultKind: FeedbackType;
  area?: string;
  onSubmitted: (kind: FeedbackType, title: string) => void;
  onCancel: () => void;
}

const KINDS: { id: FeedbackType; label: string }[] = [
  { id: 'BUG', label: 'Bug' },
  { id: 'FEATURE', label: 'Feature' },
  { id: 'IDEA', label: 'Idea' },
];

/** Tab id → the area labels the Feedback backlog already uses. */
const AREA_LABELS: Record<string, string> = {
  overview: 'Overview',
  all: 'Spending', 'ai-tech': 'Spending', utilities: 'Spending', education: 'Spending',
  'big-ticket': 'Spending', insurance: 'Spending',
  income: 'Income', calendar: 'Bills', insights: 'Insights', reports: 'Insights',
  accounts: 'Accounts', moneymap: 'Money Map', flow: 'Flow', goals: 'Goals',
  planned: 'Planned', admin: 'Admin',
};

/** Inline "raise it" form. Nothing is sent until the user hits the button —
 *  a deliberate write into the Feedback backlog, confirmed by that click. */
export const AgentFeedbackForm: React.FC<AgentFeedbackFormProps> = ({ defaultKind, area, onSubmitted, onCancel }) => {
  const [kind, setKind] = useState<FeedbackType>(defaultKind);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: kind,
          title: t,
          description: detail.trim() || undefined,
          area: (area && AREA_LABELS[area]) || undefined,
        }),
      });
      const data = await res.json();
      if (data.status !== 'ok') throw new Error(data.message || 'Failed to log that');
      onSubmitted(kind, t);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to log that'));
      setBusy(false);
    }
  };

  return (
    <form className="ha-agent-fbform" onSubmit={submit}>
      <div className="ha-agent-fbform-kinds" role="group" aria-label="Type of feedback">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`ha-agent-chip${kind === k.id ? ' is-active' : ''}`}
            onClick={() => setKind(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>
      <input
        className="ha-input"
        placeholder={kind === 'BUG' ? 'What went wrong?' : 'What would you like?'}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        maxLength={160}
      />
      <textarea
        className="ha-input"
        placeholder="Any detail (optional)"
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        rows={2}
        maxLength={1000}
      />
      {error && <p className="ha-agent-fbform-error">{error}</p>}
      <div className="ha-agent-fbform-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!title.trim() || busy}>
          {busy ? 'Logging…' : `Log ${kind === 'BUG' ? 'bug' : kind === 'FEATURE' ? 'feature' : 'idea'}`}
        </button>
      </div>
    </form>
  );
};
