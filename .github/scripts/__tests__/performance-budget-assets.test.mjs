import { describe, expect, it } from 'vitest';
import {
  extractStaticAssetsFromHtml,
  routeFromHtmlRelativePath,
} from '../../../scripts/lib/performance-budget-assets.mjs';

describe('performance budget asset discovery', () => {
  it('counts unique Next.js JS and CSS files referenced by initial HTML', () => {
    const html = [
      '<link rel="preload" as="script" href="/_next/static/chunks/app.js?build=1">',
      '<script src="/_next/static/chunks/app.js"></script>',
      '<script src="https://analytics.example.test/analytics.js"></script>',
      '<link rel="stylesheet" href="/_next/static/css/site.css">',
      '<link rel="preload" as="style" href="/_next/static/css/site.css">',
      '<link rel="stylesheet" href="/styles/local.css">',
      '<img src="/_next/static/media/logo.svg">',
    ].join(' ');

    expect(extractStaticAssetsFromHtml(html)).toEqual({
      js: ['static/chunks/app.js'],
      css: ['static/css/site.css'],
    });
  });

  it('maps prerendered app files to URL routes while ignoring route groups', () => {
    expect(routeFromHtmlRelativePath('index.html')).toBe('/');
    expect(routeFromHtmlRelativePath('(public)/market-analysis.html')).toBe('/market-analysis');
    expect(routeFromHtmlRelativePath('dashboard/page.html')).toBe('/dashboard');
    expect(routeFromHtmlRelativePath('@modal/dashboard.html')).toBeNull();
  });
});
