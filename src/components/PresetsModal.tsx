import React, { useState } from 'react';
import { PRESETS } from '../data/presets';
import { getCategoryMeta } from '../data/categories';
import type { ExpenseItem, PresetItem } from '../types/expense';
import { formatCurrency, formatBillingCycle } from '../utils/formatters';
import { X, Search, Plus, Check } from 'lucide-react';
import { useOverlayClose } from '../hooks/useOverlayClose';
import { useModalA11y } from '../hooks/useModalA11y';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: ExpenseItem[];
  onAddFromPreset: (preset: PresetItem) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  expenses,
  onAddFromPreset,
}) => {
  const overlayHandlers = useOverlayClose(onClose);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { dialogRef, dialogProps } = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const filteredPresets = PRESETS.filter((p) => {
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAdd = (preset: PresetItem) => {
    onAddFromPreset(preset);
  };

  return (
    <div className="modal-overlay" {...overlayHandlers}>
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
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
              Preset catalogue
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              Standard household utilities, streaming and software subscriptions
            </p>
          </div>

          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Filter bar */}
        <div style={{ padding: '1rem 1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', display: 'flex', alignItems: 'center' }}>
              <Search size={15} color="var(--ha-muted)" style={{ position: 'absolute', left: '0.75rem' }} />
              <input
                type="text"
                placeholder="Search presets (Netflix, Spotify, Electricity)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ha-input"
                style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
              />
            </div>

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'utilities', label: 'Utilities' },
                { id: 'entertainment', label: 'Streaming' },
                { id: 'ai-tech', label: 'AI & Tech' },
                { id: 'housing', label: 'Housing' },
                { id: 'lifestyle', label: 'Lifestyle' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterCategory(tab.id)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--ha-radius-sm)',
                    border: '1px solid',
                    borderColor: filterCategory === tab.id ? 'var(--ha-blue)' : 'var(--ha-line)',
                    backgroundColor: filterCategory === tab.id ? 'var(--ha-blue-light)' : 'var(--ha-white)',
                    color: filterCategory === tab.id ? 'var(--ha-blue)' : 'var(--ha-muted)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Presets Grid */}
        <div style={{
          padding: '1.25rem 1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '0.75rem',
          maxHeight: '60vh',
          overflowY: 'auto',
        }}>
          {filteredPresets.map((preset) => {
            const cat = getCategoryMeta(preset.category);
            const isAlreadyAdded = expenses.some((e) => e.name.toLowerCase().includes(preset.name.toLowerCase().split(' ')[0]));

            return (
              <div
                key={preset.id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--ha-radius-md)',
                  backgroundColor: '#fafaf7',
                  border: '1px solid var(--ha-line)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span className="ha-color-marker" style={{ backgroundColor: preset.color }} />
                    <span className="ha-badge ha-badge-neutral" style={{ fontSize: '0.68rem' }}>
                      {cat.name.split(' ')[0]}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ha-ink)', marginBottom: '0.2rem' }}>
                    {preset.name}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', lineHeight: 1.35, minHeight: '30px' }}>
                    {preset.description}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--ha-line)' }}>
                  <div>
                    <span className="tabular-nums" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                      {formatCurrency(preset.defaultAmount, 'EUR')}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--ha-muted)' }}>
                      {formatBillingCycle(preset.defaultCycle)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAdd(preset)}
                    className={isAlreadyAdded ? 'btn btn-secondary' : 'btn btn-primary'}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  >
                    {isAlreadyAdded ? (
                      <>
                        <Check size={12} />
                        <span>Add</span>
                      </>
                    ) : (
                      <>
                        <Plus size={12} />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
