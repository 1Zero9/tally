import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { APP_VERSION, CHANGELOG, MOBILE_APP_VERSION, MOBILE_CHANGELOG } from '../data/changelog';
import { useOverlayClose } from '../hooks/useOverlayClose';
import { useModalA11y } from '../hooks/useModalA11y';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: 'desktop' | 'mobile';
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, variant = 'desktop' }) => {
  const overlayHandlers = useOverlayClose(onClose);
  const { dialogRef, dialogProps } = useModalA11y(isOpen, onClose);
  if (!isOpen) return null;

  const version = variant === 'mobile' ? MOBILE_APP_VERSION : APP_VERSION;
  const entries = variant === 'mobile' ? MOBILE_CHANGELOG : CHANGELOG;

  return (
    <div className="modal-overlay" {...overlayHandlers}>
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--ha-line)',
        }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              What&apos;s new
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              Currently on version {version}
            </p>
          </div>

          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {entries.map((entry) => (
            <div key={entry.version}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--ha-radius-sm)',
                  backgroundColor: 'var(--ha-blue-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Sparkles size={14} color="var(--ha-blue)" />
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                  v{entry.version}
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>
                  {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '2.7rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {entry.changes.map((change, idx) => (
                  <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', lineHeight: 1.5 }}>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
