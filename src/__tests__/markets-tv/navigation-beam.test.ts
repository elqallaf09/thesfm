import { expect, it } from 'vitest';
import { nearestTvTarget } from '@/lib/markets-tv/navigation';
it('keeps horizontal remote movement on the same row instead of jumping to a closer diagonal card', () => {
  const origin = { left: 0, top: 0, width: 80, height: 40 };
  const diagonal = { left: 100, top: 50, width: 80, height: 40 };
  const row = { left: 400, top: 0, width: 80, height: 40 };
  expect(nearestTvTarget(origin, [origin, diagonal, row], 'ArrowRight')).toBe(2);
  expect(nearestTvTarget(row, [origin, diagonal, row], 'ArrowLeft')).toBe(0);
  expect(nearestTvTarget(origin, [origin, diagonal], 'ArrowDown')).toBe(1);
  expect(nearestTvTarget(origin, [diagonal], 'invalid')).toBe(-1);
});
