import React, { useState } from 'react';
import type { AccountItem, CurrencyCode, TransferItem } from '../types/expense';
import { Edit2, Trash2, Plus, Landmark, Eye, EyeOff, Copy, Check, ShieldAlert, Link as LinkIcon, PiggyBank, ScrollText } from 'lucide-react';
import { hasTextSelection } from '../utils/dom';
import { convertCurrency } from '../utils/calculations';
import { CollapsibleSection } from './CollapsibleSection';
import { AccountRegisterModal } from './AccountRegisterModal';
import { formatCurrency, formatDate } from '../utils/formatters';

const LIABILITY_TYPES = new Set(['CREDIT_CARD', 'LOAN']);
// Savings vehicles, in the order the summary groups them.
const SAVINGS_TYPE_ORDER = ['SAVINGS', 'CREDIT_UNION', 'INVESTMENT', 'SHARES', 'STATE_SAVINGS'] as const;

const TYPE_LABELS: Record<string, string> = {
  CHECKING: 'Current',
  SAVINGS: 'Savings',
  CREDIT_UNION: 'Credit union',
  CREDIT_CARD: 'Credit card',
  DEBIT_CARD: 'Debit card',
  PAYPAL: 'PayPal',
  LOAN: 'Loan',
  INVESTMENT: 'Investment',
  SHARES: 'Shares',
  STATE_SAVINGS: 'State Savings',
  OTHER: 'Other',
};

const SENSITIVE_FIELDS: { key: string; hasKey: keyof AccountItem; label: string }[] = [
  { key: 'accountNumber', hasKey: 'hasAccountNumber', label: 'Account number' },
  { key: 'routingNumber', hasKey: 'hasRoutingNumber', label: 'Routing / sort code' },
  { key: 'iban', hasKey: 'hasIban', label: 'IBAN' },
  { key: 'bic', hasKey: 'hasBic', label: 'BIC / SWIFT' },
  { key: 'loginUsername', hasKey: 'hasLoginUsername', label: 'Login username' },
  { key: 'loginPassword', hasKey: 'hasLoginPassword', label: 'Login password' },
  { key: 'loginUrl', hasKey: 'hasLoginUrl', label: 'Login URL' },
  { key: 'securityNotes', hasKey: 'hasSecurityNotes', label: 'Security notes' },
];

interface AccountsSectionProps {
  accounts: AccountItem[];
  transfers: TransferItem[];
  currency: CurrencyCode;
  encryptionConfigured: boolean;
  onEditAccount: (account: AccountItem) => void;
  onDeleteAccount: (id: string) => void;
  onOpenAddModal: () => void;
}

export const AccountsSection: React.FC<AccountsSectionProps> = ({
  accounts,
  transfers,
  currency,
  encryptionConfigured,
  onEditAccount,
  onDeleteAccount,
  onOpenAddModal,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [registerAccount, setRegisterAccount] = useState<AccountItem | null>(null);

  const savingsAccounts = accounts.filter((a) => SAVINGS_TYPE_ORDER.includes(a.type as typeof SAVINGS_TYPE_ORDER[number]) && a.balance != null);
  const savingsTotal = savingsAccounts.reduce((s, a) => s + convertCurrency(a.balance || 0, a.currency, currency), 0);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealingKey, setRevealingKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const revealKey = (accountId: string, field: string) => `${accountId}:${field}`;

  const handleReveal = async (accountId: string, field: string) => {
    const key = revealKey(accountId, field);
    if (revealed[key] !== undefined) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    setRevealingKey(key);
    try {
      const res = await fetch(`/api/accounts/${accountId}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setRevealed((prev) => ({ ...prev, [key]: data.value ?? '' }));
      }
    } catch (err) {
      console.error('Failed to reveal field:', err);
    } finally {
      setRevealingKey(null);
    }
  };

  const handleCopy = async (accountId: string, field: string, value: string) => {
    const key = revealKey(accountId, field);
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div className="ha-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="ha-badge ha-badge-blue">Financial accounts</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              Accounts &amp; payment methods
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '600px', marginTop: '0.25rem' }}>
              Banks, credit unions, cards and loans — with encrypted account numbers and login details for emergencies.
            </p>
          </div>
          <button onClick={onOpenAddModal} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            <Plus size={15} />
            <span>Add account</span>
          </button>
        </div>

        {!encryptionConfigured && (
          <div style={{
            marginTop: '1rem',
            backgroundColor: 'var(--ha-red-tint)',
            border: '1px solid var(--ha-red)',
            borderRadius: 'var(--ha-radius-sm)',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--ha-red)',
            fontSize: '0.78rem',
          }}>
            <ShieldAlert size={15} style={{ flexShrink: 0 }} />
            <span>Credential encryption isn&apos;t configured on this server. Account numbers and logins can&apos;t be saved until CREDENTIALS_ENCRYPTION_KEY is set.</span>
          </div>
        )}
      </div>

      {savingsAccounts.length >= 2 && (
        <div className="ha-card" style={{ padding: '1.1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
            <PiggyBank size={15} color="var(--ha-blue)" />
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ha-ink)' }}>Savings by type</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {SAVINGS_TYPE_ORDER.filter((t) => savingsAccounts.some((a) => a.type === t)).map((t) => {
              const group = savingsAccounts.filter((a) => a.type === t);
              const subtotal = group.reduce((s, a) => s + convertCurrency(a.balance || 0, a.currency, currency), 0);
              return (
                <div key={t} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--ha-muted)' }}>{TYPE_LABELS[t]} · {group.length}</span>
                  <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--ha-ink)' }}>{formatCurrency(subtotal, currency)}</span>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: 'var(--ha-ink)', borderTop: '1px solid var(--ha-line)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
              <span>Total savings</span>
              <span className="tabular-nums">{formatCurrency(savingsTotal, currency)}</span>
            </div>
          </div>
        </div>
      )}

      <CollapsibleSection id="accounts-ledger" title={`Accounts (${accounts.length})`}>
        {accounts.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--ha-muted)' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--ha-blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <Landmark size={24} color="var(--ha-blue)" />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.35rem' }}>
              No accounts recorded yet
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              Add your bank accounts, credit union loan, PayPal or cards to track where money flows in and out.
            </p>
            <button onClick={onOpenAddModal} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              <Plus size={15} />
              <span>Add first account</span>
            </button>
          </div>
        ) : (
          <div>
            {accounts.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <div key={item.id} style={{ borderBottom: '1px solid var(--ha-line)' }}>
                  <div
                    className="ha-ledger-row"
                    style={{ opacity: item.isActive ? 1 : 0.55, cursor: 'pointer' }}
                    onClick={() => {
                      if (hasTextSelection()) return;
                      setExpandedId(isExpanded ? null : item.id);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 280px' }}>
                      <span className="ha-color-marker" style={{ backgroundColor: item.type === 'LOAN' ? 'var(--ha-red)' : 'var(--ha-blue)' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                            {item.name}
                          </span>
                          <span className="ha-badge ha-badge-neutral" style={{ fontSize: '0.7rem' }}>
                            {TYPE_LABELS[item.type] || item.type}
                          </span>
                        </div>
                        {item.institution && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                            {item.institution}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem' }}>
                      {item.balance != null && (
                        <div className="tabular-nums" style={{ fontSize: '0.9rem', fontWeight: 700, color: LIABILITY_TYPES.has(item.type) ? 'var(--ha-red)' : 'var(--ha-ink)' }}>
                          {formatCurrency(item.balance, item.currency)}
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditAccount(item); }}
                        className="btn btn-ghost"
                        style={{ padding: '0.35rem 0.45rem' }}
                        title="Edit record"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteAccount(item.id); }}
                        className="btn btn-ghost"
                        style={{ padding: '0.35rem 0.45rem', color: 'var(--ha-red)' }}
                        title="Delete record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setRegisterAccount(item); }}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}
                        >
                          <ScrollText size={13} /> View register
                        </button>
                      </div>
                      {item.balance != null && item.balanceAsOf && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--ha-muted)' }}>
                          Balance as of {formatDate(item.balanceAsOf)} — entered manually, not live-synced.
                        </p>
                      )}

                      {item.type === 'LOAN' && (item.originalAmount || item.interestRate || item.termMonths || item.payoffDate) && (
                        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--ha-muted)', padding: '0.6rem 0', borderTop: '1px solid var(--ha-line)' }}>
                          {item.originalAmount != null && <span>Original: <strong style={{ color: 'var(--ha-ink)' }}>{item.originalAmount}</strong></span>}
                          {item.interestRate != null && <span>Rate: <strong style={{ color: 'var(--ha-ink)' }}>{item.interestRate}%</strong></span>}
                          {item.termMonths != null && <span>Term: <strong style={{ color: 'var(--ha-ink)' }}>{item.termMonths}mo</strong></span>}
                          {item.payoffDate && <span>Payoff: <strong style={{ color: 'var(--ha-ink)' }}>{item.payoffDate}</strong></span>}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--ha-line)', paddingTop: '0.6rem' }}>
                        {SENSITIVE_FIELDS.map((f) => {
                          const has = !!item[f.hasKey];
                          if (!has) return null;
                          const key = revealKey(item.id, f.key);
                          const isRevealed = revealed[key] !== undefined;
                          const isLoading = revealingKey === key;
                          return (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--ha-muted)', width: '150px', flexShrink: 0 }}>{f.label}</span>
                              <span className="tabular-nums" style={{ color: 'var(--ha-ink)', fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                                {isRevealed ? revealed[key] : '••••••••'}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReveal(item.id, f.key); }}
                                className="btn btn-ghost"
                                style={{ padding: '0.25rem 0.35rem' }}
                                title={isRevealed ? 'Hide' : 'Reveal'}
                                disabled={isLoading}
                              >
                                {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                              {isRevealed && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCopy(item.id, f.key, revealed[key]); }}
                                  className="btn btn-ghost"
                                  style={{ padding: '0.25rem 0.35rem' }}
                                  title="Copy"
                                >
                                  {copiedKey === key ? <Check size={13} color="var(--ha-lime)" /> : <Copy size={13} />}
                                </button>
                              )}
                              {f.key === 'loginUrl' && isRevealed && revealed[key] && (
                                <a href={revealed[key]} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="Open link">
                                  <LinkIcon size={13} color="var(--ha-blue)" />
                                </a>
                              )}
                            </div>
                          );
                        })}
                        {SENSITIVE_FIELDS.every((f) => !item[f.hasKey]) && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--ha-muted)' }}>No sensitive details saved for this account.</p>
                        )}
                      </div>

                      {item._count && (item._count.expenses > 0 || item._count.incomes > 0) && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--ha-muted)', marginTop: '0.35rem' }}>
                          Linked to {item._count.expenses} expense{item._count.expenses === 1 ? '' : 's'} and {item._count.incomes} income source{item._count.incomes === 1 ? '' : 's'}.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      <AccountRegisterModal
        isOpen={registerAccount !== null}
        onClose={() => setRegisterAccount(null)}
        account={registerAccount}
        transfers={transfers}
      />
    </div>
  );
};
