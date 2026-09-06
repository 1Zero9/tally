import React, { useState, useEffect } from 'react';
import type { TransferItem, AccountItem, ExpenseItem, IncomeItem, CurrencyCode } from '../types/expense';
import { CURRENCIES } from '../utils/currencies';
import { X, ArrowRight, Loader2 } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

const EXTERNAL_VALUE = '__external__';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>, existingId?: string) => Promise<boolean>;
  editingTransfer?: TransferItem | null;
  accounts: AccountItem[];
  expenses?: ExpenseItem[];
  incomes?: IncomeItem[];
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTransfer,
  accounts,
  expenses = [],
  incomes = [],
}) => {
  const [amount, setAmount] = useState<number | string>('');
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [date, setDate] = useState('');
  const [fromAccountId, setFromAccountId] = useState<string>(EXTERNAL_VALUE);
  const [toAccountId, setToAccountId] = useState<string>(EXTERNAL_VALUE);
  const [externalLabel, setExternalLabel] = useState('');
  const [note, setNote] = useState('');
  const [linkedIncomeId, setLinkedIncomeId] = useState<string>('');
  const [linkedExpenseId, setLinkedExpenseId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingTransfer) {
      setAmount(editingTransfer.amount);
      setCurrency(editingTransfer.currency || 'EUR');
      setDate(editingTransfer.date || '');
      setFromAccountId(editingTransfer.fromAccountId || EXTERNAL_VALUE);
      setToAccountId(editingTransfer.toAccountId || EXTERNAL_VALUE);
      setExternalLabel(editingTransfer.externalLabel || '');
      setNote(editingTransfer.note || '');
      setLinkedIncomeId(editingTransfer.linkedIncomeId || '');
      setLinkedExpenseId(editingTransfer.linkedExpenseId || '');
    } else {
      setAmount('');
      setCurrency('EUR');
      setDate(new Date().toISOString().split('T')[0]);
      setFromAccountId(EXTERNAL_VALUE);
      setToAccountId(EXTERNAL_VALUE);
      setExternalLabel('');
      setNote('');
      setLinkedIncomeId('');
      setLinkedExpenseId('');
    }
  }, [editingTransfer, isOpen]);

  const { dialogRef, dialogProps } = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const fromIsExternal = fromAccountId === EXTERNAL_VALUE;
  const toIsExternal = toAccountId === EXTERNAL_VALUE;
  const bothExternal = fromIsExternal && toIsExternal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || !date || bothExternal || isSaving) return;

    setIsSaving(true);
    const ok = await onSave(
      {
        amount: numAmount,
        currency,
        date,
        fromAccountId: fromIsExternal ? null : fromAccountId,
        toAccountId: toIsExternal ? null : toAccountId,
        externalLabel: (fromIsExternal || toIsExternal) ? externalLabel.trim() || null : null,
        note: note.trim(),
        linkedIncomeId: fromIsExternal && linkedIncomeId ? linkedIncomeId : null,
        linkedExpenseId: toIsExternal && linkedExpenseId ? linkedExpenseId : null,
      },
      editingTransfer?.id
    );
    setIsSaving(false);
    if (ok) onClose();
  };

  const currencySymbol = CURRENCIES[currency]?.symbol || '€';

  return (
    <div className="modal-overlay">
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--ha-line)',
        }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              {editingTransfer ? 'Edit transfer' : 'Log a money movement'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              One hop in the journey — salary landing, moving between accounts, or a payment going out
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
              Amount *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '1rem', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ha-muted)', pointerEvents: 'none' }}>
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="ha-input ha-input-large"
                style={{ paddingLeft: '2.5rem' }}
                autoFocus
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                From
              </label>
              <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className="ha-input">
                <option value={EXTERNAL_VALUE}>External (income in)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}{a.institution ? ` — ${a.institution}` : ''}</option>
                ))}
              </select>
            </div>

            <ArrowRight size={18} color="var(--ha-muted)" style={{ marginBottom: '0.7rem' }} />

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                To
              </label>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="ha-input">
                <option value={EXTERNAL_VALUE}>External (payment / one-off spend)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}{a.institution ? ` — ${a.institution}` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {bothExternal && (
            <p style={{ fontSize: '0.78rem', color: 'var(--ha-red)' }}>
              At least one side must be an account you&apos;ve added — otherwise there&apos;s nothing to link this movement to.
            </p>
          )}

          {(fromIsExternal || toIsExternal) && (
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Label for the external side (optional)
              </label>
              <input
                type="text"
                placeholder={fromIsExternal ? 'e.g. Salary — Acme Corp' : 'e.g. Car repair, Netflix DD, doctor visit'}
                value={externalLabel}
                onChange={(e) => setExternalLabel(e.target.value)}
                className="ha-input"
                style={{ fontSize: '0.82rem' }}
              />
            </div>
          )}

          {fromIsExternal && incomes.length > 0 && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Link to an income source (optional)
              </label>
              <select value={linkedIncomeId} onChange={(e) => setLinkedIncomeId(e.target.value)} className="ha-input">
                <option value="">Not linked</option>
                {incomes.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
          )}

          {toIsExternal && expenses.length > 0 && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Link to a bill/expense (optional)
              </label>
              <select value={linkedExpenseId} onChange={(e) => setLinkedExpenseId(e.target.value)} className="ha-input">
                <option value="">Not linked</option>
                {expenses.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="ha-input tabular-nums"
              />
            </div>
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
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', display: 'block', marginBottom: '0.35rem' }}>
              Note (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly savings sweep"
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
            <button type="submit" className="btn btn-primary" disabled={bothExternal || isSaving}>
              {isSaving ? <Loader2 size={15} className="spin" /> : null}
              {isSaving ? 'Saving…' : editingTransfer ? 'Save changes' : 'Log transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
