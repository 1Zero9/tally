import React, { useMemo, useState } from 'react';
import type { ExpenseItem, IncomeItem, AccountItem, TransferItem, CurrencyCode, CustomCategoryItem } from '../types/expense';
import { convertCurrency, getMonthlyEquivalent, getEffectiveAmount } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { getCategoryMeta } from '../data/categories';
import { Activity, Landmark, ArrowLeftRight } from 'lucide-react';

interface MoneyMapProps {
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  accounts: AccountItem[];
  transfers: TransferItem[];
  currency: CurrencyCode;
  customCategories?: CustomCategoryItem[];
}

interface FlowNode {
  id: string;
  label: string;
  sublabel?: string;
  total: number;
  x: number;
  y: number;
}

interface AccountFlowNode extends FlowNode {
  isLoan: boolean;
}

interface FlowEdge {
  from: string;
  to: string;
  amount: number;
  kind: 'in' | 'out' | 'internal';
}

const NODE_R = 34;
const WIDTH = 900;
const COLOR_IN = '#3AA76D';
const COLOR_OUT = '#D8443C';
const COLOR_INTERNAL = '#7C5CFC';
const COLOR_ACCOUNT_POS = '#3155D9';

function layoutColumn<T extends { id: string; label: string; sublabel?: string; total: number }>(
  items: T[],
  x: number,
  height: number
): (T & { x: number; y: number })[] {
  const n = items.length;
  if (n === 0) return [];
  const gap = height / (n + 1);
  return items.map((item, i) => ({ ...item, x, y: gap * (i + 1) }));
}

function truncateLabel(label: string): string {
  return label.length > 14 ? `${label.slice(0, 12)}…` : label;
}

type Period = 'all' | '30' | '90';
type MapMode = 'journey' | 'projected';

export const MoneyMap: React.FC<MoneyMapProps> = ({ incomes, expenses, accounts, transfers, currency, customCategories = [] }) => {
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('all');
  const hasTransferData = transfers.length > 0;
  const [mode, setMode] = useState<MapMode>(hasTransferData ? 'journey' : 'projected');

  const filteredTransfers = useMemo(() => {
    if (period === 'all') return transfers;
    const days = period === '30' ? 30 : 90;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return transfers.filter((t) => new Date(t.date).getTime() >= cutoff);
  }, [transfers, period]);

  // --- Real journey, built from logged Transfer records ---
  const journey = useMemo(() => {
    const externalInTotals: Record<string, number> = {};
    const externalOutTotals: Record<string, number> = {};
    const accountIn: Record<string, number> = {};
    const accountOut: Record<string, number> = {};
    const edgeMap: Record<string, FlowEdge> = {};

    filteredTransfers.forEach((t) => {
      const amt = convertCurrency(t.amount, t.currency, currency);
      const fromExternal = !t.fromAccountId;
      const toExternal = !t.toAccountId;

      if (fromExternal && !toExternal) {
        const key = t.externalLabel || t.linkedIncome?.name || 'External income';
        const srcId = `ext-in:${key}`;
        const dstId = `account:${t.toAccountId}`;
        externalInTotals[srcId] = (externalInTotals[srcId] || 0) + amt;
        accountIn[t.toAccountId as string] = (accountIn[t.toAccountId as string] || 0) + amt;
        const edgeKey = `${srcId}->${dstId}`;
        if (!edgeMap[edgeKey]) edgeMap[edgeKey] = { from: srcId, to: dstId, amount: 0, kind: 'in' };
        edgeMap[edgeKey].amount += amt;
      } else if (!fromExternal && toExternal) {
        const key = t.externalLabel || t.linkedExpense?.name || 'External payment';
        const srcId = `account:${t.fromAccountId}`;
        const dstId = `ext-out:${key}`;
        externalOutTotals[dstId] = (externalOutTotals[dstId] || 0) + amt;
        accountOut[t.fromAccountId as string] = (accountOut[t.fromAccountId as string] || 0) + amt;
        const edgeKey = `${srcId}->${dstId}`;
        if (!edgeMap[edgeKey]) edgeMap[edgeKey] = { from: srcId, to: dstId, amount: 0, kind: 'out' };
        edgeMap[edgeKey].amount += amt;
      } else if (!fromExternal && !toExternal) {
        const srcId = `account:${t.fromAccountId}`;
        const dstId = `account:${t.toAccountId}`;
        accountOut[t.fromAccountId as string] = (accountOut[t.fromAccountId as string] || 0) + amt;
        accountIn[t.toAccountId as string] = (accountIn[t.toAccountId as string] || 0) + amt;
        const edgeKey = `${srcId}->${dstId}`;
        if (!edgeMap[edgeKey]) edgeMap[edgeKey] = { from: srcId, to: dstId, amount: 0, kind: 'internal' };
        edgeMap[edgeKey].amount += amt;
      }
    });

    const usedAccountIds = new Set<string>([...Object.keys(accountIn), ...Object.keys(accountOut)]);
    const accountList = accounts
      .filter((a) => usedAccountIds.has(a.id))
      .map((a) => ({
        id: `account:${a.id}`,
        label: a.name,
        sublabel: a.institution || undefined,
        total: (accountIn[a.id] || 0) - (accountOut[a.id] || 0),
        isLoan: a.type === 'LOAN',
      }));

    const externalInList = Object.entries(externalInTotals).map(([id, total]) => ({
      id,
      label: id.replace('ext-in:', ''),
      total,
    }));
    const externalOutList = Object.entries(externalOutTotals).map(([id, total]) => ({
      id,
      label: id.replace('ext-out:', ''),
      total,
    }));

    const maxRows = Math.max(externalInList.length, accountList.length, externalOutList.length, 1);
    const height = Math.max(maxRows * 78, 220);

    const leftNodes = layoutColumn(externalInList, 90, height);
    const midNodes = layoutColumn(accountList, 430, height) as AccountFlowNode[];
    const rightNodes = layoutColumn(externalOutList, 770, height);
    const edges = Object.values(edgeMap);

    return { leftNodes, midNodes, rightNodes, edges, height };
  }, [filteredTransfers, accounts, currency]);

  // --- Projected monthly flow, from recurring Expense/Income account links ---
  const projected = useMemo(() => {
    const activeIncomes = incomes.filter((i) => i.isActive);
    const activeExpenses = expenses.filter((e) => e.isActive);

    const accountMonthlyIn: Record<string, number> = {};
    const accountMonthlyOut: Record<string, number> = {};

    const incomeItems = activeIncomes.map((inc) => {
      const monthly = getMonthlyEquivalent(convertCurrency(inc.amount, inc.currency, currency), inc.frequency);
      const accId = inc.depositAccountId || 'unassigned';
      accountMonthlyIn[accId] = (accountMonthlyIn[accId] || 0) + monthly;
      return { id: `income:${inc.id}`, label: inc.name, total: monthly, accountId: accId };
    });

    const categoryTotals: Record<string, Record<string, number>> = {};
    activeExpenses.forEach((exp) => {
      const monthly = getMonthlyEquivalent(convertCurrency(getEffectiveAmount(exp), exp.currency, currency), exp.billingCycle);
      const accId = exp.paymentAccountId || 'unassigned';
      accountMonthlyOut[accId] = (accountMonthlyOut[accId] || 0) + monthly;
      if (!categoryTotals[accId]) categoryTotals[accId] = {};
      categoryTotals[accId][exp.category] = (categoryTotals[accId][exp.category] || 0) + monthly;
    });

    const usedAccountIds = new Set<string>([
      ...Object.keys(accountMonthlyIn),
      ...Object.keys(accountMonthlyOut),
    ]);

    const accountList = accounts
      .filter((a) => usedAccountIds.has(a.id))
      .map((a) => ({
        id: `account:${a.id}`,
        rawId: a.id,
        label: a.name,
        sublabel: a.institution || undefined,
        total: (accountMonthlyIn[a.id] || 0) - (accountMonthlyOut[a.id] || 0),
        isLoan: a.type === 'LOAN',
      }));

    if (usedAccountIds.has('unassigned')) {
      accountList.push({
        id: 'account:unassigned',
        rawId: 'unassigned',
        label: 'Unlinked',
        sublabel: 'No account set',
        total: (accountMonthlyIn['unassigned'] || 0) - (accountMonthlyOut['unassigned'] || 0),
        isLoan: false,
      });
    }

    const categoryTotalsFlat: Record<string, number> = {};
    Object.values(categoryTotals).forEach((byCat) => {
      Object.entries(byCat).forEach(([cat, amt]) => {
        categoryTotalsFlat[cat] = (categoryTotalsFlat[cat] || 0) + amt;
      });
    });

    const categoryList = Object.entries(categoryTotalsFlat).map(([cat, amt]) => ({
      id: `category:${cat}`,
      label: getCategoryMeta(cat, customCategories).name,
      total: amt,
    }));

    const maxRows = Math.max(incomeItems.length, accountList.length, categoryList.length, 1);
    const height = Math.max(maxRows * 78, 220);

    const leftNodes = layoutColumn(incomeItems, 90, height);
    const midNodes = layoutColumn(accountList, 430, height) as AccountFlowNode[];
    const rightNodes = layoutColumn(categoryList, 770, height);

    const edges: FlowEdge[] = [];
    leftNodes.forEach((n) => {
      const src = incomeItems.find((i) => i.id === n.id);
      if (!src) return;
      const accNode = midNodes.find((a) => (a as unknown as { rawId: string }).rawId === src.accountId);
      if (accNode) edges.push({ from: n.id, to: accNode.id, amount: n.total, kind: 'in' });
    });

    midNodes.forEach((accNode) => {
      const rawId = (accNode as unknown as { rawId: string }).rawId;
      const byCat = categoryTotals[rawId];
      if (!byCat) return;
      Object.entries(byCat).forEach(([cat, amt]) => {
        const catNode = rightNodes.find((c) => c.id === `category:${cat}`);
        if (catNode) edges.push({ from: accNode.id, to: catNode.id, amount: amt, kind: 'out' });
      });
    });

    return { leftNodes, midNodes, rightNodes, edges, height };
  }, [incomes, expenses, accounts, currency, customCategories]);

  const data = mode === 'journey' ? journey : projected;
  const hasData = data.leftNodes.length > 0 || data.midNodes.length > 0 || data.rightNodes.length > 0;
  const suffix = mode === 'projected' ? '/mo' : '';

  const nodeById = (id: string): FlowNode | undefined =>
    [...data.leftNodes, ...data.midNodes, ...data.rightNodes].find((n) => n.id === id);

  const internalEdgePath = (from: FlowNode, to: FlowNode) => {
    const bulge = 85;
    const goingDown = to.y > from.y;
    const startY = goingDown ? from.y + NODE_R : from.y - NODE_R;
    const endY = goingDown ? to.y - NODE_R : to.y + NODE_R;
    return `M ${from.x} ${startY} C ${from.x + bulge} ${startY}, ${to.x + bulge} ${endY}, ${to.x} ${endY}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div className="ha-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="ha-badge ha-badge-blue">{mode === 'journey' ? 'Real money journey' : 'Projected monthly flow'}</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              Money map
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '640px', marginTop: '0.25rem' }}>
              {mode === 'journey'
                ? 'Where money actually moved — income landing, transfers between accounts, and payments going out — built from your logged Flow entries.'
                : 'A projection based on recurring bills and income linked to accounts, shown as a typical month.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {hasTransferData && (
              <div className="ha-segmented" style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--ha-line)', padding: '2px', borderRadius: 'var(--ha-radius-sm)' }}>
                <button
                  onClick={() => setMode('journey')}
                  className={`ha-chip${mode === 'journey' ? ' active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  Actual journey
                </button>
                <button
                  onClick={() => setMode('projected')}
                  className={`ha-chip${mode === 'projected' ? ' active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  Projected
                </button>
              </div>
            )}
            {mode === 'journey' && hasTransferData && (
              <div style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--ha-line)', padding: '2px', borderRadius: 'var(--ha-radius-sm)' }}>
                {(['all', '90', '30'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`ha-chip${period === p ? ' active' : ''}`}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  >
                    {p === 'all' ? 'All time' : `${p}d`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="ha-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        {!hasData ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--ha-muted)' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--ha-blue-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
            }}>
              {mode === 'journey' ? <ArrowLeftRight size={24} color="var(--ha-blue)" /> : <Activity size={24} color="var(--ha-blue)" />}
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.35rem' }}>
              Nothing to map {mode === 'journey' ? 'for this period' : 'yet'}
            </h4>
            <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 }}>
              {mode === 'journey'
                ? 'Log transfers in the Flow tab — salary landing, sweeps between accounts, payments out — to see the real journey here.'
                : 'Link your income and expenses to accounts to see the flow visualized here.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: `${WIDTH}px`, margin: '0 auto 0.75rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span>{mode === 'journey' ? 'Money in' : 'Income sources'}</span>
              <span>Accounts</span>
              <span>{mode === 'journey' ? 'Money out' : 'Spending categories'}</span>
            </div>
            <svg width={WIDTH} height={data.height} style={{ display: 'block', margin: '0 auto', minWidth: `${WIDTH}px` }}>
              <defs>
                <marker id="mm-arrow-in" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill={COLOR_IN} />
                </marker>
                <marker id="mm-arrow-out" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill={COLOR_OUT} />
                </marker>
                <marker id="mm-arrow-internal" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill={COLOR_INTERNAL} />
                </marker>
              </defs>

              {data.edges.map((edge, i) => {
                const from = nodeById(edge.from);
                const to = nodeById(edge.to);
                if (!from || !to) return null;
                const edgeKey = `${edge.from}->${edge.to}:${i}`;
                const isHovered = hoveredEdge === edgeKey;
                const color = edge.kind === 'in' ? COLOR_IN : edge.kind === 'out' ? COLOR_OUT : COLOR_INTERNAL;
                const isInternal = edge.kind === 'internal';
                const midX = (from.x + to.x) / 2;
                const d = isInternal
                  ? internalEdgePath(from, to)
                  : `M ${from.x + NODE_R} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - NODE_R} ${to.y}`;
                const labelX = isInternal ? from.x + 95 : midX;
                const labelY = isInternal ? (from.y + to.y) / 2 : (from.y + to.y) / 2 - 8;

                return (
                  <g key={edgeKey}>
                    <path
                      d={d}
                      fill="none"
                      stroke={color}
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      opacity={isHovered ? 1 : 0.55}
                      markerEnd={edge.kind === 'in' ? 'url(#mm-arrow-in)' : edge.kind === 'out' ? 'url(#mm-arrow-out)' : 'url(#mm-arrow-internal)'}
                      onMouseEnter={() => setHoveredEdge(edgeKey)}
                      onMouseLeave={() => setHoveredEdge(null)}
                      style={{ cursor: 'pointer' }}
                    />
                    {isHovered && (
                      <text x={labelX} y={labelY} textAnchor="middle" fontSize="11" fontWeight={700} fill={color}>
                        {formatCurrency(edge.amount, currency)}{suffix}
                      </text>
                    )}
                  </g>
                );
              })}

              {data.leftNodes.map((n) => (
                <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                  <circle r={NODE_R} fill="#eaf7f0" stroke={COLOR_IN} strokeWidth="2" />
                  <foreignObject x={-NODE_R} y={-NODE_R} width={NODE_R * 2} height={NODE_R * 2}>
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#1f7a4d', textAlign: 'center', padding: '2px' }}>
                      {truncateLabel(n.label)}
                    </div>
                  </foreignObject>
                  <text x={0} y={NODE_R + 16} textAnchor="middle" fontSize="10.5" fontWeight={700} fill="var(--ha-ink)">
                    {formatCurrency(n.total, currency)}{suffix}
                  </text>
                </g>
              ))}

              {data.midNodes.map((n) => {
                const isPositive = n.total >= 0;
                const ringColor = n.isLoan ? COLOR_OUT : isPositive ? COLOR_ACCOUNT_POS : COLOR_OUT;
                const bgColor = n.isLoan ? '#fbeceb' : isPositive ? '#eef2fc' : '#fbeceb';
                return (
                  <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                    <circle r={NODE_R} fill={bgColor} stroke={ringColor} strokeWidth="2.5" />
                    <foreignObject x={-NODE_R} y={-NODE_R} width={NODE_R * 2} height={NODE_R * 2}>
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: ringColor, textAlign: 'center', padding: '2px' }}>
                        {truncateLabel(n.label)}
                      </div>
                    </foreignObject>
                    <text x={0} y={NODE_R + 16} textAnchor="middle" fontSize="10.5" fontWeight={700} fill={isPositive ? COLOR_ACCOUNT_POS : COLOR_OUT}>
                      {isPositive ? '+' : ''}{formatCurrency(n.total, currency)}{suffix}
                    </text>
                  </g>
                );
              })}

              {data.rightNodes.map((n) => (
                <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                  <circle r={NODE_R} fill="#fbeceb" stroke={COLOR_OUT} strokeWidth="2" />
                  <foreignObject x={-NODE_R} y={-NODE_R} width={NODE_R * 2} height={NODE_R * 2}>
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#a8332c', textAlign: 'center', padding: '2px' }}>
                      {truncateLabel(n.label)}
                    </div>
                  </foreignObject>
                  <text x={0} y={NODE_R + 16} textAnchor="middle" fontSize="10.5" fontWeight={700} fill="var(--ha-ink)">
                    {formatCurrency(n.total, currency)}{suffix}
                  </text>
                </g>
              ))}
            </svg>

            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--ha-muted)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLOR_IN, display: 'inline-block' }} />
                Money in
              </span>
              {mode === 'journey' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLOR_INTERNAL, display: 'inline-block' }} />
                  Between accounts
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLOR_ACCOUNT_POS, display: 'inline-block' }} />
                Account (net positive)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLOR_OUT, display: 'inline-block' }} />
                Loan / net negative / spending
              </span>
            </div>
          </>
        )}
      </div>

      {accounts.length === 0 && (
        <div className="ha-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Landmark size={18} color="var(--ha-blue)" />
          <p style={{ fontSize: '0.82rem', color: 'var(--ha-muted)' }}>
            Add accounts and log transfers in Flow to build out the full map.
          </p>
        </div>
      )}
    </div>
  );
};
