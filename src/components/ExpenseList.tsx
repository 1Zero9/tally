import React, { useState } from 'react';
import type { ExpenseItem, CurrencyCode, CustomCategoryItem } from '../types/expense';
import { CATEGORY_LIST, getCategoryMeta } from '../data/categories';
import { convertCurrency, getMonthlyEquivalent, getEffectiveAmount } from '../utils/calculations';
import { formatCurrency, formatBillingCycle } from '../utils/formatters';
import { hasTextSelection } from '../utils/dom';
import { Search, ArrowUpDown, Edit2, Trash2, Copy, User, Plus, Sparkles, RefreshCw, Mail, ChevronDown, MoreHorizontal } from 'lucide-react';

function isOverdue(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = dateStr.split('-').map(Number);
  const due = new Date(year, (month || 1) - 1, day || 1);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function daysUntilDate(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = dateStr.split('-').map(Number);
  const due = new Date(year, (month || 1) - 1, day || 1);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface ExpenseListProps {
  expenses: ExpenseItem[];
  currency: CurrencyCode;
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
  onToggleActive: (id: string) => void;
  onTogglePaid: (id: string) => void;
  onEditExpense: (expense: ExpenseItem) => void;
  onDuplicateExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  onOpenAddModal: () => void;
  onOpenPresetsModal: () => void;
  onQuickUpdateAmount: (expense: ExpenseItem, newAmount: number) => void;
  onContactVendor: (expense: ExpenseItem) => void;
  customCategories?: CustomCategoryItem[];
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  currency,
  selectedCategory,
  onSelectCategory,
  onToggleActive,
  onTogglePaid,
  onEditExpense,
  onDuplicateExpense,
  onDeleteExpense,
  onOpenAddModal,
  onOpenPresetsModal,
  onQuickUpdateAmount,
  onContactVendor,
  customCategories = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'unpaid' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'amount-desc' | 'amount-asc' | 'renewal' | 'name'>('amount-desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const allCategories = [...CATEGORY_LIST, ...customCategories];

  // Filter items
  const filteredItems = expenses.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchNotes = item.notes?.toLowerCase().includes(q);
      const matchMethod = item.paymentMethod.toLowerCase().includes(q);
      const matchCategory = getCategoryMeta(item.category, customCategories).name.toLowerCase().includes(q);
      const matchUser = item.createdBy?.name.toLowerCase().includes(q);
      if (!matchName && !matchNotes && !matchMethod && !matchCategory && !matchUser) {
        return false;
      }
    }

    if (selectedCategory && item.category !== selectedCategory) {
      return false;
    }

    if (statusFilter === 'active' && !item.isActive) return false;
    if (statusFilter === 'paused' && item.isActive) return false;
    if (statusFilter === 'unpaid' && item.isPaidThisCycle) return false;
    if (statusFilter === 'overdue' && !(item.isActive && !item.isPaidThisCycle && isOverdue(item.nextRenewalDate))) return false;

    return true;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    const amountA = getMonthlyEquivalent(convertCurrency(a.amount, a.currency, currency), a.billingCycle);
    const amountB = getMonthlyEquivalent(convertCurrency(b.amount, b.currency, currency), b.billingCycle);

    if (sortBy === 'amount-desc') return amountB - amountA;
    if (sortBy === 'amount-asc') return amountA - amountB;
    if (sortBy === 'renewal') return a.renewalDay - b.renewalDay;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const overdueCount = expenses.filter((e) => e.isActive && !e.isPaidThisCycle && isOverdue(e.nextRenewalDate)).length;
  const unpaidCount = expenses.filter((e) => !e.isPaidThisCycle).length;
  const activeCount = expenses.filter((e) => e.isActive).length;
  const pausedCount = expenses.filter((e) => !e.isActive).length;

  const STATUS_FILTERS: { id: typeof statusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: expenses.length },
    { id: 'active', label: 'Active', count: activeCount },
    { id: 'paused', label: 'Paused', count: pausedCount },
    { id: 'unpaid', label: 'Unpaid', count: unpaidCount },
    { id: 'overdue', label: 'Overdue', count: overdueCount },
  ];

  return (
    <div className="ha-card ha-ledger-card" style={{ marginBottom: '2.5rem' }}>
      <div className="ha-ledger-header">
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
            Household ledger
          </h3>
          {overdueCount > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-red)', fontWeight: 600 }}>
              {overdueCount} bill{overdueCount === 1 ? '' : 's'} overdue
            </p>
          )}
          <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)' }}>
            {sortedItems.length} of {expenses.length} records shown
          </p>
        </div>

        <div className="ha-ledger-toolbar">
          <div className="ha-ledger-search">
            <Search size={15} color="var(--ha-muted)" style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search expenses"
              aria-label="Search expenses"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ha-input"
              style={{
                paddingLeft: '2.2rem',
                paddingRight: searchQuery ? '2rem' : '0.85rem',
                width: '230px',
                fontSize: '0.85rem',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--ha-muted)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <label className="ha-ledger-select-wrap">
            <span>Category</span>
            <select
              aria-label="Filter by category"
              value={selectedCategory ?? ''}
              onChange={(e) => onSelectCategory(e.target.value || null)}
              className="ha-ledger-select"
            >
              <option value="">All categories</option>
              {allCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </label>

          <div className="ha-ledger-status" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map(({ id, label, count }) => {
              const isSelected = statusFilter === id;
              const isAlertFilter = id === 'overdue' || id === 'unpaid';
              return (
                <button
                  key={id}
                  onClick={() => setStatusFilter(id)}
                  disabled={count === 0 && id !== 'all'}
                  className={`${isSelected ? 'is-active' : ''}${isAlertFilter ? ' is-alert' : ''}`}
                  aria-pressed={isSelected}
                >
                  <span>{label}</span>
                  <span className="ha-ledger-status-count">{count}</span>
                </button>
              );
            })}
          </div>

          <label className="ha-ledger-sort">
            <ArrowUpDown size={14} color="var(--ha-muted)" />
            <select
              aria-label="Sort expenses"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'amount-desc' | 'amount-asc' | 'renewal' | 'name')}
              className="ha-ledger-select"
            >
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
              <option value="renewal">Renewal day (1–31)</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </label>
        </div>
      </div>

      {/* Ledger Table Rows */}
      {expenses.length === 0 ? (
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
            <Sparkles size={24} color="var(--ha-blue)" />
          </div>

          <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.35rem' }}>
            Your household ledger is clean and ready
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
            No test data is present. Start adding your real home utility bills, subscriptions, college fees, and sports memberships.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={onOpenAddModal}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem' }}
            >
              <Plus size={15} />
              <span>+ Add first expense</span>
            </button>

            <button
              onClick={onOpenPresetsModal}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              <Sparkles size={15} color="var(--ha-blue)" />
              <span>Browse 1-Click Catalog</span>
            </button>
          </div>
        </div>
      ) : sortedItems.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ha-muted)' }}>
          <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>
            No records matched current search filters.
          </p>
          <button
            onClick={() => { setSearchQuery(''); onSelectCategory(null); setStatusFilter('all'); }}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div>
          {sortedItems.map((item) => {
            const cat = getCategoryMeta(item.category, customCategories);
            const monthlyAmount = getMonthlyEquivalent(convertCurrency(item.amount, item.currency, currency), item.billingCycle);
            const overdue = item.isActive && !item.isPaidThisCycle && isOverdue(item.nextRenewalDate);
            const daysUntilContractEnd = item.contractEndDate ? daysUntilDate(item.contractEndDate) : null;
            const showContractBadge = item.isActive && daysUntilContractEnd !== null && daysUntilContractEnd <= 60;
            const isExpanded = expandedId === item.id;
            const goal = item.linkedGoal;
            const goalPct = goal && goal.targetAmount > 0
              ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
              : null;

            return (
              <div key={item.id} style={{ borderBottom: '1px solid var(--ha-line)' }}>
              <div
                className="ha-ledger-row"
                style={{
                  opacity: item.isActive ? 1 : 0.55,
                  cursor: 'pointer',
                  borderBottom: 'none',
                }}
                onClick={() => {
                  if (hasTextSelection()) return;
                  setExpandedId(isExpanded ? null : item.id);
                }}
              >
                {/* 1. Category Square Color Marker & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 280px' }}>
                  <span
                    className="ha-color-marker"
                    style={{ backgroundColor: item.color || cat.color }}
                    title={cat.name}
                  />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ha-ink)' }}>
                        {item.name}
                      </span>
                      {item.vendor && item.vendor !== item.name && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>
                          ({item.vendor})
                        </span>
                      )}
                      <span className="ha-badge ha-badge-neutral" style={{ fontSize: '0.7rem' }}>
                        {cat.name}
                      </span>
                      {item.createdBy && (
                        <span className="ha-badge ha-badge-blue" style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <User size={10} />
                          <span>{item.createdBy.name.split(' ')[0]}</span>
                        </span>
                      )}
                      {goal && (
                        <span
                          className="ha-badge ha-badge-blue"
                          style={{ fontSize: '0.68rem' }}
                          title={`Linked to savings goal: ${goal.name}`}
                        >
                          {goalPct}% saved
                        </span>
                      )}
                      {showContractBadge && (
                        <span
                          className={`ha-badge ${daysUntilContractEnd! <= 14 ? 'ha-badge-red' : 'ha-badge-lime'}`}
                          style={{ fontSize: '0.68rem' }}
                          title="Contract end date — call to review, renegotiate or cancel before it auto-renews"
                        >
                          {daysUntilContractEnd! < 0
                            ? 'Contract ended — review'
                            : daysUntilContractEnd === 0
                            ? 'Contract ends today'
                            : `Contract ends in ${daysUntilContractEnd} days`}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.75rem', color: overdue ? 'var(--ha-red)' : 'var(--ha-muted)', marginTop: '2px' }}>
                      <span>{item.paymentMethod || 'Direct Debit'}</span>
                      <span>•</span>
                      <span style={{ fontWeight: overdue ? 700 : 400 }}>
                        {overdue ? 'Overdue — due ' : 'Due '}{item.nextRenewalDate}
                      </span>
                      {item.notes && (
                        <>
                          <span>•</span>
                          <span style={{ color: 'var(--ha-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.notes}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Tabular Amount */}
                <div className="ha-ledger-amount" style={{ textAlign: 'right', minWidth: '130px' }}>
                  <div className="tabular-nums" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                    {formatCurrency(item.amount, item.currency)}
                    <span style={{ fontSize: '0.75rem', color: 'var(--ha-muted)', fontWeight: 400, marginLeft: '2px' }}>
                      {formatBillingCycle(item.billingCycle)}
                    </span>
                  </div>
                  {item.billingCycle !== 'monthly' && item.billingCycle !== 'once' && (
                    <div className="tabular-nums" style={{ fontSize: '0.72rem', color: 'var(--ha-muted)' }}>
                      ≈ {formatCurrency(monthlyAmount, currency)}/mo
                    </div>
                  )}
                </div>

                {/* 3. Payment state, active state, and restrained row actions */}
                <div className="ha-ledger-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem' }}>
                  <button
                    className={`ha-payment-status${item.isPaidThisCycle ? ' is-paid' : overdue ? ' is-overdue' : ' is-unpaid'}`}
                    onClick={(e) => { e.stopPropagation(); onTogglePaid(item.id); }}
                    title={item.isPaidThisCycle ? 'Paid — click to mark unpaid' : 'Unpaid — click to mark paid'}
                  >
                    {item.isPaidThisCycle ? 'Paid' : 'Unpaid'}
                  </button>

                  <div className="ha-active-control" title={item.isActive ? 'Active — click to pause' : 'Paused — click to activate'} onClick={(e) => e.stopPropagation()}>
                    <span>{item.isActive ? 'Active' : 'Paused'}</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={() => onToggleActive(item.id)}
                        aria-label={`${item.isActive ? 'Pause' : 'Activate'} ${item.name}`}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); onEditExpense(item); }}
                    className="ha-row-edit"
                    title="Edit record"
                  >
                    <Edit2 size={14} />
                    <span>Edit</span>
                  </button>

                  <div className="ha-row-menu-wrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenActionsId(openActionsId === item.id ? null : item.id);
                      }}
                      className="ha-row-more"
                      title="More actions"
                      aria-label={`More actions for ${item.name}`}
                      aria-haspopup="menu"
                      aria-expanded={openActionsId === item.id}
                    >
                      <MoreHorizontal size={17} />
                    </button>

                    {openActionsId === item.id && (
                      <>
                        <button
                          className="ha-row-menu-overlay"
                          aria-label="Close actions menu"
                          onClick={(e) => { e.stopPropagation(); setOpenActionsId(null); }}
                        />
                        <div className="ha-row-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                          {item.isVariable && (
                            <button
                              role="menuitem"
                              onClick={() => {
                                setOpenActionsId(null);
                                const input = window.prompt(`New amount for "${item.name}" this cycle:`, String(item.amount));
                                if (input === null) return;
                                const parsed = Number(input);
                                if (!Number.isFinite(parsed) || parsed < 0) return;
                                onQuickUpdateAmount(item, parsed);
                              }}
                            >
                              <RefreshCw size={14} />
                              <span>Update amount</span>
                            </button>
                          )}
                          {item.vendorEmail && (
                            <button
                              role="menuitem"
                              onClick={() => { setOpenActionsId(null); onContactVendor(item); }}
                            >
                              <Mail size={14} />
                              <span>Contact vendor</span>
                            </button>
                          )}
                          <button
                            role="menuitem"
                            onClick={() => { setOpenActionsId(null); onDuplicateExpense(item); }}
                          >
                            <Copy size={14} />
                            <span>Duplicate</span>
                          </button>
                          <div className="ha-row-menu-divider" />
                          <button
                            role="menuitem"
                            className="is-destructive"
                            onClick={() => { setOpenActionsId(null); onDeleteExpense(item.id); }}
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    className="ha-row-expand"
                    onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : item.id); }}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.name} details`}
                    aria-expanded={isExpanded}
                  >
                    <ChevronDown
                      size={16}
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
                    />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '0 1.25rem 1rem', backgroundColor: '#fafaf7' }}>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem 1.75rem',
                    fontSize: '0.8rem',
                    color: 'var(--ha-muted)',
                    padding: '0.85rem 0',
                    borderTop: '1px solid var(--ha-line)',
                  }}>
                    <span>Category: <strong style={{ color: 'var(--ha-ink)' }}>{cat.name}</strong></span>
                    <span>Billing cycle: <strong style={{ color: 'var(--ha-ink)' }}>{formatBillingCycle(item.billingCycle)}</strong></span>
                    <span>Renewal day: <strong style={{ color: 'var(--ha-ink)' }}>{item.renewalDay}</strong></span>
                    {item.paymentAccount && (
                      <span>Paid from: <strong style={{ color: 'var(--ha-ink)' }}>{item.paymentAccount.name}</strong></span>
                    )}
                    {item.vendorEmail && (
                      <span>Vendor email: <strong style={{ color: 'var(--ha-ink)' }}>{item.vendorEmail}</strong></span>
                    )}
                    {item.contractEndDate && (
                      <span>Contract ends: <strong style={{ color: 'var(--ha-ink)' }}>{item.contractEndDate}</strong></span>
                    )}
                    {item.usageRating && (
                      <span>Usage: <strong style={{ color: 'var(--ha-ink)', textTransform: 'capitalize' }}>{item.usageRating}</strong></span>
                    )}
                    {item.lastPaidAt && (
                      <span>Last paid: <strong style={{ color: 'var(--ha-ink)' }}>{new Date(item.lastPaidAt).toLocaleDateString()}</strong></span>
                    )}
                    {item.createdBy && (
                      <span>Added by: <strong style={{ color: 'var(--ha-ink)' }}>{item.createdBy.name}</strong></span>
                    )}
                    {item.originalAmount != null && item.originalCurrency && (
                      <span>
                        Originally: <strong style={{ color: 'var(--ha-ink)' }}>{formatCurrency(item.originalAmount, item.originalCurrency)}</strong>
                        {item.exchangeRate != null && item.rateDate ? ` (converted at ${item.exchangeRate.toFixed(4)} on ${item.rateDate})` : ''}
                      </span>
                    )}
                    {item.reimbursementExpected != null && item.reimbursementExpected > 0 && (
                      <span>
                        Reimbursement: <strong style={{ color: 'var(--ha-ink)' }}>
                          {item.reimbursementReceived != null && item.reimbursementReceived > 0
                            ? `${formatCurrency(item.reimbursementReceived, item.currency)} received${item.reimbursementReceivedDate ? ` on ${item.reimbursementReceivedDate}` : ''} — net cost ${formatCurrency(getEffectiveAmount(item), item.currency)}`
                            : `${formatCurrency(item.reimbursementExpected, item.currency)} expected (claim pending)`}
                        </strong>
                      </span>
                    )}
                  </div>

                  {goal && goalPct !== null && (
                    <div style={{ paddingBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--ha-muted)' }}>
                          Saving towards <strong style={{ color: 'var(--ha-ink)' }}>{goal.name}</strong> — {formatCurrency(goal.currentAmount, goal.currency || currency)} of {formatCurrency(goal.targetAmount, goal.currency || currency)}
                        </span>
                        <span className="tabular-nums" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                          {goalPct}%
                        </span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '999px', backgroundColor: 'var(--ha-line)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${goalPct}%`,
                          borderRadius: '999px',
                          backgroundColor: goalPct >= 100 ? 'var(--ha-lime)' : 'var(--ha-blue)',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  )}

                  {item.notes && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--ha-ink)', paddingBottom: '0.25rem', lineHeight: 1.5 }}>
                      {item.notes}
                    </div>
                  )}
                </div>
              )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
