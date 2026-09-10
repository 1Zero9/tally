import { describe, it, expect } from 'vitest';
import { formatDate } from '../formatters';

describe('formatDate', () => {
  it('renders a plain YYYY-MM-DD in UK/Ireland reading order', () => {
    expect(formatDate('2026-10-02')).toBe('2 Oct 2026');
  });

  it('does not slip a date-only value to the day before (timezone-safe)', () => {
    // Parsed as UTC midnight this would show "1 Oct 2026" west of UTC.
    expect(formatDate('2026-10-02')).toBe('2 Oct 2026');
    expect(formatDate('2026-01-01')).toBe('1 Jan 2026');
  });

  it('handles a full ISO timestamp', () => {
    expect(formatDate('2026-10-02T09:30:00.000Z')).toContain('Oct 2026');
  });

  it('falls back gracefully', () => {
    expect(formatDate()).toBe('—');
    expect(formatDate('not a date')).toBe('not a date');
  });
});
