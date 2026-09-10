import React, { useEffect, useState } from 'react';
import type { CurrencyCode, CustomCategoryItem, ExpenseItem, HistoryPeriod } from '../types/expense';
import { formatCurrency } from '../utils/formatters';
import { getCategoryMeta } from '../data/categories';
import {
  bucketTransactionsByMonth,
  groupSpendByCategory,
  groupSpendByVendor,
  groupCategoryMerchantTrend,
  type ReportTransaction,
  type TrendBucket,
} from '../utils/reports';
import { getOrderedCategories } from '../data/categories';
import { convertCurrency, getMonthlyContribution, getAnnualEquivalent, getEffectiveAmount } from '../utils/calculations';
import { exportReportCSV } from '../utils/reportExport';
import { OptimizationInsights } from './OptimizationInsights';
import { MoneyFlowInsights } from './MoneyFlowInsights';
import { TrendingUp, Store, Clock, Sparkles, Download, BarChart3, Wallet, ChevronRight } from 'lucide-react';

const SPENDING_COLOR = '#176b52';
const INCOME_COLOR = '#8A5CF6';

type ReportType = 'trends' | 'category-vendor' | 'committed' | 'category-trend' | 'timeline' | 'insights';

const REPORT_TYPES: { id: ReportType; label: string; icon: React.ReactNode }[] = [
  { id: 'trends', label: 'Trends', icon: <TrendingUp size={14} /> },
  { id: 'category-vendor', label: 'Category & Vendor', icon: <Store size={14} /> },
  { id: 'committed', label: 'Committed', icon: <Wallet size={14} /> },
  { id: 'category-trend', label: 'Category trend', icon: <BarChart3 size={14} /> },
  { id: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
  { id: 'insights', label: 'Insights', icon: <Sparkles size={14} /> },
];

const MERCHANT_COLORS = [
  '#176b52', '#8A5CF6', '#2563eb', '#db2777', '#d97706',
  '#0891b2', '#65a30d', '#dc2626', '#7c3aed', '#0d9488',
];

const PERIODS: { id: HistoryPeriod; label: string }[] = [
  { id: '1', label: '1mo' },
  { id: '3', label: '3mo' },
  { id: '6', label: '6mo' },
  { id: '12', label: '12mo' },
  { id: 'all', label: 'All' },
];

const DIRECTION_LABEL: Record<ReportTransaction['direction'], string> = {
  out: 'Spent',
  in: 'Received',
  internal: 'Transfer',
};

interface ReportsSectionProps {
  currency: CurrencyCode;
  expenses: ExpenseItem[];
  customCategories?: CustomCategoryItem[];
}

export const ReportsSection: React.FC<ReportsSectionProps> = ({
  currency,
  expenses,
  customCategories = [],
}) => {
  const [reportType, setReportType] = useState<ReportType>('trends');
  const [period, setPeriod] = useState<HistoryPeriod>('6');
  const [transactions, setTransactions] = useState<ReportTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetch(`/api/reports/transactions?period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.status === 'ok') {
          setTransactions(data.transactions || []);
        } else {
          setLoadError(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load report transactions:', err);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, reloadKey]);

  const retry = () => setReloadKey((k) => k + 1);

  const months = bucketTransactionsByMonth(transactions, currency);
  const categoryRows = groupSpendByCategory(transactions, currency, customCategories);
  const vendorRows = groupSpendByVendor(transactions, currency);
  const maxMonthValue = Math.max(1, ...months.map((m) => Math.max(m.spending, m.income)));

  return (
    <div className="ha-reports">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ha-ink)' }}>Reports</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
            Built from every real transfer in and out of the household — including ad-hoc transfers not tied to a tracked bill or income.
          </p>
        </div>

        <div className="ha-print-hide" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.id}
              onClick={() => setReportType(rt.id)}
              className={`ha-chip${reportType === rt.id ? ' active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}
            >
              {rt.icon}
              {rt.label}
            </button>
          ))}
        </div>
      </div>

      {reportType !== 'insights' && reportType !== 'committed' && (
        <div className="ha-print-hide" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.85rem' }}>
          <div className="ha-ledger-status" role="group" aria-label="Report period">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={period === p.id ? 'is-active' : ''}
                aria-pressed={period === p.id}
              >
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {reportType === 'committed' ? (
        <CommittedReport expenses={expenses} currency={currency} customCategories={customCategories} />
      ) : loading ? (
        <div className="ha-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.82rem' }}>
          Loading report…
        </div>
      ) : loadError ? (
        <div className="ha-card" style={{
          padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--ha-red)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
        }}>
          <span>Couldn&apos;t load report data.</span>
          <button onClick={retry} className="btn btn-secondary" style={{ fontSize: '0.78rem' }}>
            Retry
          </button>
        </div>
      ) : reportType === 'trends' ? (
        <TrendsReport months={months} maxMonthValue={maxMonthValue} currency={currency} />
      ) : reportType === 'category-vendor' ? (
        <CategoryVendorReport categoryRows={categoryRows} vendorRows={vendorRows} currency={currency} />
      ) : reportType === 'category-trend' ? (
        <CategoryTrendReport transactions={transactions} currency={currency} customCategories={customCategories} />
      ) : reportType === 'timeline' ? (
        <TimelineReport transactions={transactions} customCategories={customCategories} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <MoneyFlowInsights />
          <OptimizationInsights expenses={expenses} currency={currency} />
        </div>
      )}
    </div>
  );
};

const ExportButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="btn btn-ghost ha-print-hide" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}>
    <Download size={13} />
    <span>Export CSV</span>
  </button>
);

const TrendsReport: React.FC<{
  months: ReturnType<typeof bucketTransactionsByMonth>;
  maxMonthValue: number;
  currency: CurrencyCode;
}> = ({ months, maxMonthValue, currency }) => {
  const handleExport = () => {
    exportReportCSV(
      `tally-trends-${new Date().toISOString().split('T')[0]}.csv`,
      ['Month', 'Spending', 'Income'],
      months.map((m) => [m.label, m.spending.toFixed(2), m.income.toFixed(2)])
    );
  };

  return (
    <div className="ha-card" style={{ padding: '1.1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--ha-muted)' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: SPENDING_COLOR, display: 'inline-block' }} />
            Spending
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--ha-muted)' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: INCOME_COLOR, display: 'inline-block' }} />
            Income
          </span>
        </div>
        <ExportButton onClick={handleExport} />
      </div>

      {months.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.82rem' }}>
          No transfers recorded in this period yet.
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.6rem', height: '180px', paddingTop: '0.5rem' }}>
          {months.map((m) => (
            <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', justifyContent: 'center' }}>
                <div
                  title={`Spending — ${formatCurrency(m.spending, currency)}`}
                  style={{ width: '40%', height: `${Math.max(2, (m.spending / maxMonthValue) * 100)}%`, backgroundColor: SPENDING_COLOR, borderRadius: '3px 3px 0 0' }}
                />
                <div
                  title={`Income — ${formatCurrency(m.income, currency)}`}
                  style={{ width: '40%', height: `${Math.max(2, (m.income / maxMonthValue) * 100)}%`, backgroundColor: INCOME_COLOR, borderRadius: '3px 3px 0 0' }}
                />
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--ha-muted)', whiteSpace: 'nowrap' }}>{m.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RankedTable: React.FC<{ title: string; rows: { key: string; name: string; total: number; percentage: number }[]; currency: CurrencyCode; onExport: () => void }> = ({
  title,
  rows,
  currency,
  onExport,
}) => (
  <div className="ha-card" style={{ padding: '1.1rem 1.25rem', flex: 1, minWidth: '280px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ha-ink)' }}>{title}</h3>
      <ExportButton onClick={onExport} />
    </div>
    {rows.length === 0 ? (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.8rem' }}>
        No spend recorded in this period yet.
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {rows.map((r) => (
          <div key={r.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
              <span style={{ fontWeight: 600, color: 'var(--ha-ink)' }}>{r.name}</span>
              <span className="tabular-nums" style={{ color: 'var(--ha-muted)' }}>
                {formatCurrency(r.total, currency)} ({r.percentage}%)
              </span>
            </div>
            <div style={{ height: '6px', backgroundColor: 'var(--ha-line)', borderRadius: 'var(--ha-radius-sm)', overflow: 'hidden' }}>
              <div style={{ width: `${r.percentage}%`, height: '100%', backgroundColor: 'var(--ha-blue)' }} />
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const CategoryVendorReport: React.FC<{
  categoryRows: ReturnType<typeof groupSpendByCategory>;
  vendorRows: ReturnType<typeof groupSpendByVendor>;
  currency: CurrencyCode;
}> = ({ categoryRows, vendorRows, currency }) => (
  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
    <RankedTable
      title="Spend by category"
      rows={categoryRows}
      currency={currency}
      onExport={() =>
        exportReportCSV(
          `tally-category-breakdown-${new Date().toISOString().split('T')[0]}.csv`,
          ['Category', 'Total', 'Percentage'],
          categoryRows.map((r) => [r.name, r.total.toFixed(2), `${r.percentage}%`])
        )
      }
    />
    <RankedTable
      title="Spend by vendor"
      rows={vendorRows}
      currency={currency}
      onExport={() =>
        exportReportCSV(
          `tally-vendor-breakdown-${new Date().toISOString().split('T')[0]}.csv`,
          ['Vendor', 'Total', 'Percentage'],
          vendorRows.map((r) => [r.name, r.total.toFixed(2), `${r.percentage}%`])
        )
      }
    />
  </div>
);

/**
 * Where the household's committed money goes — its active bills and
 * expenses grouped by category, biggest first, each category expandable to
 * the individual items inside it. Built from the tracked Expense list (not
 * the transaction ledger), so it reflects what you're signed up to spend
 * regardless of whether payments have been imported. Moved here from the
 * bottom of the Spending page.
 */
const CommittedReport: React.FC<{
  expenses: ExpenseItem[];
  currency: CurrencyCode;
  customCategories: CustomCategoryItem[];
}> = ({ expenses, currency, customCategories }) => {
  const [basis, setBasis] = useState<'monthly' | 'annual'>('monthly');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // A category's cost on the chosen basis. Monthly uses the steady-state
  // contribution (a one-off only counts in its own month); annual uses the
  // yearly-equivalent for recurring items and the full amount for one-offs.
  const contributionFor = (e: ExpenseItem): number => {
    if (basis === 'annual') {
      const yearly =
        e.billingCycle === 'once'
          ? getEffectiveAmount(e)
          : getAnnualEquivalent(getEffectiveAmount(e), e.billingCycle);
      return convertCurrency(yearly, e.currency, currency);
    }
    return convertCurrency(getMonthlyContribution(e), e.currency, currency);
  };

  const active = expenses.filter((e) => e.isActive);
  const rows = getOrderedCategories(customCategories)
    .map((cat) => {
      const items = active
        .filter((e) => e.category === cat.id)
        .map((e) => ({ id: e.id, name: e.name, amount: contributionFor(e) }))
        .filter((it) => it.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      return {
        key: cat.id,
        name: cat.meta.name,
        color: cat.meta.color,
        items,
        total: items.reduce((sum, it) => sum + it.amount, 0),
      };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  const grand = rows.reduce((sum, r) => sum + r.total, 0);
  const pctOf = (v: number) => (grand > 0 ? Math.round((v / grand) * 1000) / 10 : 0);

  const handleExport = () =>
    exportReportCSV(
      `tally-committed-by-category-${new Date().toISOString().split('T')[0]}.csv`,
      ['Category', basis === 'annual' ? 'Annual' : 'Monthly', 'Percentage'],
      rows.map((r) => [r.name, r.total.toFixed(2), `${pctOf(r.total)}%`])
    );

  if (rows.length === 0) {
    return (
      <div className="ha-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.82rem' }}>
        No active bills or expenses yet. Add some on the Spending page and they&apos;ll break down by category here.
      </div>
    );
  }

  return (
    <div className="ha-card" style={{ padding: '1.1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.9rem' }}>
        <div className="ha-ledger-status" role="group" aria-label="Basis">
          <button onClick={() => setBasis('monthly')} className={basis === 'monthly' ? 'is-active' : ''} aria-pressed={basis === 'monthly'}>
            <span>Monthly</span>
          </button>
          <button onClick={() => setBasis('annual')} className={basis === 'annual' ? 'is-active' : ''} aria-pressed={basis === 'annual'}>
            <span>Annual</span>
          </button>
        </div>
        <ExportButton onClick={handleExport} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {rows.map((r) => {
          const pct = pctOf(r.total);
          const isOpen = expanded.has(r.key);
          return (
            <div key={r.key}>
              <button
                type="button"
                onClick={() => toggle(r.key)}
                aria-expanded={isOpen}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '3px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                    <ChevronRight
                      size={12}
                      style={{ color: 'var(--ha-muted)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }}
                    />
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: r.color, display: 'inline-block' }} />
                    {r.name}
                    <span style={{ color: 'var(--ha-muted)', fontWeight: 400 }}>· {r.items.length}</span>
                  </span>
                  <span className="tabular-nums" style={{ color: 'var(--ha-muted)' }}>
                    {formatCurrency(r.total, currency)} ({pct}%)
                  </span>
                </div>
              </button>
              <div style={{ height: '6px', backgroundColor: 'var(--ha-line)', borderRadius: 'var(--ha-radius-sm)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', backgroundColor: r.color }} />
              </div>
              {isOpen && (
                <div style={{ margin: '0.4rem 0 0.2rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {r.items.map((it) => (
                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--ha-muted)' }}>
                      <span>{it.name}</span>
                      <span className="tabular-nums">{formatCurrency(it.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.9rem', paddingTop: '0.6rem', borderTop: '1px solid var(--ha-line)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
        <span>Total</span>
        <span className="tabular-nums">{formatCurrency(grand, currency)} / {basis === 'annual' ? 'year' : 'month'}</span>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--ha-muted)', marginTop: '0.6rem', lineHeight: 1.5 }}>
        Your active bills and expenses{basis === 'annual' ? ', as a yearly cost' : ' at their steady monthly rate'}. Paused items are excluded; {basis === 'annual' ? 'one-offs count once' : 'a one-off counts only in the month it falls'}.
      </p>
    </div>
  );
};

const CategoryTrendReport: React.FC<{
  transactions: ReportTransaction[];
  currency: CurrencyCode;
  customCategories: CustomCategoryItem[];
}> = ({ transactions, currency, customCategories }) => {
  const [bucket, setBucket] = useState<TrendBucket>('week');

  // Only offer categories that actually have real spend in this period.
  const spentCategoryIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const t of transactions) {
      if (t.direction === 'out' && t.category) ids.add(t.category);
    }
    return ids;
  }, [transactions]);

  const options = React.useMemo(
    () => getOrderedCategories(customCategories).filter((c) => spentCategoryIds.has(c.id)),
    [customCategories, spentCategoryIds]
  );

  const [categoryId, setCategoryId] = useState<string>('');
  const activeCategory = categoryId && spentCategoryIds.has(categoryId)
    ? categoryId
    : options.find((c) => c.id === 'shopping')?.id || options[0]?.id || '';

  const result = React.useMemo(
    () => activeCategory ? groupCategoryMerchantTrend(transactions, activeCategory, bucket, currency) : null,
    [transactions, activeCategory, bucket, currency]
  );

  const colorFor = (name: string) => {
    const idx = result ? result.merchants.findIndex((m) => m.name === name) : -1;
    return MERCHANT_COLORS[(idx < 0 ? 0 : idx) % MERCHANT_COLORS.length];
  };

  const categoryLabel = activeCategory
    ? getCategoryMeta(activeCategory, customCategories).name
    : '';

  const handleExport = () => {
    if (!result) return;
    exportReportCSV(
      `tally-${categoryLabel.toLowerCase().replace(/\s+/g, '-')}-trend-${new Date().toISOString().split('T')[0]}.csv`,
      ['Merchant', 'Total', 'Trips', 'Avg basket', 'Share', `Change (${bucket}-on-${bucket}, 1st vs 2nd half)`],
      result.merchants.map((m) => [
        m.name,
        m.total.toFixed(2),
        String(m.tripCount),
        m.avgBasket.toFixed(2),
        `${m.sharePct}%`,
        m.changePct == null ? '—' : `${m.changePct > 0 ? '+' : ''}${m.changePct}%`,
      ])
    );
  };

  if (options.length === 0) {
    return (
      <div className="ha-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.82rem' }}>
        No categorised spend in this period yet. Categorise some transactions and this view will break each category down by shop.
      </div>
    );
  }

  const maxBucketTotal = result ? Math.max(1, ...result.points.map((p) => p.total)) : 1;
  const topByTrips = result && result.merchants.length
    ? [...result.merchants].sort((a, b) => b.tripCount - a.tripCount)[0]
    : null;
  const fewestByTrips = result && result.merchants.length > 1
    ? [...result.merchants].sort((a, b) => a.tripCount - b.tripCount)[0]
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="ha-card" style={{ padding: '1.1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <select
              value={activeCategory}
              onChange={(e) => setCategoryId(e.target.value)}
              className="ha-input"
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem' }}
            >
              {options.map((c) => (
                <option key={c.id} value={c.id}>{c.meta.name}</option>
              ))}
            </select>
            <div className="ha-ledger-status" role="group" aria-label="Bucket size">
              <button onClick={() => setBucket('week')} className={bucket === 'week' ? 'is-active' : ''} aria-pressed={bucket === 'week'}>
                <span>Weekly</span>
              </button>
              <button onClick={() => setBucket('month')} className={bucket === 'month' ? 'is-active' : ''} aria-pressed={bucket === 'month'}>
                <span>Monthly</span>
              </button>
            </div>
          </div>
          <ExportButton onClick={handleExport} />
        </div>

        {!result || result.points.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.82rem' }}>
            No {categoryLabel} spend recorded in this period yet.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.45rem', height: '190px', paddingTop: '0.5rem' }}>
              {result.points.map((p) => {
                const segs = Object.entries(p.byMerchant).sort((a, b) => b[1].total - a[1].total);
                return (
                  <div key={p.key} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', height: '100%' }}>
                    <div style={{ flex: 1, width: '100%', maxWidth: '46px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div
                        title={`${p.label} — ${formatCurrency(p.total, currency)} over ${p.tripCount} ${p.tripCount === 1 ? 'shop' : 'shops'}`}
                        style={{ display: 'flex', flexDirection: 'column', height: `${Math.max(3, (p.total / maxBucketTotal) * 100)}%`, borderRadius: '3px 3px 0 0', overflow: 'hidden' }}
                      >
                        {segs.map(([name, v]) => (
                          <div
                            key={name}
                            title={`${name}: ${formatCurrency(v.total, currency)} · ${v.tripCount} ${v.tripCount === 1 ? 'shop' : 'shops'}`}
                            style={{ height: `${(v.total / p.total) * 100}%`, backgroundColor: colorFor(name) }}
                          />
                        ))}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.6rem', color: 'var(--ha-muted)', whiteSpace: 'nowrap' }}>{p.label}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginTop: '0.85rem' }}>
              {result.merchants.map((m) => (
                <span key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--ha-muted)' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: colorFor(m.name), display: 'inline-block' }} />
                  {m.name}
                </span>
              ))}
            </div>

            {topByTrips && fewestByTrips && topByTrips.name !== fewestByTrips.name && (
              <p style={{ fontSize: '0.78rem', color: 'var(--ha-ink)', marginTop: '0.85rem', lineHeight: 1.5 }}>
                You shopped at <strong>{topByTrips.name}</strong> {topByTrips.tripCount} {topByTrips.tripCount === 1 ? 'time' : 'times'}
                {' '}({formatCurrency(topByTrips.total, currency)} total, {formatCurrency(topByTrips.avgBasket, currency)} a shop)
                {' '}but <strong>{fewestByTrips.name}</strong> just {fewestByTrips.tripCount} {fewestByTrips.tripCount === 1 ? 'time' : 'times'}
                {' '}({formatCurrency(fewestByTrips.total, currency)} total, {formatCurrency(fewestByTrips.avgBasket, currency)} a shop).
              </p>
            )}
          </>
        )}
      </div>

      {result && result.merchants.length > 0 && (
        <div className="ha-card" style={{ padding: '1.1rem 1.25rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.75rem' }}>
            {categoryLabel} by shop
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ha-line)', textAlign: 'left', color: 'var(--ha-muted)' }}>
                  <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>Shop</th>
                  <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Shops</th>
                  <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Avg / shop</th>
                  <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Share</th>
                  <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {result.merchants.map((m) => (
                  <tr key={m.name} style={{ borderBottom: '1px solid var(--ha-line)' }}>
                    <td style={{ padding: '0.4rem 0.5rem', color: 'var(--ha-ink)', fontWeight: 600 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: colorFor(m.name), display: 'inline-block' }} />
                        {m.name}
                      </span>
                    </td>
                    <td className="tabular-nums" style={{ padding: '0.4rem 0.5rem', textAlign: 'right', color: 'var(--ha-ink)' }}>{formatCurrency(m.total, currency)}</td>
                    <td className="tabular-nums" style={{ padding: '0.4rem 0.5rem', textAlign: 'right', color: 'var(--ha-muted)' }}>{m.tripCount}</td>
                    <td className="tabular-nums" style={{ padding: '0.4rem 0.5rem', textAlign: 'right', color: 'var(--ha-muted)' }}>{formatCurrency(m.avgBasket, currency)}</td>
                    <td className="tabular-nums" style={{ padding: '0.4rem 0.5rem', textAlign: 'right', color: 'var(--ha-muted)' }}>{m.sharePct}%</td>
                    <td className="tabular-nums" style={{ padding: '0.4rem 0.5rem', textAlign: 'right', color: m.changePct == null ? 'var(--ha-muted)' : m.changePct > 0 ? 'var(--ha-red)' : 'var(--ha-green)' }}>
                      {m.changePct == null ? '—' : `${m.changePct > 0 ? '+' : ''}${m.changePct}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--ha-muted)', marginTop: '0.6rem', lineHeight: 1.5 }}>
            Trend compares each shop&apos;s average spend per {bucket} in the first half of the period against the second half. Tally sees totals, not receipts — a bigger basket and a pricier shop look the same here.
          </p>
        </div>
      )}
    </div>
  );
};

const TimelineReport: React.FC<{
  transactions: ReportTransaction[];
  customCategories: CustomCategoryItem[];
}> = ({ transactions, customCategories }) => {
  const handleExport = () => {
    exportReportCSV(
      `tally-timeline-${new Date().toISOString().split('T')[0]}.csv`,
      ['Date', 'Label', 'Category', 'Direction', 'Amount', 'Currency', 'From account', 'To account'],
      transactions.map((t) => [
        t.date,
        t.label,
        t.category || '',
        DIRECTION_LABEL[t.direction],
        t.amount.toFixed(2),
        t.currency,
        t.fromAccount?.name || '',
        t.toAccount?.name || '',
      ])
    );
  };

  return (
    <div className="ha-card" style={{ padding: '1.1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ha-ink)' }}>Transaction timeline</h3>
        <ExportButton onClick={handleExport} />
      </div>

      {transactions.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.82rem' }}>
          No transfers recorded in this period yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ha-line)', textAlign: 'left', color: 'var(--ha-muted)' }}>
                <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>Label</th>
                <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>Direction</th>
                <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--ha-line)' }}>
                  <td style={{ padding: '0.4rem 0.5rem', color: 'var(--ha-muted)', whiteSpace: 'nowrap' }}>{t.date}</td>
                  <td style={{ padding: '0.4rem 0.5rem', color: 'var(--ha-ink)', fontWeight: 600 }}>{t.label}</td>
                  <td style={{ padding: '0.4rem 0.5rem', color: 'var(--ha-muted)' }}>
                    {t.category ? getCategoryMeta(t.category, customCategories).name : '—'}
                  </td>
                  <td style={{ padding: '0.4rem 0.5rem', color: 'var(--ha-muted)' }}>{DIRECTION_LABEL[t.direction]}</td>
                  <td className="tabular-nums" style={{ padding: '0.4rem 0.5rem', textAlign: 'right', color: 'var(--ha-ink)', fontWeight: 600 }}>
                    {formatCurrency(t.amount, t.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
