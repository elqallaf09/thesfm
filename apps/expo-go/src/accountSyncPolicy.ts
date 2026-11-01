export const ACCOUNT_SYNC_INTERVAL_MS = 30_000;

export function resumedToForeground(previous: string, next: string) {
  return previous !== 'active' && next === 'active';
}
