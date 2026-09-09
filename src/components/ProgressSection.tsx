import React, { useMemo } from 'react';
import type { GoalItem, ExpenseItem, AccountItem, TransferItem, CurrencyCode } from '../types/expense';
import { formatCurrency } from '../utils/formatters';
import { convertCurrency, getMonthlyEquivalent } from '../utils/calculations';
import { CollapsibleSection } from './CollapsibleSection';
import { Edit2, Trash2, Plus, Target, TrendingDown, TrendingUp } from 'lucide-react';

interface ProgressSectionProps {
  goals: GoalItem[];
  expenses: ExpenseItem[];
  accounts: AccountItem[];
  transfers: TransferItem[];
  currency: CurrencyCode;
  onEditGoal: (goal: GoalItem) => void;
  onDeleteGoal: (id: string) => void;
  onOpenAddModal: () => void;
}

const DEBT_TYPES = new Set(['LOAN', 'CREDIT_CARD']);
// Savings vehicles, in the order the section groups them.
const SAVINGS_TYPE_ORDER = ['SAVINGS', 'CREDIT_UNION', 'INVESTMENT', 'SHARES', 'STATE_SAVINGS'] as const;
const SAVINGS_TYPES = new Set<string>(SAVINGS_TYPE_ORDER);
const TYPE_LABEL: Record<string, string> = {
  LOAN: 'Loan',
  CREDIT_CARD: 'Credit card',
  SAVINGS: 'Savings',
  CREDIT_UNION: 'Credit union',
  INVESTMENT: 'Investment',
  SHARES: 'Shares',
  STATE_SAVINGS: 'State Savings',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function addMonths(from: Date, n: number): Date {
  return new Date(from.getFullYear(), from.getMonth() + n, from.getDate());
}
function fmtMonth(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
/** Whole-month difference a→b (positive if b is later). */
function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}
function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
}

const Bar: React.FC<{ pct: number; color?: string }> = ({ pct, color = 'var(--ha-blue)' }) => (
  <div style={{ marginTop: '0.55rem', height: '8px', borderRadius: '999px', backgroundColor: 'var(--ha-line)', overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, borderRadius: '999px', backgroundColor: pct >= 100 ? 'var(--ha-lime)' : color, transition: 'width 0.3s ease' }} />
  </div>
);

const Stat: React.FC<{ label: string; value: string; tone?: 'ink' | 'red' | 'lime' }> = ({ label, value, tone = 'ink' }) => (
  <div className="ha-card" style={{ padding: '0.9rem 1.1rem', flex: '1 1 160px' }}>
    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
    <div className="tabular-nums" style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '0.2rem', color: tone === 'red' ? 'var(--ha-red)' : tone === 'lime' ? 'var(--ha-lime)' : 'var(--ha-ink)' }}>{value}</div>
  </div>
);

export const ProgressSection: React.FC<ProgressSectionProps> = ({
  goals, expenses, accounts, transfers, currency, onEditGoal, onDeleteGoal, onOpenAddModal,
}) => {
  const debts = useMemo(
    () => accounts.filter((a) => DEBT_TYPES.has(a.type) && a.balance != null && a.balance !== 0),
    [accounts],
  );

  const savings = useMemo(
    () => accounts
      .filter((a) => SAVINGS_TYPES.has(a.type) && a.balance != null)
      .sort((a, b) => (b.balance || 0) - (a.balance || 0)),
    [accounts],
  );

  // Payments logged toward each debt account = transfers landing in it.
  const paymentsByAccount = useMemo(() => {
    const m = new Map<string, { count: number; total: number }>();
    for (const t of transfers) {
      if (!t.toAccountId) continue;
      const e = m.get(t.toAccountId) || { count: 0, total: 0 };
      e.count += 1;
      e.total += convertCurrency(t.amount, t.currency, currency);
      m.set(t.toAccountId, e);
    }
    return m;
  }, [transfers, currency]);

  // Monthly contribution to each goal = active expenses linked to it.
  const contributionByGoal = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) {
      if (!e.linkedGoalId || !e.isActive) continue;
      const monthly = getMonthlyEquivalent(convertCurrency(e.amount, e.currency, currency), e.billingCycle);
      m.set(e.linkedGoalId, (m.get(e.linkedGoalId) || 0) + monthly);
    }
    return m;
  }, [expenses, currency]);

  const totalOwed = debts.reduce((s, a) => s + convertCurrency(Math.abs(a.balance || 0), a.currency, currency), 0);
  const totalSavings = savings.reduce((s, a) => s + convertCurrency(a.balance || 0, a.currency, currency), 0);
  const totalSaved = goals.filter((g) => g.isActive).reduce((s, g) => s + convertCurrency(g.currentAmount, g.currency, currency), 0);
  const activeGoals = goals.filter((g) => g.isActive);

  const goalOnTrack = (g: GoalItem): boolean | null => {
    const rate = contributionByGoal.get(g.id) || 0;
    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
    if (remaining === 0) return true;
    if (rate <= 0) return null; // unknown — no contribution wired up
    if (!g.targetDate) return true;
    const monthsLeft = Math.ceil(convertCurrency(remaining, g.currency, currency) / rate);
    return addMonths(new Date(), monthsLeft) <= new Date(g.targetDate);
  };
  const onTrackCount = activeGoals.filter((g) => goalOnTrack(g) === true).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div className="ha-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="ha-badge ha-badge-blue">Where you stand</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>Progress</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '600px', marginTop: '0.25rem' }}>
              Savings balances, loans and cards being paid down, and goals being built up — in one place.
            </p>
          </div>
          <button onClick={onOpenAddModal} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            <Plus size={15} />
            <span>Add goal</span>
          </button>
        </div>
      </div>

      {/* Overview strip */}
      <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
        <Stat label="Savings balances" value={formatCurrency(totalSavings, currency)} tone={totalSavings > 0 ? 'lime' : 'ink'} />
        <Stat label="Total owed" value={formatCurrency(totalOwed, currency)} tone={totalOwed > 0 ? 'red' : 'ink'} />
        <Stat label="Saved toward goals" value={formatCurrency(totalSaved, currency)} tone={totalSaved > 0 ? 'lime' : 'ink'} />
        <Stat label="Goals on track" value={activeGoals.length ? `${onTrackCount} of ${activeGoals.length}` : '—'} />
      </div>

      {savings.length > 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', margin: '-0.5rem 0 0' }}>
          {savings.length} savings account{savings.length === 1 ? '' : 's'} totalling {formatCurrency(totalSavings, currency)} — see <strong>Accounts</strong> for the breakdown by type.
        </p>
      )}

      {/* Debts */}
      <CollapsibleSection id="progress-debts" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><TrendingDown size={15} /> Loans &amp; cards ({debts.length})</span>}>
        {debts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.85rem' }}>
            No loans or credit cards with a balance. Add one in Accounts, with its original amount, to track payoff progress here.
          </div>
        ) : (
          <div>
            {debts.map((a) => {
              const owed = Math.abs(a.balance || 0);
              const hasOriginal = a.type === 'LOAN' && a.originalAmount != null && a.originalAmount > owed;
              const paidOff = hasOriginal ? (a.originalAmount as number) - owed : 0;
              const pct = hasOriginal ? Math.round((paidOff / (a.originalAmount as number)) * 100) : 0;
              const pay = paymentsByAccount.get(a.id);
              const payoffDays = a.payoffDate ? daysUntil(a.payoffDate) : null;

              return (
                <div key={a.id} style={{ borderBottom: '1px solid var(--ha-line)', padding: '1.1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ha-ink)' }}>{a.name}</span>
                        <span className="ha-badge ha-badge-neutral" style={{ fontSize: '0.7rem' }}>{TYPE_LABEL[a.type] || a.type}</span>
                        {a.institution && <span style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>{a.institution}</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                        {hasOriginal ? (
                          <>{formatCurrency(paidOff, a.currency)} of {formatCurrency(a.originalAmount as number, a.currency)} paid off — {formatCurrency(owed, a.currency)} to go</>
                        ) : (
                          <>{formatCurrency(owed, a.currency)} owed</>
                        )}
                        {pay && <> • {formatCurrency(pay.total, currency)} logged across {pay.count} payment{pay.count === 1 ? '' : 's'}</>}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--ha-muted)', marginTop: '2px', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {a.interestRate != null && <span>Rate {a.interestRate}%</span>}
                        {a.termMonths != null && <span>Term {a.termMonths} mo</span>}
                        {a.payoffDate && (
                          <span>Target payoff {a.payoffDate}{payoffDays != null && payoffDays > 0 ? ` (${Math.round(payoffDays / 30)} mo)` : ''}</span>
                        )}
                      </div>
                    </div>
                    {hasOriginal && (
                      <span className="tabular-nums" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ha-ink)', flexShrink: 0 }}>{pct}%</span>
                    )}
                  </div>
                  {hasOriginal && <Bar pct={pct} color="var(--ha-lime)" />}
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Goals */}
      <CollapsibleSection id="progress-goals" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><TrendingUp size={15} /> Savings goals ({goals.length})</span>}>
        {goals.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--ha-muted)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--ha-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Target size={24} color="var(--ha-blue)" />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.35rem' }}>No goals set yet</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              Set a target — an emergency fund, a house deposit, a holiday — and track progress as you save. Link a recurring
              top-up to it and Tally projects when you&apos;ll get there.
            </p>
            <button onClick={onOpenAddModal} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              <Plus size={15} /> <span>+ Add first goal</span>
            </button>
          </div>
        ) : (
          <div>
            {goals.map((g) => {
              const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
              const remaining = Math.max(0, g.targetAmount - g.currentAmount);
              const days = g.targetDate ? daysUntil(g.targetDate) : null;
              const rate = contributionByGoal.get(g.id) || 0;
              const remainingInCcy = convertCurrency(remaining, g.currency, currency);
              const monthsLeft = rate > 0 && remaining > 0 ? Math.ceil(remainingInCcy / rate) : null;
              const projected = monthsLeft != null ? addMonths(new Date(), monthsLeft) : null;
              const vsTarget =
                projected && g.targetDate ? monthsBetween(projected, new Date(g.targetDate)) : null;

              return (
                <div key={g.id} style={{ borderBottom: '1px solid var(--ha-line)', padding: '1.1rem 1.25rem', opacity: g.isActive ? 1 : 0.55 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ha-ink)' }}>{g.name}</span>
                        {g.linkedAccount && <span className="ha-badge ha-badge-neutral" style={{ fontSize: '0.7rem' }}>{g.linkedAccount.name}</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                        {formatCurrency(g.currentAmount, g.currency)} of {formatCurrency(g.targetAmount, g.currency)} — {formatCurrency(remaining, g.currency)} to go
                        {g.targetDate && days !== null && (
                          <> • {days > 0 ? `${days} day${days === 1 ? '' : 's'} left` : days === 0 ? 'Due today' : `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`}</>
                        )}
                      </div>
                      {remaining > 0 && (
                        <div style={{ fontSize: '0.74rem', marginTop: '3px', color: monthsLeft == null ? 'var(--ha-muted)' : vsTarget != null && vsTarget < 0 ? 'var(--ha-red)' : 'var(--ha-ink)' }}>
                          {monthsLeft == null ? (
                            'No recurring top-up linked — link one to project a finish date'
                          ) : (
                            <>
                              ~{formatCurrency(rate, currency)}/mo → on track for {fmtMonth(projected as Date)}
                              {vsTarget != null && vsTarget !== 0 && (
                                <> ({Math.abs(vsTarget)} mo {vsTarget > 0 ? 'ahead of' : 'behind'} target)</>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <span className="tabular-nums" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ha-ink)' }}>{pct}%</span>
                      <button onClick={() => onEditGoal(g)} className="btn btn-ghost" style={{ padding: '0.35rem 0.45rem' }} title="Edit goal"><Edit2 size={14} /></button>
                      <button onClick={() => onDeleteGoal(g.id)} className="btn btn-ghost" style={{ padding: '0.35rem 0.45rem', color: 'var(--ha-red)' }} title="Delete goal"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <Bar pct={pct} />
                  {g.notes && <p style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', marginTop: '0.5rem' }}>{g.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
};
