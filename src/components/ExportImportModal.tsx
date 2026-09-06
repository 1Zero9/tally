import React from 'react';
import type { ExpenseItem, CustomCategoryItem } from '../types/expense';
import { exportExpensesCSV, exportExpensesJSON } from '../services/storage';
import { X, FileSpreadsheet, FileCode } from 'lucide-react';
import { useOverlayClose } from '../hooks/useOverlayClose';
import { useModalA11y } from '../hooks/useModalA11y';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: ExpenseItem[];
  customCategories?: CustomCategoryItem[];
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  expenses,
  customCategories = [],
}) => {
  const overlayHandlers = useOverlayClose(onClose);
  const { dialogRef, dialogProps } = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" {...overlayHandlers}>
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--ha-line)',
        }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              Export records
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              Download your household&apos;s records as a spreadsheet or a JSON file
            </p>
          </div>

          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div
                onClick={() => exportExpensesCSV(expenses, customCategories)}
                className="ha-card-interactive"
                style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--ha-blue)' }}>
                  <FileSpreadsheet size={18} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>CSV spreadsheet</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', lineHeight: 1.35 }}>
                  Export all items to Excel or Google Sheets.
                </p>
              </div>

              <div
                onClick={() => exportExpensesJSON(expenses)}
                className="ha-card-interactive"
                style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--ha-ink)' }}>
                  <FileCode size={18} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>JSON file</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', lineHeight: 1.35 }}>
                  A structured copy of your expense data.
                </p>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', margin: 0 }}>
            For a full, restorable household backup (income, transfers, accounts and goals included), use Admin → Database Snapshots.
          </p>
        </div>
      </div>
    </div>
  );
};
