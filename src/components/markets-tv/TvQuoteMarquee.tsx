'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Pause, Play } from 'lucide-react';
import type { TvLanguage, TvQuote } from '@/lib/markets-tv/types';
import { tvQuotePrice } from '@/lib/markets-tv/i18n';
import { tvSceneChange, tvSceneHasPrice, tvSceneQuoteUnit, tvSceneText } from '@/lib/markets-tv/scene-display';
import { TvQuoteEvidence } from './TvQuoteEvidence';
import './quote-marquee.css';

export function TvQuoteMarquee({ quotes, language, now, paused, speed, select, toggle }: {
  quotes: TvQuote[]; language: TvLanguage; now: number; paused: boolean; speed: number; select: (quote: TvQuote) => void; toggle: () => void;
}) {
  const group = useRef<HTMLDivElement>(null), viewport = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0), [copies, setCopies] = useState(2), [hidden, setHidden] = useState(false);
  const available = quotes;
  const identity = available.map(quote => `${quote.exchange}:${quote.symbol}:${quote.currency}`).join('|');
  useEffect(() => {
    const node = group.current; if (!node) return;
    const measure = () => { const width = node.getBoundingClientRect().width; setDistance(width); setCopies(width ? Math.max(2, Math.ceil((viewport.current?.clientWidth || 0) / width) + 1) : 2); };
    measure(); const observer = new ResizeObserver(measure); observer.observe(node); if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [identity]);
  useEffect(() => { const update = () => setHidden(document.hidden); update(); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update); }, []);
  if (!available.length) return null;
  const style = { '--ticker-distance': `${distance}px`, '--ticker-duration': `${Math.max(1, distance / Math.max(20, Math.min(100, speed)))}s` } as CSSProperties;
  return <section className="tv-quote-marquee" aria-label={tvSceneText(language, 'ticker')} data-paused={paused || hidden || !distance} style={style}>
    <button className="tv-marquee-toggle" onClick={toggle} aria-pressed={paused} aria-label={tvSceneText(language, paused ? 'resumeTicker' : 'pauseTicker')} data-tv-focus-key="ticker-pause">{paused ? <Play/> : <Pause/>}</button>
    <div className="tv-marquee-viewport" ref={viewport} dir="ltr" onFocusCapture={event => { const target = event.target; requestAnimationFrame(() => { if (target instanceof HTMLElement && viewport.current) viewport.current.scrollLeft = target.offsetLeft - viewport.current.clientWidth / 3; }); }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget) && viewport.current) viewport.current.scrollLeft = 0; }}>
      <div className="tv-marquee-track">{Array.from({ length: copies }, (_, copy) => <div className="tv-marquee-set" key={copy} ref={copy ? undefined : group} aria-hidden={Boolean(copy) || undefined} inert={Boolean(copy) || undefined}>{available.map(quote => <button key={`${quote.exchange}:${quote.symbol}:${quote.currency}`} tabIndex={copy ? -1 : 0} onClick={() => select(quote)} data-tv-focus-key={copy ? undefined : `ticker:${quote.exchange}:${quote.symbol}:${quote.currency}`}>
        <strong>{quote.displaySymbol || quote.symbol}</strong><bdi>{tvSceneHasPrice(quote) ? tvQuotePrice(quote) : '—'} <small>{tvSceneQuoteUnit(quote, language)}</small></bdi><span data-trend={!tvSceneHasPrice(quote) ? 'flat' : (quote.changePercent || 0) > 0 ? 'up' : (quote.changePercent || 0) < 0 ? 'down' : 'flat'}>{tvSceneHasPrice(quote) ? tvSceneChange(quote) : '—'}</span><TvQuoteEvidence quote={quote} language={language} now={now} compact/>
      </button>)}</div>)}</div>
    </div>
  </section>;
}
