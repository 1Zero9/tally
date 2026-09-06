import React, { useEffect, useState } from 'react';
import type { CurrencyCode, CustomCategoryItem, ExpenseItem, HistoryPeriod } from '../types/expense';
import { formatCurrency } from '../utils/formatters';
import { getCategoryMeta } from '../data/categories';
import {
  bucketTransactionsByMonth,
  groupSpendByCategory,
  groupSpendByVendor,
  type ReportTransaction,
} from '../utils/reports';
import { exportReportCSV } from '../utils/reportExport';
import { OptimizationInsights } from './OptimizationInsights';
import { MoneyFlowInsights } from './MoneyFlowInsights';
import { TrendingUp, Store, Clock, Sparkles, Download } from 'lucide-react';

const SPENDING_COLOR = '#176b52';
const INCOME_COLOR = '#8A5CF6';

type ReportType = 'trends' | 'category-vendor' | 'timeline' | 'insights';

const REPORT_TYPES: { id: ReportType; label: string; icon: React.ReactNode }[] = [
  { id: 'trends', label: 'Trends', icon: <TrendingUp size={14} /> },
  { id: 'category-vendor', label: 'Category & Vendor', icon: <Store size={14} /> },
  { id: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
  { id: 'insights', label: 'Insights', icon: <Sparkles size={14} /> },
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/reports/transactions?period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.status === 'ok') setTransactions(data.transactions || []);
      })
      .catch((err) => console.error('Failed to load report transactions:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

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

      {reportType !== 'insights' && (
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

      {loading ? (
        <div className="ha-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.82rem' }}>
          Loading report…
        </div>
      ) : reportType === 'trends' ? (
        <TrendsReport months={months} maxMonthValue={maxMonthValue} currency={currency} />
      ) : reportType === 'category-vendor' ? (
        <CategoryVendorReport categoryRows={categoryRows} vendorRows={vendorRows} currency={currency} />
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
