export const GLOBAL_MARKETS_EXPLORER_PAGE_SIZE = 12;
export const GLOBAL_MARKETS_EXPLORER_MOBILE_PAGE_SIZE = 6;

export function nextExplorerVisibleCount(current: number, total: number, mobile: boolean) {
  return Math.min(
    total,
    current + (mobile ? GLOBAL_MARKETS_EXPLORER_MOBILE_PAGE_SIZE : GLOBAL_MARKETS_EXPLORER_PAGE_SIZE),
  );
}
