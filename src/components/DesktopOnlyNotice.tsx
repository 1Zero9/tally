import React from 'react';
import { Monitor, X } from 'lucide-react';

/**
 * Shown in place of a dense editor when the viewport is too small to use it
 * comfortably. Mobile is deliberately a quick-glance experience — heavy
 * authoring flows live on desktop.
 */
export const DesktopOnlyNotice: React.FC<{ title: string; message: string; onClose: () => void }> = ({
  title, message, onClose,
}) => (
  <div className="modal-overlay">
    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--ha-line)' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ha-ink)' }}>{title}</h3>
        <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }} aria-label="Close"><X size={18} /></button>
      </div>
      <div style={{ padding: '1.75rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: 'var(--ha-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Monitor size={22} color="var(--ha-blue)" />
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--ha-muted)', lineHeight: 1.5, margin: 0 }}>{message}</p>
        <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Got it</button>
      </div>
    </div>
  </div>
);
