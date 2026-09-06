import React, { useState, useEffect } from 'react';
import type { AccountItem, AccountType, CurrencyCode } from '../types/expense';
import { CURRENCIES } from '../utils/currencies';
import { X, Lock, ShieldAlert, Loader2 } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

const ACCOUNT_TYPES: { id: AccountType; label: string }[] = [
  { id: 'CHECKING', label: 'Current' },
  { id: 'SAVINGS', label: 'Savings' },
  { id: 'CREDIT_UNION', label: 'Credit union' },
  { id: 'CREDIT_CARD', label: 'Credit card' },
  { id: 'DEBIT_CARD', label: 'Debit card' },
  { id: 'PAYPAL', label: 'PayPal' },
  { id: 'LOAN', label: 'Loan' },
  { id: 'INVESTMENT', label: 'Investment' },
  { id: 'OTHER', label: 'Other' },
];

interface SensitiveFieldState {
  value: string;
  touched: boolean;
}

const emptyField = (): SensitiveFieldState => ({ value: '', touched: false });

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: Record<string, unknown>,
    existingId?: string
  ) => Promise<boolean>;
  editingAccount?: AccountItem | null;
  encryptionConfigured: boolean;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAccount,
  encryptionConfigured,
}) => {
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [balance, setBalance] = useState<number | string>('');
  const [balanceAsOf, setBalanceAsOf] = useState('');

  const [accountNumber, setAccountNumber] = useState<SensitiveFieldState>(emptyField());
  const [routingNumber, setRoutingNumber] = useState<SensitiveFieldState>(emptyField());
  const [iban, setIban] = useState<SensitiveFieldState>(emptyField());
  const [bic, setBic] = useState<SensitiveFieldState>(emptyField());
  const [loginUsername, setLoginUsername] = useState<SensitiveFieldState>(emptyField());
  const [loginPassword, setLoginPassword] = useState<SensitiveFieldState>(emptyField());
  const [loginUrl, setLoginUrl] = useState<SensitiveFieldState>(emptyField());
  const [securityNotes, setSecurityNotes] = useState<SensitiveFieldState>(emptyField());

  const [originalAmount, setOriginalAmount] = useState<number | string>('');
  const [interestRate, setInterestRate] = useState<number | string>('');
  const [termMonths, setTermMonths] = useState<number | string>('');
  const [payoffDate, setPayoffDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setInstitution(editingAccount.institution || '');
      setType(editingAccount.type);
      setCurrency((editingAccount.currency as CurrencyCode) || 'EUR');
      setNotes(editingAccount.notes || '');
      setIsActive(editingAccount.isActive);
      setBalance(editingAccount.balance ?? '');
      setBalanceAsOf(editingAccount.balanceAsOf || '');
      setOriginalAmount(editingAccount.originalAmount ?? '');
      setInterestRate(editingAccount.interestRate ?? '');
      setTermMonths(editingAccount.termMonths ?? '');
      setPayoffDate(editingAccount.payoffDate || '');
    } else {
      setName('');
      setInstitution('');
      setType('CHECKING');
      setCurrency('EUR');
      setNotes('');
      setIsActive(true);
      setBalance('');
      setBalanceAsOf('');
      setOriginalAmount('');
      setInterestRate('');
      setTermMonths('');
      setPayoffDate('');
    }
    setAccountNumber(emptyField());
    setRoutingNumber(emptyField());
    setIban(emptyField());
    setBic(emptyField());
    setLoginUsername(emptyField());
    setLoginPassword(emptyField());
    setLoginUrl(emptyField());
    setSecurityNotes(emptyField());
  }, [editingAccount, isOpen]);

  const { dialogRef, dialogProps } = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    const data: Record<string, unknown> = {
      name: name.trim(),
      institution: institution.trim(),
      type,
      currency,
      notes: notes.trim(),
      isActive,
      balance: balance !== '' ? Number(balance) : null,
      balanceAsOf: balance !== '' ? (balanceAsOf.trim() || new Date().toISOString().split('T')[0]) : null,
      originalAmount: type === 'LOAN' && originalAmount !== '' ? Number(originalAmount) : null,
      interestRate: type === 'LOAN' && interestRate !== '' ? Number(interestRate) : null,
      termMonths: type === 'LOAN' && termMonths !== '' ? Number(termMonths) : null,
      payoffDate: type === 'LOAN' ? payoffDate.trim() : null,
    };

    if (accountNumber.touched) data.accountNumber = accountNumber.value;
    if (routingNumber.touched) data.routingNumber = routingNumber.value;
    if (iban.touched) data.iban = iban.value;
    if (bic.touched) data.bic = bic.value;
    if (loginUsername.touched) data.loginUsername = loginUsername.value;
    if (loginPassword.touched) data.loginPassword = loginPassword.value;
    if (loginUrl.touched) data.loginUrl = loginUrl.value;
    if (securityNotes.touched) data.securityNotes = securityNotes.value;

    setIsSaving(true);
    const ok = await onSave(data, editingAccount?.id);
    setIsSaving(false);
    if (ok) onClose();
  };

  const sensitiveField = (
    label: string,
    state: SensitiveFieldState,
    setState: React.Dispatch<React.SetStateAction<SensitiveFieldState>>,
    placeholderHasValue: boolean,
    inputType: 'text' | 'password' = 'text'
  ) => (
    <div>
      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
        {label}
      </label>
      <input
        type={inputType}
        placeholder={placeholderHasValue ? 'Already set — leave blank to keep, type to replace' : 'Not set'}
        value={state.value}
        onChange={(e) => setState({ value: e.target.value, touched: true })}
        className="ha-input"
        style={{ fontSize: '0.85rem' }}
        disabled={!encryptionConfigured}
        autoComplete="off"
      />
    </div>
  );

  return (
    <div className="modal-overlay">
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--ha-line)',
        }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              {editingAccount ? 'Edit account' : 'Add account'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              Bank, credit union, card or payment method
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Account name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Main Current Account, Car Loan — XYZ Credit Union"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="ha-input"
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Type
              </label>
              <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className="ha-input">
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Institution
              </label>
              <input
                type="text"
                placeholder="e.g. AIB, Revolut, PayPal"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="ha-input"
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

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                Current balance
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Not set"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="ha-input"
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--ha-muted)', marginTop: '0.3rem' }}>
                Entered manually — there&apos;s no live bank sync, so update this whenever it changes.
              </p>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                As of
              </label>
              <input
                type="date"
                value={balanceAsOf}
                onChange={(e) => setBalanceAsOf(e.target.value)}
                className="ha-input"
                disabled={balance === ''}
              />
            </div>
          </div>

          {type === 'LOAN' && (
            <div style={{
              backgroundColor: '#fafaf7',
              border: '1px solid var(--ha-line)',
              borderRadius: 'var(--ha-radius-md)',
              padding: '1rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.85rem',
            }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ha-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Original loan amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={originalAmount}
                  onChange={(e) => setOriginalAmount(e.target.value)}
                  className="ha-input"
                  style={{ fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ha-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Interest rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="ha-input"
                  style={{ fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ha-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Term (months)
                </label>
                <input
                  type="number"
                  value={termMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                  className="ha-input"
                  style={{ fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ha-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Payoff date
                </label>
                <input
                  type="date"
                  value={payoffDate}
                  onChange={(e) => setPayoffDate(e.target.value)}
                  className="ha-input"
                  style={{ fontSize: '0.82rem' }}
                />
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <Lock size={14} color="var(--ha-muted)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                Sensitive details (encrypted at rest)
              </span>
            </div>

            {!encryptionConfigured && (
              <div style={{
                backgroundColor: 'var(--ha-red-tint)',
                border: '1px solid var(--ha-red)',
                borderRadius: 'var(--ha-radius-sm)',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--ha-red)',
                fontSize: '0.78rem',
                marginBottom: '0.85rem',
              }}>
                <ShieldAlert size={15} style={{ flexShrink: 0 }} />
                <span>Encryption isn&apos;t configured on this server — sensitive fields are disabled until CREDENTIALS_ENCRYPTION_KEY is set.</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {sensitiveField('Account number', accountNumber, setAccountNumber, !!editingAccount?.hasAccountNumber)}
              {sensitiveField('Routing / sort code', routingNumber, setRoutingNumber, !!editingAccount?.hasRoutingNumber)}
              {sensitiveField('IBAN', iban, setIban, !!editingAccount?.hasIban)}
              {sensitiveField('BIC / SWIFT', bic, setBic, !!editingAccount?.hasBic)}
              {sensitiveField('Login username / email', loginUsername, setLoginUsername, !!editingAccount?.hasLoginUsername)}
              {sensitiveField('Login password', loginPassword, setLoginPassword, !!editingAccount?.hasLoginPassword, 'password')}
              {sensitiveField('Login URL', loginUrl, setLoginUrl, !!editingAccount?.hasLoginUrl)}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ha-ink)', display: 'block', marginBottom: '0.35rem' }}>
                  Security notes (2FA backup codes, security questions, etc.)
                </label>
                <textarea
                  placeholder={editingAccount?.hasSecurityNotes ? 'Already set — leave blank to keep, type to replace' : 'Not set'}
                  value={securityNotes.value}
                  onChange={(e) => setSecurityNotes({ value: e.target.value, touched: true })}
                  className="ha-input"
                  style={{ fontSize: '0.85rem', minHeight: '70px', resize: 'vertical' }}
                  disabled={!encryptionConfigured}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', display: 'block', marginBottom: '0.35rem' }}>
              Notes (optional, not encrypted)
            </label>
            <input
              type="text"
              placeholder="e.g. Joint account, primary bill-pay account"
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
              {isSaving ? 'Saving…' : editingAccount ? 'Save changes' : 'Add account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
