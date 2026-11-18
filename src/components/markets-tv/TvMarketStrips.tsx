'use client';
import { memo, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DEFAULT_TV_STRIP_SPEED, type TvGroup, type TvLanguage, type TvMarket, type TvQuote, type TvSnapshot } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';
import { TvBrowseStripPage } from './TvBrowseStripPage';
import { TvMotionOverride } from './useTvPlayback';
import { TvStripQuote } from './TvStripQuote';
import { retainVisibleTvSnapshot } from './retainedSnapshot';
import { ChevronRight, RefreshCw } from 'lucide-react';
import type { TvSelections } from '@/lib/markets-tv/selections';
import { useTvResource } from './useTvResource';
import { hasTvPrice, tvStripCoverage } from '@/lib/markets-tv/coverage';
import { tvSceneIssue, tvSceneText, tvStripSourceCooling } from '@/lib/markets-tv/scene-display';
import { stripCopy } from './strip-copy';
import './strip-layout.css';

type Props = { browse?: boolean; selections: TvSelections; marketIds?: string[]; speed?: number; marketSpeeds?: Record<string, number>; revision?: number; paused?: boolean; watchlistCount: number; markets: TvMarket[]; groups: TvGroup[]; language: TvLanguage; token: string; activeGroup: TvGroup; activeMarket: string; now: number; onSelect: (group: TvGroup, market?: string) => void; onQuote: (quote: TvQuote) => void };
const Strip = memo(function Strip({ market, active, language, token, now, onSelect, onQuote, speed = DEFAULT_TV_STRIP_SPEED, revision = 0, paused: manualPause = false, browse = false, selections }: Omit<Props, 'watchlistCount' | 'markets' | 'groups' | 'activeGroup' | 'activeMarket'> & { market: TvMarket; active: boolean }) {
  const explicitPlay = useContext(TvMotionOverride);
  const root = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null), firstSet = useRef<HTMLDivElement>(null);
  const [marquee, setMarquee] = useState(false);
  const [visible, setVisible] = useState(false), [page, setPage] = useState(0), [duration, setDuration] = useState(90), [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  useEffect(() => {
    const viewport = track.current?.parentElement;
    if (!focused && !manualPause && viewport) viewport.scrollLeft = 0;
  }, [explicitPlay, focused, manualPause, marquee]);
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
  const resourceData = resource.data, errorStatus = resource.errorStatus;
  useEffect(() => { setRetained(previous => retainVisibleTvSnapshot(previous, { data: resourceData, errorStatus })); }, [resourceData, errorStatus]);
  // Hide revoked data in this render as well as clearing the retained state.
  const snapshot = retainVisibleTvSnapshot(retained, resource), quotes = snapshot?.quotes || [];
  const coverage = tvStripCoverage(quotes, now);
  const sourceCooling = tvStripSourceCooling(quotes, snapshot?.retryAt, now);
  const emptyPrices = quotes.length > 0 && !coverage.priced;
  const failure = tvSceneText(language, quotes.length > 0 && quotes.every(quote => quote.issue === quotes[0].issue) ? tvSceneIssue(quotes[0].issue) : 'updatesUnavailable');
  const displayed = quotes.filter(hasTvPrice);
  const pages = Math.max(1, Math.ceil((custom ? selection.length : snapshot?.directoryTotal ?? market.count) / 12));
  const directoryCount = snapshot?.directoryTotal ?? market.count;
  const batchRange = coverage.loaded ? `${page * 12 + 1}–${page * 12 + coverage.loaded}` : '—';
  useEffect(() => {
    const element = firstSet.current, viewport = track.current?.parentElement;
    if (!element || !viewport) return;
    const measure = () => {
      // Measure one complete set, independently of the optional loop copy.
      // A sparse market stays still instead of showing the same listing twice.
      const width = element.getBoundingClientRect().width;
      setMarquee(width > viewport.clientWidth + 1);
      setDuration(Math.max(1, width / speed));
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || !element.contains(focused)) return;
      const bounds = viewport.getBoundingClientRect(), card = focused.getBoundingClientRect();
      if (card.left < bounds.left || card.right > bounds.right) focused.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(element); resize.observe(viewport); return () => resize.disconnect();
  }, [displayed.length, speed, browse]);
  useEffect(() => {
    if (displayed.length && (marquee || browse) || !visible || paused || manualPause || sourceCooling || resource.loading || resource.error || !resource.data || pages <= 1) return;
    // Static and empty batches have no animation cycle. Advance without
    // duplicating sparse listings, while retaining remote-focus and motion rules.
    const timer = setTimeout(() => {
      if (!document.hidden && navigator.onLine && (explicitPlay || !window.matchMedia('(prefers-reduced-motion: reduce)').matches)) setPage(value => (value + 1) % pages);
    }, displayed.length ? Math.max(4000, 360000 / speed) : 8000);
    return () => clearTimeout(timer);
  }, [displayed.length, marquee, browse, visible, paused, manualPause, sourceCooling, resource.loading, resource.error, resource.data, pages, speed, explicitPlay]);
  useEffect(() => { if (page >= pages) setPage(0); }, [page, pages]);
  const health = market.status === 'unavailable' || resource.error ? 'error' : coverage.recent ? 'ready' : coverage.priced ? 'retained' : 'waiting';
  const evidenceSummary = `${t('recentPrices')}: ${coverage.recent} · ${t('closed')}: ${coverage.closed} · ${t('retainedPrices')}: ${coverage.stale} · ${t('referencePrices')}: ${coverage.reference} · ${t('unknownPrices')}: ${coverage.unknown}`;
  const next = useCallback(() => { if (!resource.loading) setPage(value => (value + 1) % pages); }, [resource.loading, pages]);
  const empty = <span className="tv-market-strip-empty">{custom && !selection.length ? t('noSelectedInstruments') : market.status === 'unavailable' ? t('directoryUnavailable') : resource.loading ? t('loading') : resource.error ? t('error') : sourceCooling ? failure : pages > 1 ? t('nextPricedBatch') : t('noPrices')}</span>;
  return <div ref={root} className={`tv-market-strip ${active ? 'is-active' : ''}`} data-market={market.id} data-empty={emptyPrices} data-priced-count={displayed.length} data-directory-empty={market.count===0} data-source-cooling={sourceCooling} data-paged={pages > 1}>
    <button className="tv-market-strip-heading" aria-pressed={active} data-tv-focus-key={`market-strip:${market.id}`} onClick={() => onSelect(market.group, market.id)}>
      <strong title={language === 'ar' ? market.labelAr : language === 'fr' ? market.labelFr : market.labelEn}>{language === 'ar' ? market.labelAr : language === 'fr' ? market.labelFr : market.labelEn}</strong>
      <small><bdi>{directoryCount.toLocaleString('en-US')}</bdi> {t('catalogCount')}</small>
      {market.status==='selected'&&<span className="tv-strip-coverage tv-strip-partial" aria-label={t('partialMarket')} title={t('partialMarket')}>{stripCopy(language).partial}</span>}
      {custom&&<span className="tv-strip-coverage">{t('selectedCount')}: <bdi>{selection.length.toLocaleString('en-US')}</bdi></span>}
      {market.count>0&&<span className="tv-strip-coverage"><span>{t('batchRange')}: <b dir="ltr">{batchRange}</b> · {t('availableBatch')}: <b dir="ltr">{snapshot ? `${coverage.priced} / ${coverage.loaded}` : '—'}</b></span><span className="tv-strip-batch">{t('batchPage')} <b dir="ltr">{page + 1} / {pages}</b></span></span>}
      <span className="tv-strip-health" data-state={health} title={evidenceSummary}>{resource.loading ? <RefreshCw className="tv-spin"/> : <i/>}{market.count===0?t('directoryUnavailable'):emptyPrices && !resource.loading ? failure : t(resource.error ? 'retrying' : resource.loading ? 'loading' : coverage.recent ? 'recentPrices' : coverage.closed ? 'closed' : coverage.stale ? 'stale' : coverage.reference ? 'reference' : coverage.unknown ? 'unknown_time' : 'waitingPrices')}</span>
    </button>
    {browse && displayed.length > 0 ? <TvBrowseStripPage key={page} quotes={displayed} group={market.group} language={language}
      now={now} onQuote={onQuote} speed={speed} paused={manualPause || !visible || resource.loading}
      hasNextBatch={pages > 1} sourceCooling={sourceCooling} nextBatch={next}/> : <>
      <div className="tv-market-strip-window" data-tv-motion={explicitPlay ? 'play' : undefined} onPointerEnter={event => { if (event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) setHovered(true); }} onPointerLeave={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
        {displayed.length ? <div ref={track} className="tv-market-strip-track" data-tv-motion={explicitPlay ? 'play' : undefined} data-marquee={marquee} onAnimationIteration={() => { if (marquee && !sourceCooling) next(); }} style={{ animationDuration: `${duration}s`, animationPlayState: visible && !paused && !manualPause ? 'running' : 'paused' }}>
          {(marquee ? [0, 1] : [0]).map(copy => <div ref={copy === 0 ? firstSet : undefined} className="tv-market-strip-set" key={copy} aria-hidden={copy === 1} inert={Boolean(copy) || undefined}>
            {displayed.map(q => <TvStripQuote key={`${q.exchange}:${q.symbol}`} quote={q} group={market.group} language={language} now={Math.floor(now / 15000) * 15000} duplicate={Boolean(copy)} onQuote={onQuote}/>)}
          </div>)}
        </div> : empty}
      </div>
      {pages > 1 && <button className="tv-strip-next" aria-label={`${t('next')}: ${market.labelEn}`} onClick={next} disabled={resource.loading}><ChevronRight aria-hidden="true"/></button>}
    </>}
  </div>;
});
export const TvMarketStrips = memo(function TvMarketStrips(props: Props) {
  const container = useRef<HTMLElement>(null);
  useEffect(() => { container.current?.scrollTo({ top: 0 }); }, [props.activeGroup, props.activeMarket]);
  const markets = props.token && props.groups.includes('watchlist') ? [...props.markets, { id: 'watchlist', group: 'watchlist' as const, labelAr: tvText('ar','watchlist'), labelEn: tvText('en','watchlist'), labelFr: tvText('fr','watchlist'), count: props.watchlistCount, status: 'directory' }] : props.markets;
  const visible = markets.filter(m => props.marketIds ? props.marketIds.includes(m.id) : props.groups.includes('world') || props.groups.includes(m.group));
  const selectedOrder = new Map(props.marketIds?.map((id, index) => [id, index]));
  const sorted = [...visible].sort((a,b) => props.marketIds
    ? (selectedOrder.get(a.id) ?? 0) - (selectedOrder.get(b.id) ?? 0)
    : Number(b.id === props.activeMarket || !props.activeMarket && b.group === props.activeGroup) - Number(a.id === props.activeMarket || !props.activeMarket && a.group === props.activeGroup));
  return <section ref={container} className="tv-market-strips tv-readable-strips" aria-label={tvText(props.language,'stripMarkets')}>
    {!sorted.length && <p className="tv-strips-empty">{tvText(props.language,'chooseMarkets')}</p>}
    {sorted.map(market => <Strip key={market.group === 'watchlist' ? `${market.id}:${props.token}` : `${market.id}:${props.selections[market.id]?.join(',') ?? 'all'}`} {...props} speed={props.marketSpeeds?.[market.id] ?? props.speed} market={market} active={market.id === props.activeMarket || !props.activeMarket && market.group === props.activeGroup}/>)}
  </section>;
});
