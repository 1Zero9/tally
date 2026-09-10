import type { BillingCycle, CurrencyCode } from '../types/expense';
import { CURRENCIES } from './currencies';

/**
 * Formats a monetary value according to currency symbol & decimals.
 * Follows clean European style (€123.45).
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'EUR',
  includeDecimals: boolean = true
): string {
  const cfg = CURRENCIES[currency] || CURRENCIES.EUR;
  const num = Math.abs(amount);
  
  const formattedNumber = num.toLocaleString('en-IE', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  });

  return `${cfg.symbol}${formattedNumber}`;
}

/**
 * Formats billing cycle into a human-readable label.
 */
export function formatBillingCycle(cycle: BillingCycle): string {
  switch (cycle) {
    case 'monthly':
      return '/month';
    case 'annual':
      return '/year';
    case 'quarterly':
      return '/quarter';
    case 'weekly':
      return '/week';
    default:
      return '';
  }
}

export function formatCycleTitle(cycle: BillingCycle): string {
  switch (cycle) {
    case 'monthly':
      return 'Monthly';
    case 'annual':
      return 'Annual';
    case 'quarterly':
      return 'Quarterly';
    case 'weekly':
      return 'Weekly';
    case 'once':
      return 'One-off';
    default:
      return cycle;
  }
}

/**
 * Formats a renewal date into relative days badge.
 */
export function formatRenewalCountdown(days: number): {
  text: string;
  urgency: 'critical' | 'warning' | 'normal' | 'distant';
} {
  if (days < 0) {
    return { text: 'Overdue', urgency: 'critical' };
  }
  if (days === 0) {
    return { text: 'Due today', urgency: 'critical' };
  }
  if (days === 1) {
    return { text: 'Due tomorrow', urgency: 'critical' };
  }
  if (days <= 5) {
    return { text: `Due in ${days} days`, urgency: 'warning' };
  }
  if (days <= 14) {
    return { text: `In ${days} days`, urgency: 'normal' };
  }
  return { text: `In ${days} days`, urgency: 'distant' };
}

/**
 * Formats a date into UK / Ireland reading order — e.g. "2 Oct 2026".
 * Accepts a plain `YYYY-MM-DD` calendar date or a full ISO timestamp.
 * A date-only string is read as a *local* calendar date, not UTC
 * midnight, so it never slips to the day before when the runtime is in a
 * timezone behind UTC.
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    const d = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}
