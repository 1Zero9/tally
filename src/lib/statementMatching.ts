/**
 * Pure, dependency-free helpers for the statement reconciliation feature —
 * safe to import from both client components (CSV parsing / column
 * guessing during the import wizard) and server API routes (normalization
 * + matching against the household's real Expenses/Transfers/aliases).
 */

export type StatementTxDirection = 'DEBIT' | 'CREDIT';
export type DetectedBillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'annual';

/**
 * Strips control/zero-width characters and caps length on free text pulled
 * from an imported statement (raw descriptions, AI-read merchant names)
 * before it's stored and later surfaced to AI prompt contexts elsewhere in
 * the app (assistant Q&A, money-flow insights) — defense-in-depth against a
 * malicious or malformed statement trying to smuggle prompt-injection text
 * or terminal/control sequences through a free-text field.
 */
export function sanitizeImportedText(raw: string, maxLength = 200): string {
  if (!raw) return '';
  return raw
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

/** RFC4180-ish CSV parser: handles quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      pushField();
    } else if (c === '\r') {
      continue;
    } else if (c === '\n') {
      pushRow();
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

export interface ColumnGuess {
  dateIndex: number | null;
  descriptionIndex: number | null;
  amountIndex: number | null;
  debitIndex: number | null;
  creditIndex: number | null;
}

/** Best-effort guess at which column is which, based on common header names. */
export function guessColumns(headers: string[]): ColumnGuess {
  const norm = headers.map((h) => h.trim().toLowerCase());
  const find = (patterns: string[]): number | null => {
    for (const p of patterns) {
      const idx = norm.findIndex((h) => h.includes(p));
      if (idx !== -1) return idx;
    }
    return null;
  };

  return {
    dateIndex: find(['date', 'posted', 'transaction date', 'value date']),
    descriptionIndex: find(['description', 'details', 'narrative', 'merchant', 'memo', 'particulars', 'payee']),
    amountIndex: find(['amount', 'value']),
    debitIndex: find(['debit', 'withdrawal', 'money out', 'paid out', 'out']),
    creditIndex: find(['credit', 'deposit', 'money in', 'paid in', 'in']),
  };
}

/** Parses a wide range of amount formats: "1,234.56", "1.234,56", "(12.00)", "€12,00". */
export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[€£$]/g, '');
  if (!s) return null;

  const negative = /^\(.*\)$/.test(s) || s.trim().startsWith('-');
  s = s.replace(/[()]/g, '').replace(/^-/, '').trim();

  if (s.includes(',') && s.includes('.')) {
    // Whichever separator appears last is the decimal one.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',') && !s.includes('.')) {
    const parts = s.split(',');
    if (parts[parts.length - 1].length === 2) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  }

  const n = parseFloat(s);
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
}

/** Normalizes a wide range of date formats to YYYY-MM-DD. Assumes DD/MM/YYYY for ambiguous slash-formats. */
export function parseDateFlexible(raw: string): string | null {
  const s = (raw || '').trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;

  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    // If the first number can't be a month, it's unambiguous DD/MM. Otherwise assume DD/MM (EU convention).
    return `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/);
  if (m) {
    const year = 2000 + Number(m[3]);
    return `${year}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];

  return null;
}

// ---------------------------------------------------------------------------
// Description normalization
// ---------------------------------------------------------------------------

const NOISE_PREFIXES: RegExp[] = [
  /^POS\s+PURCHASE\s*/i,
  // "POS13MAY", "POS08MAR" — a day-of-month + 3-letter month glued directly
  // to POS with no space (seen from at least one Irish bank's exports).
  // Left unstripped, this date becomes part of the normalized description,
  // so every occurrence of the same real merchant gets a different key and
  // never groups, matches an alias, or picks up a "rename merchant" nickname
  // applied to a different occurrence.
  /^POS\d{1,2}[A-Z]{3}\s*/i,
  /^POS\s+/i,
  /^SQ\s*\*/i,
  /^SQU\s*\*/i,
  /^PAYPAL\s*\*/i,
  /^PP\s*\*/i,
  /^CARD PAYMENT TO\s*/i,
  /^CONTACTLESS\s+/i,
  /^DEBIT CARD PURCHASE\s*/i,
  /^VISA\s+(DEBIT|PURCHASE)?\s*/i,
  /^DD\s+/i,
  /^SO\s+/i,
  /^ONLINE PAYMENT TO\s*/i,
  /^PMT\s+/i,
  /^PAYMENT TO\s*/i,
  /^DIRECT DEBIT\s*/i,
];

/**
 * Strips card references, POS/SQ/PayPal prefixes, transaction IDs, masked
 * card numbers and trailing reference codes, then collapses to a stable,
 * comparable uppercase string of meaningful words.
 */
export function normalizeDescription(raw: string): string {
  let s = (raw || '').trim();

  for (const re of NOISE_PREFIXES) s = s.replace(re, '');

  s = s.replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, ' ');
  s = s.replace(/\bX{2,}\d{2,}\b/gi, ' ');
  s = s.replace(/\*+\d{3,}\b/g, ' ');
  s = s.replace(/\bREF\s*[:#]?\s*\w+/gi, ' ');
  s = s.replace(/\b\d{6,}\b/g, ' ');
  s = s.replace(/[^A-Za-z0-9&' ]+/g, ' ');
  s = s.replace(/\s+/g, ' ').trim().toUpperCase();

  return s;
}

/** Derives a short, stable alias pattern (a few leading significant words) from a normalized description. */
export function buildAliasPattern(normalizedDescription: string): string {
  const tokens = normalizedDescription
    .split(' ')
    .filter((t) => t.length > 1 && !/^\d+$/.test(t));
  return tokens.slice(0, 3).join(' ').trim();
}

function tokens(s: string): Set<string> {
  return new Set(s.split(' ').filter((t) => t.length > 1));
}

/** 0..1 similarity score between two normalized (uppercase) strings. */
export function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;

  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;

  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.max(ta.size, tb.size);
}

/**
 * A stable key identifying "the same real-world transaction" for duplicate
 * detection — same day, amount, currency, direction and normalized
 * merchant description. Used to catch the common case of overlapping
 * statement periods (this month's export includes a few days already
 * covered by last month's) without needing exact file-level dedup.
 */
export function duplicateKey(row: { date: string; amount: number; currency: string; direction: StatementTxDirection; normalizedDescription: string }): string {
  return [row.date, row.amount.toFixed(2), row.currency, row.direction, row.normalizedDescription].join('|');
}

/**
 * Looks at a set of dates (all sharing the same merchant and amount — that's
 * the caller's job to establish) and decides whether the spacing between
 * them is regular enough to be a genuine recurring bill, rather than
 * coincidentally-identical one-off spending (e.g. two same-price coffees).
 * Returns null when there aren't enough points or the gaps are too
 * irregular to trust — callers should fall back to treating each row as a
 * separate one-off in that case. Requires at least 3 occurrences — with
 * only 2, a single gap can't be checked for regularity, so anything from
 * two same-priced coffees a week apart would otherwise look "recurring."
 */
export function detectRecurringCycle(dates: string[]): DetectedBillingCycle | null {
  if (dates.length < 3) return null;
  const sorted = [...dates].sort();

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
    gaps.push(days);
  }
  if (gaps.some((g) => g <= 0)) return null;

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const maxDeviation = Math.max(...gaps.map((g) => Math.abs(g - avgGap)));

  const withinTolerance = (targetDays: number, toleranceDays: number) =>
    Math.abs(avgGap - targetDays) <= toleranceDays && maxDeviation <= toleranceDays * 1.5;

  if (withinTolerance(7, 3)) return 'weekly';
  if (withinTolerance(30.44, 6)) return 'monthly';
  if (withinTolerance(91.3, 12)) return 'quarterly';
  if (withinTolerance(365, 20)) return 'annual';
  return null;
}

// ---------------------------------------------------------------------------
// Matching pipeline
// ---------------------------------------------------------------------------

export interface MatchCandidateExpense {
  id: string;
  name: string;
  vendor: string | null;
  amount: number;
  currency: string;
  renewalDay: number;
}

export interface MatchCandidateTransfer {
  id: string;
  amount: number;
  currency: string;
  date: string;
  externalLabel: string | null;
}

export interface MatchCandidateAlias {
  id: string;
  pattern: string;
  vendorName: string;
  expenseId: string | null;
  category: string | null;
}

export interface StatementRowInput {
  normalizedDescription: string;
  amount: number;
  currency: string;
  date: string;
  direction: StatementTxDirection;
}

export interface MatchResult {
  status: 'MATCHED' | 'UNMATCHED';
  matchedExpenseId?: string | null;
  matchedTransferId?: string | null;
  matchConfidence?: number | null;
  suggestedVendorName?: string | null;
  suggestedCategory?: string | null;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return 999;
  return Math.abs(da - db) / (1000 * 60 * 60 * 24);
}

function scoreExpenseMatch(tx: StatementRowInput, expense: MatchCandidateExpense): number {
  if (tx.currency !== expense.currency) return 0;

  const amountTolerance = Math.max(0.5, expense.amount * 0.02);
  if (Math.abs(tx.amount - expense.amount) > amountTolerance) return 0;

  let score = 0.5;

  const nameSim = Math.max(
    stringSimilarity(tx.normalizedDescription, normalizeDescription(expense.name)),
    expense.vendor ? stringSimilarity(tx.normalizedDescription, normalizeDescription(expense.vendor)) : 0
  );
  score += nameSim * 0.4;

  const txDay = new Date(tx.date).getDate();
  const rawDiff = Math.abs(txDay - expense.renewalDay);
  const dayDiff = Math.min(rawDiff, 31 - rawDiff);
  const dateScore = Math.max(0, 1 - dayDiff / 10);
  score += dateScore * 0.1;

  return Math.min(1, score);
}

function scoreTransferMatch(tx: StatementRowInput, transfer: MatchCandidateTransfer): number {
  if (tx.currency !== transfer.currency) return 0;

  const amountTolerance = Math.max(0.5, transfer.amount * 0.02);
  if (Math.abs(tx.amount - transfer.amount) > amountTolerance) return 0;

  if (daysBetween(tx.date, transfer.date) > 5) return 0;

  let score = 0.6;
  if (transfer.externalLabel) {
    score += stringSimilarity(tx.normalizedDescription, normalizeDescription(transfer.externalLabel)) * 0.4;
  }
  return Math.min(1, score);
}

function findAliasMatch(tx: StatementRowInput, aliases: MatchCandidateAlias[]): MatchCandidateAlias | null {
  let best: MatchCandidateAlias | null = null;
  for (const alias of aliases) {
    if (!alias.pattern) continue;
    if (tx.normalizedDescription.includes(alias.pattern)) {
      if (!best || alias.pattern.length > best.pattern.length) best = alias;
    }
  }
  return best;
}

/**
 * Attempts to match a single normalized statement row against the
 * household's learned aliases, active expenses, and existing transfer log
 * (to avoid re-suggesting things already manually logged).
 */
export function matchTransaction(
  tx: StatementRowInput,
  context: {
    expenses: MatchCandidateExpense[];
    transfers: MatchCandidateTransfer[];
    aliases: MatchCandidateAlias[];
  }
): MatchResult {
  const alias = findAliasMatch(tx, context.aliases);
  const suggestedCategory = alias?.category ?? null;

  if (tx.direction === 'DEBIT') {
    // A learned alias that already points at a specific Expense means the
    // household has confirmed this exact merchant pattern before — safe to
    // auto-accept. Everything else below is only ever a *suggestion*: it
    // always lands as UNMATCHED ("needs review") so nothing gets silently
    // logged without an explicit confirm/log/ignore from the household.
    if (alias?.expenseId) {
      const expense = context.expenses.find((e) => e.id === alias.expenseId);
      if (expense) {
        return {
          status: 'MATCHED',
          matchedExpenseId: expense.id,
          matchConfidence: 0.97,
          suggestedVendorName: alias.vendorName,
          suggestedCategory,
        };
      }
    }

    let bestExpense: { id: string; score: number } | null = null;
    for (const expense of context.expenses) {
      const score = scoreExpenseMatch(tx, expense);
      if (!bestExpense || score > bestExpense.score) bestExpense = { id: expense.id, score };
    }

    if (bestExpense && bestExpense.score >= 0.75) {
      return {
        status: 'UNMATCHED',
        matchedExpenseId: bestExpense.id,
        matchConfidence: bestExpense.score,
        suggestedVendorName: alias?.vendorName ?? null,
        suggestedCategory,
      };
    }

    let bestTransfer: { id: string; score: number } | null = null;
    for (const transfer of context.transfers) {
      const score = scoreTransferMatch(tx, transfer);
      if (!bestTransfer || score > bestTransfer.score) bestTransfer = { id: transfer.id, score };
    }

    if (bestTransfer && bestTransfer.score >= 0.75) {
      return {
        status: 'UNMATCHED',
        matchedTransferId: bestTransfer.id,
        matchConfidence: bestTransfer.score,
        suggestedCategory,
      };
    }

    if (bestExpense && bestExpense.score >= 0.5) {
      return {
        status: 'UNMATCHED',
        matchedExpenseId: bestExpense.id,
        matchConfidence: bestExpense.score,
        suggestedVendorName: alias?.vendorName ?? null,
        suggestedCategory,
      };
    }

    return { status: 'UNMATCHED', suggestedVendorName: alias?.vendorName ?? null, suggestedCategory };
  }

  // CREDIT rows: only try to recognize as an already-logged transfer (e.g. salary landing) — a suggestion, never auto-confirmed.
  let bestTransfer: { id: string; score: number } | null = null;
  for (const transfer of context.transfers) {
    const score = scoreTransferMatch(tx, transfer);
    if (!bestTransfer || score > bestTransfer.score) bestTransfer = { id: transfer.id, score };
  }
  if (bestTransfer && bestTransfer.score >= 0.75) {
    return {
      status: 'UNMATCHED',
      matchedTransferId: bestTransfer.id,
      matchConfidence: bestTransfer.score,
      suggestedCategory,
    };
  }
  return { status: 'UNMATCHED', suggestedVendorName: alias?.vendorName ?? null, suggestedCategory };
}

/**
 * Flags rows that share a normalized description with at least one other
 * still-unmatched row in the same batch — a recurring-looking charge that
 * isn't tracked anywhere yet, worth a closer look.
 */
export function findRecurringUnmatched(
  transactions: { id: string; normalizedDescription: string; status: 'MATCHED' | 'UNMATCHED' | 'DUPLICATE' }[]
): Set<string> {
  const groups = new Map<string, string[]>();
  for (const tx of transactions) {
    if (tx.status !== 'UNMATCHED' || !tx.normalizedDescription) continue;
    const arr = groups.get(tx.normalizedDescription) || [];
    arr.push(tx.id);
    groups.set(tx.normalizedDescription, arr);
  }

  const flagged = new Set<string>();
  for (const ids of groups.values()) {
    if (ids.length >= 2) ids.forEach((id) => flagged.add(id));
  }
  return flagged;
}

// ---------------------------------------------------------------------------
// Duplicate recurring-bill guard (statement import)
// ---------------------------------------------------------------------------

export interface RecurringExpenseRow {
  id: string;
  name: string;
  vendor: string | null;
  amount: number;
  currency: string;
  billingCycle: string;
  isActive: boolean;
}

/**
 * Finds an existing active *recurring* expense that a to-be-created bill
 * would duplicate — same currency, amount within ~2%, and a close
 * normalized-name/vendor match. Used by "Add as bill" and the group
 * "recognize as recurring bill" flow to stop a second copy of the same
 * subscription being created from a statement.
 */
export function findDuplicateRecurringExpense(
  candidate: { name: string; amount: number; currency: string },
  existing: RecurringExpenseRow[]
): { id: string; name: string; amount: number } | null {
  const norm = normalizeDescription(candidate.name);
  if (!norm) return null;
  for (const e of existing) {
    if (!e.isActive || e.billingCycle === 'once' || e.currency !== candidate.currency) continue;
    const amountTolerance = Math.max(0.5, e.amount * 0.02);
    if (Math.abs(e.amount - candidate.amount) > amountTolerance) continue;
    const sim = Math.max(
      stringSimilarity(norm, normalizeDescription(e.name)),
      e.vendor ? stringSimilarity(norm, normalizeDescription(e.vendor)) : 0
    );
    // Deliberately strict: this fires a blocking "you already track…"
    // prompt during import, so a near-miss on a statement full of
    // similarly-named recurring debits shouldn't trip it. Amount already
    // has to match within ~2%.
    if (sim >= 0.88) return { id: e.id, name: e.name, amount: e.amount };
  }
  return null;
}

/**
 * Income equivalent of findDuplicateRecurringExpense — same scoring, used
 * by "Add as income" so a second copy of the same salary/rental isn't
 * created from another month's statement.
 */
export function findDuplicateIncome(
  candidate: { name: string; amount: number; currency: string },
  existing: { id: string; name: string; amount: number; currency: string; frequency: string; isActive: boolean }[]
): { id: string; name: string; amount: number } | null {
  return findDuplicateRecurringExpense(
    candidate,
    existing.map((e) => ({
      id: e.id,
      name: e.name,
      vendor: null,
      amount: e.amount,
      currency: e.currency,
      billingCycle: e.frequency,
      isActive: e.isActive,
    }))
  );
}
