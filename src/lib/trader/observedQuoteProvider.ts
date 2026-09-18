type Observation = {
  analyticalSource?: string;
  upstreamSource?: string | null;
  price?: number | null;
  lastKnownPrice?: number | null;
  available?: boolean;
  lastUpdated?: string | null;
};

/** Summarize sources that supplied the returned observations, not a legacy preference. */
export function observedQuoteProvider(quotes: Observation[]) {
  if (!quotes.some(quote => quote.analyticalSource === 'THE SFM Market Data Engine')) return null;
  const observations = quotes.filter(quote => (quote.price ?? quote.lastKnownPrice ?? 0) > 0);
  const names = [...new Set(observations.map(quote => quote.upstreamSource).filter(Boolean))];
  const source = names.join(' + ') || 'THE SFM Market Data Engine';
  const times = observations.map(quote => Date.parse(quote.lastUpdated || '')).filter(Number.isFinite);
  return {
    active: source,
    provider: source,
    status: quotes.some(quote => quote.available && (quote.price ?? 0) > 0) ? 'connected' : 'degraded',
    lastUpdated: times.length ? new Date(Math.max(...times)).toISOString() : null,
  };
}
