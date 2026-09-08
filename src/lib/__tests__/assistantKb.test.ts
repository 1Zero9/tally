import { describe, it, expect } from 'vitest';
import { classifyQuestion, normalizeQuestion } from '../assistantKb';

describe('normalizeQuestion', () => {
  it('strips punctuation, casing and filler so equivalent questions match', () => {
    expect(normalizeQuestion('How do I add an account?')).toBe(
      normalizeQuestion('how do i add an account')
    );
    expect(normalizeQuestion('  What   happens if I DELETE a statement?! ')).toBe(
      'what happens if delete statement'
    );
  });

  it('returns an empty string for empty input', () => {
    expect(normalizeQuestion('')).toBe('');
    expect(normalizeQuestion('  ')).toBe('');
  });
});

describe('classifyQuestion', () => {
  it('routes app-usage questions to "help"', () => {
    expect(classifyQuestion('How do I add an account?')).toBe('help');
    expect(classifyQuestion('What happens if I delete a statement import?')).toBe('help');
    expect(classifyQuestion('How can I create a budget?')).toBe('help');
    expect(classifyQuestion('What does the Money Map screen show?')).toBe('help');
  });

  it('routes money questions to "data", even when phrased like a how-to', () => {
    expect(classifyQuestion('How much did I spend this month?')).toBe('data');
    expect(classifyQuestion('What are my biggest expenses?')).toBe('data');
    expect(classifyQuestion('How can I reduce spending?')).toBe('data');
    expect(classifyQuestion('Compare this month with last month')).toBe('data');
  });

  it('defaults unknown phrasing to "data" (never caches by accident)', () => {
    expect(classifyQuestion('groceries')).toBe('data');
    expect(classifyQuestion('tell me something interesting')).toBe('data');
  });
});
