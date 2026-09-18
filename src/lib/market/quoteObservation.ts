export type QuoteObservation = {
  precision: 'instant' | 'date' | 'unknown';
  marketOpen: boolean | null;
};

/** Observation time is supplied by the source, never the time of our HTTP request. */
export function observationIso(value: unknown): string | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const number = Number(value);
    const date = new Date(number * (number < 1e12 ? 1000 : 1));
    return number > 0 && Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  const text = String(value).trim();
  // A timezone-less wall clock is ambiguous. Date-only observations retain their precision.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) return null;
  const date = new Date(text);
  if (!Number.isFinite(date.getTime())) return null;
  if (text.length === 10 && date.toISOString().slice(0, 10) !== text) return null;
  return date.toISOString();
}

export function twelveDataObservation(body: Record<string, unknown>) {
  const lastQuote = observationIso(body.last_quote_at);
  const timestamp = observationIso(body.timestamp);
  const datetime = typeof body.datetime === 'string' ? body.datetime.trim() : '';
  const daily = /^\d{4}-\d{2}-\d{2}$/.test(datetime);
  // The quote request explicitly asks for UTC, so its intraday datetime is unambiguous.
  const utcDatetime = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(datetime)
    ? `${datetime.replace(' ', 'T')}Z` : datetime;
  const lastUpdated = lastQuote ?? timestamp ?? observationIso(utcDatetime);
  const observation: QuoteObservation = {
    precision: !lastUpdated ? 'unknown' : lastQuote ? 'instant' : daily || !datetime ? 'date' : 'instant',
    marketOpen: typeof body.is_market_open === 'boolean' ? body.is_market_open : null,
  };
  // Exchange-open state does not prove that this account has a realtime entitlement.
  const delayType = observation.marketOpen === false || observation.precision === 'date' ? 'eod' : 'delayed';
  return { lastUpdated, observation, delayType } as const;
}
