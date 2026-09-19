import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisResult } from '@/domain/intelligence/contracts';
import { normalizeAnalystQuery, analystAssetSearchUrl, matchesAnalystAssetFilter } from '@/lib/ai-analyst/assetSearch';
import { shariaEvidenceFromAnalysis } from '@/lib/ai-analyst/investmentCheck';
import { resolveCanonicalIntelligenceAsset } from '@/services/intelligence/assetResolver';
import { calendarTimestamp, parseBlsCalendar } from '@/providers/intelligence/officialMacroCalendar';
import { createFinnhubNewsProvider, normalizeFinnhubNewsArticle } from '@/lib/providers/news/finnhub';

afterEach(() => { vi.unstubAllGlobals(); });
describe('analyst Arabic asset search and context integrity', () => {
  it('accepts Arabic and long company names without treating them as provider symbols', () => {
    expect(normalizeAnalystQuery('  ذهب  ')).toBe('ذهب');
    expect(normalizeAnalystQuery('الشركة الوطنية للمشروعات التكنولوجية والاستثمار')).not.toBeNull();
    expect(normalizeAnalystQuery('x'.repeat(161))).toBeNull();
    expect(new URL(analystAssetSearchUrl('ذهب', 'ALL'), 'https://example.com').searchParams.get('query')).toBe('ذهب');
  });
  it('resolves Arabic gold and silver into the commodity analysis class', async () => {
    expect(await resolveCanonicalIntelligenceAsset({ symbol: 'ذهب', assetType: 'COMMODITY' })).toMatchObject({ assetType: 'COMMODITY' });
    expect(await resolveCanonicalIntelligenceAsset({ symbol: 'XAUUSD', assetType: 'COMMODITY' })).toMatchObject({ assetType: 'COMMODITY' });
    expect(await resolveCanonicalIntelligenceAsset({ symbol: 'فضة', assetType: 'COMMODITY' })).toMatchObject({ assetType: 'COMMODITY' });
  });
  it('does not classify a mining stock or oil as a metal', () => {
    expect(matchesAnalystAssetFilter({ symbol: 'GC=F', name: 'Gold', assetType: 'gold' }, 'METAL')).toBe(true);
    expect(matchesAnalystAssetFilter({ symbol: 'HG=F', name: 'Copper', assetType: 'commodity' }, 'METAL')).toBe(true);
    expect(matchesAnalystAssetFilter({ symbol: 'GOLD', name: 'Gold mining company', assetType: 'stock' }, 'METAL')).toBe(false);
    expect(matchesAnalystAssetFilter({ symbol: 'CL=F', name: 'Crude oil', assetType: 'commodity' }, 'METAL')).toBe(false);
  });
  it('displays prefixed Sharia evidence and rejects an unavailable stale factor', () => {
    const result = { factors: [{ factor: 'SHARIA', availability: 'PARTIAL', evidence: [{ labelKey: 'intelligence_evidence_verified_sharia_status', value: 'needs_review' }] }] } as AnalysisResult;
    expect(shariaEvidenceFromAnalysis(result)?.value).toBe('needs_review');
    result.factors[0].availability = 'UNAVAILABLE'; expect(shariaEvidenceFromAnalysis(result)).toBeNull();
  });
  it('preserves Eastern daylight and standard time and rejects unknown zones', () => {
    expect(calendarTimestamp('20260918T083000', 'America/New_York')).toBe('2026-09-18T12:30:00.000Z');
    expect(calendarTimestamp('20261218T083000', 'US-Eastern')).toBe('2026-12-18T13:30:00.000Z');
    expect(calendarTimestamp('20260918T083000', null)).toBeNull();
    expect(calendarTimestamp('20260230T083000Z', null)).toBeNull();
  });
  it('uses the official calendar only as dated scheduling evidence', () => {
    const feed = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;TZID=US-Eastern:20260918T083000\r\nSUMMARY:Employment\r\n Situation\r\nEND:VEVENT\r\nEND:VCALENDAR';
    const [event] = parseBlsCalendar(feed, Date.parse('2026-09-18T00:00:00Z'));
    expect(event).toMatchObject({ title: 'EmploymentSituation', dateTimeUtc: '2026-09-18T12:30:00.000Z', actual: null, forecast: null, provider: 'bls' });
    expect(parseBlsCalendar(feed, Date.parse('2026-10-18T00:00:00Z'))).toEqual([]);
  });
  it('never stamps a general news story with the requested company symbol', () => {
    const result = normalizeFinnhubNewsArticle({ headline: 'Other company earnings', url: 'https://example.com/news', related: 'MSFT' }, 0, { scope: 'general', symbol: 'AAPL', from: '', to: '', limit: 10 });
    expect(result?.relatedSymbols).toEqual(['MSFT']);
  });
  it('requests company news independently of the general endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ headline: 'Apple earnings', url: 'https://example.com/news', datetime: 1789776000 }]))); vi.stubGlobal('fetch', fetch);
    const result = await createFinnhubNewsProvider('fixture-key').getArticles({ scope: 'asset', symbol: 'AAPL', from: '2026-09-17', to: '2026-09-18', limit: 10 });
    expect(fetch).toHaveBeenCalledTimes(1); expect(String(fetch.mock.calls[0][0])).toContain('/company-news?'); expect(result[0].relatedSymbols).toEqual(['AAPL']);
  });
});
