'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { tvText } from '@/lib/markets-tv/i18n';
import type { TvGroup, TvLanguage, TvQuote } from '@/lib/markets-tv/types';
import { TvStripQuote } from './TvStripQuote';
import { tvCardColumns, tvPagination } from '@/lib/markets-tv/pagination';

type Props = {
  quotes: TvQuote[]; group: TvGroup; language: TvLanguage; now: number; speed: number;
  paused: boolean; hasNextBatch: boolean; sourceCooling: boolean;
  onQuote: (quote: TvQuote) => void; nextBatch: () => void;
};

// The browse footer holds on complete cards. The dedicated strip wall still scrolls continuously.
export function TvBrowseStripPage({ quotes, group, language, now, speed, paused, hasNextBatch, sourceCooling, nextBatch, onQuote }: Props) {
  const grid = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1), [page, setPage] = useState(0);
  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    const resize = new ResizeObserver(() => {
      const style = getComputedStyle(element);
      const gap = parseFloat(style.columnGap) || 0;
      const cardEm = parseFloat(style.getPropertyValue('--tv-card-width'));
      const next = tvCardColumns(element.clientWidth, parseFloat(style.fontSize), Math.max(17, cardEm || 0), gap, 8);
      if (next !== null) setColumns(next);
    });
    resize.observe(element);
    return () => resize.disconnect();
  }, []);
  const { pages, current:index, count } = tvPagination(quotes.length, columns, page);
  const advance = useCallback((automatic: boolean) => {
    if (index < pages - 1) setPage(index + 1);
    else {
      setPage(0);
      if (hasNextBatch && (!automatic || !sourceCooling)) nextBatch();
    }
  }, [index, pages, hasNextBatch, sourceCooling, nextBatch]);
  useEffect(() => {
    if (paused || (pages === 1 && (!hasNextBatch || sourceCooling))) return;
    const timer = window.setInterval(() => {
      const row = grid.current?.parentElement;
      if (!row || document.hidden || row.contains(document.activeElement) || row.matches(':hover')
        || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      advance(true);
    }, 360000 / speed);
    return () => window.clearInterval(timer);
  }, [advance, pages, speed, paused, hasNextBatch, sourceCooling]);
  return <>
    <div className="tv-browse-strip-page" ref={grid} style={{ gridTemplateColumns: `repeat(${count},minmax(0,1fr))` }} dir="ltr">
      {quotes.slice(index * count, (index + 1) * count).map(quote => <TvStripQuote key={`${quote.exchange}:${quote.symbol}`}
        quote={quote} group={group} language={language} now={now} duplicate={false} onQuote={onQuote}/>)}
    </div>
    <button className="tv-strip-next" aria-label={tvText(language, 'next')} onClick={() => advance(false)} disabled={pages === 1 && !hasNextBatch}>
      {language === 'ar' ? <ChevronLeft aria-hidden="true"/> : <ChevronRight aria-hidden="true"/>}
    </button>
  </>;
}
