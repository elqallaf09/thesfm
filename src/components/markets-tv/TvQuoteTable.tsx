'use client';
import { ArrowDownRight, ArrowUpRight, CircleHelp, Minus } from 'lucide-react';
import type { TvLanguage, TvMarket, TvQuote } from '@/lib/markets-tv/types';
import type { TvInstrument } from '@/lib/markets-tv/selections';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvText } from '@/lib/markets-tv/i18n';
import { tvSceneHasPrice, tvSceneQuoteUnit, tvSceneText } from '@/lib/markets-tv/scene-display';
import { tvQuoteMovement, tvTableQuotePrice } from '@/lib/markets-tv/quote-presentation';
import { TvAssetIcon } from './TvAssetIcon';
import { TvQuoteEvidence } from './TvQuoteEvidence';

export function TvQuoteTable({ items, quotes, markets = [], language, now, loading, emptyReason, select }: {
  items: TvInstrument[]; quotes: TvQuote[]; markets?: TvMarket[]; language: TvLanguage; now: number; loading: boolean; emptyReason?: 'error' | 'prices'; select: (quote: TvQuote) => void;
}) {
  const bySymbol = new Map(quotes.map(quote => [quote.symbol, quote]));
  const pricedItems = items.flatMap(item => {
    const quote = bySymbol.get(item.symbol);
    return quote && tvSceneHasPrice(quote) ? [{ item, quote }] : [];
  });
  return <div className="tv-hall-table" role="table" aria-label={hallText(language, 'directory')} aria-busy={loading}>
    <div className="tv-hall-columns" role="row">{(['company', 'price', 'change', 'source'] as const).map(key => <span role="columnheader" key={key}>{hallText(language, key)}</span>)}</div>
    <div className="tv-hall-rows" role="rowgroup">{pricedItems.map(({ item, quote }) => {
      const movement = tvQuoteMovement(quote.changePercent);
      const MovementIcon = movement.trend === 'up' ? ArrowUpRight : movement.trend === 'down' ? ArrowDownRight : movement.trend === 'unknown' ? CircleHelp : Minus;
      const market = markets.find(value => value.id === item.region);
      const marketName = market ? language === 'ar' ? market.labelAr : language === 'fr' ? market.labelFr : market.labelEn : item.region;
      const companyName = language === 'ar' ? item.nameAr || item.name : item.name;
      return <div className="tv-hall-row" role="row" key={item.symbol} data-trend={movement.trend}>
        <div role="cell" className="tv-hall-identity">
          <button type="button" onClick={() => select(quote)} data-tv-focus-key={`hall:${item.symbol}`}>
            <TvAssetIcon quote={quote}/>
            <span className="tv-hall-company-copy">
              <strong dir="auto" title={companyName}>{companyName}</strong>
              <span className="tv-hall-listing"><bdi>{item.displaySymbol || item.symbol}</bdi>{marketName && <small>{marketName}</small>}</span>
            </span>
          </button>
        </div>
        <div role="cell" className="tv-hall-price" dir="ltr"><strong>{tvTableQuotePrice(quote)}</strong><small>{tvSceneQuoteUnit(quote, language)}</small></div>
        <div role="cell" className="tv-hall-change" data-trend={movement.trend}>
          <span className="tv-hall-change-badge" dir="ltr"><MovementIcon aria-hidden="true"/><bdi>{movement.value}</bdi></span>
          <span className="tv-hall-change-label" dir={language === 'ar' ? 'rtl' : 'ltr'}>{hallText(language, movement.label)}</span>
        </div>
        <div role="cell" className="tv-hall-evidence"><TvQuoteEvidence quote={quote} language={language} now={now}/></div>
      </div>;
    })}</div>
    {!pricedItems.length && <p className="tv-hall-empty" role="status">{loading ? tvText(language, 'loading') : emptyReason === 'error' ? tvText(language, 'error') : emptyReason === 'prices' ? tvSceneText(language, 'noScenePrices') : items.length ? hallText(language, 'pricesUnavailable') : hallText(language, 'noResults')}</p>}
  </div>;
}
