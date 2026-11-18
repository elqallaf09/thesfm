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

it('stops at the visual grid row edge instead of jumping to another row in RTL or LTR', () => {
  const left = { left: 0, top: 0, width: 100, height: 32 };
  const right = { left: 110, top: 0, width: 100, height: 32 };
  const lowerLeft = { left: 0, top: 38, width: 100, height: 32 };
  const lowerRight = { left: 110, top: 38, width: 100, height: 32 };
  const targets = [left, right, lowerLeft, lowerRight];
  expect(nearestTvTarget(right, targets, 'ArrowLeft', true)).toBe(0);
  expect(nearestTvTarget(left, targets, 'ArrowRight', true)).toBe(1);
  expect(nearestTvTarget(right, targets, 'ArrowRight', true)).toBe(-1);
  expect(nearestTvTarget(left, [lowerRight], 'ArrowRight', true)).toBe(-1);
  expect(nearestTvTarget(right, [lowerLeft], 'ArrowLeft', true)).toBe(-1);
  expect(nearestTvTarget(right, targets, 'ArrowDown', true)).toBe(3);
  expect(nearestTvTarget(lowerLeft, targets, 'ArrowUp', true)).toBe(0);
});
