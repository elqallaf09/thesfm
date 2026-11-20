import { describe, expect, it } from 'vitest';
import { tvNewsLayout } from '@/lib/markets-tv/newsLayout';

describe('readable TV news pages', () => {
  it('fits the allocated panel rather than compressing a long feed', () => {
    expect(tvNewsLayout(1420, 570, 18)).toEqual({ columns: 3, rows: 2, count: 6 });
    expect(tvNewsLayout(1180, 440, 16)).toEqual({ columns: 2, rows: 2, count: 4 });
    expect(tvNewsLayout(880, 280, 16)).toEqual({ columns: 2, rows: 1, count: 2 });
    expect(tvNewsLayout(330, 360, 16)).toEqual({ columns: 1, rows: 2, count: 2 });
    expect(tvNewsLayout(3600, 1600, 34)).toEqual({ columns: 3, rows: 2, count: 6 });
  });
  it('keeps the previous layout while a hidden WebView cannot be measured', () => {
    for (const invalid of [0, -1, NaN, Infinity]) {
      expect(tvNewsLayout(invalid, 500, 16)).toBeNull();
      expect(tvNewsLayout(1000, invalid, 16)).toBeNull();
      expect(tvNewsLayout(1000, 500, invalid)).toBeNull();
    }
  });
});
