import React from 'react';
import type { ExpenseItem, CurrencyCode, CustomCategoryItem } from '../types/expense';
import { CATEGORY_LIST, getCustomCategories, getCategoryMeta } from '../data/categories';
import { convertCurrency, getMonthlyContribution } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';

interface CategoryBreakdownChartProps {
  expenses: ExpenseItem[];
  currency: CurrencyCode;
  customCategories?: CustomCategoryItem[];
  bare?: boolean;
}

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  expenses,
  currency,
  customCategories = [],
  bare = false,
}) => {
  const activeExpenses = expenses.filter((e) => e.isActive);
  const totalSpend = activeExpenses.reduce((sum, item) => {
    return sum + convertCurrency(getMonthlyContribution(item), item.currency, currency);
  }, 0);

  const categoryData = [...CATEGORY_LIST, ...getCustomCategories(customCategories)].map((cat) => {
    const catItems = activeExpenses.filter((e) => e.category === cat.id);
    const monthlyAmount = catItems.reduce((sum, item) => {
      return sum + convertCurrency(getMonthlyContribution(item), item.currency, currency);
    }, 0);
    const percentage = totalSpend > 0 ? (monthlyAmount / totalSpend) * 100 : 0;
    const meta = getCategoryMeta(cat.id, customCategories);
    return {
      ...cat,
      name: meta.name,
      color: meta.color,
      itemCount: catItems.length,
      monthlyAmount,
      percentage: Math.round(percentage * 10) / 10,
    };
  }).sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  return (
    <div className={bare ? undefined : 'ha-card'} style={bare ? undefined : { padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
      <div style={{ marginBottom: '0.65rem' }}>
        <h3 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          Monthly commitments by category
        </h3>
      </div>

      {/* Horizontal Stacked Proportion Track */}
      <div style={{
        height: '8px',
        backgroundColor: 'var(--ha-line)',
        borderRadius: 'var(--ha-radius-sm)',
        display: 'flex',
        overflow: 'hidden',
        marginBottom: '0.75rem',
      }}>
        {categoryData.map((cat) => {
          if (cat.percentage <= 0) return null;
          return (
            <div
              key={cat.id}
              style={{
                width: `${cat.percentage}%`,
                height: '100%',
                backgroundColor: cat.color,
                transition: 'width 0.2s ease',
              }}
              title={`${cat.name}: ${cat.percentage}%`}
            />
          );
        })}
      </div>

      {/* Informational legend — only categories with spend this month.
          Filtering lives with the ledger controls below. */}
      {(() => {
        const withSpend = categoryData.filter((cat) => cat.monthlyAmount > 0);
        if (withSpend.length === 0) {
          return <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', margin: 0 }}>No spend recorded this month yet.</p>;
        }
        return (
          <div className="ha-spending-legend">
            {withSpend.map((cat) => (
              <div key={cat.id} className="ha-spending-legend-item">
                <span className="ha-color-marker" style={{ backgroundColor: cat.color }} />
                <span className="ha-spending-legend-name">{cat.name}</span>
                <span className="tabular-nums ha-spending-legend-amount">{formatCurrency(cat.monthlyAmount, currency)}</span>
                <span className="tabular-nums ha-spending-legend-percent">{cat.percentage}%</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
};
