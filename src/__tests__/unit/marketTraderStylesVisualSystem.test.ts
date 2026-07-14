import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const traderStyles = readFileSync(
  join(process.cwd(), 'src/components/market-analysis/MarketTraderStyles.tsx'),
  'utf8',
);
const rawDepthPattern = /(?:border-radius\s*:\s*|borderRadius\s*:\s*['"`]?)(?:(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem)?(?:\s+(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem))*|[^;}\n]*,\s*(?:var\([^;}\n]*,\s*)?(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem))|box-shadow\s*:\s*(?!\s*(?:var\(|none\b))[^;}\n]+|boxShadow\s*:\s*(?!\s*['"`]?(?:var\(|none\b))[^,}\n]+/i;

describe('market trader tools visual system', () => {
  it('uses centralized flat surfaces and semantic financial states', () => {
    expect(traderStyles).toContain('background: var(--surface)');
    expect(traderStyles).toContain('border: 1px solid var(--border)');
    expect(traderStyles).toContain('background: var(--primary)');
    expect(traderStyles).toContain('color: var(--primary-foreground)');
    expect(traderStyles).toContain('box-shadow: var(--focus-shadow)');
    expect(traderStyles).toContain('background: var(--success-soft)');
    expect(traderStyles).toContain('background: var(--danger-soft)');
    expect(traderStyles).toContain('background: var(--chart-grid)');
    expect(traderStyles).toContain('font-family: var(--font-data)');
  });

  it('contains no component-local legacy palette or decorative gradients', () => {
    expect(traderStyles).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|(?:linear|radial|conic)-gradient\(/i);
    expect(traderStyles).not.toMatch(/\b(?:Tajawal|Arial)\b|\.dark\b|var\(--sfm-/i);
    expect(traderStyles).not.toMatch(/font(?:-weight|):\s*(?:[89]00|[7-9][5-9]0)/);
    expect(traderStyles).not.toMatch(rawDepthPattern);
    expect(traderStyles).not.toContain('var(--hero-gradient)');
  });

  it('retains trader geometry, interactions, and responsive rules', () => {
    expect(traderStyles).toContain('.market-active-dashboard > .technical-dashboard');
    expect(traderStyles).toContain('max-width: none');
    expect(traderStyles).not.toContain('max-width: 1400px');
    expect(traderStyles).toContain('.technical-dashboard .technical-search-apply:hover');
    expect(traderStyles).toContain('.trader-premium-dashboard .trader-tool-switcher > button[aria-selected="true"]');
    expect(traderStyles).toContain('@container trading-tools (max-width: 1180px)');
    expect(traderStyles).toContain('@container trading-tools (max-width: 980px)');
    expect(traderStyles).toContain('@media (max-width: 780px)');
    expect(traderStyles).toContain('@container trading-tools (max-width: 720px)');
    expect(traderStyles).toContain('@media (max-width: 460px)');
  });
});
