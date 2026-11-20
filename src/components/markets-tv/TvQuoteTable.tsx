'use client';
import type { TvLanguage, TvMarket, TvQuote } from '@/lib/markets-tv/types';
import type { TvInstrument } from '@/lib/markets-tv/selections';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvQuotePrice, tvText } from '@/lib/markets-tv/i18n';
import { tvSceneChange, tvSceneHasPrice, tvSceneQuoteUnit, tvSceneText } from '@/lib/markets-tv/scene-display';
import { TvQuoteEvidence } from './TvQuoteEvidence';

export function TvQuoteTable({ items, quotes, markets = [], language, now, loading, emptyReason, showUnavailable = false, select }: {
  items: TvInstrument[]; quotes: TvQuote[]; markets?: TvMarket[]; language: TvLanguage; now: number; loading: boolean; emptyReason?: 'error' | 'prices'; showUnavailable?: boolean; select: (quote: TvQuote) => void;
}) {
  const byListing = new Map(quotes.filter(quote => quote.listingKey).map(quote => [quote.listingKey, quote]));
  const bySymbol = new Map<string, TvQuote | undefined>();
  for (const quote of quotes) bySymbol.set(quote.symbol, bySymbol.has(quote.symbol) ? undefined : quote);
  const itemCounts = new Map<string, number>();
  for (const item of items) itemCounts.set(item.symbol, (itemCounts.get(item.symbol) || 0) + 1);
  const itemQuote = (item: TvInstrument) => {
    if (item.listingKey && byListing.has(item.listingKey)) return byListing.get(item.listingKey);
    // Older API responses can supply bare symbols. Never attach one ambiguous
    // price to two venues, or replace an explicitly different listing.
    const quote = itemCounts.get(item.symbol) === 1 ? bySymbol.get(item.symbol) : undefined;
    if (!quote || item.listingKey && quote.listingKey || item.region && quote.exchange && item.region !== quote.exchange) return undefined;
    return quote;
  };
  const visibleItems = showUnavailable ? items : items.filter(item => { const quote = itemQuote(item); return quote && tvSceneHasPrice(quote); });
  return <div className="tv-hall-table" role="table" aria-label={hallText(language, 'directory')} aria-busy={loading}>
    <div className="tv-hall-columns" role="row">{(['company', 'price', 'change', 'source'] as const).map(key => <span role="columnheader" key={key}>{hallText(language, key)}</span>)}</div>
    <div className="tv-hall-rows" role="rowgroup">{visibleItems.map(item => {
      const quote = itemQuote(item), priced = Boolean(quote && tvSceneHasPrice(quote));
      const key = item.listingKey || (item.region ? `${item.region}:${item.symbol}` : item.symbol);
      const change = priced ? quote?.changePercent : null;
      const market = markets.find(value => value.id === item.region);
      const marketName = market ? language === 'ar' ? market.labelAr : language === 'fr' ? market.labelFr : market.labelEn : item.region;
      return <div className="tv-hall-row" role="row" key={key}>
        <div role="cell" className="tv-hall-identity"><button disabled={!quote} onClick={() => quote && select(quote)} data-tv-focus-key={`hall:${key}`}><strong dir="auto">{language === 'ar' ? item.nameAr || item.name : item.name}</strong><span className="tv-hall-listing"><bdi>{item.displaySymbol || item.symbol}</bdi>{marketName && <small>{marketName}</small>}</span></button></div>
        <div role="cell" className="tv-hall-price" dir="ltr"><strong>{priced && quote ? tvQuotePrice(quote) : '—'}</strong><small>{quote ? tvSceneQuoteUnit(quote, language) : item.currency || ''}</small></div>
        <div role="cell" className="tv-hall-change" data-trend={change == null || change === 0 ? 'flat' : change > 0 ? 'up' : 'down'} dir="ltr">{priced && quote ? tvSceneChange(quote) : '—'}</div>
        <div role="cell">{quote ? <TvQuoteEvidence quote={quote} language={language} now={now}/> : <small className="tv-hall-muted">{loading ? tvText(language, 'loading') : hallText(language, 'unavailable')}</small>}</div>
      </div>;
    })}</div>
    {!visibleItems.length && <p className="tv-hall-empty" role="status">{loading ? tvText(language, 'loading') : emptyReason === 'error' ? tvText(language, 'error') : emptyReason === 'prices' ? tvSceneText(language, 'noScenePrices') : items.length ? hallText(language, 'pricesUnavailable') : hallText(language, 'noResults')}</p>}
  </div>;
}
