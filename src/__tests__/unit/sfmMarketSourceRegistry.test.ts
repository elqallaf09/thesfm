import { describe, expect, it } from 'vitest';
import { SFM_MARKET_SOURCE_REGISTRY } from '@/lib/sfm-market/sourceRegistry';

describe('SFM primary market source registry', () => {
  it('marks SEC as a regulator source rather than a price exchange', () => {
    const sec = SFM_MARKET_SOURCE_REGISTRY.find(source => source.id === 'sec-edgar');
    expect(sec?.sourceClass).toBe('regulator');
    expect(sec?.accessState).toBe('connected');
    expect(sec?.capabilities).toContain('regulatory_filings');
    expect(sec?.capabilities).not.toContain('real_time_l1');
  });

  it('does not falsely claim GCC licensed feeds are connected', () => {
    for (const id of ['boursa-kuwait', 'saudi-exchange', 'adx-mcp', 'dfm']) {
      const source = SFM_MARKET_SOURCE_REGISTRY.find(item => item.id === id);
      expect(source).toBeDefined();
      expect(source?.connection.configured).toBe(false);
      expect(source?.accessState).not.toBe('connected');
      expect(source?.redistribution).toBe('agreement_required');
    }
  });

  it('contains no Yahoo or generic aggregator as a primary-source registry entry', () => {
    const text = JSON.stringify(SFM_MARKET_SOURCE_REGISTRY).toLowerCase();
    expect(text).not.toContain('yahoo');
    expect(SFM_MARKET_SOURCE_REGISTRY.every(source => source.sourceClass !== 'aggregator')).toBe(true);
  });
});
