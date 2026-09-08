import React, { useEffect, useState } from 'react';
import type { ChartType, CurrencyCode, HistoryPeriod, MonthlyHistoryPoint } from '../types/expense';
import { formatCurrency } from '../utils/formatters';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react';

const SPENDING_COLOR = '#176b52';
const INCOME_COLOR = '#8A5CF6';

const PERIODS: { id: HistoryPeriod; label: string }[] = [
  { id: '1', label: '1mo' },
  { id: '3', label: '3mo' },
  { id: '6', label: '6mo' },
  { id: '12', label: '12mo' },
  { id: 'all', label: 'All' },
];

interface TrendChartProps {
  currency: CurrencyCode;
  metric?: 'spending' | 'income' | 'both';
  title?: string;
  subtitle?: string;
  /** Render without the card chrome / heading — for embedding inside a
   *  collapsible section that provides its own. */
  bare?: boolean;
  billsOnly?: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  currency,
  metric = 'both',
  title = 'Trends over time',
  subtitle,
  bare = false,
  billsOnly = false,
}) => {
  const [period, setPeriod] = useState<HistoryPeriod>('6');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [pieSeries, setPieSeries] = useState<'spending' | 'income'>(metric === 'income' ? 'income' : 'spending');
  const [months, setMonths] = useState<MonthlyHistoryPoint[]>([]);
  const [hasAnyHistory, setHasAnyHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/history?period=${period}&currency=${currency}${billsOnly ? '&billsOnly=true' : ''}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.status === 'ok') {
          setMonths(data.months || []);
          setHasAnyHistory(!!data.hasAnyHistory);
        }
      })
      .catch((err) => console.error('Failed to load history:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, currency, billsOnly]);

  const showSpending = metric === 'spending' || metric === 'both';
  const showIncome = metric === 'income' || metric === 'both';

  const maxValue = Math.max(
    1,
    ...months.map((m) => Math.max(showSpending ? m.spending : 0, showIncome ? m.income : 0))
  );

  const pieData = months
    .map((m) => ({ label: m.label, value: pieSeries === 'spending' ? m.spending : m.income }))
    .filter((d) => d.value > 0);
  const pieTotal = pieData.reduce((sum, d) => sum + d.value, 0);
  const pieColor = pieSeries === 'spending' ? SPENDING_COLOR : INCOME_COLOR;

  return (
    <div className={bare ? '' : 'ha-card'} style={bare ? {} : { padding: '1.1rem 1.25rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: bare ? 'flex-end' : 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
        {!bare && (
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div className="ha-ledger-status" role="group" aria-label="Chart period">
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

          <div style={{ display: 'flex', gap: '0.25rem', border: '1px solid var(--ha-line)', borderRadius: 'var(--ha-radius-sm)', padding: '2px' }}>
            {(['bar', 'line', 'pie'] as ChartType[]).map((type) => {
              const Icon = type === 'bar' ? BarChart3 : type === 'line' ? LineChartIcon : PieChartIcon;
              return (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className="btn btn-ghost"
                  style={{
                    padding: '0.3rem 0.4rem',
                    backgroundColor: chartType === type ? 'var(--ha-blue-light)' : 'transparent',
                  }}
                  title={`${type.charAt(0).toUpperCase()}${type.slice(1)} chart`}
                  aria-pressed={chartType === type}
                >
                  <Icon size={14} color={chartType === type ? 'var(--ha-blue)' : 'var(--ha-muted)'} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {metric === 'both' && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--ha-muted)' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: SPENDING_COLOR, display: 'inline-block' }} />
            Spending
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--ha-muted)' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: INCOME_COLOR, display: 'inline-block' }} />
            Income
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.82rem' }}>
          Loading trends…
        </div>
      ) : !hasAnyHistory ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ha-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
          No payment history yet. Trends build up automatically as you mark bills paid and income received —
          check back after a cycle or two.
        </div>
      ) : chartType === 'bar' ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.6rem', height: '160px', paddingTop: '0.5rem' }}>
          {months.map((m) => (
            <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', justifyContent: 'center' }}>
                {showSpending && (
                  <div
                    title={`Spending — ${formatCurrency(m.spending, currency)}`}
                    style={{
                      width: showIncome ? '40%' : '55%',
                      height: `${Math.max(2, (m.spending / maxValue) * 100)}%`,
                      backgroundColor: SPENDING_COLOR,
                      borderRadius: '3px 3px 0 0',
                    }}
                  />
                )}
                {showIncome && (
                  <div
                    title={`Income — ${formatCurrency(m.income, currency)}`}
                    style={{
                      width: showSpending ? '40%' : '55%',
                      height: `${Math.max(2, (m.income / maxValue) * 100)}%`,
                      backgroundColor: INCOME_COLOR,
                      borderRadius: '3px 3px 0 0',
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--ha-muted)', whiteSpace: 'nowrap' }}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      ) : chartType === 'line' ? (
        <LineChartView months={months} maxValue={maxValue} showSpending={showSpending} showIncome={showIncome} currency={currency} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {metric === 'both' && (
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <button
                onClick={() => setPieSeries('spending')}
                className={`ha-chip${pieSeries === 'spending' ? ' active' : ''}`}
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
              >
                Spending
              </button>
              <button
                onClick={() => setPieSeries('income')}
                className={`ha-chip${pieSeries === 'income' ? ' active' : ''}`}
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
              >
                Income
              </button>
            </div>
          )}

          {pieData.length === 0 ? (
            <div style={{ padding: '1.5rem', color: 'var(--ha-muted)', fontSize: '0.82rem' }}>
              No {pieSeries} recorded in this period yet.
            </div>
          ) : (
            <>
              <PieView data={pieData} total={pieTotal} baseColor={pieColor} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {pieData.map((d, i) => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
                    <span style={{
                      width: '9px', height: '9px', borderRadius: '3px', display: 'inline-block',
                      backgroundColor: pieColor, opacity: 1 - (i / (pieData.length + 1)) * 0.6,
                    }} />
                    <span style={{ color: 'var(--ha-ink)', fontWeight: 600 }}>{d.label}</span>
                    <span className="tabular-nums" style={{ color: 'var(--ha-muted)' }}>
                      {formatCurrency(d.value, currency)} ({pieTotal > 0 ? Math.round((d.value / pieTotal) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const LineChartView: React.FC<{
  months: MonthlyHistoryPoint[];
  maxValue: number;
  showSpending: boolean;
  showIncome: boolean;
  currency: CurrencyCode;
}> = ({ months, maxValue, showSpending, showIncome, currency }) => {
  const width = 600;
  const height = 160;
  const padding = 20;
  const stepX = months.length > 1 ? (width - padding * 2) / (months.length - 1) : 0;

  const toPoints = (key: 'spending' | 'income') =>
    months
      .map((m, i) => {
        const x = padding + i * stepX;
        const y = height - padding - ((m[key] / maxValue) * (height - padding * 2));
        return `${x},${y}`;
      })
      .join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '160px' }} preserveAspectRatio="none">
        {showSpending && (
          <polyline points={toPoints('spending')} fill="none" stroke={SPENDING_COLOR} strokeWidth={2.5} />
        )}
        {showIncome && (
          <polyline points={toPoints('income')} fill="none" stroke={INCOME_COLOR} strokeWidth={2.5} />
        )}
        {months.map((m, i) => {
          const x = padding + i * stepX;
          return (
            <React.Fragment key={m.month}>
              {showSpending && (
                <circle cx={x} cy={height - padding - ((m.spending / maxValue) * (height - padding * 2))} r={3} fill={SPENDING_COLOR}>
                  <title>{`${m.label} spending — ${formatCurrency(m.spending, currency)}`}</title>
                </circle>
              )}
              {showIncome && (
                <circle cx={x} cy={height - padding - ((m.income / maxValue) * (height - padding * 2))} r={3} fill={INCOME_COLOR}>
                  <title>{`${m.label} income — ${formatCurrency(m.income, currency)}`}</title>
                </circle>
              )}
            </React.Fragment>
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
        {months.map((m) => (
          <span key={m.month} style={{ fontSize: '0.65rem', color: 'var(--ha-muted)' }}>
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const PieView: React.FC<{ data: { label: string; value: number }[]; total: number; baseColor: string }> = ({ data, total, baseColor }) => {
  let cumulative = 0;
  const stops = data.map((d, i) => {
    const start = (cumulative / total) * 360;
    cumulative += d.value;
    const end = (cumulative / total) * 360;
    const opacity = 1 - (i / (data.length + 1)) * 0.6;
    return `${hexToRgba(baseColor, opacity)} ${start}deg ${end}deg`;
  });

  return (
    <div
      style={{
        width: '140px',
        height: '140px',
        borderRadius: '50%',
        background: `conic-gradient(${stops.join(', ')})`,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <div style={{
        position: 'absolute',
        inset: '22%',
        borderRadius: '50%',
        backgroundColor: 'var(--ha-white)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }} />
    </div>
  );
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
