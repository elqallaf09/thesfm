import { describe, expect, it } from 'vitest';
import { buildOilEvidenceSnapshot, categoriesForOilEvidence } from '@/lib/market/oilIntelligence';

describe('oil evidence intelligence', () => {
  it('classifies chokepoint, shipping and geopolitical evidence without turning it into a numeric scenario assumption', () => {
    expect(categoriesForOilEvidence('Tanker traffic through the Strait of Hormuz disrupted after an attack')).toEqual(
      expect.arrayContaining(['hormuz', 'shipping', 'geopolitics']),
    );
  });

  it('keeps contradictory directional evidence mixed instead of forcing one conclusion', () => {
    const snapshot = buildOilEvidenceSnapshot({
      news: [
        {
          id: 'a',
          title: 'Oil production cut announced after supply disruption',
          sourceName: 'Source A',
          originalUrl: 'https://example.com/a',
          publishedAt: '2026-09-20T12:00:00.000Z',
          verificationStatus: 'confirmed',
          importanceScore: 80,
        },
        {
          id: 'b',
          title: 'Oil output increase resumes supply',
          sourceName: 'Source B',
          originalUrl: 'https://example.com/b',
          publishedAt: '2026-09-20T11:00:00.000Z',
          verificationStatus: 'official',
          importanceScore: 70,
        },
      ],
      now: new Date('2026-09-20T13:00:00.000Z'),
    });
    const production = snapshot.categories.find(category => category.id === 'production');
    expect(production?.direction).toBe('mixed');
    expect(production?.attention).toBe('high');
  });

  it('uses official inventory movement as evidence context rather than a fabricated supply outage', () => {
    const snapshot = buildOilEvidenceSnapshot({
      inventory: {
        source: 'U.S. Energy Information Administration',
        sourceUrl: 'https://www.eia.gov/example',
        series: 'U.S. commercial crude oil stocks excl. lease stock',
        unit: 'million barrels',
        latest: 423.429,
        previous: 424.069,
        weeklyChange: -0.64,
        weeklyChangePct: -0.15,
        asOf: '2026-09-11',
        previousAsOf: '2026-09-04',
        releaseDate: '2026-09-16',
        fetchedAt: '2026-09-20T00:00:00.000Z',
      },
    });
    const inventory = snapshot.categories.find(category => category.id === 'inventories');
    expect(inventory?.direction).toBe('tightening');
    expect(inventory?.items[0]?.verificationStatus).toBe('official');
  });
});
