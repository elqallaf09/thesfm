'use client';
import type { TvLanguage, TvQuote } from '@/lib/markets-tv/types';
import type { TvInstrument } from '@/lib/markets-tv/selections';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvQuotePrice, tvText } from '@/lib/markets-tv/i18n';
import { tvSceneChange, tvSceneHasPrice, tvSceneQuoteUnit } from '@/lib/markets-tv/scene-display';
import { TvQuoteEvidence } from './TvQuoteEvidence';

export function TvQuoteTable({ items, quotes, language, now, loading, select }: {
  items: TvInstrument[]; quotes: TvQuote[]; language: TvLanguage; now: number; loading: boolean; select: (quote: TvQuote) => void;
}) {
  const bySymbol = new Map(quotes.map(quote => [quote.symbol, quote]));
  return <div className="tv-hall-table" role="table" aria-label={hallText(language, 'directory')} aria-busy={loading}>
    <div className="tv-hall-columns" role="row">{(['company', 'price', 'change', 'source'] as const).map(key => <span role="columnheader" key={key}>{hallText(language, key)}</span>)}</div>
    <div className="tv-hall-rows" role="rowgroup">{items.map(item => {
      const quote = bySymbol.get(item.symbol), priced = Boolean(quote && tvSceneHasPrice(quote));
      const change = priced ? quote?.changePercent : null;
      return <div className="tv-hall-row" role="row" key={item.symbol}>
        <div role="cell" className="tv-hall-identity"><button disabled={!quote} onClick={() => quote && select(quote)} data-tv-focus-key={`hall:${item.symbol}`}><strong>{language === 'ar' ? item.nameAr || item.name : item.name}</strong><bdi>{item.displaySymbol || item.symbol}</bdi></button></div>
        <div role="cell" className="tv-hall-price" dir="ltr"><strong>{priced && quote ? tvQuotePrice(quote) : '—'}</strong><small>{quote ? tvSceneQuoteUnit(quote, language) : item.currency || ''}</small></div>
        <div role="cell" className="tv-hall-change" data-trend={change == null || change === 0 ? 'flat' : change > 0 ? 'up' : 'down'} dir="ltr">{priced && quote ? tvSceneChange(quote) : '—'}</div>
        <div role="cell">{quote ? <TvQuoteEvidence quote={quote} language={language} now={now}/> : <small className="tv-hall-muted">{loading ? tvText(language, 'loading') : hallText(language, 'unavailable')}</small>}</div>
      </div>;
    })}</div>
    {!items.length && <p className="tv-hall-empty" role="status">{loading ? tvText(language, 'loading') : hallText(language, 'noResults')}</p>}
  </div>;
}
