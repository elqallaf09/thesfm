import { describe, expect, it } from 'vitest';
import {
  IPO_REGIONS,
  IPO_TOPIC_IDS,
  hasIpoRegionEvidence,
  ipoEditionFeedUrl,
  ipoGlobalPublisherFeedUrl,
  ipoReferenceDomains,
  ipoRegionalPublisherFeedUrl,
} from '@/lib/market-news/ipoRegions';
import { TOPICS } from '@/lib/market-news/specialTopics';

describe('regional IPO references', () => {
  it('registers six regional IPO topics scoped to their own market codes', () => {
    expect(IPO_TOPIC_IDS).toHaveLength(6);
    for (const topic of IPO_TOPIC_IDS) {
      expect(TOPICS[topic].params.marketCodes).toEqual(IPO_REGIONS[topic].marketCodes);
      expect(TOPICS[topic].query).toContain(' OR ');
      expect(TOPICS[topic].query).toContain('اكتتاب');
    }
  });

  it('searches several independent references per region', () => {
    for (const topic of IPO_TOPIC_IDS) {
      const region = IPO_REGIONS[topic];
      expect(region.editions.length).toBeGreaterThanOrEqual(2);
      expect(ipoReferenceDomains(topic).length).toBeGreaterThanOrEqual(8);
      const urls = [
        ...region.editions.map(edition => ipoEditionFeedUrl(topic, edition)),
        ipoRegionalPublisherFeedUrl(topic),
        ipoGlobalPublisherFeedUrl(topic),
      ];
      expect(new Set(urls).size).toBe(urls.length);
      for (const url of urls) {
        const parsed = new URL(url);
        expect(parsed.hostname).toBe('news.google.com');
        // Google News rejects very long queries; keep every feed comfortably short.
        expect(url.length).toBeLessThan(2_000);
        expect(parsed.searchParams.get('q')).toContain(`when:${region.days}d`);
      }
    }
  });

  it('requires the region in the headline or summary so a dominant US IPO does not leak into other regions', () => {
    const usStory = "Anthropic's public trading debut means a win for NC retirement fund";
    for (const topic of IPO_TOPIC_IDS.filter(id => id !== 'ipo-us-news')) expect(hasIpoRegionEvidence(topic, usStory)).toBe(false);
    expect(hasIpoRegionEvidence('ipo-us-news', usStory)).toBe(true);
    expect(hasIpoRegionEvidence('ipo-gulf-news', 'بدء اكتتاب المستثمرين في 11.1 مليون سهم من شركة مسقا بسعر 6 ريالات')).toBe(true);
    expect(hasIpoRegionEvidence('ipo-gulf-news', 'طرح أولي بالسعودية')).toBe(true);
    expect(hasIpoRegionEvidence('ipo-gulf-news', 'بدء تداول أسهم الشركة ونمو الإيرادات')).toBe(false);
    expect(hasIpoRegionEvidence('ipo-arab-news', 'تغطية اكتتاب لابروفان المغربية تتجاوز 7 مرات')).toBe(true);
    expect(hasIpoRegionEvidence('ipo-arab-news', 'المصرف يرفع رأس المال')).toBe(false);
    expect(hasIpoRegionEvidence('ipo-uk-news', 'Startup aims to raise $1bn in IPO')).toBe(false);
    expect(hasIpoRegionEvidence('ipo-uk-news', 'Example plc sets AIM-listed IPO price')).toBe(true);
    expect(hasIpoRegionEvidence('ipo-asia-news', 'SEBI to review IPO pricing; NSE chief comments')).toBe(true);
  });

  it('uses each edition\'s own script and country', () => {
    const arabic = ipoEditionFeedUrl('ipo-gulf-news', { country: 'SA', language: 'ar' });
    const query = new URL(arabic).searchParams.get('q') ?? '';
    expect(query).toContain('اكتتاب');
    expect(query).toContain('تداول');
    expect(query).not.toContain('Tadawul');
    expect(new URL(arabic).searchParams.get('gl')).toBe('SA');
    const global = new URL(ipoGlobalPublisherFeedUrl('ipo-uk-news')).searchParams.get('q') ?? '';
    expect(global).toContain('site:reuters.com');
    expect(global).toContain('"London Stock Exchange"');
  });
});
