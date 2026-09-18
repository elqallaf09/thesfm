import type { MarketDataProviderName, NormalizedMarketQuote } from '@/lib/market/marketDataProviders';
import type { SfmMarketQuality, SfmMarketSourceClass } from '@/lib/sfm-market/types';

const QUOTE_FIELDS: Array<keyof Pick<NormalizedMarketQuote,
  'price' | 'currency' | 'change' | 'changePercent' | 'open' | 'high' | 'low' | 'previousClose' | 'volume' | 'lastUpdated'
>> = [
  'price',
  'currency',
  'change',
  'changePercent',
  'open',
  'high',
  'low',
  'previousClose',
  'volume',
  'lastUpdated',
];

function isPresent(value: unknown) {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'number') return Number.isFinite(value);
  return true;
}

function freshnessLimitSeconds(delayType: NormalizedMarketQuote['delayType']) {
  if (delayType === 'realtime') return 15 * 60;
  if (delayType === 'delayed') return 45 * 60;
  if (delayType === 'eod') return 48 * 60 * 60;
  if (delayType === 'cached') return 6 * 60 * 60;
  return 60 * 60;
}

export function marketSourceClassForProvider(provider: MarketDataProviderName | string | null | undefined): SfmMarketSourceClass {
  // v1 still consumes the repository's existing upstream provider layer. Do not
  // misrepresent an aggregator as an exchange/regulator source. Direct exchange,
  // regulator and issuer adapters can be registered here as they are added.
  if (!provider) return 'aggregator';
  return 'aggregator';
}

export function quoteFreshnessSeconds(observedAt: string | null | undefined, now = new Date()) {
  if (!observedAt) return null;
  const observed = new Date(observedAt);
  if (Number.isNaN(observed.getTime())) return null;
  return Math.max(0, Math.round((now.getTime() - observed.getTime()) / 1000));
}

export function assessSfmQuoteQuality(quote: NormalizedMarketQuote | null, now = new Date()): SfmMarketQuality {
  if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) {
    return {
      state: 'unavailable',
      score: 0,
      completenessPercent: 0,
      freshnessSeconds: null,
      missingFields: QUOTE_FIELDS.map(String),
      reasons: ['No valid market price is available.'],
    };
  }

  const missingFields = QUOTE_FIELDS.filter(field => !isPresent(quote[field])).map(String);
  const completenessPercent = Math.round(((QUOTE_FIELDS.length - missingFields.length) / QUOTE_FIELDS.length) * 100);
  const freshnessSeconds = quoteFreshnessSeconds(quote.lastUpdated, now);
  const future = Boolean(quote.lastUpdated && Date.parse(quote.lastUpdated) > now.getTime() + 60_000);
  const stale = future || freshnessSeconds === null || freshnessSeconds > freshnessLimitSeconds(quote.delayType);
  const reasons: string[] = [];

  if (missingFields.length) reasons.push(`Missing fields: ${missingFields.join(', ')}.`);
  if (stale) reasons.push('The upstream observation is stale or has no trustworthy observation time.');
  if (future) reasons.push('The observation timestamp is in the future.');
  if (quote.cached) reasons.push('The value was served from an upstream/fallback cache.');

  let state: SfmMarketQuality['state'];
  if (stale) state = 'stale';
  else if (completenessPercent >= 90) state = 'complete';
  else if (completenessPercent >= 70) state = 'usable';
  else state = 'partial';

  const freshnessPenalty = stale ? 35 : 0;
  const cachePenalty = quote.cached ? 10 : 0;
  const score = Math.max(0, Math.min(100, completenessPercent - freshnessPenalty - cachePenalty));

  return {
    state,
    score,
    completenessPercent,
    freshnessSeconds,
    missingFields,
    reasons,
  };
}
