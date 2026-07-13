import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const marketPage = readFileSync(join(process.cwd(), 'src/app/market-analysis/page.tsx'), 'utf8');
const marketCharts = readFileSync(
  join(process.cwd(), 'src/components/market-analysis/MarketChartComponents.tsx'),
  'utf8',
);
const marketStyles = marketPage.slice(
  marketPage.indexOf('<style jsx>{`'),
  marketPage.indexOf('`}</style>', marketPage.indexOf('<style jsx>{`')),
);
const rawDepthPattern = /(?:border-radius\s*:\s*|borderRadius\s*:\s*['"`]?)(?:(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem)?(?:\s+(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem))*|[^;}\n]*,\s*(?:var\([^;}\n]*,\s*)?(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem))|box-shadow\s*:\s*(?!\s*(?:var\(|none\b))[^;}\n]+|boxShadow\s*:\s*(?!\s*['"`]?(?:var\(|none\b))[^,}\n]+/i;

describe('market analysis visual system', () => {
  it('uses centralized theme and financial-data tokens', () => {
    expect(marketPage).toContain('<WorkspacePageContainer as="main" variant="full" className="market-main">');
    expect(marketStyles).toContain('background:var(--surface)');
    expect(marketStyles).toContain('color:var(--foreground)');
    expect(marketStyles).toContain('stroke:var(--chart-grid)');
    expect(marketStyles).toContain('var(--success-soft)');
    expect(marketStyles).toContain('var(--danger-soft)');
    expect(marketStyles).toContain('var(--warning-soft)');
    expect(marketStyles).toContain('var(--info-soft)');
    expect(marketStyles).toContain('font-family:var(--font-data)');
  });

  it('keeps a single semantic hero and no page-local legacy palette', () => {
    expect(marketStyles.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(marketStyles).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|(?:linear|radial|conic)-gradient\(/i);
    expect(marketStyles).not.toMatch(/\b(?:Tajawal|Arial)\b|\.dark\b/i);
    expect(marketStyles).not.toMatch(/font(?:-weight|):\s*(?:[89]00|[7-9][5-9]0)/);
    expect(marketStyles).not.toMatch(rawDepthPattern);
    expect(marketStyles).not.toMatch(/calc\(100vw|--sidebar|margin-(?:left|right)/i);
    expect(marketStyles).toContain('transform:translateX(-50%)');
  });

  it('keeps the selected-asset card readable on its flat semantic surface', () => {
    expect(marketStyles).toContain(':global(.market-hero-card){');
    expect(marketStyles).toContain('background:var(--surface)!important');
    expect(marketStyles).toContain('color:var(--foreground)!important');
    expect(marketStyles).toContain(':global(.market-hero-card span){\n          color:var(--foreground-muted)!important');
    expect(marketStyles).toContain(':global(.market-hero-card p),\n        :global(.market-hero-card em){\n          color:var(--foreground-secondary)!important');
    expect(marketStyles).not.toContain(':global(.market-hero-card span){\n          color:var(--hero-foreground-muted)!important');
  });

  it('keeps hero labels and compact search-result text contrast-safe', () => {
    expect(marketStyles).toMatch(/:global\(\.market-eyebrow\)\{[^}]*color:var\(--hero-foreground\)!important/);
    expect(marketStyles).toMatch(/:global\(\.market-search-field > label\),\s*:global\(\.market-search-panel > label > span\)\{\s*color:var\(--hero-foreground\)!important/);
    expect(marketStyles).toMatch(/:global\(\.market-search-results strong\)\{\s*color:var\(--foreground\)!important/);
    expect(marketStyles).toMatch(/:global\(\.market-search-results button em\)\{\s*color:var\(--primary-hover\)!important/);
    expect(marketStyles).not.toMatch(/(?:\.market-eyebrow|\.market-search-field\s*>\s*label|\.market-search-panel(?:\s*>\s*)?label\s*>\s*span)\s*\{[^}]*color:var\(--accent\)/);
    expect(marketStyles).not.toMatch(/\.market-search-results (?:strong|button em)\s*\{[^}]*color:var\(--accent\)/);
  });

  it('pairs the primary search action with its semantic foreground and hover tokens', () => {
    expect(marketStyles).toMatch(/:global\(\.market-search-submit\)\{[^}]*background:var\(--primary\)!important;\s*color:var\(--primary-foreground\)!important/);
    expect(marketStyles).toMatch(/:global\(\.market-search-submit svg\)\{\s*color:var\(--primary-foreground\)!important/);
    expect(marketStyles).toMatch(/:global\(\.market-search-submit:not\(:disabled\):hover\),\s*:global\(\.market-search-submit:not\(:disabled\):focus-visible\)\{[^}]*background:var\(--primary-hover\)!important/);
  });

  it('preserves dynamic support, current, and resistance marker positions', () => {
    expect(marketPage).toContain('style={{ insetInlineStart: `${readableLevelMarkerPercent(levelRange.support)}%` }}');
    expect(marketPage).toContain('style={{ insetInlineStart: `${readableLevelMarkerPercent(levelRange.current)}%` }}');
    expect(marketPage).toContain('style={{ insetInlineStart: `${readableLevelMarkerPercent(levelRange.resistance)}%` }}');
  });

  it('maps chart series and profit/loss states to shared chart tokens', () => {
    expect(marketCharts).toContain("isPositive ? 'var(--chart-1)' : 'var(--danger)'");
    expect(marketCharts).toContain("isPositive ? 'var(--chart-2)' : 'var(--warning)'");
    expect(marketCharts).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  });

  it('labels alert controls and exposes report disclosure state in both layouts', () => {
    for (const id of [
      'market-alert-type-overview',
      'market-alert-value-overview',
      'market-alert-type-focused',
      'market-alert-value-focused',
    ]) expect(marketPage).toContain(`id="${id}"`);
    expect(marketPage.match(/aria-expanded=\{reportOpen\}/g)).toHaveLength(2);
    expect(marketPage).toContain('aria-controls="market-asset-report-overview"');
    expect(marketPage).toContain('aria-controls="market-asset-report-focused"');
  });
});
