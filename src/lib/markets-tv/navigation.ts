export type FocusRect = { left: number; top: number; width: number; height: number };
export function nearestTvTarget(origin: FocusRect, targets: FocusRect[], direction: string): number {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(direction)) return -1;
  const ox = origin.left + origin.width / 2, oy = origin.top + origin.height / 2;
  let best = -1, score = Infinity, alignedBest = false;
  targets.forEach((rect, index) => {
    const dx = rect.left + rect.width / 2 - ox, dy = rect.top + rect.height / 2 - oy;
    const horizontal = direction === 'ArrowLeft' || direction === 'ArrowRight';
    const forward = direction === 'ArrowLeft' ? -dx : direction === 'ArrowRight' ? dx : direction === 'ArrowUp' ? -dy : dy;
    if (forward <= 1) return;
    const cross = horizontal ? Math.abs(dy) : Math.abs(dx);
    const overlap = horizontal ? Math.min(origin.top + origin.height, rect.top + rect.height) - Math.max(origin.top, rect.top)
      : Math.min(origin.left + origin.width, rect.left + rect.width) - Math.max(origin.left, rect.left);
    const aligned = overlap > 1;
    const next = forward + cross * 3;
    if (aligned && !alignedBest || aligned === alignedBest && next < score) { best = index; score = next; alignedBest = aligned; }
  });
  return best;
}
