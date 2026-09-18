import 'server-only';
import { createServerSupabaseAdmin } from './adminAccess';
import { aggregateRegionalQuoteHealth, type MarketHealthReport, type MarketHealthRow } from '@/lib/market/sourceHealth';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';

export async function recordRegionalQuoteHealth(prices: TechStockPrice[]) {
  const counts = aggregateRegionalQuoteHealth(prices);
  if (!counts.length) return;
  const admin = createServerSupabaseAdmin();
  if (!admin) return;
  try {
    const result = await admin.rpc('record_market_source_health', { p_checks: counts }).abortSignal(AbortSignal.timeout(1200));
    if (result.error) console.warn('[market-source-health] aggregate_write_unavailable');
  } catch {
    // Monitoring may fail independently; never withhold a valid reference quote.
    console.warn('[market-source-health] aggregate_write_unavailable');
  }
}

export async function loadRegionalQuoteHealth(admin: NonNullable<ReturnType<typeof createServerSupabaseAdmin>>): Promise<MarketHealthReport> {
  try {
    const since = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
    const { data, error } = await admin.from('market_source_health_daily')
      .select('day,mic,provider,outcome,checks,updated_at').gte('day', since).order('day', { ascending: false })
      .limit(512).abortSignal(AbortSignal.timeout(2500));
    return error ? { available: false, rows: [] } : { available: true, rows: (data ?? []) as MarketHealthRow[] };
  } catch { return { available: false, rows: [] }; }
}
