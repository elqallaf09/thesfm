import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

const sharedSurfaces = [
  'src/components/ThemeToggle.tsx',
  'src/components/AdminAccessDenied.tsx',
  'src/components/UnderDevelopment.tsx',
  'src/components/market/MarketSignalPanel.tsx',
  'src/components/market/StockTickerStrip.tsx',
  'src/components/market/TradingViewChart.tsx',
] as const;

describe('shared semantic surfaces', () => {
  it.each(sharedSurfaces)('%s consumes the centralized visual system', file => {
    const source = read(file);
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(|oklch\(|(?:linear|radial|conic)-gradient\(/i);
    expect(source).not.toMatch(/\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto)\b|var\(--sfm-/i);
    expect(source).not.toMatch(/font-weight:\s*(?:8|9)\d{2}\b/i);
  });

  it('keeps market values in the data font and ordinary surfaces flat', () => {
    const signal = read('src/components/market/MarketSignalPanel.tsx');
    const ticker = read('src/components/market/StockTickerStrip.tsx');
    const chart = read('src/components/market/TradingViewChart.tsx');
    expect(`${signal}${ticker}`).toContain('font-family:var(--font-data)');
    expect(signal).toContain('background:var(--surface)');
    expect(ticker).not.toMatch(/100vw|calc\(100vw/);
    expect(chart).toContain("getPropertyValue('--surface')");
  });

  it('uses logical, accessible shared controls and directional back icons', () => {
    const themeToggle = read('src/components/ThemeToggle.tsx');
    const underDevelopment = read('src/components/UnderDevelopment.tsx');
    expect(themeToggle).toContain('aria-label={label}');
    expect(themeToggle).toContain('var(--focus-shadow)');
    expect(underDevelopment).toContain('isAr ? <ArrowRight');
    expect(underDevelopment).toContain(':focus-visible');
    expect(underDevelopment).not.toContain('margin-inline-start:230px');
  });
});
