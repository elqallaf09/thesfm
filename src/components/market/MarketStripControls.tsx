'use client';

import type { RefObject } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Lang } from '@/lib/translations';
import { t } from '@/lib/translations';

type MarketStripControlsProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  dir: 'rtl' | 'ltr';
  lang: Lang;
};

const SCROLL_AMOUNT_PX = 320;

function scrollViewport(containerRef: RefObject<HTMLDivElement | null>, direction: 1 | -1, dir: 'rtl' | 'ltr') {
  const viewport = containerRef.current?.querySelector<HTMLDivElement>('.market-ticker-viewport');
  if (!viewport) return;
  const signedAmount = direction * SCROLL_AMOUNT_PX * (dir === 'rtl' ? -1 : 1);
  viewport.scrollBy({ left: signedAmount, behavior: 'smooth' });
}

/**
 * A pair of real, focusable buttons layered over each strip. Beyond
 * providing arrow-key-free manual navigation, focusing either button
 * bubbles a native focus event up to MarketTickerStrip's outer <section>,
 * which is how keyboard users trigger the strip's built-in
 * pause-on-focus behavior -- the ticker cards themselves render no
 * focusable element, so without these buttons a keyboard-only user would
 * have no way to pause a strip at all.
 */
export function MarketStripControls({ containerRef, dir, lang }: MarketStripControlsProps) {
  return (
    <div className="gm-strip-controls">
      <button
        type="button"
        className="gm-strip-control-btn"
        aria-label={t('global_markets_strip_prev', lang)}
        onClick={() => scrollViewport(containerRef, -1, dir)}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="gm-strip-control-btn"
        aria-label={t('global_markets_strip_next', lang)}
        onClick={() => scrollViewport(containerRef, 1, dir)}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>

      <style jsx>{`
        .gm-strip-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .gm-strip-control-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          inline-size: 44px;
          block-size: 44px;
          border: 1px solid var(--border);
          border-radius: var(--radius-pill);
          background: var(--surface);
          color: var(--foreground-secondary);
          cursor: pointer;
          transition: background-color 120ms ease, color 120ms ease;
        }

        .gm-strip-control-btn:hover {
          background: var(--surface-muted);
          color: var(--foreground);
        }

        .gm-strip-control-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

export default MarketStripControls;
