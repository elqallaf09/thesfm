'use client';
import type { TvLanguage, TvMarket, TvQuote } from '@/lib/markets-tv/types';
import type { TvInstrument } from '@/lib/markets-tv/selections';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvQuotePrice, tvText } from '@/lib/markets-tv/i18n';
import { tvSceneChange, tvSceneHasPrice, tvSceneQuoteUnit } from '@/lib/markets-tv/scene-display';
import { TvQuoteEvidence } from './TvQuoteEvidence';

export function TvQuoteTable({ items, quotes, markets = [], language, now, loading, select }: {
  items: TvInstrument[]; quotes: TvQuote[]; markets?: TvMarket[]; language: TvLanguage; now: number; loading: boolean; select: (quote: TvQuote) => void;
}) {
  const bySymbol = new Map(quotes.map(quote => [quote.symbol, quote]));
  const pricedItems = items.filter(item => { const quote = bySymbol.get(item.symbol); return quote && tvSceneHasPrice(quote); });
  return <div className="tv-hall-table" role="table" aria-label={hallText(language, 'directory')} aria-busy={loading}>
    <div className="tv-hall-columns" role="row">{(['company', 'price', 'change', 'source'] as const).map(key => <span role="columnheader" key={key}>{hallText(language, key)}</span>)}</div>
    <div className="tv-hall-rows" role="rowgroup">{pricedItems.map(item => {
      const quote = bySymbol.get(item.symbol), priced = Boolean(quote && tvSceneHasPrice(quote));
      const change = priced ? quote?.changePercent : null;
      const market = markets.find(value => value.id === item.region);
      const marketName = market ? language === 'ar' ? market.labelAr : language === 'fr' ? market.labelFr : market.labelEn : item.region;
      return <div className="tv-hall-row" role="row" key={item.symbol}>
        <div role="cell" className="tv-hall-identity"><button disabled={!quote} onClick={() => quote && select(quote)} data-tv-focus-key={`hall:${item.symbol}`}><strong dir="auto">{language === 'ar' ? item.nameAr || item.name : item.name}</strong><span className="tv-hall-listing"><bdi>{item.displaySymbol || item.symbol}</bdi>{marketName && <small>{marketName}</small>}</span></button></div>
        <div role="cell" className="tv-hall-price" dir="ltr"><strong>{priced && quote ? tvQuotePrice(quote) : '—'}</strong><small>{quote ? tvSceneQuoteUnit(quote, language) : item.currency || ''}</small></div>
        <div role="cell" className="tv-hall-change" data-trend={change == null || change === 0 ? 'flat' : change > 0 ? 'up' : 'down'} dir="ltr">{priced && quote ? tvSceneChange(quote) : '—'}</div>
        <div role="cell">{quote ? <TvQuoteEvidence quote={quote} language={language} now={now}/> : <small className="tv-hall-muted">{loading ? tvText(language, 'loading') : hallText(language, 'unavailable')}</small>}</div>
      </div>;
    })}</div>
    {!pricedItems.length && <p className="tv-hall-empty" role="status">{loading ? tvText(language, 'loading') : items.length ? tvText(language, 'waitingPrices') : hallText(language, 'noResults')}</p>}
  </div>;
}
