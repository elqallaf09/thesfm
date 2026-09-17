import { describe, expect, it } from 'vitest';
import { publishedShariahFundProfile, publishedShariahFundSymbols } from '@/lib/market/shariahPublishedFundProfiles';

describe('published Shariah fund profiles', () => {
  it('covers only the reviewed Shariah-branded ETFs', () => {
    expect(publishedShariahFundSymbols().sort()).toEqual(['HLAL', 'SPRE', 'SPSK', 'SPUS', 'UMMA']);
    for (const symbol of ['HLAL', 'SPRE', 'SPSK', 'SPUS', 'UMMA']) {
      expect(publishedShariahFundProfile(symbol)).toMatchObject({ symbol, verifiedAt: '2026-09-17' });
    }
  });

  it('does not turn conventional or metal funds into published Shariah funds', () => {
    for (const symbol of ['QQQ', 'VOO', 'VTI', 'SPY', 'IWM', 'GLD', 'SLV']) {
      expect(publishedShariahFundProfile(symbol)).toBeNull();
    }
  });

  it('uses exact official sponsor HTTPS pages and keeps methodology evidence non-empty', () => {
    for (const symbol of publishedShariahFundSymbols()) {
      const profile = publishedShariahFundProfile(symbol)!;
      const url = new URL(profile.officialUrl);
      expect(url.protocol).toBe('https:');
      expect(['www.wahed.com', 'www.sp-funds.com']).toContain(url.hostname);
      expect(profile.sourceName.length).toBeGreaterThan(10);
      expect(profile.methodology.length).toBeGreaterThan(30);
    }
  });

  it('normalizes ticker case but rejects unknown symbols', () => {
    expect(publishedShariahFundProfile(' spus ')?.symbol).toBe('SPUS');
    expect(publishedShariahFundProfile('UNKNOWN')).toBeNull();
    expect(publishedShariahFundProfile(null)).toBeNull();
  });
});
