'use client';

import { Children, cloneElement, isValidElement, useCallback, useEffect, useRef, useState } from 'react';
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
  pixelsPerSecond?: number;
  minimumItems?: number;
  emptyState?: ReactNode;
  status?: ReactNode;
  children: ReactNode;
};

export const MARKET_TICKER_PIXELS_PER_SECOND = 30;
const WIDTH_CHANGE_TOLERANCE_PX = 0.5;

export function tickerDurationSeconds(loopDistancePixels: number, pixelsPerSecond: number) {
  if (!Number.isFinite(loopDistancePixels) || loopDistancePixels <= 0 || !Number.isFinite(pixelsPerSecond) || pixelsPerSecond <= 0) return null;
  return loopDistancePixels / pixelsPerSecond;
}

export function hasMaterialTickerWidthChange(previous: number, next: number) {
  return Math.abs(previous - next) >= WIDTH_CHANGE_TOLERANCE_PX;
}

export function observeTickerGeometry(
  targets: Element[],
  onResize: ResizeObserverCallback,
  Observer: typeof ResizeObserver = ResizeObserver,
) {
  const observer = new Observer(onResize);
  targets.forEach(target => observer.observe(target));
  return () => observer.disconnect();
}

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
  pixelsPerSecond,
  minimumItems = 10,
  emptyState,
  status,
  children,
}: MarketTickerStripProps) {
  const [paused, setPaused] = useState(false);
  const [resolvedDirection, setResolvedDirection] = useState<TickerDirection>(direction ?? 'ltr');
  const [loopDistance, setLoopDistance] = useState(0);
  const primarySetRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const tickerItems = Children.toArray(children);
  const hasTickerItems = tickerItems.length > 0;
  const repeatCount = tickerItems.length > 0 ? Math.max(2, Math.ceil(minimumItems / tickerItems.length)) : 1;
  const animationName = resolvedDirection === 'rtl' ? 'sfmMarketTickerScrollRtl' : 'sfmMarketTickerScrollLtr';
  const measuredDuration = pixelsPerSecond ? tickerDurationSeconds(loopDistance, pixelsPerSecond) : durationSeconds;
  const style = {
    '--market-ticker-duration': measuredDuration ? `${measuredDuration}s` : undefined,
  } as CSSProperties;
  const trackStyle = {
    animationName: measuredDuration ? animationName : 'none',
    animationDuration: measuredDuration ? 'var(--market-ticker-duration)' : undefined,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
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

  const measureLoopDistance = useCallback(() => {
    if (!pixelsPerSecond) return;
    const width = primarySetRef.current?.getBoundingClientRect().width ?? 0;
    if (width <= 0) return;
    setLoopDistance(previous => hasMaterialTickerWidthChange(previous, width) ? width : previous);
  }, [pixelsPerSecond]);

  useEffect(() => {
    if (!pixelsPerSecond || !primarySetRef.current || !viewportRef.current || typeof ResizeObserver === 'undefined') return;
    measureLoopDistance();
    const cleanup = observeTickerGeometry([primarySetRef.current, viewportRef.current], measureLoopDistance);
    void document.fonts?.ready.then(measureLoopDistance);
    return cleanup;
  }, [measureLoopDistance, pixelsPerSecond, tickerItems.length]);

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
        <div ref={viewportRef} className={joinClasses('market-ticker-viewport', viewportClassName)}>
          <div className={joinClasses('market-ticker-track', trackClassName)} style={trackStyle} data-loop-distance={loopDistance || undefined} data-pixels-per-second={pixelsPerSecond}>
            <div ref={primarySetRef} className={joinClasses('market-ticker-set', setClassName)} role="list" data-ticker-set="primary">
              {renderSet('primary', false)}
            </div>
            <div className={joinClasses('market-ticker-set', setClassName)} aria-hidden="true" data-ticker-set="duplicate">
              {renderSet('duplicate', true)}
            </div>
          </div>
        </div>
      ) : emptyState ? (
        <div className={joinClasses('market-ticker-viewport', viewportClassName)} role="status">
          {emptyState}
        </div>
      ) : null}

      {/* While paused (hover/focus/active), the strip becomes manually
          drag-scrollable so a user can inspect items that are mid-loop. It
          stays overflow:hidden the rest of the time so the seamless
          duplicate-set loop never shows a manual scroll offset once motion
          resumes. */}
      <style jsx global>{`
        .market-ticker-strip[data-market-ticker='true']:hover > .market-ticker-viewport,
        .market-ticker-strip[data-market-ticker='true']:focus-within > .market-ticker-viewport,
        .market-ticker-strip[data-market-ticker='true']:active > .market-ticker-viewport,
        .market-ticker-strip[data-market-ticker='true'].is-paused > .market-ticker-viewport {
          overflow-x: auto;
          touch-action: pan-x;
        }
      `}</style>
    </section>
  );
}

export default MarketTickerStrip;
