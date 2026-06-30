'use client';

import { Children, cloneElement, isValidElement, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

type TickerDirection = 'ltr' | 'rtl';

type MarketTickerStripProps = {
  ariaLabel: string;
  className?: string;
  viewportClassName?: string;
  trackClassName?: string;
  setClassName?: string;
  direction?: TickerDirection;
  durationSeconds?: number;
  minimumItems?: number;
  emptyState?: ReactNode;
  status?: ReactNode;
  children: ReactNode;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function renderTickerChild(child: ReactNode, key: string, hidden: boolean) {
  if (isValidElement<{ 'aria-hidden'?: boolean; role?: string }>(child)) {
    return cloneElement(child, {
      key,
      role: child.props.role ?? 'listitem',
      ...(hidden ? { 'aria-hidden': true } : {}),
    });
  }

  return (
    <span key={key} role="listitem" aria-hidden={hidden || undefined}>
      {child}
    </span>
  );
}

export function MarketTickerStrip({
  ariaLabel,
  className,
  viewportClassName,
  trackClassName,
  setClassName,
  direction,
  durationSeconds = 44,
  minimumItems = 10,
  emptyState,
  status,
  children,
}: MarketTickerStripProps) {
  const [paused, setPaused] = useState(false);
  const [resolvedDirection, setResolvedDirection] = useState<TickerDirection>(direction ?? 'ltr');
  const tickerItems = Children.toArray(children);
  const hasTickerItems = tickerItems.length > 0;
  const repeatCount = tickerItems.length > 0 ? Math.max(2, Math.ceil(minimumItems / tickerItems.length)) : 1;
  const animationName = resolvedDirection === 'rtl' ? 'sfmMarketTickerScrollRtl' : 'sfmMarketTickerScrollLtr';
  const style = {
    '--market-ticker-duration': `${durationSeconds}s`,
  } as CSSProperties;
  const trackStyle = {
    animation: `${animationName} var(--market-ticker-duration) linear infinite`,
    ...(paused ? { animationPlayState: 'paused' } : {}),
  } as CSSProperties;
  const renderSet = (setKey: string, hiddenSet: boolean) =>
    Array.from({ length: repeatCount }).flatMap((_, repeatIndex) =>
      tickerItems.map((child, itemIndex) =>
        renderTickerChild(
          child,
          `${setKey}-${repeatIndex}-${itemIndex}`,
          hiddenSet || repeatIndex > 0,
        ),
      ),
    );

  useEffect(() => {
    if (direction) {
      setResolvedDirection(direction);
      return;
    }

    const resolveDocumentDirection = () => {
      const documentDirection = document.documentElement.dir === 'rtl' || document.body.dir === 'rtl' ? 'rtl' : 'ltr';
      setResolvedDirection(documentDirection);
    };

    resolveDocumentDirection();

    const observer = new MutationObserver(resolveDocumentDirection);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir', 'data-sfm-dir'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['dir'] });

    return () => observer.disconnect();
  }, [direction]);

  return (
    <section
      className={joinClasses('market-ticker-strip', className, paused && 'is-paused')}
      aria-label={ariaLabel}
      aria-live="off"
      data-market-ticker="true"
      data-direction={resolvedDirection}
      dir={resolvedDirection}
      style={style}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {status}
      {hasTickerItems ? (
        <div className={joinClasses('market-ticker-viewport', viewportClassName)}>
          <div className={joinClasses('market-ticker-track', trackClassName)} style={trackStyle}>
            <div className={joinClasses('market-ticker-set', setClassName)} role="list">
              {renderSet('primary', false)}
            </div>
            <div className={joinClasses('market-ticker-set', setClassName)} aria-hidden="true">
              {renderSet('duplicate', true)}
            </div>
          </div>
        </div>
      ) : emptyState ? (
        <div className={joinClasses('market-ticker-viewport', viewportClassName)} role="status">
          {emptyState}
        </div>
      ) : null}
    </section>
  );
}

export default MarketTickerStrip;
