import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const baseStyles = read('src/components/market-analysis/MarketBaseStyles.tsx');
const chartStyles = read('src/components/market-analysis/MarketChartStyles.tsx');
const sharedStyles = `${baseStyles}\n${chartStyles}`;
const rawDepthPattern = /(?:border-radius\s*:\s*|borderRadius\s*:\s*['"`]?)(?:(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem)?(?:\s+(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem))*|[^;}\n]*,\s*(?:var\([^;}\n]*,\s*)?(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem))|box-shadow\s*:\s*(?!\s*(?:var\(|none\b))[^;}\n]+|boxShadow\s*:\s*(?!\s*['"`]?(?:var\(|none\b))[^,}\n]+/i;

describe('shared market style visual-system contract', () => {
  it('uses centralized tokens without a local palette or theme override', () => {
    expect(sharedStyles).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgba?\(|(?:linear|radial|conic)-gradient\(|\.dark\b|var\(--sfm-/i,
    );
    expect(sharedStyles).not.toMatch(/\b(?:Tajawal|Arial)\b|font-weight:\s*(?:8\d{2}|9\d{2})/i);
    expect(sharedStyles).not.toMatch(rawDepthPattern);
    expect(sharedStyles).not.toContain('var(--hero-gradient)');

    for (const token of [
      '--surface', '--surface-muted', '--foreground', '--foreground-muted',
      '--border', '--primary', '--primary-soft', '--success', '--warning',
      '--danger', '--info', '--focus-shadow', '--font-ui', '--font-data',
    ]) {
      expect(sharedStyles).toContain(`var(${token})`);
    }
  });

  it('keeps chart data and states on semantic chart roles', () => {
    expect(chartStyles).toContain('stroke: var(--chart-grid)');
    expect(chartStyles).toContain('fill: var(--chart-label)');
    expect(chartStyles).toMatch(/\.price-chart-level\.support[\s\S]*?var\(--success\)/);
    expect(chartStyles).toMatch(/\.price-chart-level\.resistance[\s\S]*?var\(--danger\)/);
    expect(chartStyles).toMatch(/\.price-chart-state\.error[\s\S]*?var\(--warning-soft\)/);
    expect(chartStyles).toContain('font: 500 10px var(--font-data)');
    expect(chartStyles).not.toContain('drop-shadow(');
  });

  it('preserves responsive and directional chart behavior', () => {
    for (const breakpoint of ['1180px', '1024px', '720px']) {
      expect(chartStyles).toContain(`max-width: ${breakpoint}`);
    }
    expect(chartStyles).toContain('[dir="rtl"] .levels-bar > span');
    expect(chartStyles).toContain('.price-candle.up .price-candle-body');
    expect(chartStyles).toContain('.price-candle.down .price-candle-body');
    expect(chartStyles).toContain('.price-chart-hit-zone');
  });
});
