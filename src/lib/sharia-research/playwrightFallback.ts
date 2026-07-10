import 'server-only';

import { assertSafePublicUrl } from './secureFetch';

export function isPlaywrightFallbackEnabled() {
  return process.env.SHARIA_RESEARCH_PLAYWRIGHT_FALLBACK === 'true';
}

export async function renderPublicPageWithPlaywright(inputUrl: string) {
  if (!isPlaywrightFallbackEnabled()) throw new Error('PLAYWRIGHT_FALLBACK_DISABLED');
  const url = await assertSafePublicUrl(inputUrl);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      javaScriptEnabled: true,
      serviceWorkers: 'block',
      acceptDownloads: false,
      userAgent: 'THE-SFM-ShariaResearch/1.0 (+https://www.the-sfm.com; controlled-rendering-fallback)',
    });
    const page = await context.newPage();
    await page.route('**/*', async route => {
      const request = route.request();
      try {
        const requestUrl = await assertSafePublicUrl(request.url());
        if (requestUrl.origin !== url.origin || !['document', 'script', 'stylesheet', 'xhr', 'fetch'].includes(request.resourceType())) {
          await route.abort('blockedbyclient');
          return;
        }
        await route.continue();
      } catch {
        await route.abort('blockedbyclient');
      }
    });
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 12_000 });
    const html = await page.content();
    await context.close();
    return html.slice(0, 2_000_000);
  } finally {
    await browser.close();
  }
}
