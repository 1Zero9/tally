import type { CategoryInfo, BuiltinExpenseCategory, CustomCategoryItem } from '../types/expense';

export const CATEGORIES: Record<BuiltinExpenseCategory, CategoryInfo> = {
  'education': {
    id: 'education',
    name: 'Education & Schooling',
    description: 'College tuition, school fees, transport, books, uniform & lunches',
    color: '#3155D9', // Ultramarine
    bgColor: '#eef2fc',
    borderColor: '#d0daf7',
    icon: 'GraduationCap',
  },
  'lifestyle': {
    id: 'lifestyle',
    name: 'Sports & Activities',
    description: 'Sports clubs, football/swimming coaching, gym, fitness & extracurriculars',
    color: '#202124', // Graphite
    bgColor: '#f4f5f6',
    borderColor: '#e7e8ea',
    icon: 'Dumbbell',
  },
  'utilities': {
    id: 'utilities',
    name: 'Home Utilities',
    description: 'Electricity, Gas/Heating, Water, Fibre Broadband & Mobile bills',
    color: '#1a3299', // Deep Blue
    bgColor: '#eef2fc',
    borderColor: '#d0daf7',
    icon: 'Zap',
  },
  'housing': {
    id: 'housing',
    name: 'Housing & Property',
    description: 'Rent/Mortgage, Council & Property Tax, Home Insurance, TV Licence',
    color: '#676B73', // Mid Grey
    bgColor: '#f1f2f4',
    borderColor: '#e7e8ea',
    icon: 'Home',
  },
  'ai-tech': {
    id: 'ai-tech',
    name: 'AI & Tech Services',
    description: 'ChatGPT Plus, Claude Pro, Cursor, Midjourney, Copilot & cloud services',
    color: '#3155D9',
    bgColor: '#e8ecfa',
    borderColor: '#c6d3f7',
    icon: 'Bot',
  },
  'entertainment': {
    id: 'entertainment',
    name: 'Streaming & Media',
    description: 'Netflix, Spotify, Apple TV+, Disney+, YouTube & entertainment subscriptions',
    color: '#F04E3E', // Tomato Red
    bgColor: '#fef2f1',
    borderColor: '#fcd3cf',
    icon: 'Tv',
  },
  'shopping': {
    id: 'shopping',
    name: 'Shopping & Groceries',
    description: 'One monthly total for groceries and general shopping — no itemizing',
    color: '#8A5CF6', // Violet
    bgColor: '#f4effe',
    borderColor: '#ded0fb',
    icon: 'ShoppingCart',
  },
  'big-ticket': {
    id: 'big-ticket',
    name: 'Mortgage, Loans & Big Purchases',
    description: 'Mortgage repayments, car & personal loans, holidays and other major financed purchases',
    color: '#B45309', // Amber/Gold
    bgColor: '#fdf2e3',
    borderColor: '#f6dfb8',
    icon: 'Landmark',
  },
  'insurance': {
    id: 'insurance',
    name: 'Insurance, Motor Tax & NCT',
    description: 'Car, life & health insurance, motor tax and NCT — vehicle and personal cover kept separate from household bills',
    color: '#0E7490', // Teal
    bgColor: '#e7f5f8',
    borderColor: '#bfe3ea',
    icon: 'ShieldCheck',
  },
  'transport': {
    id: 'transport',
    name: 'Transport & Motoring',
    description: 'Fuel, tolls, parking, public transport, car servicing & repairs (tax/NCT/insurance stay under Insurance)',
    color: '#15803D', // Green
    bgColor: '#e9f6ee',
    borderColor: '#c3e6d1',
    icon: 'Car',
  },
  'health': {
    id: 'health',
    name: 'Health & Medical',
    description: 'GP, dentist, pharmacy, physio, glasses and other medical costs',
    color: '#BE185D', // Rose
    bgColor: '#fdeef4',
    borderColor: '#f7cbdd',
    icon: 'HeartPulse',
  },
  'dining': {
    id: 'dining',
    name: 'Eating Out & Takeaway',
    description: 'Restaurants, cafés, coffee and food delivery — kept separate from the grocery shop',
    color: '#4D7C0F', // Lime
    bgColor: '#f0f6e6',
    borderColor: '#d8e8bd',
    icon: 'Utensils',
  },
  'personal': {
    id: 'personal',
    name: 'Personal Care & Clothing',
    description: 'Haircuts, beauty, cosmetics, clothes, footwear and accessories',
    color: '#4338CA', // Indigo
    bgColor: '#ecebfa',
    borderColor: '#cfccf2',
    icon: 'Shirt',
  },
  'travel': {
    id: 'travel',
    name: 'Travel & Holidays',
    description: 'Flights, hotels, car hire and spending money on trips away',
    color: '#0369A1', // Blue
    bgColor: '#e6f2f9',
    borderColor: '#bfdcec',
    icon: 'Plane',
  },
  'banking': {
    id: 'banking',
    name: 'Banking & Fees',
    description: 'ATM withdrawals, account maintenance fees, bank charges, interest and stamp duty',
    color: '#475569', // Slate
    bgColor: '#eef1f4',
    borderColor: '#d5dbe1',
    icon: 'Landmark',
  },
  'pets': {
    id: 'pets',
    name: 'Pets',
    description: 'Vet, pet food, pet insurance and grooming',
    color: '#92400E', // Brown
    bgColor: '#f7ede4',
    borderColor: '#ead9c6',
    icon: 'Dog',
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export function isBuiltinCategory(id: string): id is BuiltinExpenseCategory {
  return Object.prototype.hasOwnProperty.call(CATEGORIES, id);
}

// A rotating palette used to auto-assign a color to newly created custom
// categories, so households don't have to pick one — cycles by count of
// existing custom categories at creation time.
export const CUSTOM_CATEGORY_PALETTE: { color: string; bgColor: string; borderColor: string }[] = [
  { color: '#0E7490', bgColor: '#e7f5f8', borderColor: '#bfe3ea' }, // Teal
  { color: '#B45309', bgColor: '#fdf2e3', borderColor: '#f6dfb8' }, // Amber
  { color: '#8A5CF6', bgColor: '#f4effe', borderColor: '#ded0fb' }, // Violet
  { color: '#F04E3E', bgColor: '#fef2f1', borderColor: '#fcd3cf' }, // Tomato
  { color: '#3155D9', bgColor: '#eef2fc', borderColor: '#d0daf7' }, // Ultramarine
  { color: '#676B73', bgColor: '#f1f2f4', borderColor: '#e7e8ea' }, // Grey
];

export function pickCustomCategoryColors(existingCustomCount: number) {
  return CUSTOM_CATEGORY_PALETTE[existingCustomCount % CUSTOM_CATEGORY_PALETTE.length];
}

/**
 * The full set of colour triples (marker / tint background / border) offered
 * in the Category Manager's colour picker — a superset of the auto-assign
 * palette above, covering the hues the built-in categories also use.
 */
export const CATEGORY_COLOR_PRESETS: { name: string; color: string; bgColor: string; borderColor: string }[] = [
  { name: 'Ultramarine', color: '#3155D9', bgColor: '#eef2fc', borderColor: '#d0daf7' },
  { name: 'Deep Blue', color: '#1a3299', bgColor: '#e8ecfa', borderColor: '#c6d3f7' },
  { name: 'Teal', color: '#0E7490', bgColor: '#e7f5f8', borderColor: '#bfe3ea' },
  { name: 'Green', color: '#15803D', bgColor: '#e9f6ee', borderColor: '#c3e6d1' },
  { name: 'Lime', color: '#4D7C0F', bgColor: '#f0f6e6', borderColor: '#d8e8bd' },
  { name: 'Amber', color: '#B45309', bgColor: '#fdf2e3', borderColor: '#f6dfb8' },
  { name: 'Tomato', color: '#F04E3E', bgColor: '#fef2f1', borderColor: '#fcd3cf' },
  { name: 'Rose', color: '#BE185D', bgColor: '#fdeef4', borderColor: '#f7cbdd' },
  { name: 'Violet', color: '#8A5CF6', bgColor: '#f4effe', borderColor: '#ded0fb' },
  { name: 'Indigo', color: '#4338CA', bgColor: '#ecebfa', borderColor: '#cfccf2' },
  { name: 'Graphite', color: '#202124', bgColor: '#f4f5f6', borderColor: '#e7e8ea' },
  { name: 'Grey', color: '#676B73', bgColor: '#f1f2f4', borderColor: '#e7e8ea' },
];

const FALLBACK_META: CategoryInfo = {
  id: 'utilities',
  name: 'Other',
  description: 'Uncategorized',
  color: '#676B73',
  bgColor: '#f1f2f4',
  borderColor: '#e7e8ea',
  icon: 'Tag',
};

/**
 * The rows from GET /api/categories that are genuine standalone custom
 * categories — i.e. not per-household appearance overrides for a built-in.
 * Every "custom categories" picker/list should render this, not the raw rows.
 */
export function getCustomCategories(rows: CustomCategoryItem[] | undefined | null): CustomCategoryItem[] {
  return (rows ?? []).filter((c) => !c.builtinKey);
}

/** The appearance-override row for a given built-in key, if the household has set one. */
export function getBuiltinOverride(
  rows: CustomCategoryItem[] | undefined | null,
  builtinKey: string
): CustomCategoryItem | undefined {
  return (rows ?? []).find((c) => c.builtinKey === builtinKey);
}

/**
 * Resolves display metadata (name/icon/color) for any category id — built-in
 * or household-defined custom — falling back gracefully if the id isn't
 * recognized (e.g. a custom category was since deleted).
 *
 * `categoryRows` is the full GET /api/categories payload: both standalone
 * custom categories and any per-household appearance overrides for built-ins.
 */
export function getCategoryMeta(
  id: string | null | undefined,
  categoryRows?: CustomCategoryItem[]
): CategoryInfo {
  if (!id) return FALLBACK_META;
  if (isBuiltinCategory(id)) {
    const base = CATEGORIES[id];
    const override = getBuiltinOverride(categoryRows, id);
    if (!override) return base;
    return {
      ...base,
      // A household can rename a built-in; the override row's name only
      // counts when it actually differs from the canonical one.
      name: override.name && override.name !== base.name ? override.name : base.name,
      color: override.color || base.color,
      bgColor: override.bgColor || base.bgColor,
      borderColor: override.borderColor || base.borderColor,
      icon: override.icon || base.icon,
    };
  }
  const custom = categoryRows?.find((c) => c.id === id && !c.builtinKey);
  if (custom) {
    return {
      id: custom.id,
      name: custom.name,
      description: custom.name,
      color: custom.color,
      bgColor: custom.bgColor,
      borderColor: custom.borderColor,
      icon: custom.icon,
    };
  }
  return { ...FALLBACK_META, id, name: id };
}

export interface OrderedCategory {
  id: string;
  isCustom: boolean;
  meta: CategoryInfo;
}

/**
 * The full category list — built-ins and custom together — in the
 * household's chosen order. Once anything has an explicit `sortOrder`
 * (set by a reorder), everything sorts by that; otherwise it's the
 * canonical built-in order followed by custom categories by creation.
 */
export function getOrderedCategories(rows: CustomCategoryItem[] | undefined | null): OrderedCategory[] {
  const all = rows ?? [];
  const overrideByKey = new Map<string, CustomCategoryItem>();
  for (const r of all) if (r.builtinKey) overrideByKey.set(r.builtinKey, r);
  const custom = all.filter((c) => !c.builtinKey);

  type Entry = { id: string; isCustom: boolean; order: number | null; fallback: number };
  const entries: Entry[] = [
    ...CATEGORY_LIST.map((b, i) => ({
      id: b.id, isCustom: false,
      order: overrideByKey.get(b.id)?.sortOrder ?? null,
      fallback: i,
    })),
    ...custom.map((c, i) => ({
      id: c.id, isCustom: true,
      order: c.sortOrder ?? null,
      fallback: 1000 + i,
    })),
  ];

  const anyOrdered = entries.some((e) => e.order != null);
  entries.sort((a, b) => {
    if (anyOrdered) {
      const ao = a.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
    }
    return a.fallback - b.fallback;
  });

  return entries.map((e) => ({ id: e.id, isCustom: e.isCustom, meta: getCategoryMeta(e.id, all) }));
}
