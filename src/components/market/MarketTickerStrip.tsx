'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

type MarketTickerStripProps = {
  ariaLabel: string;
  className: string;
  viewportClassName: string;
  trackClassName: string;
  setClassName: string;
  status?: ReactNode;
  children: ReactNode;
};

export function MarketTickerStrip({
  ariaLabel,
  className,
  viewportClassName,
  trackClassName,
  setClassName,
  status,
  children,
}: MarketTickerStripProps) {
  const [paused, setPaused] = useState(false);

  return (
    <section
      className={`${className}${paused ? ' is-paused' : ''}`}
      aria-label={ariaLabel}
      dir="ltr"
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {status}
      <div className={viewportClassName}>
        <div className={trackClassName}>
          <div className={setClassName}>{children}</div>
          <div className={setClassName} aria-hidden="true">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default MarketTickerStrip;
