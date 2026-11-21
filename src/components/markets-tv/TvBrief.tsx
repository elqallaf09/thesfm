'use client';

import { useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpDown, ArrowUpRight, ChartColumnIncreasing, Clock3, Layers3, List, Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { tvQuotePrice, tvQuoteTime, tvText } from '@/lib/markets-tv/i18n';
import { briefMetrics, briefSummary, obsText, type TvBriefStats } from '@/lib/markets-tv/obsidian';
import { tvQuoteMovement } from '@/lib/markets-tv/quote-presentation';
import { tvSceneQuoteUnit, tvSceneText } from '@/lib/markets-tv/scene-display';
import { tvSceneQuoteKey } from '@/lib/markets-tv/scene-quotes';
import type { TvLanguage, TvQuote, TvSnapshot } from '@/lib/markets-tv/types';
import { TvBriefIdentity, TvBriefSample } from './TvBriefSample';
import { TvQuoteEvidence } from './TvQuoteEvidence';
import './market-brief.css';

type BriefView = 'highlights' | 'sample' | 'leaders';
type QuoteProps = { language: TvLanguage; now: number; select: (quote: TvQuote) => void };
type BriefProps = QuoteProps & {
  snapshot: TvSnapshot | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
};

function BriefMetrics({ stats, language }: { stats: TvBriefStats; language: TvLanguage }) {
  const o = (key: Parameters<typeof obsText>[1]) => obsText(language, key);
  const average = stats.average === null ? null : Number(stats.average.toFixed(2));
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
      {stats.comparable ? <>
        <div className="tv-brief-distribution" aria-hidden="true">
          {stats.rising > 0 && <i data-trend="up" style={{ flexGrow: stats.rising }}/>}
          {stats.unchanged > 0 && <i data-trend="flat" style={{ flexGrow: stats.unchanged }}/>}
          {stats.falling > 0 && <i data-trend="down" style={{ flexGrow: stats.falling }}/>}
        </div>
        <div className="tv-brief-breadth">
        <span data-trend="up"><ArrowUpRight aria-hidden="true"/><bdi>{stats.rising}</bdi><small>{o('rising')}</small></span>
        <span data-trend="down"><ArrowDownRight aria-hidden="true"/><bdi>{stats.falling}</bdi><small>{o('falling')}</small></span>
      </div></> : <strong>—</strong>}
      <small><bdi>{stats.comparable}</bdi> {o('comparable')}{stats.unchanged > 0 && <> · <bdi>{stats.unchanged}</bdi> {tvText(language, 'unchanged')}</>}</small>
    </article>
    <article>
      <header><Layers3 aria-hidden="true"/><span>{o('available')}</span></header>
      <strong dir="ltr">{stats.available}<em> / {stats.total}</em></strong>
      <progress aria-hidden="true" value={stats.available} max={stats.total}/>
    </article>
    <article>
      <header><Clock3 aria-hidden="true"/><span>{o('health')}</span></header>
      <strong dir="ltr">{stats.recent}<em> / {stats.total}</em></strong>
      <small>{o(!stats.recent ? 'noneRecent' : stats.recent === stats.total ? 'current' : 'partial')}</small>
    </article>
  </div>;
}

function BriefToolbar({ stats, language, view, changeView, select }: {
  stats: TvBriefStats; language: TvLanguage; view: BriefView; changeView: (view: BriefView) => void; select: QuoteProps['select'];
}) {
  const leader = stats.leaders[0];
  const tied = stats.leaders.length > 1;
  const movement = tvQuoteMovement(leader?.changePercent);
  const Icon = tied ? ArrowUpDown : movement.trend === 'up' ? ArrowUpRight : ArrowDownRight;
  return <div className="tv-brief-toolbar">
    <div className="tv-brief-switch" role="group" aria-label={tvSceneText(language, 'displayMode')}>
      <button type="button" aria-pressed={view === 'highlights'} aria-controls="tv-brief-results" data-tv-focus-key="brief-highlights"
        onClick={() => changeView('highlights')}><Activity aria-hidden="true"/>{obsText(language, 'highlights')}</button>
      <button type="button" aria-pressed={view === 'sample'} aria-controls="tv-brief-results" data-tv-focus-key="brief-sample"
        onClick={() => changeView('sample')}><List aria-hidden="true"/>{obsText(language, 'samplePrices')} <bdi>{stats.available}</bdi></button>
    </div>
    {leader && <button type="button" className="tv-brief-leader" data-tv-focus-key="brief-biggest"
      aria-pressed={tied ? view === 'leaders' : undefined} aria-controls={tied ? 'tv-brief-results' : undefined}
      onClick={() => tied ? changeView('leaders') : select(leader)}>
      <span>{obsText(language, tied ? 'jointLeaders' : 'largestMove')}</span>
      {tied ? <strong>{obsText(language, 'instrumentCount')} <bdi>{stats.leaders.length}</bdi></strong>
        : <strong dir="auto">{language === 'ar' ? leader.nameAr : leader.name}</strong>}
      <bdi data-trend={tied ? undefined : movement.trend}><Icon aria-hidden="true"/>{tied ? tvQuoteMovement(stats.magnitude).value.slice(1) : movement.value}</bdi>
    </button>}
  </div>;
}

function BriefRankings({ stats, language, now, select }: QuoteProps & { stats: TvBriefStats }) {
  const groups = (['gainers', 'losers'] as const).filter(kind => stats[kind].length > 0);
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
            <TvBriefIdentity quote={quote} language={language}/>
            <strong className="tv-brief-change" data-trend={up ? 'up' : 'down'} dir="ltr">{tvQuoteMovement(quote.changePercent).value}</strong>
            <span className="tv-ranking-bar" aria-hidden="true" data-trend={up ? 'up' : 'down'}>
              <i style={{ width: `${Math.abs(quote.changePercent!) / stats.magnitude * 100}%` }}/>
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
  const [requestedView, setView] = useState<BriefView | null>(null);
  const benchmarks = snapshot?.market === 'brief' ? snapshot.quotes : undefined;
  const stats = briefMetrics([...(snapshot?.summary ?? []), ...(snapshot?.quotes ?? [])], now);
  const view = requestedView === 'leaders' && stats.leaders.length < 2 ? 'sample' : requestedView ?? (benchmarks ? 'sample' : 'highlights');
  const o = (key: Parameters<typeof obsText>[1]) => obsText(language, key);
  const pricesOnly = !stats.comparable && stats.available > 0;
  const savedOnly = pricesOnly && !stats.recent;
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
          {!empty && <p className="tv-brief-scope">{pricesOnly ? o(savedOnly ? 'savedBriefNote' : 'pricesOnlyNote') : briefSummary(stats, language)}</p>}
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
    {stats.comparable > 0 && <BriefToolbar stats={stats} language={language} view={view} changeView={setView} select={select}/>}
    {!empty && <div id="tv-brief-results">
      {(stats.available > 0 || benchmarks) && (pricesOnly || view !== 'highlights' || !stats.available)
        ? <TvBriefSample key={savedOnly ? 'saved' : view} mode={savedOnly ? 'saved' : view === 'leaders' ? 'leaders' : 'sample'}
            benchmarks={benchmarks} stats={stats} language={language} now={now} select={select}/>
        : <BriefRankings stats={stats} language={language} now={now} select={select}/>}
    </div>}
  </section>;
}
