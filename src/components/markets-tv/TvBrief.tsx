'use client';

import { Activity, ArrowDownRight, ArrowUpRight, ChartColumnIncreasing, Clock3, Layers3, Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { tvQuotePrice, tvQuoteTime, tvText } from '@/lib/markets-tv/i18n';
import { isTvExternalIndex } from '@/lib/markets-tv/indexChart';
import { briefMetrics, obsText } from '@/lib/markets-tv/obsidian';
import { tvSceneChange, tvSceneQuoteUnit, tvSceneText } from '@/lib/markets-tv/scene-display';
import { tvSceneQuoteKey } from '@/lib/markets-tv/scene-quotes';
import type { TvLanguage, TvQuote, TvSnapshot } from '@/lib/markets-tv/types';
import { TvAssetIcon } from './TvAssetIcon';
import { TvMarketFlag } from './TvMarketFlag';
import { TvQuoteEvidence } from './TvQuoteEvidence';
import './market-brief.css';

type BriefStats = ReturnType<typeof briefMetrics>;
type QuoteProps = { language: TvLanguage; now: number; select: (quote: TvQuote) => void };
type BriefProps = QuoteProps & {
  snapshot: TvSnapshot | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
};

function BriefMetrics({ stats, language }: { stats: BriefStats; language: TvLanguage }) {
  const o = (key: Parameters<typeof obsText>[1]) => obsText(language, key);
  const average = stats.average === null ? null : Number(stats.average.toFixed(2));
  const unchanged = stats.comparable - stats.rising - stats.falling;
  return <div className="tv-brief-metrics">
    <article>
      <header><ChartColumnIncreasing aria-hidden="true"/><span>{o('average')}</span></header>
      <strong dir="ltr" data-trend={average === null || average === 0 ? undefined : average > 0 ? 'up' : 'down'}>
        {average === null ? '—' : `${average > 0 ? '+' : ''}${average.toFixed(2)}%`}
      </strong>
      <small>{stats.basis === '24h' ? tvSceneText(language, 'day') : tvText(language, 'regularSessions')}</small>
    </article>
    <article>
      <header><Activity aria-hidden="true"/><span>{o('breadth')}</span></header>
      {stats.comparable ? <div className="tv-brief-breadth">
        <span data-trend="up"><ArrowUpRight aria-hidden="true"/><bdi>{stats.rising}</bdi><small>{o('rising')}</small></span>
        <span data-trend="down"><ArrowDownRight aria-hidden="true"/><bdi>{stats.falling}</bdi><small>{o('falling')}</small></span>
      </div> : <strong>—</strong>}
      <small><bdi>{stats.comparable}</bdi> {o('comparable')}{unchanged > 0 && <> · <bdi>{unchanged}</bdi> {tvText(language, 'unchanged')}</>}</small>
    </article>
    <article>
      <header><Layers3 aria-hidden="true"/><span>{o('available')}</span></header>
      <strong dir="ltr">{stats.available}<em> / {stats.total}</em></strong>
      <progress aria-hidden="true" value={stats.available} max={stats.total}/>
    </article>
    <article>
      <header><Clock3 aria-hidden="true"/><span>{o('health')}</span></header>
      <strong dir="ltr">{stats.recent}<em> / {stats.total}</em></strong>
      <small>{o(stats.recent === stats.total ? 'current' : 'partial')}</small>
    </article>
  </div>;
}

function BriefIcon({ quote }: { quote: TvQuote }) {
  if (isTvExternalIndex(quote.symbol) && quote.country && /^[a-z]{2}$/i.test(quote.country)) {
    return <span className="tv-brief-flag"><TvMarketFlag region={quote.country}/></span>;
  }
  return <TvAssetIcon quote={quote}/>;
}

function BriefRankings({ stats, language, now, select }: QuoteProps & { stats: BriefStats }) {
  const groups = (['gainers', 'losers'] as const).filter(kind => stats[kind].length > 0);
  const highestChange = Math.max(stats.gainers[0]?.changePercent ?? 0, Math.abs(stats.losers[0]?.changePercent ?? 0));
  if (!groups.length) return <div className="tv-brief-rankings">
    <p className="tv-ranking-empty"><Minus aria-hidden="true"/>{obsText(language, stats.comparable ? 'noMoves' : 'noComparable')}</p>
  </div>;

  return <div className="tv-brief-rankings" data-single={groups.length === 1}>
    {groups.map(kind => {
      const up = kind === 'gainers';
      const Trend = up ? TrendingUp : TrendingDown;
      return <section key={kind} className="tv-brief-group" aria-labelledby={`brief-${kind}`}>
        <header className="tv-brief-group-header">
          <h2 id={`brief-${kind}`}><span className="tv-brief-trend-icon" data-trend={up ? 'up' : 'down'}><Trend aria-hidden="true"/></span>{tvText(language, kind)}</h2>
          {groups.length === 1 && <p className="tv-ranking-empty"><Minus aria-hidden="true"/>{obsText(language, up ? 'noLosers' : 'noGainers')}</p>}
        </header>
        <div className="tv-brief-cards">
          {stats[kind].slice(0, 3).map(quote => <button type="button" key={tvSceneQuoteKey(quote)} className="tv-ranked-quote"
            data-tv-focus-key={`brief:${tvSceneQuoteKey(quote)}`} onClick={() => select(quote)}>
            <span className="tv-brief-identity">
              <BriefIcon quote={quote}/>
              <span><strong>{language === 'ar' ? quote.nameAr : quote.name}</strong><bdi>{quote.displaySymbol || quote.symbol}</bdi></span>
            </span>
            <strong className="tv-brief-change" data-trend={up ? 'up' : 'down'} dir="ltr">{tvSceneChange(quote)}</strong>
            <span className="tv-ranking-bar" aria-hidden="true" data-trend={up ? 'up' : 'down'}>
              <i style={{ width: `${Math.abs(quote.changePercent!) / highestChange * 100}%` }}/>
            </span>
            <span className="tv-brief-trade"><span>{tvSceneText(language, 'price')}</span><span><bdi>{tvQuotePrice(quote)}</bdi> <small>{tvSceneQuoteUnit(quote, language)}</small></span></span>
            <TvQuoteEvidence quote={quote} language={language} now={now} compact/>
          </button>)}
        </div>
      </section>;
    })}
  </div>;
}

export function TvBrief({ snapshot, language, now, select, loading = false, error, onRefresh }: BriefProps) {
  const stats = briefMetrics([...(snapshot?.summary ?? []), ...(snapshot?.quotes ?? [])], now);
  const o = (key: Parameters<typeof obsText>[1]) => obsText(language, key);
  const savedOnly = !stats.comparable && stats.available > 0;
  const empty = !snapshot || stats.total === 0;
  const headline = empty ? (loading ? 'loadingBrief' : error ? 'unavailableBrief' : 'emptyBrief')
    : savedOnly ? 'savedBrief' : stats.headline;
  const generatedAt = snapshot?.generatedAt;
  return <section className="tv-brief-dashboard" aria-busy={loading}>
    <div className="tv-brief-overview" data-empty={empty}>
      <header className="tv-brief-cover">
        <div className="tv-brief-cover-copy" role={empty ? (error ? 'alert' : 'status') : undefined}>
          <p className="tv-brief-kicker">{tvText(language, 'brief')}</p>
          <h1>{o(headline)}</h1>
          {!empty && <p className="tv-brief-scope">{o('scope')}</p>}
        </div>
        <div className="tv-brief-cover-footer">
          {onRefresh && (!loading || !empty) && <button type="button" onClick={onRefresh} data-tv-focus-key="brief-refresh">
            <RefreshCw aria-hidden="true"/>{tvText(language, error || empty ? 'retry' : 'refresh')}
          </button>}
          {generatedAt && Number.isFinite(Date.parse(generatedAt)) && <span className="tv-brief-asof">{o('briefAsOf')} <time dateTime={generatedAt}><bdi>{tvQuoteTime(generatedAt, language, now)}</bdi></time></span>}
        </div>
      </header>
      {!empty && <BriefMetrics stats={stats} language={language}/>}
    </div>
    {!empty && (savedOnly ? <section className="tv-brief-saved">
      <p>{o('savedBriefNote')}</p>
      <div>{stats.saved.map(quote => <button type="button" key={tvSceneQuoteKey(quote)} data-tv-focus-key={`brief:${tvSceneQuoteKey(quote)}`} onClick={() => select(quote)}>
        <span className="tv-brief-saved-name"><BriefIcon quote={quote}/><strong>{language === 'ar' ? quote.nameAr : quote.name}</strong></span>
        <span className="tv-brief-saved-price"><bdi>{tvQuotePrice(quote)}</bdi> <small>{tvSceneQuoteUnit(quote, language)}</small></span>
        <TvQuoteEvidence quote={quote} language={language} now={now} compact/>
      </button>)}</div>
    </section> : <BriefRankings stats={stats} language={language} now={now} select={select}/>)}
  </section>;
}
