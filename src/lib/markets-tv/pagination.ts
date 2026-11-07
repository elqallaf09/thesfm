/** ResizeObserver can see a hidden or not-yet-styled WebView element. */
export function tvCardColumns(width: number, fontSize: number, cardEm = 15, gap = 0, maximum = 5): number | null {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(fontSize) || fontSize <= 0) return null;
  const spacing = Number.isFinite(gap) && gap >= 0 ? gap : 0;
  const em = Number.isFinite(cardEm) && cardEm > 0 ? cardEm : 15;
  const max = Number.isFinite(maximum) && maximum > 0 ? Math.floor(maximum) : 5;
  return Math.max(1, Math.min(max, Math.floor((width + spacing) / (fontSize * em + spacing))));
}
export function tvPagination(total: number, columns: number, page: number) {
  const count = Number.isFinite(columns) && columns > 0 ? Math.max(1,Math.floor(columns)) : 1;
  const length = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const pages = Math.max(1, Math.ceil(length / count));
  const current = Number.isFinite(page) && page >= 0 ? Math.floor(page) % pages : 0;
  return { count, pages, current };
}
