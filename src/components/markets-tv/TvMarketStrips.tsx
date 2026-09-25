'use client';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_TV_STRIP_SPEED, type TvGroup, type TvLanguage, type TvMarket, type TvQuote, type TvSnapshot } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';
import { TvStripQuote } from './TvStripQuote';
import { mergeStripSnapshot } from '@/lib/markets-tv/stripQuotes';
import { ChevronRight, RefreshCw } from 'lucide-react';
import type { TvSelections } from '@/lib/markets-tv/selections';
import { useTvResource } from './useTvResource';
import { hasTvPrice, tvStripCoverage } from '@/lib/markets-tv/coverage';

type Props = { selections: TvSelections; marketIds?: string[]; speed?: number; marketSpeeds?: Record<string, number>; pricedOnly?: boolean; revision?: number; paused?: boolean; watchlistCount: number; markets: TvMarket[]; groups: TvGroup[]; language: TvLanguage; token: string; activeGroup: TvGroup; activeMarket: string; now: number; onSelect: (group: TvGroup, market?: string) => void; onQuote: (quote: TvQuote) => void };
function Strip({ market, active, language, token, now, onSelect, onQuote, speed = DEFAULT_TV_STRIP_SPEED, revision = 0, paused: manualPause = false, selections, pricedOnly = false }: Omit<Props, 'watchlistCount' | 'markets' | 'groups' | 'activeGroup' | 'activeMarket'> & { market: TvMarket; active: boolean }) {
  const root = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false), [page, setPage] = useState(0), [duration, setDuration] = useState(90), [paused, setPaused] = useState(false);
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(root.current); return () => observer.disconnect();
  }, []);
  const selection = selections[market.id], custom = selection !== undefined;
  const selectedPage = custom ? selection.slice(page * 12, (page + 1) * 12) : null;
  const params = new URLSearchParams({ group: market.group, market: market.id, page: String(custom ? 0 : page), pageSize: '12' });
  if (selectedPage) params.set('symbols', JSON.stringify(selectedPage));
  const path = visible && market.count > 0 && (!custom || selectedPage!.length > 0) ? `/api/tv/snapshot?${params}` : null;
  const resource = useTvResource<TvSnapshot>(path, market.group === 'crypto' ? 15000 : 30000, market.group === 'watchlist' ? token : '', revision);
  const [retained, setRetained] = useState<TvSnapshot | null>(null);
  useEffect(() => { if (resource.data) setRetained(previous => mergeStripSnapshot(previous, resource.data!)); }, [resource.data]);
  const snapshot = resource.data ? mergeStripSnapshot(retained, resource.data) : retained, quotes = snapshot?.quotes || [];
  const coverage = tvStripCoverage(quotes, now);
  const displayed = pricedOnly ? quotes.filter(hasTvPrice) : quotes;
  const pages = Math.max(1, Math.ceil((custom ? selection.length : snapshot?.directoryTotal ?? market.count) / 12));
  useEffect(() => {
    if (!track.current) return;
    const resize = new ResizeObserver(() => { if (track.current) setDuration(Math.max(1, track.current.scrollWidth / 2 / speed)); });
    resize.observe(track.current); return () => resize.disconnect();
  }, [displayed.length, speed]);
  useEffect(() => {
    if (!pricedOnly || displayed.length || !visible || paused || manualPause || resource.loading || resource.error || !resource.data || pages <= 1) return;
    // Empty batches have no animation cycle to advance them. Keep scanning bounded
    // and stop while hidden, paused or disconnected instead of requesting the whole exchange.
    const timer = setTimeout(() => { if (!document.hidden && navigator.onLine) setPage(value => (value + 1) % pages); }, 8000);
    return () => clearTimeout(timer);
  }, [pricedOnly, displayed.length, visible, paused, manualPause, resource.loading, resource.error, resource.data, pages]);
  useEffect(() => { if (page >= pages) setPage(0); }, [page, pages]);
  const health = resource.error ? 'error' : coverage.recent ? 'ready' : coverage.priced ? 'retained' : 'waiting';
  const evidenceSummary = `${t('recentPrices')}: ${coverage.recent} · ${t('retainedPrices')}: ${coverage.stale} · ${t('referencePrices')}: ${coverage.reference} · ${t('unknownPrices')}: ${coverage.unknown}`;
  const next = () => { if (!resource.loading) setPage(value => (value + 1) % pages); };
  return <div ref={root} className={`tv-market-strip ${active ? 'is-active' : ''}`} data-market={market.id}>
    <button className="tv-market-strip-heading" aria-pressed={active} onClick={() => onSelect(market.group, market.id)}>
      <strong>{language === 'ar' ? market.labelAr : language === 'fr' ? market.labelFr : market.labelEn}</strong>
      <small dir="ltr" title={t('directory')}>{custom ? `${selection.length.toLocaleString('en-US')} / ` : ''}{market.count.toLocaleString('en-US')}</small>
      <span className="tv-strip-coverage">{t('pageCoverage')}: <b dir="ltr">{snapshot ? `${coverage.priced} / ${coverage.loaded}` : '—'}</b> · {t('batchPage')} <b dir="ltr">{page + 1} / {pages}</b></span>
      <span className="tv-strip-health" data-state={health} title={evidenceSummary}>{resource.loading ? <RefreshCw className="tv-spin"/> : <i/>}{t(resource.error ? 'retrying' : resource.loading ? 'loading' : coverage.recent ? 'recentPrices' : coverage.stale ? 'stale' : coverage.reference ? 'reference' : coverage.unknown ? 'unknown_time' : 'waitingPrices')}</span>
    </button>
    <div className="tv-market-strip-window" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(Boolean(root.current?.contains(document.activeElement)))} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      {displayed.length ? <div ref={track} className="tv-market-strip-track" onAnimationIteration={next} style={{ animationDuration: `${duration}s`, animationPlayState: visible && !paused && !manualPause ? 'running' : 'paused' }}>
        {[0, 1].map(copy => <div className="tv-market-strip-set" key={copy} aria-hidden={copy === 1}>
          {displayed.map(q => <TvStripQuote key={`${q.exchange}:${q.symbol}`} quote={q} group={market.group} language={language} now={Math.floor(now / 15000) * 15000} duplicate={Boolean(copy)} onQuote={onQuote}/>)}
        </div>)}
      </div> : <span className="tv-market-strip-empty">{custom && !selection.length ? t('noSelectedInstruments') : market.status === 'unavailable' ? t('directoryUnavailable') : resource.loading ? t('loading') : resource.error ? t('error') : pricedOnly && pages > 1 ? t('nextPricedBatch') : t('noPrices')}</span>}
    </div>
    <button className="tv-strip-next" aria-label={`${t('next')}: ${market.labelEn}`} onClick={next} disabled={pages === 1 || resource.loading}><ChevronRight aria-hidden="true"/></button>
  </div>;
}
export function TvMarketStrips(props: Props) {
  const container = useRef<HTMLElement>(null);
  useEffect(() => { container.current?.scrollTo({ top: 0 }); }, [props.activeGroup, props.activeMarket]);
  const markets = props.token && props.groups.includes('watchlist') ? [...props.markets, { id: 'watchlist', group: 'watchlist' as const, labelAr: tvText('ar','watchlist'), labelEn: tvText('en','watchlist'), labelFr: tvText('fr','watchlist'), count: props.watchlistCount, status: 'directory' }] : props.markets;
  const visible = markets.filter(m => props.marketIds ? props.marketIds.includes(m.id) : props.groups.includes('world') || props.groups.includes(m.group));
  const selectedOrder = new Map(props.marketIds?.map((id, index) => [id, index]));
  const sorted = [...visible].sort((a,b) => props.marketIds
    ? (selectedOrder.get(a.id) ?? 0) - (selectedOrder.get(b.id) ?? 0)
    : Number(b.id === props.activeMarket || !props.activeMarket && b.group === props.activeGroup) - Number(a.id === props.activeMarket || !props.activeMarket && a.group === props.activeGroup));
  return <section ref={container} className="tv-market-strips" aria-label={tvText(props.language,'stripMarkets')}>
    {!sorted.length && <p className="tv-strips-empty">{tvText(props.language,'chooseMarkets')}</p>}
    {sorted.map(market => <Strip key={market.group === 'watchlist' ? `${market.id}:${props.token}` : `${market.id}:${props.selections[market.id]?.join(',') ?? 'all'}`} {...props} speed={props.marketSpeeds?.[market.id] ?? props.speed} market={market} active={market.id === props.activeMarket || !props.activeMarket && market.group === props.activeGroup}/>)}
  </section>;
}
