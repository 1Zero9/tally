import React, { useState, useEffect } from 'react';
import type { ExpenseItem } from '../types/expense';
import { X, Sparkles, Send } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

type Intent = 'negotiate' | 'cancel' | 'ask';

interface ContactVendorModalProps {
  expense: ExpenseItem | null;
  onClose: () => void;
}

export const ContactVendorModal: React.FC<ContactVendorModalProps> = ({ expense, onClose }) => {
  const [intent, setIntent] = useState<Intent>('negotiate');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState('');

  useEffect(() => {
    if (expense) {
      setSubject('');
      setBody('');
      setError('');
      setSentMessage('');
      setIntent('negotiate');
    }
  }, [expense]);

  const { dialogRef, dialogProps } = useModalA11y(!!expense, onClose);

  if (!expense) return null;

  const handleDraft = async (selectedIntent: Intent) => {
    setIntent(selectedIntent);
    setIsDrafting(true);
    setError('');
    setSentMessage('');
    try {
      const res = await fetch(`/api/expenses/${expense.id}/draft-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: selectedIntent }),
      });
      const data = await res.json();
      if (data.status !== 'ok') throw new Error(data.message || 'Failed to draft email');
      setSubject(data.draft.subject);
      setBody(data.draft.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to draft email');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    setError('');
    try {
      const res = await fetch(`/api/expenses/${expense.id}/send-vendor-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();
      if (data.status !== 'ok') throw new Error(data.message || 'Failed to send email');
      setSentMessage(data.message || 'Email sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const intentOptions: { id: Intent; label: string }[] = [
    { id: 'negotiate', label: 'Ask for a better rate' },
    { id: 'cancel', label: 'Cancel the contract' },
    { id: 'ask', label: 'Ask about renewal terms' },
  ];

  return (
    <div className="modal-overlay">
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--ha-line)',
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              Contact {expense.name}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              To {expense.vendorEmail} — review and edit before sending. Nothing is sent automatically.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ha-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block', letterSpacing: '0.03em' }}>
              What do you want to say?
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {intentOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleDraft(opt.id)}
                  disabled={isDrafting}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.8rem',
                    borderColor: intent === opt.id ? 'var(--ha-blue)' : undefined,
                    color: intent === opt.id ? 'var(--ha-blue)' : undefined,
                  }}
                >
                  <Sparkles size={13} style={{ marginRight: '0.35rem' }} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {isDrafting && (
            <div style={{ fontSize: '0.85rem', color: 'var(--ha-muted)' }}>Drafting…</div>
          )}

          {(subject || body) && !isDrafting && (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="ha-input"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                  Message
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="ha-input"
                  rows={8}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </>
          )}

          {error && (
            <div style={{ fontSize: '0.82rem', color: 'var(--ha-red)' }}>{error}</div>
          )}
          {sentMessage && (
            <div style={{ fontSize: '0.82rem', color: 'var(--ha-blue)' }}>{sentMessage}</div>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--ha-line)',
          }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Close
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!subject || !body || isSending}
              className="btn btn-primary"
            >
              <Send size={14} style={{ marginRight: '0.35rem' }} />
              {isSending ? 'Sending…' : 'Send email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
