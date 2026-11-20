'use client';

import type { CSSProperties } from 'react';
import { tvQuotePrice } from '@/lib/markets-tv/i18n';
import { isTvExternalIndex } from '@/lib/markets-tv/indexChart';
import { obsText, type TvBriefStats } from '@/lib/markets-tv/obsidian';
import { tvQuoteMovement } from '@/lib/markets-tv/quote-presentation';
import { tvSceneQuoteUnit } from '@/lib/markets-tv/scene-display';
import { tvSceneQuoteKey } from '@/lib/markets-tv/scene-quotes';
import type { TvLanguage, TvQuote } from '@/lib/markets-tv/types';
import { TvAssetIcon } from './TvAssetIcon';
import { TvBroadcastPager } from './TvBroadcastPager';
import { TvMarketFlag } from './TvMarketFlag';
import { TvQuoteEvidence } from './TvQuoteEvidence';
import { useTvBroadcastPage } from './useTvBroadcastPage';
import { useTvTableSize } from './useTvTableSize';

export function TvBriefIdentity({ quote, language }: { quote: TvQuote; language: TvLanguage }) {
  const flag = isTvExternalIndex(quote.symbol) && quote.country && /^[a-z]{2}$/i.test(quote.country);
  return <span className="tv-brief-identity">
    {flag ? <span className="tv-brief-flag"><TvMarketFlag region={quote.country!}/></span> : <TvAssetIcon quote={quote}/>}
    <span><strong dir="auto">{language === 'ar' ? quote.nameAr : quote.name}</strong><bdi>{quote.displaySymbol || quote.symbol}</bdi></span>
  </span>;
}

export function TvBriefSample({ stats, language, now, select, mode }: {
  stats: TvBriefStats; language: TvLanguage; now: number; select: (quote: TvQuote) => void;
  mode: 'sample' | 'leaders' | 'saved';
}) {
  const quotes = mode === 'leaders' ? stats.leaders : stats.saved;
  const pageSize = useTvTableSize();
  const pages = Math.ceil(quotes.length / pageSize);
  const { current, move } = useTvBroadcastPage(pages, false);
  const visible = quotes.slice(current * pageSize, (current + 1) * pageSize);
  const title = obsText(language, mode === 'leaders' ? 'jointLeaders' : 'samplePrices');
  return <section className={`tv-brief-sample${mode === 'saved' ? ' tv-brief-saved' : ''}`} aria-label={title} data-paged={pages > 1}>
    {pages > 1 && <header className="tv-brief-sample-header">
      <h2>{title}</h2>
      <TvBroadcastPager page={current} pages={pages} language={language} move={move}/>
    </header>}
    <div className="tv-brief-sample-grid" style={{ '--brief-columns': Math.min(3, visible.length) } as CSSProperties}>
      {visible.map(quote => {
        const key = tvSceneQuoteKey(quote);
        const comparable = stats.comparableKeys.has(key);
        const movement = tvQuoteMovement(quote.changePercent);
        const reason = movement.trend === 'unknown' ? 'changeMissing'
          : quote.changeBasis && quote.changeBasis !== stats.basis ? 'differentPeriod' : 'outsideComparison';
        return <button type="button" key={key} className="tv-brief-sample-quote"
          data-tv-focus-key={`brief-sample:${key}`} onClick={() => select(quote)}>
          <TvBriefIdentity quote={quote} language={language}/>
          <span className="tv-brief-sample-values">
            <span className="tv-brief-sample-price"><bdi>{tvQuotePrice(quote)}</bdi> <small>{tvSceneQuoteUnit(quote, language)}</small></span>
            {comparable ? <bdi className="tv-brief-sample-move" data-trend={movement.trend}>{movement.value}</bdi>
              : mode !== 'saved' && <span className="tv-brief-excluded">{obsText(language, reason)}</span>}
          </span>
          <TvQuoteEvidence quote={quote} language={language} now={now} compact/>
        </button>;
      })}
    </div>
  </section>;
}
