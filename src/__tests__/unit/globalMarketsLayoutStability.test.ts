import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Global Markets asynchronous layout contracts', () => {
  it('does not advertise SSR explorer controls as interactive before hydration', () => {
    const explorer = read('src/components/global-markets/GlobalMarketsExplorer.tsx');
    expect(explorer).toContain('const [interactive, setInteractive] = useState(false)');
    expect(explorer).toContain('useEffect(() => deferUntilStreamSettled(() => setInteractive(true)), [])');
    expect(explorer).toContain('<input type="search" disabled={!interactive}');
    expect(explorer).toContain('className="gm-explorer-toggle" disabled={!interactive}');
  });

  it('renders selected strip shells independently of quote completion', () => {
    const page = read('src/components/global-markets/GlobalMarketsPage.tsx');
    expect(page).toContain('selectedStrips.map(strip');
    expect(page).toContain('loading={loading}');
    expect(page).not.toContain('gm-strips-skeleton-row');
    const strip = read('src/components/market/MarketStrip.tsx');
    expect(strip).toContain('MarketStripSkeleton');
    expect(strip).toContain('block-size: var(--gm-strip-item-height)');
  });

  it('does not let aborted work mutate current request state', () => {
    const page = read('src/components/global-markets/GlobalMarketsPage.tsx');
    expect(page).toContain('activeRequestRef.current?.abort()');
    expect(page).toContain('if (signal.aborted) return');
    expect(page).toContain('if (!signal.aborted)');
    const news = read('src/components/global-markets/GlobalMarketsNews.tsx');
    expect(news).toContain('if (controller.signal.aborted) return');
    expect(news).not.toContain('setItems([])');
    expect(news).toContain('loading && !settled');
  });

  it('shares the same six-row geometry across skeleton and loaded news', () => {
    const news = read('src/components/global-markets/GlobalMarketsNews.tsx');
    expect(news).toContain('className="gm-news-list gm-news-skeleton"');
    expect(news).toContain('Array.from({ length: 6 }');
    expect(news).toContain('min-block-size:calc(6 * var(--gm-news-row-size) + 40px)');
    expect(news).toContain('grid-template-rows:16px 38px 18px');
    expect(news).not.toContain('content-visibility:auto');
  });
});
