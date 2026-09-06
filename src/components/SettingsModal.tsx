import React from 'react';
import type { CurrencyCode } from '../types/expense';
import { CURRENCY_LIST } from '../utils/currencies';
import { X, Coins, LayoutGrid, UserPlus, Download, ChevronRight, ShieldOff } from 'lucide-react';
import { useOverlayClose } from '../hooks/useOverlayClose';
import { useModalA11y } from '../hooks/useModalA11y';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCurrency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  onOpenPresetsModal: () => void;
  onOpenExportModal: () => void;
  onOpenShareModal: () => void;
  onSignOutEverywhere: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentCurrency,
  onCurrencyChange,
  onOpenPresetsModal,
  onOpenExportModal,
  onOpenShareModal,
  onSignOutEverywhere,
}) => {
  const overlayHandlers = useOverlayClose(onClose);
  const { dialogRef, dialogProps } = useModalA11y(isOpen, onClose);
  if (!isOpen) return null;

  const openThenClose = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <div className="modal-overlay" {...overlayHandlers}>
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--ha-line)',
        }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              Settings & preferences
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              Currency, catalogue, sharing and backups
            </p>
          </div>

          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Currency */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <Coins size={15} color="var(--ha-blue)" />
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ha-ink)' }}>Currency</h4>
            </div>
            <select
              value={currentCurrency}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
              className="ha-input"
              style={{ cursor: 'pointer' }}
            >
              {CURRENCY_LIST.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Action rows */}
          <div>
            <button
              onClick={() => openThenClose(onOpenPresetsModal)}
              className="ha-card-interactive"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', marginBottom: '0.6rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: 'var(--ha-radius-sm)', backgroundColor: 'var(--ha-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <LayoutGrid size={15} color="var(--ha-blue)" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ha-ink)' }}>Catalog</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ha-muted)' }}>Add common household bills in one click</div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--ha-muted)" />
            </button>

            <button
              onClick={() => openThenClose(onOpenShareModal)}
              className="ha-card-interactive"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', marginBottom: '0.6rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: 'var(--ha-radius-sm)', backgroundColor: 'var(--ha-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <UserPlus size={15} color="var(--ha-blue)" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ha-ink)' }}>Share workspace</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ha-muted)' }}>Invite a partner or family member</div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--ha-muted)" />
            </button>

            <button
              onClick={() => openThenClose(onOpenExportModal)}
              className="ha-card-interactive"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: 'var(--ha-radius-sm)', backgroundColor: 'var(--ha-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Download size={15} color="var(--ha-blue)" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ha-ink)' }}>Export & backup</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ha-muted)' }}>Download as CSV or JSON</div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--ha-muted)" />
            </button>
          </div>

          {/* Security */}
          <div style={{ borderTop: '1px solid var(--ha-line)', paddingTop: '1.1rem' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.6rem' }}>
              Security
            </h4>
            <button
              onClick={() => openThenClose(onSignOutEverywhere)}
              className="ha-card-interactive"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: 'var(--ha-radius-sm)', backgroundColor: 'var(--ha-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldOff size={15} color="var(--ha-blue)" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ha-ink)' }}>Sign out everywhere</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ha-muted)' }}>Ends every session on every device, including this one</div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--ha-muted)" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
