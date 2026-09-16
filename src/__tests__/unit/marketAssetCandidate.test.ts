import { describe, expect, it } from 'vitest';
import { implicitMarketAssetCandidates } from '@/lib/ai-analyst/marketAssetCandidate';

describe('implicitMarketAssetCandidates', () => {
  it.each([
    ['NVDA', 'NVDA'],
    ['بوبيان', 'بوبيان'],
    ['حلل سهم بوبيان اليوم؟', 'بوبيان'],
    ['Analyze Apple stock today', 'Apple'],
    ['شنو رايك في EURUSD الحين؟', 'EURUSD'],
    ['Tell me about Kuwait Finance House', 'Kuwait Finance House'],
    ['what is NVDA?', 'NVDA'],
  ])('extracts an untrusted resolver candidate from %s', (message, expected) => {
    expect(implicitMarketAssetCandidates([{ role: 'user', content: message }])).toContain(expected);
  });

  it('does not force comparison or ordinary finance questions into one asset', () => {
    expect(implicitMarketAssetCandidates([{ role: 'user', content: 'compare NVDA with AMD' }])).toEqual([]);
    expect(implicitMarketAssetCandidates([{ role: 'user', content: 'شنو وضع السوق اليوم؟' }])).toEqual([]);
    expect(implicitMarketAssetCandidates([{ role: 'user', content: 'كيف احسب نسبة الادخار؟' }])).toEqual([]);
  });

  it('uses only the latest user message and keeps candidate count bounded', () => {
    const result = implicitMarketAssetCandidates([
      { role: 'user', content: 'AAPL' },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: 'what is NVDA?' },
    ]);
    expect(result[0]).toBe('NVDA');
    expect(result.length).toBeLessThanOrEqual(4);
  });
});
