import React, { useState, useEffect } from 'react';
import type { GoalItem, AccountItem, CurrencyCode } from '../types/expense';
import { CURRENCIES } from '../utils/currencies';
import { formatCurrency } from '../utils/formatters';
import { X, Divide, Loader2 } from 'lucide-react';

const SPLIT_PRESETS = [2, 4, 12, 20];

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>, existingId?: string) => Promise<boolean>;
  editingGoal?: GoalItem | null;
  accounts: AccountItem[];
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingGoal,
  accounts,
}) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState<number | string>('');
  const [currentAmount, setCurrentAmount] = useState<number | string>('');
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [targetDate, setTargetDate] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [splitCount, setSplitCount] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingGoal) {
      setName(editingGoal.name);
      setTargetAmount(editingGoal.targetAmount);
      setCurrentAmount(editingGoal.currentAmount);
      setCurrency(editingGoal.currency || 'EUR');
      setTargetDate(editingGoal.targetDate || '');
      setLinkedAccountId(editingGoal.linkedAccountId || '');
      setNotes(editingGoal.notes || '');
      setSplitCount('');
    } else {
      setName('');
      setTargetAmount('');
      setCurrentAmount('');
      setCurrency('EUR');
      setTargetDate('');
      setLinkedAccountId('');
      setNotes('');
      setSplitCount('');
    }
  }, [editingGoal, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;
    const numTarget = Number(targetAmount) || 0;
    if (numTarget <= 0) return;

    setIsSaving(true);
    const ok = await onSave(
      {
        name: name.trim(),
        targetAmount: numTarget,
        currentAmount: Number(currentAmount) || 0,
        currency,
        targetDate: targetDate || null,
        linkedAccountId: linkedAccountId || null,
        notes: notes.trim(),
        isActive: true,
      },
      editingGoal?.id
    );
    setIsSaving(false);
    if (ok) onClose();
  };

  const currencySymbol = CURRENCIES[currency]?.symbol || '€';
  const remainingToSave = Math.max(0, (Number(targetAmount) || 0) - (Number(currentAmount) || 0));
  const perChunk = splitCount && Number(splitCount) > 0 ? remainingToSave / Number(splitCount) : null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--ha-line)',
        }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              {editingGoal ? 'Edit goal' : 'Add goal'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              Emergency fund, house deposit, or any savings target
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
              Goal name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Emergency fund, House deposit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ha-input"
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Target amount *
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '0.85rem', fontSize: '1rem', fontWeight: 700, color: 'var(--ha-muted)', pointerEvents: 'none' }}>
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="ha-input"
                  style={{ paddingLeft: '1.8rem' }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Current amount saved
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '0.85rem', fontSize: '1rem', fontWeight: 700, color: 'var(--ha-muted)', pointerEvents: 'none' }}>
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  className="ha-input"
                  style={{ paddingLeft: '1.8rem' }}
                />
              </div>
            </div>
          </div>

          <div style={{
            border: '1px solid var(--ha-line)',
            borderRadius: 'var(--ha-radius-md)',
            padding: '0.85rem 1rem',
            backgroundColor: '#fafaf7',
          }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <Divide size={13} />
              Split into equal payments (optional)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {SPLIT_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSplitCount(n)}
                  className="ha-chip"
                  style={{
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    backgroundColor: splitCount === n ? 'var(--ha-blue)' : 'var(--ha-white)',
                    color: splitCount === n ? 'var(--ha-white)' : 'var(--ha-ink)',
                    border: '1px solid var(--ha-line)',
                  }}
                >
                  {n}
                </button>
              ))}
              <input
                type="number"
                min="2"
                placeholder="Custom"
                value={splitCount}
                onChange={(e) => setSplitCount(e.target.value === '' ? '' : Number(e.target.value))}
                className="ha-input"
                style={{ width: '90px', fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
              />
              {splitCount !== '' && (
                <button
                  type="button"
                  onClick={() => setSplitCount('')}
                  className="btn btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}
                >
                  Clear
                </button>
              )}
            </div>
            {perChunk !== null && (
              <p style={{ fontSize: '0.82rem', color: 'var(--ha-ink)', marginTop: '0.6rem' }}>
                <strong>{splitCount}</strong> payments of <strong>{formatCurrency(perChunk, currency)}</strong> each
                {' '}<span style={{ color: 'var(--ha-muted)' }}>({formatCurrency(remainingToSave, currency)} left to save)</span>
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Currency
              </label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="ha-input">
                {Object.values(CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Target date (optional)
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="ha-input"
                style={{ fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {accounts.length > 0 && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Linked account (optional)
              </label>
              <select value={linkedAccountId} onChange={(e) => setLinkedAccountId(e.target.value)} className="ha-input">
                <option value="">Not linked</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}{a.institution ? ` — ${a.institution}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', display: 'block', marginBottom: '0.35rem' }}>
              Notes (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 6 months of expenses, top-up every payday"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="ha-input"
              style={{ fontSize: '0.82rem' }}
            />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--ha-line)',
          }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={15} className="spin" /> : null}
              {isSaving ? 'Saving…' : editingGoal ? 'Save changes' : 'Add goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
