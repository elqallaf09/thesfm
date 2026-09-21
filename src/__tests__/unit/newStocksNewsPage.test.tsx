import React, { type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const language = vi.hoisted(() => ({ lang: 'ar', dir: 'rtl' }));
vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => language }));
vi.mock('@/components/news/NewsPageShell', () => ({
  NewsPageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/market/StockTickerStrip', () => ({
  StockTickerStrip: () => <div data-testid="stock-price-ticker" />,
}));

import { SpecialMarketNewsPage } from '@/components/special-news/SpecialMarketNewsPage';

beforeEach(() => { vi.stubGlobal('React', React); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('IPO news page context', () => {
  it.each(['ar', 'en', 'fr'])('omits the unverified stock ticker in %s while keeping other news tickers', lang => {
    language.lang = lang;
    language.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const ipo = renderToStaticMarkup(<SpecialMarketNewsPage topic="new-stocks" />);
    expect(ipo).not.toContain('stock-price-ticker');
    expect(ipo).toContain('30');
    const healthcare = renderToStaticMarkup(<SpecialMarketNewsPage topic="healthcare-stocks" />);
    expect(healthcare).toContain('stock-price-ticker');
  });
});
