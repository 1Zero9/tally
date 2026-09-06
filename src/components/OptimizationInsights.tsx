import React, { useState } from 'react';
import type { ExpenseItem, CurrencyCode } from '../types/expense';
import { convertCurrency, getMonthlyEquivalent, getEffectiveAmount } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { CollapsibleSection } from './CollapsibleSection';

interface OptimizationInsightsProps {
  expenses: ExpenseItem[];
  currency: CurrencyCode;
}

const HORIZONS: { id: string; label: string; months: number }[] = [
  { id: '1m', label: '1 month', months: 1 },
  { id: '1y', label: '1 year', months: 12 },
  { id: '3y', label: '3 years', months: 36 },
  { id: '5y', label: '5 years', months: 60 },
];

export const OptimizationInsights: React.FC<OptimizationInsightsProps> = ({
  expenses,
  currency,
}) => {
  const [horizonId, setHorizonId] = useState('1y');
  const horizon = HORIZONS.find((h) => h.id === horizonId) || HORIZONS[1];

  const activeItems = expenses.filter((e) => e.isActive);
  const pausedItems = expenses.filter((e) => !e.isActive);

  // 1. Annual billing conversion — monthly plans worth switching to yearly.
  const monthlyOnlyServices = activeItems.filter((e) => e.billingCycle === 'monthly' && getEffectiveAmount(e) > 8);
  const annualSwitchYearly = monthlyOnlyServices.reduce((sum, item) => {
    const amountInDisplay = convertCurrency(getEffectiveAmount(item), item.currency, currency);
    return sum + amountInDisplay * 2; // ~2 months free equivalent
  }, 0);
  const annualSwitchMonthly = annualSwitchYearly / 12;

  // 2. Rarely used — active subscriptions marked low usage, prime cancellation candidates.
  const rarelyUsedItems = activeItems.filter((e) => e.usageRating === 'low');
  const rarelyUsedMonthly = rarelyUsedItems.reduce((sum, item) => {
    return sum + getMonthlyEquivalent(convertCurrency(getEffectiveAmount(item), item.currency, currency), item.billingCycle);
  }, 0);

  // 3. Already saving — subscriptions already paused.
  const alreadySavingMonthly = pausedItems.reduce((sum, item) => {
    return sum + getMonthlyEquivalent(convertCurrency(getEffectiveAmount(item), item.currency, currency), item.billingCycle);
  }, 0);

  const potentialMonthly = annualSwitchMonthly + rarelyUsedMonthly;
  const heroTotal = potentialMonthly * horizon.months;
  const alreadyTotal = alreadySavingMonthly * horizon.months;
  const annualSwitchTotal = annualSwitchMonthly * horizon.months;
  const rarelyUsedTotal = rarelyUsedMonthly * horizon.months;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header + Horizon toggle */}
      <div className="ha-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="ha-badge ha-badge-lime">
                Savings
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              What could we save?
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '600px', marginTop: '0.25rem' }}>
              Real numbers from your bills — pick a timeframe to see what it adds up to.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {HORIZONS.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setHorizonId(h.id)}
                className={h.id === horizonId ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--ha-lime-tint)',
          border: '1px solid var(--ha-lime)',
          padding: '1.25rem',
          borderRadius: 'var(--ha-radius-md)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--ha-ink)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>
            Potential savings over {horizon.label}
          </div>
          <div className="tabular-nums" style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.15 }}>
            {formatCurrency(heroTotal, currency)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--ha-muted)' }}>
            from annual billing switches and rarely-used subscriptions
          </div>
        </div>
      </div>

      {/* Opportunity Grid */}
      <CollapsibleSection id="optimization-opportunities" title="Opportunities" bodyStyle={{ padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {/* 1. Annual Billing Conversion */}
        <div className="ha-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.5rem' }}>
            Switch to annual billing
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', marginBottom: '1rem', lineHeight: 1.45 }}>
            {monthlyOnlyServices.length ? (
              <><strong>{monthlyOnlyServices.length} active monthly subscription{monthlyOnlyServices.length === 1 ? '' : 's'}</strong> could switch to yearly billing — typically ~16% cheaper (2 months free).</>
            ) : (
              'No monthly subscriptions currently worth switching.'
            )}
          </p>
          <div style={{
            backgroundColor: '#fafaf7',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--ha-radius-sm)',
            border: '1px solid var(--ha-line)',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>Over {horizon.label}:</div>
            <div className="tabular-nums" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-blue)' }}>
              {formatCurrency(annualSwitchTotal, currency)}
            </div>
          </div>
        </div>

        {/* 2. Rarely Used */}
        <div className="ha-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.5rem' }}>
            Rarely used — consider cancelling
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', marginBottom: '1rem', lineHeight: 1.45 }}>
            {rarelyUsedItems.length ? (
              <><strong>{rarelyUsedItems.length} subscription{rarelyUsedItems.length === 1 ? '' : 's'}</strong> marked low usage: {rarelyUsedItems.map((i) => i.name).join(', ')}.</>
            ) : (
              'Nothing marked as low usage right now — set a usage rating on a bill to track this.'
            )}
          </p>
          <div style={{
            backgroundColor: '#fafaf7',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--ha-radius-sm)',
            border: '1px solid var(--ha-line)',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>Over {horizon.label}, if cancelled:</div>
            <div className="tabular-nums" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-blue)' }}>
              {formatCurrency(rarelyUsedTotal, currency)}
            </div>
          </div>
        </div>

        {/* 3. Already Saving */}
        <div className="ha-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.5rem' }}>
            Already saving
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', marginBottom: '1rem', lineHeight: 1.45 }}>
            {pausedItems.length ? (
              <><strong>{pausedItems.length} paused subscription{pausedItems.length === 1 ? '' : 's'}</strong> that used to cost {formatCurrency(alreadySavingMonthly, currency)}/month.</>
            ) : (
              'No paused subscriptions yet.'
            )}
          </p>
          <div style={{
            backgroundColor: '#fafaf7',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--ha-radius-sm)',
            border: '1px solid var(--ha-line)',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>Value over {horizon.label}:</div>
            <div className="tabular-nums" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-blue)' }}>
              {formatCurrency(alreadyTotal, currency)}
            </div>
          </div>
        </div>
      </div>
      </CollapsibleSection>
    </div>
  );
};
