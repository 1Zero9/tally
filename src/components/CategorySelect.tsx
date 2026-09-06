import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { CustomCategoryItem } from '../types/expense';
import { CATEGORY_LIST } from '../data/categories';

const NEW_CATEGORY_SENTINEL = '__new_category__';

interface CategorySelectProps {
  value: string;
  onChange: (categoryId: string) => void;
  customCategories: CustomCategoryItem[];
  onCategoryCreated: (category: CustomCategoryItem) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholderOption?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * A category <select> that also lets the household create a new custom
 * category inline ("+ Create new category…") when nothing built-in fits —
 * e.g. "Tolls" for road/bridge tolls. New categories are household-scoped,
 * auto-assigned an icon/color, and immediately usable everywhere else that
 * renders this component (via the shared `customCategories` list).
 */
export const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  customCategories,
  onCategoryCreated,
  className = 'ha-input',
  style,
  placeholderOption,
  disabled,
  id,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === NEW_CATEGORY_SENTINEL) {
      setNewName('');
      setError('');
      setIsCreating(true);
      return;
    }
    onChange(e.target.value);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setIsSaving(true);
    setError('');
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        onCategoryCreated(data.category);
        onChange(data.category.id);
        setIsCreating(false);
      } else {
        setError(data.message || 'Failed to create category');
      }
    } catch {
      setError('Failed to create category');
    } finally {
      setIsSaving(false);
    }
  };

  if (isCreating) {
    return (
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          id={id}
          autoFocus
          className={className}
          style={style}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
            if (e.key === 'Escape') setIsCreating(false);
          }}
          placeholder="New category name, e.g. Tolls"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={isSaving || !newName.trim()}
          className="btn btn-primary"
          style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
        >
          {isSaving ? <Loader2 size={12} className="spin" /> : 'Create'}
        </button>
        <button
          type="button"
          onClick={() => setIsCreating(false)}
          className="btn btn-ghost"
          style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}
        >
          Cancel
        </button>
        {error && <div style={{ fontSize: '0.72rem', color: 'var(--ha-red)', width: '100%' }}>{error}</div>}
      </div>
    );
  }

  return (
    <select
      id={id}
      className={className}
      style={style}
      value={value}
      onChange={handleSelectChange}
      disabled={disabled}
    >
      {placeholderOption && <option value="">{placeholderOption}</option>}
      {CATEGORY_LIST.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      {customCategories.length > 0 && (
        <optgroup label="Custom">
          {customCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
      )}
      <option value={NEW_CATEGORY_SENTINEL}>+ Create new category…</option>
    </select>
  );
};
