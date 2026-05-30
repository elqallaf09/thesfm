'use client';

import type { ReactNode } from 'react';

type MarketTickerStripProps = {
  ariaLabel: string;
  className: string;
  viewportClassName: string;
  trackClassName: string;
  setClassName: string;
  children: ReactNode;
};

export function MarketTickerStrip({
  ariaLabel,
  className,
  viewportClassName,
  trackClassName,
  setClassName,
  children,
}: MarketTickerStripProps) {
  return (
    <section className={className} aria-label={ariaLabel} dir="ltr">
      <div className={viewportClassName}>
        <div className={trackClassName}>
          {[0, 1].map(copy => (
            <div className={setClassName} key={copy} aria-hidden={copy === 1}>
              {children}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MarketTickerStrip;
