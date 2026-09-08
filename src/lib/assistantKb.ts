/**
 * Internal knowledge base for the Tally Agent.
 *
 * Only "how do I / what happens if" style *app-usage* answers are cached and
 * reused. Questions about the household's own money are deliberately never
 * stored or reused here — that data changes, so a stale cached figure would
 * be worse than a fresh model call. Everything is household-scoped.
 */
import { prisma } from './prisma';
import { stringSimilarity } from './statementMatching';

export type QuestionKind = 'help' | 'data';

/** Stable, comparable form of a free-text question. */
export function normalizeQuestion(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|a|an|my|our|is|are|do|does|i|to|of|in|on|for|please|tally)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const HELP_HINTS = [
  'how do', 'how can', 'how to', 'what happens if', 'what does', 'what is the',
  'where do', 'where can', 'where is', 'can i', 'how are', 'why does', 'why is my screen',
  'add an account', 'create a budget', 'import a statement', 'set up', 'turn on', 'turn off',
];

const DATA_HINTS = [
  'how much', 'this month', 'last month', 'this year', 'my biggest', 'biggest expense',
  'spend', 'spent', 'spending', 'save', 'saved', 'saving', 'budget left', 'over budget',
  'owe', 'balance', 'income', 'cash flow', 'cashflow', 'net', 'subscription cost', 'per month',
  'compare', 'vs last', 'trend', 'category', '€', '£', '$',
];

/**
 * Splits a question into "about using the app" vs "about the household's
 * money". Data wins ties — anything that smells like it needs live figures
 * must go to the model with fresh context, never a cache.
 */
export function classifyQuestion(raw: string): QuestionKind {
  const q = (raw || '').toLowerCase();
  const looksData = DATA_HINTS.some((h) => q.includes(h));
  if (looksData) return 'data';
  const looksHelp = HELP_HINTS.some((h) => q.includes(h));
  return looksHelp ? 'help' : 'data';
}

const REUSE_SIMILARITY = 0.86;

export interface KbHit {
  id: string;
  answer: string;
  question: string;
}

/**
 * Finds a previously-answered help question close enough to reuse its
 * answer. Exact normalized match first, then a similarity sweep over this
 * household's other help entries.
 */
export async function lookupKbAnswer(householdId: string | null, question: string): Promise<KbHit | null> {
  const normalized = normalizeQuestion(question);
  if (!normalized) return null;

  const exact = await prisma.assistantKbEntry.findFirst({
    where: { householdId, normalized, kind: 'help' },
  });
  if (exact) return { id: exact.id, answer: exact.answer, question: exact.question };

  const candidates = await prisma.assistantKbEntry.findMany({
    where: { householdId, kind: 'help' },
    orderBy: { hitCount: 'desc' },
    take: 200,
  });
  for (const c of candidates) {
    if (stringSimilarity(normalized, c.normalized) >= REUSE_SIMILARITY) {
      return { id: c.id, answer: c.answer, question: c.question };
    }
  }
  return null;
}

/** Records that a cached answer was served again. */
export async function bumpKbHit(id: string): Promise<void> {
  try {
    await prisma.assistantKbEntry.update({
      where: { id },
      data: { hitCount: { increment: 1 }, lastUsedAt: new Date() },
    });
  } catch {
    /* a losing race on delete/update is harmless here */
  }
}

/** Saves a fresh help answer so the next identical question skips the model. */
export async function rememberKbAnswer(
  householdId: string | null,
  createdById: string | null,
  question: string,
  answer: string
): Promise<void> {
  const normalized = normalizeQuestion(question);
  if (!normalized || !answer.trim()) return;
  try {
    await prisma.assistantKbEntry.upsert({
      where: { householdId_normalized: { householdId: householdId ?? '', normalized } },
      create: { householdId, createdById, question: question.trim().slice(0, 500), normalized, answer, kind: 'help' },
      update: { answer, question: question.trim().slice(0, 500) },
    });
  } catch {
    /* never let a cache write break the answer path */
  }
}
