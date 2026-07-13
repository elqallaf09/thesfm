import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const sources = {
  marketAgent: read('src/app/market-agent/page.tsx'),
  ai: read('src/app/ai/page.tsx'),
  projectSelector: read('src/components/projects/ProjectSelector.tsx'),
  marketMovers: read('src/components/market-news/MarketMoversCard.tsx'),
  portfolioComparison: read('src/components/market-news/PortfolioComparisonCard.tsx'),
  assetProfile: read('src/components/market/AssetProfileCard.tsx'),
  accountCompletion: read('src/components/account/AccountCompletionCard.tsx'),
};

const legacyVisuals = /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(|oklch\(|(?:linear|radial|conic)-gradient\(|\b(?:Tajawal|Cairo|Arial|Tahoma|Helvetica|Inter|Poppins|Roboto)\b/i;
const excessiveWeight = /font(?:-weight|Weight|):?\s*[:=]?\s*(?:7(?:0[1-9]|[1-9]\d)|[89]\d{2}|[1-9]\d{3,})\b|font:\s*(?:8|9)\d{2}/;

describe('agent and shared market surfaces visual-system contract', () => {
  it.each(Object.entries(sources))('%s consumes centralized colors, typography, radii, and depth', (name, source) => {
    expect(source, name).not.toMatch(legacyVisuals);
    expect(source, name).not.toMatch(excessiveWeight);
    expect(source, name).not.toMatch(/(?:^|[\s:])(?:global\()?\.dark\b/m);
    expect(source, name).not.toContain('var(--sfm-');

    const radiusValues = [...source.matchAll(/border(?:-[\w]+)?-radius:\s*([^;}\r\n]+)/g)]
      .map(match => match[1].trim());
    expect(radiusValues.filter(value => /\d+(?:\.\d+)?px/.test(value)), name).toEqual([]);

    const shadowValues = [...source.matchAll(/box-shadow:\s*([^;}\r\n]+)/g)]
      .map(match => match[1].trim());
    expect(
      shadowValues.filter(value => !/^var\(--(?:shadow|focus-shadow)/.test(value)),
      name,
    ).toEqual([]);
  });

  it('limits gradients to the two intentional route heroes and shared skeleton token', () => {
    expect(sources.marketAgent.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(sources.ai.match(/var\(--hero-gradient\)/g)).toHaveLength(1);

    for (const [name, source] of Object.entries(sources)) {
      const withoutApprovedTokens = source
        .replaceAll('var(--hero-gradient)', '')
        .replaceAll('var(--skeleton-gradient)', '');
      expect(withoutApprovedTokens, name).not.toContain('gradient');
    }
  });

  it('uses semantic surfaces and reserves the data font for numeric or market values', () => {
    const combined = Object.values(sources).join('\n');
    for (const token of [
      '--surface', '--surface-muted', '--foreground', '--foreground-muted', '--border',
      '--primary', '--primary-soft', '--accent', '--success', '--warning', '--danger',
      '--focus-ring', '--focus-shadow', '--shadow-card', '--font-ui', '--font-data',
    ]) {
      expect(combined).toContain(`var(${token})`);
    }

    expect(sources.marketAgent).toContain('font-family: var(--font-data)');
    expect(sources.ai).toContain('font-family:var(--font-data)');
    expect(sources.portfolioComparison).toContain('font-family:var(--font-data)');
    expect(sources.assetProfile).toContain('font-family:var(--font-data)');
    expect(sources.accountCompletion).toContain('font-family: var(--font-data)');
  });

  it('leaves width and sidebar geometry to the shared workspace shell', () => {
    for (const [name, source] of Object.entries({ marketAgent: sources.marketAgent, ai: sources.ai })) {
      expect(source, name).not.toMatch(/100vw|calc\(100vw|--sidebar-(?:w|width)|margin-inline-start:\s*\d|margin-(?:left|right):|translateX\(/i);
    }
    expect(sources.marketAgent).toContain('.market-agent-page {\n          width: 100%;\n          min-width: 0;');
    expect(sources.ai).toContain('.ai-page{width:100%;min-width:0;');
  });

  it('preserves focus, direction-aware positioning, responsive stacking, and financial states', () => {
    const combined = Object.values(sources).join('\n');
    expect(combined).toContain('focus-visible');
    expect(combined).toContain('var(--focus-ring)');
    expect(sources.marketAgent).toContain("[dir='rtl'] .agent-level-marker");
    expect(sources.marketAgent).toContain('@media (max-width: 560px)');
    expect(sources.projectSelector).toContain('@media (max-width: 720px)');
    expect(sources.marketMovers).toContain('@media(max-width:720px)');
    expect(sources.portfolioComparison).toContain('@media(max-width:640px)');
    expect(combined).toContain('var(--success-soft)');
    expect(combined).toContain('var(--warning-soft)');
    expect(combined).toContain('var(--danger-soft)');
  });
});
