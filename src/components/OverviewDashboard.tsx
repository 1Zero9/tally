import React from 'react';
import type { ExpenseItem, CurrencyCode, SpendingSummary, IncomeSummary, CustomCategoryItem, AccountItem } from '../types/expense';
import { CATEGORY_LIST, getCategoryMeta } from '../data/categories';
import { convertCurrency, getMonthlyEquivalent, getDaysUntilRenewal } from '../utils/calculations';
import { formatCurrency, formatRenewalCountdown, formatDate } from '../utils/formatters';
import { TrendingUp, Clock, PiggyBank, ArrowRight, Edit2, CalendarClock, Landmark } from 'lucide-react';
import { SensitiveValue } from './SensitiveValue';

// Net worth is a simplification, not a full asset/liability taxonomy —
// credit cards and loans are treated as money owed (subtracted), every
// other account type as money held (added).
const LIABILITY_TYPES = new Set(['CREDIT_CARD', 'LOAN']);

interface OverviewDashboardProps {
  expenses: ExpenseItem[];
  summary: SpendingSummary;
  incomeSummary: IncomeSummary;
  currency: CurrencyCode;
  accounts: AccountItem[];
  onEditExpense: (item: ExpenseItem) => void;
  onFilterCategory: (category: string) => void;
  onOpenAddIncome: () => void;
  onViewAllSpending: () => void;
  onViewAllBills: () => void;
  plannedExpenses?: ExpenseItem[];
  onViewPlanned?: () => void;
  customCategories?: CustomCategoryItem[];
  isSensitiveRevealed: (id: string) => boolean;
  onRevealSensitive: (id: string) => void;
  onViewAccounts: () => void;
}

type MobilePanel = 'recent' | 'spending' | 'bills';

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  expenses,
  summary,
  incomeSummary,
  currency,
  accounts,
  onEditExpense,
  onFilterCategory,
  onOpenAddIncome,
  onViewAllSpending,
  onViewAllBills,
  plannedExpenses = [],
  onViewPlanned,
  customCategories = [],
  isSensitiveRevealed,
  onRevealSensitive,
  onViewAccounts,
}) => {
  const [mobilePanel, setMobilePanel] = React.useState<MobilePanel>('recent');
  const activeExpenses = expenses.filter((e) => e.isActive);
  const hasIncome = incomeSummary.monthlyTotal > 0;
  const netAfterBills = incomeSummary.monthlyTotal - summary.monthlyTotal;

  const activeAccounts = accounts.filter((a) => a.isActive);
  const accountsWithBalance = activeAccounts.filter((a) => a.balance != null);
  const hasNetWorth = accountsWithBalance.length > 0;
  const netWorth = accountsWithBalance.reduce((sum, a) => {
    const converted = convertCurrency(a.balance as number, a.currency, currency);
    return sum + (LIABILITY_TYPES.has(a.type) ? -converted : converted);
  }, 0);

  const renewals = activeExpenses.map((item) => {
    const daysLeft = getDaysUntilRenewal(item.nextRenewalDate || `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${item.renewalDay}`, item.billingCycle);
    // Already paid this cycle — don't show it as due/overdue regardless of the date.
    const urgencyInfo = item.isPaidThisCycle
      ? { text: 'Paid', urgency: 'distant' as const }
      : formatRenewalCountdown(daysLeft);
    return { ...item, daysLeft, urgencyInfo };
  }).sort((a, b) => a.daysLeft - b.daysLeft);

  const dueNext7Days = renewals.filter((item) => !item.isPaidThisCycle && item.daysLeft <= 7);
  const totalNext7Days = dueNext7Days.reduce((sum, item) => sum + convertCurrency(item.amount, item.currency, currency), 0);
  const upcomingBills = renewals.filter((item) => !item.isPaidThisCycle).slice(0, 5);

  const nearestPlanned = plannedExpenses.length > 0
    ? [...plannedExpenses].sort((a, b) => new Date(a.nextRenewalDate).getTime() - new Date(b.nextRenewalDate).getTime())[0]
    : null;

  const recentlyAdded = [...activeExpenses]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 6)
    .map((item) => {
      const daysLeft = getDaysUntilRenewal(item.nextRenewalDate || `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${item.renewalDay}`, item.billingCycle);
      return { ...item, daysLeft };
    });

  const categoryData = [...CATEGORY_LIST, ...customCategories].map((cat) => {
    const catItems = activeExpenses.filter((e) => e.category === cat.id);
    const monthlyAmount = catItems.reduce((sum, item) => {
      const amountInDisplay = convertCurrency(item.amount, item.currency, currency);
      return sum + getMonthlyEquivalent(amountInDisplay, item.billingCycle);
    }, 0);
    return { ...cat, monthlyAmount };
  }).filter((c) => c.monthlyAmount > 0).sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const totalMonthly = categoryData.reduce((sum, c) => sum + c.monthlyAmount, 0);

  let cumulative = 0;
  const gradientStops = categoryData.map((c) => {
    const pct = totalMonthly > 0 ? (c.monthlyAmount / totalMonthly) * 100 : 0;
    const start = cumulative;
    cumulative += pct;
    return `${c.color} ${start}% ${cumulative}%`;
  });
  const donutGradient = gradientStops.length > 0
    ? `conic-gradient(${gradientStops.join(', ')})`
    : 'var(--ha-line)';

  // Bills vs one-off split — recurring bills/contracts vs incidental spending, same monthly-equivalent basis as the category donut above.
  const billsTotal = activeExpenses.filter((e) => e.isBill !== false).reduce((sum, item) => {
    const amountInDisplay = convertCurrency(item.amount, item.currency, currency);
    return sum + getMonthlyEquivalent(amountInDisplay, item.billingCycle);
  }, 0);
  const oneOffTotal = activeExpenses.filter((e) => e.isBill === false).reduce((sum, item) => {
    const amountInDisplay = convertCurrency(item.amount, item.currency, currency);
    return sum + getMonthlyEquivalent(amountInDisplay, item.billingCycle);
  }, 0);
  const billsVsOneOffTotal = billsTotal + oneOffTotal;
  const billsPct = billsVsOneOffTotal > 0 ? (billsTotal / billsVsOneOffTotal) * 100 : 0;
  const billsVsOneOffGradient = billsVsOneOffTotal > 0
    ? `conic-gradient(var(--ha-blue) 0% ${billsPct}%, var(--ha-lime) ${billsPct}% 100%)`
    : 'var(--ha-line)';

  return (
    <div>
      {/* Stat Cards */}
      <div className="ha-stat-row" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div className="ha-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={16} color="var(--ha-blue)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              This month spent
            </span>
          </div>
          <div className="tabular-nums ha-stat-amount" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
            {formatCurrency(summary.monthlyTotal, currency)}
            <span style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', fontWeight: 500 }}>/mo</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', marginTop: '0.35rem' }}>
            {summary.activeCount} active bill{summary.activeCount === 1 ? '' : 's'}
          </div>
        </div>

        <div className="ha-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Clock size={16} color="var(--ha-lime)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Coming up
            </span>
          </div>
          <div className="tabular-nums ha-stat-amount" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
            {formatCurrency(totalNext7Days, currency)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', marginTop: '0.35rem' }}>
            {dueNext7Days.length} due in the next 7 days
          </div>
        </div>

        <div className="ha-card" style={{
          padding: '1.25rem',
          backgroundColor: hasIncome ? (netAfterBills >= 0 ? 'var(--ha-lime-tint)' : 'var(--ha-red-tint)') : 'var(--ha-white)',
          border: hasIncome ? `1px solid ${netAfterBills >= 0 ? 'var(--ha-lime)' : 'var(--ha-red)'}` : '1px solid var(--ha-line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <PiggyBank size={16} color="var(--ha-ink)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ha-ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Left after bills
            </span>
          </div>
          {hasIncome ? (
            <div className="tabular-nums ha-stat-amount" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              <SensitiveValue
                revealed={isSensitiveRevealed('overview-left-after-bills')}
                onReveal={() => onRevealSensitive('overview-left-after-bills')}
              >
                {netAfterBills >= 0 ? '+' : ''}{formatCurrency(netAfterBills, currency)}
                <span style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', fontWeight: 500 }}>/mo</span>
              </SensitiveValue>
            </div>
          ) : (
            <button onClick={onOpenAddIncome} className="btn btn-secondary" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
              + Add income to see net
            </button>
          )}
        </div>

        <div className="ha-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Landmark size={16} color="var(--ha-blue)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Net worth
            </span>
          </div>
          {hasNetWorth ? (
            <>
              <div className="tabular-nums ha-stat-amount" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
                <SensitiveValue
                  revealed={isSensitiveRevealed('overview-net-worth')}
                  onReveal={() => onRevealSensitive('overview-net-worth')}
                >
                  {netWorth >= 0 ? '' : '−'}{formatCurrency(Math.abs(netWorth), currency)}
                </SensitiveValue>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', marginTop: '0.35rem' }}>
                {accountsWithBalance.length} of {activeAccounts.length} account{activeAccounts.length === 1 ? '' : 's'} with a balance set — assets minus cards &amp; loans
              </div>
            </>
          ) : (
            <button onClick={onViewAccounts} className="btn btn-secondary" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
              + Add account balances to see net worth
            </button>
          )}
        </div>
      </div>

      {/* Planned costs nudge — informational only, never affects totals */}
      {nearestPlanned && onViewPlanned && (
        <button
          onClick={onViewPlanned}
          className="ha-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            width: '100%',
            textAlign: 'left',
            padding: '0.9rem 1.25rem',
            marginBottom: '1.5rem',
            backgroundColor: '#fdf2e3',
            border: '1px solid #f6dfb8',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <CalendarClock size={18} color="#B45309" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: '#7C4A0B', minWidth: 0 }}>
              <strong>{plannedExpenses.length} planned cost{plannedExpenses.length === 1 ? '' : 's'}</strong> coming up — nearest is{' '}
              <strong>{nearestPlanned.name}</strong> ({formatCurrency(nearestPlanned.amount, nearestPlanned.currency || currency)}, expected {formatDate(nearestPlanned.nextRenewalDate)})
            </span>
          </div>
          <ArrowRight size={15} color="#B45309" style={{ flexShrink: 0 }} />
        </button>
      )}

      {/* Mobile-only segmented tabs — lets each section below be viewed one at a time instead of one long stack */}
      <div className="ha-overview-mobile-tabs">
        <button
          onClick={() => setMobilePanel('recent')}
          className={`ha-chip${mobilePanel === 'recent' ? ' active' : ''}`}
        >
          Recently added
        </button>
        <button
          onClick={() => setMobilePanel('spending')}
          className={`ha-chip${mobilePanel === 'spending' ? ' active' : ''}`}
        >
          Spending
        </button>
        <button
          onClick={() => setMobilePanel('bills')}
          className={`ha-chip${mobilePanel === 'bills' ? ' active' : ''}`}
        >
          Upcoming bills
        </button>
      </div>

      {/* 2-Column Layout */}
      <div className="ha-overview-grid">
        {/* Left: Recently added */}
        <div
          className={`ha-card ha-overview-panel-recent${mobilePanel === 'recent' ? ' active' : ''}`}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ padding: '1.1rem 1.4rem', borderBottom: '1px solid var(--ha-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                Recently added
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                Showing {recentlyAdded.length} of {activeExpenses.length} active — Spending has the full list
              </p>
            </div>
            <button
              onClick={onViewAllSpending}
              className="btn btn-ghost"
              style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}
            >
              View all
              <ArrowRight size={13} />
            </button>
          </div>
          {recentlyAdded.length > 0 ? (
            <div className="ha-recent-list">
              {recentlyAdded.map((item) => {
                const overdue = !item.isPaidThisCycle && item.daysLeft < 0;
                return (
                  <div key={item.id} className="ha-ledger-row" style={{ alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="ha-color-marker" style={{ backgroundColor: item.color || '#3155D9' }} />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                          {item.paymentMethod || 'Direct Debit'} • {item.billingCycle}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                          <span className="ha-badge ha-badge-neutral" style={{ fontSize: '0.68rem' }}>
                            {getCategoryMeta(item.category, customCategories).name}
                          </span>
                          <span
                            className={`ha-badge ${item.isPaidThisCycle ? 'ha-badge-blue' : overdue ? 'ha-badge-red' : 'ha-badge-neutral'}`}
                            style={{ fontSize: '0.68rem' }}
                          >
                            {item.isPaidThisCycle ? 'Paid' : overdue ? 'Overdue' : 'Unpaid'}
                          </span>
                          {item.billingCycle !== 'once' && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--ha-muted)' }}>
                              Due {formatDate(item.nextRenewalDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="tabular-nums" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                        {formatCurrency(item.amount, item.currency)}
                      </div>
                      <button onClick={() => onEditExpense(item)} className="btn btn-ghost" style={{ padding: '0.3rem 0.4rem' }}>
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '2rem 1.4rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.85rem' }}>
              No expenses added yet.
            </div>
          )}
        </div>

        {/* Right: Donut chart + Upcoming bills */}
        <div className="ha-overview-right" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            className={`ha-card ha-overview-panel-spending${mobilePanel === 'spending' ? ' active' : ''}`}
            style={{ padding: '1.4rem' }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '1.1rem' }}>
              Spending this month
            </h3>

            {categoryData.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <div style={{
                    position: 'relative',
                    width: '208px',
                    height: '208px',
                    borderRadius: '50%',
                    background: donutGradient,
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '140px',
                      height: '140px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--ha-white)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div className="tabular-nums" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
                        {formatCurrency(totalMonthly, currency)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ha-muted)' }}>/month</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {categoryData.slice(0, 5).map((cat) => {
                    const pct = totalMonthly > 0 ? Math.round((cat.monthlyAmount / totalMonthly) * 100) : 0;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => onFilterCategory(cat.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          width: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="ha-color-marker" style={{ backgroundColor: cat.color }} />
                          <span style={{ fontSize: '0.82rem', color: 'var(--ha-ink)', fontWeight: 500 }}>{cat.name}</span>
                        </div>
                        <span className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--ha-muted)' }}>{pct}%</span>
                      </button>
                    );
                  })}
                  {categoryData.length > 5 && (
                    <button
                      onClick={onViewAllSpending}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontSize: '0.75rem', color: 'var(--ha-muted)', marginTop: '0.15rem' }}
                    >
                      +{categoryData.length - 5} more categories — view all in Spending
                    </button>
                  )}
                </div>

                {billsVsOneOffTotal > 0 && (
                  <div style={{ marginTop: '1.4rem', paddingTop: '1.1rem', borderTop: '1px solid var(--ha-line)' }}>
                    <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>
                      Bills vs one-off
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
                      <div style={{
                        position: 'relative',
                        width: '84px',
                        height: '84px',
                        borderRadius: '50%',
                        background: billsVsOneOffGradient,
                        flexShrink: 0,
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '54px',
                          height: '54px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--ha-white)',
                        }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="ha-color-marker" style={{ backgroundColor: 'var(--ha-blue)' }} />
                          <span style={{ fontSize: '0.82rem', color: 'var(--ha-ink)', fontWeight: 500 }}>Bills</span>
                          <span className="tabular-nums" style={{ fontSize: '0.78rem', color: 'var(--ha-muted)' }}>
                            {formatCurrency(billsTotal, currency)} ({Math.round(billsPct)}%)
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="ha-color-marker" style={{ backgroundColor: 'var(--ha-lime)' }} />
                          <span style={{ fontSize: '0.82rem', color: 'var(--ha-ink)', fontWeight: 500 }}>One-off</span>
                          <span className="tabular-nums" style={{ fontSize: '0.78rem', color: 'var(--ha-muted)' }}>
                            {formatCurrency(oneOffTotal, currency)} ({Math.round(100 - billsPct)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.85rem', padding: '1.5rem 0' }}>
                Add an expense to see your spending breakdown.
              </div>
            )}
          </div>

          <div
            className={`ha-card ha-overview-panel-bills${mobilePanel === 'bills' ? ' active' : ''}`}
            style={{ overflow: 'hidden' }}
          >
            <button
              onClick={onViewAllBills}
              style={{
                width: '100%',
                padding: '1.1rem 1.4rem',
                borderBottom: '1px solid var(--ha-line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'none',
                border: 'none',
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                borderBottomColor: 'var(--ha-line)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                  Upcoming bills
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                  Unpaid only — see Bills for everything
                </p>
              </div>
              <ArrowRight size={15} color="var(--ha-muted)" />
            </button>
            {upcomingBills.length > 0 ? (
              <div>
                {upcomingBills.map((item) => (
                  <div key={item.id} className="ha-ledger-row">
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--ha-muted)' }}>
                        {item.urgencyInfo.text}
                      </div>
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                      {formatCurrency(item.amount, item.currency)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1.5rem 1.4rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.85rem' }}>
                Nothing scheduled.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
