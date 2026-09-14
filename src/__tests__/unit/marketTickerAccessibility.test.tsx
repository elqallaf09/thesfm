import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MarketTickerStrip } from '@/components/market/MarketTickerStrip';

function Card() { return <article>Visible quote</article>; }

describe('ticker duplicate accessibility', () => {
  it('keeps repeated cards hidden even when a custom component does not forward DOM attributes', () => {
    vi.stubGlobal('React', React);
    try {
      const html = renderToStaticMarkup(<MarketTickerStrip ariaLabel="Quotes" minimumItems={2}><Card /></MarketTickerStrip>);
    expect(html.match(/role="listitem"/g)).toHaveLength(4);
    expect(html.match(/role="listitem" aria-hidden="true" inert=""/g)).toHaveLength(3);
      expect(html).toContain('data-ticker-set="duplicate"');
    } finally { vi.unstubAllGlobals(); }
  });
  it('preserves native card structure without nesting listitem roles', () => {
    vi.stubGlobal('React', React);
    try {
      const html = renderToStaticMarkup(<MarketTickerStrip ariaLabel="Quotes" minimumItems={2}><article role="listitem">Quote</article></MarketTickerStrip>);
      expect(html.match(/role="listitem"/g)).toHaveLength(4);
      expect(html).not.toContain('<div role="listitem"');
    } finally { vi.unstubAllGlobals(); }
  });
});
