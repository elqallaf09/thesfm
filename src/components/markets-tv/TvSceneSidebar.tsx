import type { TvLanguage, TvNews, TvQuote, TvSnapshot } from '@/lib/markets-tv/types';
import { tvQuoteTime, tvText } from '@/lib/markets-tv/i18n';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import { tvSceneChange, tvSceneHasPrice, tvSceneIssue, tvSceneText } from '@/lib/markets-tv/scene-display';
import { TvDataNotice } from './TvDataNotice';

export function TvHeadlines({ news, language, now, onStory }: { news: TvNews[]; language: TvLanguage; now: number; onStory: (story: TvNews) => void }) {
  return <section className="tv-scene-headlines" aria-labelledby="tv-scene-news-title"><h2 id="tv-scene-news-title">{tvText(language, 'news')}</h2>
    {news.length ? news.slice(0, 3).map(story => <button key={story.id} onClick={() => onStory(story)} data-tv-focus-key={`story:${story.id}`}><span>{story.title}</span>
      <small className="tv-news-evidence"><bdi>{story.source}</bdi><time dir="ltr" dateTime={story.publishedAt}>{tvQuoteTime(story.publishedAt, language, now)}</time></small></button>) : <p>{tvText(language, 'noNews')}</p>}
  </section>;
}

export function TvSceneSidebar({ quotes, news, language, now, snapshot, loading, onStory, onQuote, onRefresh }: {
  quotes: TvQuote[]; news: TvNews[]; language: TvLanguage; now: number; snapshot: TvSnapshot | null; loading: boolean;
  onStory: (story: TvNews) => void; onQuote: (quote: TvQuote) => void; onRefresh: () => void;
}) {
  const s = (key: Parameters<typeof tvSceneText>[1]) => tvSceneText(language, key);
  const missing = quotes.filter(quote => !tvSceneHasPrice(quote));
  const movers = quotes.filter(quote => tvSceneHasPrice(quote) && quote.changePercent !== null && Number.isFinite(quote.changePercent)
    && ['available', 'delayed', 'closed'].includes(quoteStatus(quote, now)) && ['24h', 'session'].includes(quote.changeBasis || ''))
    .sort((a, b) => Math.abs(b.changePercent!) - Math.abs(a.changePercent!)).slice(0, 2);
  return <aside className="tv-scene-sidebar">
    <TvHeadlines news={news} language={language} now={now} onStory={onStory}/>
    {movers.length > 0 && <section className="tv-scene-movers"><h2>{s('sceneMoves')}</h2><p>{s('selectedMoves')}</p>{movers.map(quote => <button key={`${quote.exchange}:${quote.symbol}`} onClick={() => onQuote(quote)}>
      <span>{language === 'ar' ? quote.nameAr : quote.name}</span><strong dir="ltr" data-trend={quote.changePercent! >= 0 ? 'up' : 'down'}>{tvSceneChange(quote)}</strong>
      <small>{tvText(language, quoteStatus(quote, now))} · {s(quote.changeBasis === '24h' ? 'day' : 'session')}</small>
    </button>)}</section>}
    <details className="tv-scene-health"><summary>{tvText(language, 'provider')}</summary><p>{s('selectedCoverage')}</p>
      <div className="tv-scene-coverage-total"><strong dir="ltr">{snapshot ? `${quotes.length - missing.length} / ${quotes.length}` : '—'}</strong><span>{s('quoted')}</span></div>
      {missing.length > 0 && <details className="tv-scene-unavailable"><summary data-tv-focus-key="scene-unavailable">{s('missing')} <bdi>{missing.length}</bdi></summary><ul>{missing.map(quote => <li key={`${quote.exchange}:${quote.symbol}`}><button onClick={() => onQuote(quote)} data-tv-focus-key={`unavailable:${quote.exchange || ''}:${quote.symbol}:${quote.currency || ''}`}><strong>{language === 'ar' ? quote.nameAr : quote.name}</strong><span>{s(tvSceneIssue(quote.issue))}</span></button></li>)}</ul></details>}
      <TvDataNotice quotes={missing.length ? missing : quotes} language={language} retryAt={snapshot?.retryAt} now={now} loading={loading} refresh={onRefresh}/>
    </details>
  </aside>;
}
