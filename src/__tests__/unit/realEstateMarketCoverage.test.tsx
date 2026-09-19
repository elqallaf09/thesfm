import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { REAL_ESTATE_MARKET_COVERAGE } from '@/lib/investments/intelligence/market-center-coverage';

const language = vi.hoisted(() => ({ lang: 'en', dir: 'ltr' }));
vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => language }));
import { RealEstateMarketCoverage } from '@/components/invest/RealEstateMarketCoverage';

describe('Real Estate Market Center coverage', () => {
  it('never marks a source as valuation-ready merely because it is connected', () => {
    expect(REAL_ESTATE_MARKET_COVERAGE.length).toBeGreaterThan(0);
    expect(REAL_ESTATE_MARKET_COVERAGE.filter(item => item.valuationReady).map(item => item.id)).toEqual(['us-nyc-dof', 'us-cook']);
    expect(REAL_ESTATE_MARKET_COVERAGE.filter(item => ['qa-moj', 'gb-hmlr', 'kw-moj'].includes(item.id)).every(item => !item.valuationReady)).toBe(true);
    const connected = REAL_ESTATE_MARKET_COVERAGE.filter(item => item.state === 'CONNECTED_CONTEXT');
    expect(connected.map(item => item.id)).toEqual(expect.arrayContaining(['qa-moj', 'gb-hmlr', 'us-nyc-dof', 'us-cook']));
  });

  it('keeps jurisdictional US coverage separate rather than claiming USA-wide support', () => {
    const us = REAL_ESTATE_MARKET_COVERAGE.filter(item => item.countryCode === 'US');
    expect(us.map(item => item.id)).toEqual(expect.arrayContaining(['us-nyc-dof', 'us-cook', 'us-king', 'us-la', 'us-miami']));
    expect(us.some(item => item.id === 'us-national')).toBe(false);
  });

  it('renders source state and valuation boundary without market-price placeholders', () => {
    const html = renderToStaticMarkup(<RealEstateMarketCoverage />);
    expect(html).toContain('Market &amp; source coverage');
    expect(html).toContain('HM Land Registry Price Paid Data');
    expect(html).toContain('NYC Department of Finance Rolling Sales');
    expect(html).toContain('Cook County Assessor Parcel Sales');
    expect(html).toContain('Current valuation: not ready yet');
    expect(html).not.toMatch(/sample price|demo value|placeholder price/i);
  });
});
