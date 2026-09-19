'use client';
import { useEffect, useRef, useState } from 'react';
import type { TvGroup, TvLanguage, TvMarket, TvQuote, TvSnapshot } from '@/lib/markets-tv/types';
import { tvPrice, tvText, tvTime } from '@/lib/markets-tv/i18n';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import { useTvResource } from './useTvResource';

type Props = { watchlistCount: number; markets: TvMarket[]; groups: TvGroup[]; language: TvLanguage; token: string; activeGroup: TvGroup; activeMarket: string; now: number; onSelect: (group: TvGroup, market?: string) => void; onQuote: (quote: TvQuote) => void };
function Strip({ market, active, language, token, now, onSelect, onQuote }: Omit<Props, 'watchlistCount' | 'markets' | 'groups' | 'activeGroup' | 'activeMarket'> & { market: TvMarket; active: boolean }) {
  const root = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false), [page, setPage] = useState(0), [duration, setDuration] = useState(90), [paused, setPaused] = useState(false);
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(root.current); return () => observer.disconnect();
  }, []);
  const path = visible && market.count > 0 ? `/api/tv/snapshot?group=${market.group}&market=${market.id}&page=${page}&pageSize=12` : null;
  const resource = useTvResource<TvSnapshot>(path, 120000, market.group === 'watchlist' ? token : '');
  const [retained, setRetained] = useState<TvSnapshot | null>(null);
  useEffect(() => { if (resource.data) setRetained(resource.data); }, [resource.data]);
  const snapshot = resource.data || retained, quotes = snapshot?.quotes || [];
  const pages = Math.max(1, Math.ceil((snapshot?.directoryTotal ?? market.count) / 12));
  useEffect(() => {
    if (!track.current) return;
    const resize = new ResizeObserver(() => { if (track.current) setDuration(Math.max(30, track.current.scrollWidth / 2 / 32)); });
    resize.observe(track.current); return () => resize.disconnect();
  }, [quotes.length]);
  const next = () => { if (!resource.loading) setPage(value => (value + 1) % pages); };
  return <div ref={root} className={`tv-market-strip ${active ? 'is-active' : ''}`} data-market={market.id}>
    <button className="tv-market-strip-heading" aria-pressed={active} onClick={() => onSelect(market.group, market.id)}>
      <strong>{language === 'ar' ? market.labelAr : language === 'fr' ? market.labelFr : market.labelEn}</strong>
      <small dir="ltr">{market.count.toLocaleString('en-US')}</small>
    </button>
    <div className="tv-market-strip-window" onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      {quotes.length ? <div ref={track} className="tv-market-strip-track" onAnimationIteration={next} style={{ animationDuration: `${duration}s`, animationPlayState: visible && !paused ? 'running' : 'paused' }}>
        {[0, 1].map(copy => <div className="tv-market-strip-set" key={copy} aria-hidden={copy === 1}>
          {quotes.map(q => <button key={`${q.exchange}:${q.symbol}`} className="tv-market-strip-item" tabIndex={copy ? -1 : 0} onClick={() => onQuote(q)}>
            <b dir="ltr">{q.symbol}</b><strong dir="ltr">{tvPrice(q.price,q.currency)} {q.currency}</strong>
            <span dir="ltr" data-trend={q.changePercent === null ? 'flat' : q.changePercent >= 0 ? 'up' : 'down'}>{q.changePercent === null ? '—' : `${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%`}</span>
            <small>{q.source || t('unavailable')} · {tvTime(q.observedAt,language,true)} · {t(quoteStatus(q,now))}</small>
          </button>)}
        </div>)}
      </div> : <span className="tv-market-strip-empty">{market.status === 'unavailable' ? t('directoryUnavailable') : resource.loading ? t('loading') : resource.error ? t('error') : t('noPrices')}</span>}
    </div>
    <button className="tv-strip-next" aria-label={`${t('next')}: ${market.labelEn}`} onClick={next} disabled={pages === 1 || resource.loading}>›</button>
  </div>;
}
export function TvMarketStrips(props: Props) {
  const container = useRef<HTMLElement>(null);
  useEffect(() => { container.current?.scrollTo({ top: 0 }); }, [props.activeGroup, props.activeMarket]);
  const markets = props.token && props.groups.includes('watchlist') ? [...props.markets, { id: 'watchlist', group: 'watchlist' as const, labelAr: tvText('ar','watchlist'), labelEn: tvText('en','watchlist'), labelFr: tvText('fr','watchlist'), count: props.watchlistCount, status: 'directory' }] : props.markets;
  const visible = markets.filter(m => props.groups.includes('world') || props.groups.includes(m.group));
  const sorted = [...visible].sort((a,b) => Number(b.id === props.activeMarket || !props.activeMarket && b.group === props.activeGroup) - Number(a.id === props.activeMarket || !props.activeMarket && a.group === props.activeGroup));
  return <section ref={container} className="tv-market-strips" aria-label={tvText(props.language,'stripMarkets')}>
    {sorted.map(market => <Strip key={market.group === 'watchlist' ? `${market.id}:${props.token}` : market.id} {...props} market={market} active={market.id === props.activeMarket || !props.activeMarket && market.group === props.activeGroup}/>)}
  </section>;
}
