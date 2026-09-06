import React, { useState } from 'react';
import type { ExpenseItem, CurrencyCode, CustomCategoryItem, BudgetItem } from '../types/expense';
import { convertCurrency, getMonthlyEquivalent, getEffectiveAmount } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { getCategoryMeta } from '../data/categories';
import { Wallet, Plus, Trash2, Edit2 } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { CategorySelect } from './CategorySelect';

interface BudgetsSectionProps {
  expenses: ExpenseItem[];
  customCategories: CustomCategoryItem[];
  currency: CurrencyCode;
  budgets: BudgetItem[];
  onSaveBudget: (category: string, monthlyLimit: number) => void;
  onDeleteBudget: (id: string) => void;
  onCategoryCreated?: (category: CustomCategoryItem) => void;
}

/**
 * A deliberately simple budget: one static monthly limit per category,
 * compared against that category's current monthly-equivalent spend — the
 * same figure Overview/Spending already show, not a running ledger of
 * actual payments made this calendar month. No rollover, no history, no
 * per-member split.
 */
export const BudgetsSection: React.FC<BudgetsSectionProps> = ({
  expenses,
  customCategories,
  currency,
  budgets,
  onSaveBudget,
  onDeleteBudget,
  onCategoryCreated,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState('');

  const activeExpenses = expenses.filter((e) => e.isActive);
  const spendByCategory = new Map<string, number>();
  for (const item of activeExpenses) {
    const amountInDisplay = convertCurrency(getEffectiveAmount(item), item.currency, currency);
    const monthly = getMonthlyEquivalent(amountInDisplay, item.billingCycle);
    spendByCategory.set(item.category, (spendByCategory.get(item.category) || 0) + monthly);
  }

  const handleAdd = () => {
    const limit = Number(newLimit);
    if (!newCategory || !Number.isFinite(limit) || limit <= 0) return;
    onSaveBudget(newCategory, limit);
    setNewCategory('');
    setNewLimit('');
    setIsAdding(false);
  };

  const handleSaveEdit = (category: string) => {
    const limit = Number(editLimit);
    if (!Number.isFinite(limit) || limit <= 0) return;
    onSaveBudget(category, limit);
    setEditingId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="ha-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="ha-badge ha-badge-blue">Budgets</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              Category spending limits
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '560px', marginTop: '0.25rem' }}>
              Set a monthly limit per category and see how this month&apos;s spend compares — no rollover, just a simple check.
            </p>
          </div>
          <button onClick={() => setIsAdding(true)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            <Plus size={15} />
            <span>Set a budget</span>
          </button>
        </div>

        {isAdding && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--ha-line)', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <CategorySelect
              value={newCategory}
              onChange={setNewCategory}
              customCategories={customCategories}
              onCategoryCreated={(cat) => onCategoryCreated?.(cat)}
              placeholderOption="— Choose a category —"
              className="ha-input"
              style={{ fontSize: '0.85rem', minWidth: '200px' }}
            />
            <input
              type="number"
              step="0.01"
              placeholder={`Monthly limit (${currency})`}
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              className="ha-input"
              style={{ fontSize: '0.85rem', maxWidth: '180px' }}
            />
            <button onClick={handleAdd} disabled={!newCategory || !newLimit} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
              Save
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewCategory(''); setNewLimit(''); }}
              className="btn btn-ghost"
              style={{ fontSize: '0.82rem' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <CollapsibleSection id="budgets-list" title={`Budgets (${budgets.length})`}>
        {budgets.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--ha-muted)' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--ha-blue-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
            }}>
              <Wallet size={24} color="var(--ha-blue)" />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ha-ink)', marginBottom: '0.35rem' }}>
              No budgets set yet
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '420px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
              Pick a category and a monthly limit to see how this month&apos;s spend compares — categories without a budget just aren&apos;t shown here.
            </p>
            <button onClick={() => setIsAdding(true)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              <Plus size={15} />
              <span>Set your first budget</span>
            </button>
          </div>
        ) : (
          <div>
            {budgets.map((budget) => {
              const meta = getCategoryMeta(budget.category, customCategories);
              const spent = spendByCategory.get(budget.category) || 0;
              const pct = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
              const barColor = pct > 100 ? 'var(--ha-red)' : pct >= 80 ? '#B45309' : 'var(--ha-lime)';
              const isEditing = editingId === budget.id;

              return (
                <div key={budget.id} className="ha-ledger-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                      <span className="ha-color-marker" style={{ backgroundColor: meta.color }} />
                      <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--ha-ink)' }}>{meta.name}</span>
                    </div>
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={editLimit}
                          onChange={(e) => setEditLimit(e.target.value)}
                          className="ha-input"
                          style={{ fontSize: '0.8rem', width: '110px' }}
                          autoFocus
                        />
                        <button onClick={() => handleSaveEdit(budget.category)} className="btn btn-primary" style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem' }}>
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.3rem 0.4rem' }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="tabular-nums" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                          {formatCurrency(spent, currency)}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--ha-muted)' }}>
                          / {formatCurrency(budget.monthlyLimit, budget.currency)}/mo
                        </span>
                        <button
                          onClick={() => { setEditingId(budget.id); setEditLimit(String(budget.monthlyLimit)); }}
                          className="btn btn-ghost"
                          style={{ padding: '0.3rem 0.4rem' }}
                          title="Edit limit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => onDeleteBudget(budget.id)}
                          className="btn btn-ghost"
                          style={{ padding: '0.3rem 0.4rem', color: 'var(--ha-red)' }}
                          title="Remove budget"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--ha-line)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, backgroundColor: barColor, borderRadius: '3px', transition: 'width 0.2s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
};
