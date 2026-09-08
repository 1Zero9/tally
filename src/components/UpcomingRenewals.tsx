import React from 'react';
import type { ExpenseItem, CurrencyCode } from '../types/expense';
import { getDaysUntilRenewal, convertCurrency } from '../utils/calculations';
import { formatCurrency, formatRenewalCountdown } from '../utils/formatters';
import { Edit2 } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';

interface UpcomingRenewalsProps {
  expenses: ExpenseItem[];
  currency: CurrencyCode;
  onEditExpense: (expense: ExpenseItem) => void;
}

export const UpcomingRenewals: React.FC<UpcomingRenewalsProps> = ({
  expenses,
  currency,
  onEditExpense,
}) => {
  // Recurring bills & contracts only — never one-off spending (a `once`
  // expense isn't a renewal, even if its isBill flag was left on, e.g. by an
  // older "Add as expense" from a statement import).
  const activeItems = expenses.filter((e) => e.isActive && e.isBill !== false && e.billingCycle !== 'once');

  const sortedRenewals = activeItems.map((item) => {
    const daysLeft = getDaysUntilRenewal(item.nextRenewalDate || `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${item.renewalDay}`, item.billingCycle);
    // Already paid this cycle — don't show it as due/overdue regardless of the date.
    const urgencyInfo = item.isPaidThisCycle
      ? { text: 'Paid', urgency: 'distant' as const }
      : formatRenewalCountdown(daysLeft);
    return {
      ...item,
      daysLeft,
      urgencyInfo,
    };
  }).sort((a, b) => a.daysLeft - b.daysLeft);

  const dueNext7Days = sortedRenewals.filter((item) => !item.isPaidThisCycle && item.daysLeft <= 7);
  const totalNext7Days = dueNext7Days.reduce((sum, item) => {
    return sum + convertCurrency(item.amount, item.currency, currency);
  }, 0);

  const totalNext30Days = sortedRenewals.filter((item) => !item.isPaidThisCycle && item.daysLeft <= 30).reduce((sum, item) => {
    return sum + convertCurrency(item.amount, item.currency, currency);
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header Summary */}
      <div className="ha-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="ha-badge ha-badge-blue">
                Payment schedule
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              Upcoming renewals & debits
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '600px', marginTop: '0.25rem' }}>
              Chronological schedule of your recurring bills & contracts (mobile, electric, gas, subscriptions…). One-off spending doesn&apos;t show here — it&apos;s in Spending only.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{
              backgroundColor: '#fafaf7',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--ha-radius-md)',
              border: '1px solid var(--ha-line)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Next 7 days
              </div>
              <div className="tabular-nums" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                {formatCurrency(totalNext7Days, currency)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--ha-muted)' }}>
                {dueNext7Days.length} {dueNext7Days.length === 1 ? 'payment' : 'payments'}
              </div>
            </div>

            <div style={{
              backgroundColor: '#fafaf7',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--ha-radius-md)',
              border: '1px solid var(--ha-line)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Next 30 days
              </div>
              <div className="tabular-nums" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-blue)' }}>
                {formatCurrency(totalNext30Days, currency)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--ha-muted)' }}>
                Full cycle
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Due in next 7 days list */}
      {dueNext7Days.length > 0 && (
        <CollapsibleSection id="renewals-due-soon" title={`Due in next 7 days (${dueNext7Days.length})`}>
          <div>
            {dueNext7Days.map((item) => (
              <div key={item.id} className="ha-ledger-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span className="ha-color-marker" style={{ backgroundColor: item.color || '#3155D9' }} />
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>
                      {item.paymentMethod || 'Direct Debit'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <span className={item.daysLeft <= 1 ? 'ha-badge ha-badge-red' : 'ha-badge ha-badge-blue'}>
                    {item.urgencyInfo.text}
                  </span>

                  <div className="tabular-nums" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ha-ink)', minWidth: '90px', textAlign: 'right' }}>
                    {formatCurrency(item.amount, item.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Full Chronological Ledger */}
      <CollapsibleSection id="renewals-full-schedule" title="Chronological schedule (Day 1 to 31)">
        <div>
          {sortedRenewals.map((item) => (
            <div key={item.id} className="ha-ledger-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '38px',
                  textAlign: 'center',
                  padding: '0.2rem 0',
                  backgroundColor: '#fafaf7',
                  border: '1px solid var(--ha-line)',
                  borderRadius: 'var(--ha-radius-sm)',
                }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--ha-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Day
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                    {item.renewalDay}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="ha-color-marker" style={{ backgroundColor: item.color || '#3155D9' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                        {item.name}
                      </span>
                      {item.vendor && item.vendor !== item.name && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>
                          ({item.vendor})
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>
                      {item.paymentMethod || 'Direct Debit'} • {item.billingCycle}
                      {item.contractEndDate && (
                        <> • Contract ends {item.contractEndDate}</>
                      )}
                      {item.vendorEmail && (
                        <> • {item.vendorEmail}</>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <span className="ha-badge ha-badge-neutral">
                  {item.urgencyInfo.text}
                </span>

                <div className="tabular-nums" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ha-ink)', minWidth: '90px', textAlign: 'right' }}>
                  {formatCurrency(item.amount, item.currency)}
                </div>

                <button
                  onClick={() => onEditExpense(item)}
                  className="btn btn-ghost"
                  style={{ padding: '0.35rem 0.45rem' }}
                  title="Edit record"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
};
