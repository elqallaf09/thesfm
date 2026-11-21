'use client';
import { useEffect, useState, type RefObject } from 'react';
import { TV_DIRECTORY_MAX_ROWS } from './useTvDirectoryQuotes';

/** Keep the page size stable while a quote page and its ticker are loading. */
export function useTvTableSize(directory?: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState(6);
  useEffect(() => {
    const short = window.matchMedia('(min-width: 761px) and (max-height: 650px)');
    const tablet = window.matchMedia('(min-width: 761px) and (max-height: 710px)');
    const section = directory?.current;
    const fit = () => {
      if (!section || !window.matchMedia('(orientation: portrait)').matches) {
        setSize(short.matches ? 3 : directory && tablet.matches ? 4 : 6);
        return;
      }
      const font = parseFloat(getComputedStyle(section).fontSize);
      if (!section.clientHeight || !font) return;
      const cards = window.matchMedia('(max-width: 760px)').matches;
      // The narrow layout scrolls. Measuring its growing content would feed the
      // fetched row count back into the next page-size calculation.
      const header = section.querySelector('.tv-hall-columns');
      // A temporary quote error must not change which listings are requested.
      const parent = section.parentElement!;
      const error = parent.querySelector('.tv-hall-error');
      const alertSpace = error ? error.getBoundingClientRect().height + parseFloat(getComputedStyle(parent).rowGap) : 0;
      const room = cards ? window.innerHeight - (section.getBoundingClientRect().top + window.scrollY)
        : section.clientHeight - (header?.getBoundingClientRect().height ?? 0);
      const count = Math.floor((room + alertSpace) / (font * (cards ? 5 : 4.4)));
      setSize(Math.min(TV_DIRECTORY_MAX_ROWS, Math.max(cards ? 6 : 1, count)));
    };
    fit();
    const observer = section && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (section) observer?.observe(section);
    window.addEventListener('resize', fit);
    return () => { window.removeEventListener('resize', fit); observer?.disconnect(); };
  }, [directory]);
  return size;
}
