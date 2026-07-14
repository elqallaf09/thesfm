import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildPitchDeckPowerPoint,
  type PitchDeckExportData,
  type PitchDeckLanguage,
} from '@/lib/projects/pitchDeckPowerPoint';
import {
  createStaticPresentationCardShadow,
  STATIC_PRESENTATION_VISUAL_TOKENS,
} from '@/styles/static-tokens';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

const sampleDeck: PitchDeckExportData = {
  projectName: 'Centralized Visual System',
  language: 'en',
  completionPercent: 0,
  readinessLabel: 'In review',
  generatedAt: '2026-07-13T00:00:00.000Z',
  slides: [
    {
      id: 'overview',
      title: 'Overview',
      status: 'complete',
      content: {
        headline: 'A representative project overview',
        bullets: ['Existing verified project information'],
        metrics: [{ label: 'Completion', value: '0%' }],
        notes: 'Generated only from the supplied export data.',
      },
      missingData: [],
      suggestions: [],
    },
    {
      id: 'financial_plan',
      title: 'Financial plan',
      status: 'needs_data',
      content: {
        headline: 'Financial information supplied by the project',
        bullets: ['No financial values are supplied by this test fixture'],
        metrics: [
          { label: 'Target', value: 'Pending source value' },
          { label: 'Forecast', value: 'Pending source value' },
        ],
        notes: 'No values are added by the exporter.',
      },
      missingData: [{ label: 'Updated forecast' }],
      suggestions: ['Complete the missing forecast before final distribution.'],
    },
  ],
};

describe('pitch-deck PowerPoint visual system', () => {
  it('consumes centralized semantic presentation tokens without a route-local palette', () => {
    const source = read('src/lib/projects/pitchDeckPowerPoint.ts');

    expect(source).toContain('STATIC_PRESENTATION_VISUAL_TOKENS');
    expect(source).toContain('createStaticPresentationCardShadow');
    expect(source).not.toMatch(/const\s+(?:COLORS|PALETTE)\b/);
    expect(source).not.toMatch(/\b(?:darkBrown|deepBrown|gold|amber|cream|warmWhite)\b/i);
    expect(source).not.toMatch(/(?:color|fill|stroke|background)\s*:\s*['"][0-9a-f]{6,8}['"]/i);
    expect(source).not.toMatch(/fontFace\s*:\s*['"]/);
    expect(source).not.toMatch(/\b(?:Tahoma|Aptos(?: Display)?)\b/);
    expect(source).not.toMatch(/shadow\s*:\s*\{/);
  });

  it('uses the UI face for copy and the data face for metrics', () => {
    const source = read('src/lib/projects/pitchDeckPowerPoint.ts');
    const adapter = read('src/styles/static-tokens.ts');

    expect(adapter).toContain("ui: 'IBM Plex Sans Arabic'");
    expect(adapter).toContain("data: 'IBM Plex Mono'");
    expect(source).toContain('fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi');
    expect(source).toContain('fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontData');
    expect(source).toContain('fontFace: fontFaceForMetricValue(metric.value)');
    expect(source).toMatch(/function fontFaceForMetricValue[\s\S]{0,500}STATIC_PRESENTATION_VISUAL_TOKENS\.fontData[\s\S]{0,200}STATIC_PRESENTATION_VISUAL_TOKENS\.fontUi/);
  });

  it('adapts static colors and returns a fresh semantic card shadow', () => {
    const firstShadow = createStaticPresentationCardShadow();
    const secondShadow = createStaticPresentationCardShadow();

    expect(STATIC_PRESENTATION_VISUAL_TOKENS.fontUi).toBe('IBM Plex Sans Arabic');
    expect(STATIC_PRESENTATION_VISUAL_TOKENS.fontData).toBe('IBM Plex Mono');
    for (const [role, value] of Object.entries(STATIC_PRESENTATION_VISUAL_TOKENS)) {
      if (!role.startsWith('font')) expect(value).toMatch(/^[0-9A-F]{6}$/);
    }
    expect(firstShadow).not.toBe(secondShadow);
    expect(firstShadow.color).toBe(STATIC_PRESENTATION_VISUAL_TOKENS.shadowColor);
    expect(firstShadow.offset).toBeGreaterThanOrEqual(0);
  });

  it.each<PitchDeckLanguage>(['ar', 'en', 'fr'])(
    'still generates a valid %s PowerPoint buffer from supplied project data',
    async language => {
      const output = await buildPitchDeckPowerPoint({ ...sampleDeck, language }, 'rules');

      expect(Buffer.isBuffer(output)).toBe(true);
      expect(output.byteLength).toBeGreaterThan(10_000);
      expect(output.subarray(0, 2).toString('ascii')).toBe('PK');
    },
  );
});
