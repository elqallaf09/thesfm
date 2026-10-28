import 'server-only';
let cached: { open: boolean | null; until: number } | null = null;
let pending: Promise<boolean | null> | null = null;

/** Read the exchange's source-reported state; never infer holidays from a clock. */
export function finnhubUsMarketOpen(): Promise<boolean | null> {
  const key = process.env.FINNHUB_API_KEY?.trim();
  if (!key) return Promise.resolve(null);
  if (cached && cached.until > Date.now()) return Promise.resolve(cached.open);
  if (pending) return pending;
  pending = (async () => {
    let open: boolean | null = null, ttl = 30_000;
    try {
      const params = new URLSearchParams({ exchange: 'US', token: key });
      const response = await fetch(`https://finnhub.io/api/v1/stock/market-status?${params}`, { next: { revalidate: 30 }, signal: AbortSignal.timeout(1500) });
      if ([401, 403, 429].includes(response.status)) ttl = 300_000;
      const row = await response.json().catch(() => null) as Record<string, unknown> | null;
      const timestamp = typeof row?.t === 'number' ? row.t * 1000 : NaN;
      if (response.ok && row?.exchange === 'US' && typeof row.isOpen === 'boolean'
        && Number.isFinite(timestamp) && timestamp <= Date.now() + 60_000 && Date.now() - timestamp <= 120_000) open = row.isOpen;
    } catch { /* Missing market-state access cannot manufacture a closing quote. */ }
    cached = { open, until: Date.now() + ttl }; return open;
  })().finally(() => { pending = null; });
  return pending;
}
