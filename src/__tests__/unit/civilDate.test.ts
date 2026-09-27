import { describe, expect, it } from 'vitest';
import { parseEnglishCivilDate } from '@/lib/market/civilDate';

describe('parseEnglishCivilDate', () => {
  it('preserves the publisher calendar date in either supported English format', () => {
    expect(parseEnglishCivilDate('6 September 2026')).toBe('2026-09-06');
    expect(parseEnglishCivilDate('August 12, 2026')).toBe('2026-08-12');
  });

  it('rejects malformed and impossible dates instead of normalizing them', () => {
    expect(parseEnglishCivilDate('February 30, 2026')).toBeNull();
    expect(parseEnglishCivilDate('2026-09-06')).toBeNull();
  });
});
