import { describe, expect, it } from 'vitest';
import { SHARIAH_UNIVERSE } from '@/lib/market/shariahUniverse';
import {
  publishedShariahFundCatalogItem,
  publishedShariahFundProfile,
  publishedShariahFundSymbols,
} from '@/lib/market/shariahPublishedFundProfiles';

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

  it('presents sponsor-published Shariah status without claiming SFM certification', () => {
    for (const symbol of publishedShariahFundSymbols()) {
      const universeItem = SHARIAH_UNIVERSE.find(item => item.symbol === symbol)!;
      const item = publishedShariahFundCatalogItem(universeItem, new Date('2026-09-17T12:00:00Z'))!;
      expect(item.shariahStatus).toBe('compliant');
      expect(item.statusLabelAr).toBe('معلن متوافق شرعياً');
      expect(item.reason.ar).toContain('الجهة الراعية');
      expect(item.reason.ar).toContain('ليست فتوى');
      expect(item.fundReview).toMatchObject({
        coverage: 'published_designation',
        reason: 'provider_published_shariah',
        independentSfmCertification: false,
      });
    }
  });

  it('does not present expired or future sponsor evidence as a current designation', () => {
    const item = SHARIAH_UNIVERSE.find(entry => entry.symbol === 'SPUS')!;
    expect(publishedShariahFundCatalogItem(item, new Date('2026-09-24T00:00:00Z'))).toBeNull();
    expect(publishedShariahFundCatalogItem(item, new Date('2026-09-16T23:59:59Z'))).toBeNull();
  });
});
