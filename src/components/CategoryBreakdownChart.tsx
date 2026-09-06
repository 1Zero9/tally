import React from 'react';
import type { ExpenseItem, CurrencyCode, CustomCategoryItem } from '../types/expense';
import { CATEGORY_LIST } from '../data/categories';
import { convertCurrency, getMonthlyEquivalent, getEffectiveAmount } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';

interface CategoryBreakdownChartProps {
  expenses: ExpenseItem[];
  currency: CurrencyCode;
  customCategories?: CustomCategoryItem[];
}

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  expenses,
  currency,
  customCategories = [],
}) => {
  const activeExpenses = expenses.filter((e) => e.isActive);
  const totalSpend = activeExpenses.reduce((sum, item) => {
    const amountInDisplay = convertCurrency(getEffectiveAmount(item), item.currency, currency);
    return sum + getMonthlyEquivalent(amountInDisplay, item.billingCycle);
  }, 0);

  const categoryData = [...CATEGORY_LIST, ...customCategories].map((cat) => {
    const catItems = activeExpenses.filter((e) => e.category === cat.id);
    const monthlyAmount = catItems.reduce((sum, item) => {
      const amountInDisplay = convertCurrency(getEffectiveAmount(item), item.currency, currency);
      return sum + getMonthlyEquivalent(amountInDisplay, item.billingCycle);
    }, 0);
    const percentage = totalSpend > 0 ? (monthlyAmount / totalSpend) * 100 : 0;
    return {
      ...cat,
      itemCount: catItems.length,
      monthlyAmount,
      percentage: Math.round(percentage * 10) / 10,
    };
  }).sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  return (
    <div className="ha-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
      <div style={{ marginBottom: '0.65rem' }}>
        <h3 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ha-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          Monthly spending mix
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

      {/* Informational legend. Filtering lives with the ledger controls below. */}
      <div className="ha-spending-legend">
        {categoryData.filter((cat) => cat.itemCount > 0).map((cat) => (
          <div key={cat.id} className="ha-spending-legend-item">
            <span className="ha-color-marker" style={{ backgroundColor: cat.color }} />
            <span className="ha-spending-legend-name">
              {cat.name}
            </span>
            <span className="tabular-nums ha-spending-legend-amount">
              {formatCurrency(cat.monthlyAmount, currency)}
            </span>
            <span className="tabular-nums ha-spending-legend-percent">
              {cat.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
