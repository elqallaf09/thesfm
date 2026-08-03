import { describe, expect, it, vi } from 'vitest';
import {
  MARKET_TICKER_PIXELS_PER_SECOND,
  hasMaterialTickerWidthChange,
  observeTickerGeometry,
  tickerDurationSeconds,
} from '@/components/market/MarketTickerStrip';

describe('market ticker rendered-distance velocity', () => {
  it('resolves different set widths to the same pixels per second', () => {
    const shortWidth = 640;
    const longWidth = 1_470;
    const shortDuration = tickerDurationSeconds(shortWidth, MARKET_TICKER_PIXELS_PER_SECOND)!;
    const longDuration = tickerDurationSeconds(longWidth, MARKET_TICKER_PIXELS_PER_SECOND)!;
    expect(shortWidth / shortDuration).toBe(MARKET_TICKER_PIXELS_PER_SECOND);
    expect(longWidth / longDuration).toBe(MARKET_TICKER_PIXELS_PER_SECOND);
  });

  it('calculates duration as measured width divided by velocity', () => {
    expect(tickerDurationSeconds(900, 30)).toBe(30);
    expect(tickerDurationSeconds(0, 30)).toBeNull();
  });

  it('recalculates for a material width change but ignores layout noise', () => {
    expect(hasMaterialTickerWidthChange(900, 1_020)).toBe(true);
    expect(hasMaterialTickerWidthChange(900, 900.2)).toBe(false);
  });

  it('uses equal speed magnitude for RTL and LTR because direction is not part of duration', () => {
    const duration = tickerDurationSeconds(750, MARKET_TICKER_PIXELS_PER_SECOND);
    expect(duration).toBe(25);
  });

  it('observes every geometry target and disconnects on cleanup', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    class FakeResizeObserver {
      observe = observe;
      unobserve = vi.fn();
      disconnect = disconnect;
      constructor(callback: ResizeObserverCallback) { void callback; }
    }
    const targets = [{ id: 'set' }, { id: 'viewport' }] as unknown as Element[];
    const cleanup = observeTickerGeometry(targets, vi.fn(), FakeResizeObserver as unknown as typeof ResizeObserver);
    expect(observe).toHaveBeenCalledTimes(2);
    cleanup();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
