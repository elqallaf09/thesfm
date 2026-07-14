import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { GET as getTraderAsset } from '@/app/thesfm-trader-own/app/[[...path]]/route';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');
const detailHtml = read('src/trader-app/public/detail.html');
const detailCss = read('src/trader-app/public/detail.css');
const detailJs = read('src/trader-app/public/detail.js');
const serviceWorker = read('src/trader-app/public/service-worker.js');
const traderAssetRoute = read('src/app/thesfm-trader-own/app/[[...path]]/route.ts');

describe('standalone Trader detail visual-system contract', () => {
  it('loads its retained layout after the centralized token and terminal layers', () => {
    const tokensAt = detailHtml.indexOf('/semantic-tokens.css?v=20260713-central-system');
    const cinemaAt = detailHtml.indexOf('/cinema.css?v=20260713-central-system');
    const detailAt = detailHtml.indexOf('/detail.css?v=20260713-detail-shell');

    expect(tokensAt).toBeGreaterThan(-1);
    expect(cinemaAt).toBeGreaterThan(tokensAt);
    expect(detailAt).toBeGreaterThan(cinemaAt);
    expect(detailHtml).not.toMatch(/\/(?:styles|desktop-balance)\.css/);
  });

  it('retains selectors for every static detail class and generated content state', () => {
    const staticClasses = new Set(
      [...detailHtml.matchAll(/class="([^"]+)"/g)]
        .flatMap((match) => match[1].split(/\s+/))
        .filter(Boolean),
    );

    for (const className of staticClasses) {
      expect(detailCss, className).toContain(`.${className}`);
    }

    for (const className of [
      'empty',
      'info-row',
      'sharia-status-detail',
      'timeframe-detail',
      'outlook-detail-item',
      'action-buy',
      'action-sell',
      'action-hold',
      'decision-buy',
      'decision-sell',
      'decision-hold',
    ]) {
      expect(`${detailCss}${detailJs}`, className).toContain(className);
      expect(detailCss, className).toContain(`.${className}`);
    }
  });

  it('keeps the restored sheet on central semantic colors, type, radii, and depth', () => {
    const fontFamilies = [...detailCss.matchAll(/font-family\s*:\s*([^;]+);/gi)].map((match) => match[1].trim());
    const radii = [...detailCss.matchAll(/border-radius\s*:\s*([^;]+);/gi)].map((match) => match[1].trim());
    const shadows = [...detailCss.matchAll(/box-shadow\s*:\s*([^;]+);/gi)].map((match) => match[1].trim());

    expect(detailCss).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(|(?:linear|radial|conic)-gradient\(/i);
    expect(detailCss).not.toMatch(/var\(--(?:sfm|trader)-|var\(--(?:bg|line|text|muted|font-ar|font-mono)\b/);
    expect(fontFamilies.every((value) => /^var\(--font-(?:ui|data)\)(?: !important)?$/.test(value))).toBe(true);
    expect(radii.every((value) => /^var\(--radius-(?:control|card|pill)\)$/.test(value))).toBe(true);
    expect(shadows.every((value) => value === 'none' || /^var\(--shadow-(?:xs|card)\)$/.test(value))).toBe(true);
    expect(detailCss).not.toMatch(/100d?vw|calc\([^)]*(?:sidebar|100d?vw)/i);
    expect(detailCss).toContain('background: var(--surface)');
    expect(detailCss).toContain('color: var(--foreground)');
    expect(detailCss).toContain('font-family: var(--font-ui);');
    expect(detailCss).toContain('font-family: var(--font-data) !important;');
    expect(detailCss.indexOf('font-family: var(--font-data) !important;'))
      .toBeGreaterThan(detailCss.indexOf('font-family: var(--font-ui);'));
    expect(detailCss).toContain('border-radius: var(--radius-card)');
    expect(detailCss).toContain('box-shadow: var(--shadow-card)');
  });

  it('preserves responsive, RTL-safe, touch, reduced-motion, and print behavior', () => {
    expect(detailCss).toContain('min-height: 44px !important;');
    expect(detailCss).toContain('padding-inline-start: 1.25rem;');
    expect(detailCss).toContain('@media (max-width: 820px)');
    expect(detailCss).toContain('@media (max-width: 640px)');
    expect(detailCss).toContain('@media (max-width: 360px)');
    expect(detailCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(detailCss).toContain('@media print');
    expect(detailCss).not.toMatch(/padding-(?:left|right)|margin-(?:left|right)|\b(?:left|right)\s*:/);
  });

  it('rewrites, precaches, and serves the scoped stylesheet as a public CSS asset', async () => {
    expect(traderAssetRoute).toContain(".replaceAll('href=\"/detail.css', 'href=\"/thesfm-trader-own/app/detail.css')");
    expect(serviceWorker).toContain('the-sfm-trader-v20260713-detail-shell');
    expect(serviceWorker).toContain('/detail.css?v=20260713-detail-shell');

    const response = await getTraderAsset(
      new Request('https://www.the-sfm.com/thesfm-trader-own/app/detail.css'),
      { params: Promise.resolve({ path: ['detail.css'] }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/css; charset=utf-8');
    expect(await response.text()).toContain('.app-shell.detail-shell');
  });
});
