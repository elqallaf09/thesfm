'use client';

import type { RefObject } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { flushSync } from 'react-dom';
import type { Lang } from '@/lib/translations';
import { t } from '@/lib/translations';

type MarketStripControlsProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  dir: 'rtl' | 'ltr';
  lang: Lang;
  manual: boolean;
  onManualChange: (manual: boolean) => void;
};

const SCROLL_AMOUNT_PX = 320;

function scrollViewport(containerRef: RefObject<HTMLDivElement | null>, direction: 1 | -1, dir: 'rtl' | 'ltr') {
  const viewport = containerRef.current?.querySelector<HTMLDivElement>('.market-ticker-viewport');
  if (!viewport) return;
  const signedAmount = direction * SCROLL_AMOUNT_PX * (dir === 'rtl' ? -1 : 1);
  // Finish the step before resuming the loop. A queued smooth scroll can
  // write a residual offset after the resume reset on touch browsers.
  viewport.scrollBy({ left: signedAmount, behavior: 'instant' });
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
export function MarketStripControls({ containerRef, dir, lang, manual, onManualChange }: MarketStripControlsProps) {
  const pauseLabel = lang === 'ar' ? 'إيقاف الحركة' : lang === 'fr' ? 'Suspendre' : 'Pause ticker';
  const resumeLabel = lang === 'ar' ? 'تشغيل الحركة' : lang === 'fr' ? 'Reprendre' : 'Resume ticker';
  const PreviousIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;
  function navigate(direction: 1 | -1) {
    // Commit static layout before measuring/scrolling, including on touch
    // browsers which do not focus a button when it is tapped.
    flushSync(() => onManualChange(true));
    scrollViewport(containerRef, direction, dir);
  }
  return (
    <div className="gm-strip-controls">
      <button type="button" className="gm-strip-control-btn gm-strip-motion" aria-pressed={manual}
        onClick={() => onManualChange(!manual)}>
        {manual ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
        {manual ? resumeLabel : pauseLabel}
      </button>
      <button
        type="button"
        className="gm-strip-control-btn"
        aria-label={t('global_markets_strip_prev', lang)}
        title={t('global_markets_strip_prev', lang)}
        onClick={() => navigate(-1)}
      >
        <PreviousIcon size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="gm-strip-control-btn"
        aria-label={t('global_markets_strip_next', lang)}
        title={t('global_markets_strip_next', lang)}
        onClick={() => navigate(1)}
      >
        <NextIcon size={16} aria-hidden="true" />
      </button>

      <style jsx>{`
        .gm-strip-controls {
          display: flex;
          align-items: center;
          justify-content: flex-end;
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

        .gm-strip-motion { inline-size: auto; gap: 6px; padding-inline: 10px; font-size: 12px; margin-inline-end: auto; }
        .gm-strip-motion[aria-pressed='true'] { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }

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
