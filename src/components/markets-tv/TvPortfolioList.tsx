'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLayoutEffect, useState, type ReactNode } from 'react';
import { tvText } from '@/lib/markets-tv/i18n';
import type { TvPortfolioPosition } from '@/lib/markets-tv/portfolio';
import { portfolioText } from '@/lib/markets-tv/portfolioCopy';
import type { TvLanguage } from '@/lib/markets-tv/types';

type VisibleRows = { first: number; last: number; rows: number; pitch: number; lastStart: number };
const fullList: VisibleRows = { first: 0, last: 0, rows: 0, pitch: 0, lastStart: 0 };

export function TvPortfolioList({ positions, language, children }: { positions: TvPortfolioPosition[]; language: TvLanguage; children: ReactNode }) {
  const count = positions.length;
  const [list, setList] = useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState<VisibleRows>(fullList);

  useLayoutEffect(() => {
    if (!list || !count) return;
    const cards = list.querySelectorAll<HTMLElement>('.tv-portfolio-card-content');
    let rows = 0, columns = 1, pitch = 0;
    function updateRange() {
      if (!list || !pitch) return;
      const lastStart = Math.max(0, Math.ceil(count / columns) - rows);
      const start = Math.min(lastStart, Math.max(0, Math.round(list.scrollTop / pitch)));
      const first = start * columns + 1, last = Math.min(count, (start + rows) * columns);
      setVisible(prev => prev.first === first && prev.last === last && prev.rows === rows && prev.pitch === pitch && prev.lastStart === lastStart
        ? prev : { first, last, rows, pitch, lastStart });
    }
    function fit() {
      if (!list) return;
      const style = getComputedStyle(list);
      if (style.overflowY === 'visible') {
        list.style.removeProperty('--portfolio-row-height');
        pitch = 0;
        setVisible(fullList);
        return;
      }
      const gap = parseFloat(style.rowGap) || 0;
      columns = style.gridTemplateColumns.split(' ').length;
      // Measure naturally sized contents. The TV font setting, bilingual names
      // and native currency line can all change the height of a complete card.
      let minimum = 0;
      for (const card of cards) minimum = Math.max(minimum, card.getBoundingClientRect().height);
      const availableHeight = list.getBoundingClientRect().height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      if (!minimum || availableHeight <= 0) return;
      const button = getComputedStyle(cards[0].parentElement!);
      minimum += parseFloat(button.borderTopWidth) + parseFloat(button.borderBottomWidth);
      rows = Math.max(1, Math.floor((availableHeight + gap) / (minimum + gap)));
      const totalRows = Math.ceil(count / columns);
      if (totalRows >= 4) rows = Math.min(rows, totalRows);
      const rowHeight = Math.max(minimum, (availableHeight + gap) / rows - gap);
      pitch = rowHeight + gap;
      list.style.setProperty('--portfolio-row-height', rowHeight + 'px');
      updateRange();
    }
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(list);
    for (const card of cards) observer.observe(card);
    list.addEventListener('scroll', updateRange, { passive: true });
    return () => { observer.disconnect(); list.removeEventListener('scroll', updateRange); };
  }, [list, count, positions]);

  function move(direction: number) {
    if (!list || !visible.pitch) return;
    const start = Math.round(list.scrollTop / visible.pitch);
    const row = direction > 0
      ? start >= visible.lastStart ? 0 : Math.min(visible.lastStart, start + visible.rows)
      : start <= 0 ? visible.lastStart : Math.max(0, start - visible.rows);
    list.scrollTo({ top: row * visible.pitch, behavior: 'auto' });
  }

  const title = portfolioText(language, 'positions');
  return <section className="tv-portfolio-positions" aria-label={title}>
    <header className="tv-broadcast-heading">
      <h2>{title} <bdi>{count}</bdi></h2>
      {count > 0 && visible.lastStart > 0 ? <nav className="tv-portfolio-range" aria-label={title}>
        <button type="button" aria-label={tvText(language, 'previous')} aria-controls="tv-portfolio-list" onClick={() => move(-1)}><ChevronUp aria-hidden="true"/></button>
        <bdi dir="ltr">{visible.first}–{visible.last} / {count}</bdi>
        <button type="button" aria-label={tvText(language, 'next')} aria-controls="tv-portfolio-list" onClick={() => move(1)}><ChevronDown aria-hidden="true"/></button>
      </nav> : count > 0 && <span className="tv-portfolio-open-hint">{portfolioText(language, 'openDetails')}</span>}
    </header>
    <div ref={setList} id="tv-portfolio-list" className="tv-portfolio-list">{children}</div>
  </section>;
}
