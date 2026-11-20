/** Keep a news page readable regardless of how many articles the feed returns. */
export function tvNewsLayout(width: number, height: number, fontSize: number) {
  if (![width, height, fontSize].every(value => Number.isFinite(value) && value > 0)) return null;
  const gap = fontSize * .65;
  const columns = Math.max(1, Math.min(3, Math.floor((width + gap) / (Math.max(400, fontSize * 20) + gap))));
  const rows = Math.max(1, Math.min(2, Math.floor((height + gap) / (Math.max(174, fontSize * 10.25) + gap))));
  return { columns, rows, count: columns * rows };
}
