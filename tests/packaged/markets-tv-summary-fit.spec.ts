import { expect, test, type Locator, type Page } from '@playwright/test';
import { openAndroidTvPackage } from './packageHarness';
import type { TvLanguage, TvNews, TvQuote } from '../../src/lib/markets-tv/types';

// Synthetic layout fixtures reproduce the widths in the reported screenshot.
// They are intercepted only in this test and never enter the application data.
const now = '2026-11-19T21:05:00Z'; // 00:05 on November 20 in Kuwait.
const summary: TvQuote[] = [
  { symbol: '^GSPC', name: 'S&P 500', nameAr: 'إس آند بي 500', price: 7175.83, changePercent: -2.02,
    observedAt: '2026-11-19T20:45:00Z', status: 'delayed', exchange: 'SNP', country: 'US' },
  { symbol: '^FTSE', name: 'FTSE 100', nameAr: 'فوتسي 100', price: 10452.68, changePercent: -0.93,
    observedAt: '2026-11-19T16:35:00Z', status: 'closed', exchange: 'FTSE', country: 'GB' },
  { symbol: '^GDAXI', name: 'DAX 40', nameAr: 'داكس 40', price: 25463.81, changePercent: -1.06,
    observedAt: '2026-11-19T17:00:00Z', status: 'stale', exchange: 'XETRA', country: 'DE' },
  { symbol: '^N225', name: 'Nikkei 225', nameAr: 'نيكاي 225', price: 59444.21, changePercent: 0.71,
    observedAt: '2026-11-19T06:45:00Z', status: 'stale', exchange: 'JPX', country: 'JP' },
].map(quote => ({ ...quote, status: quote.status as TvQuote['status'], currency: null,
  source: 'Yahoo Finance', receivedAt: now, changeBasis: 'session', delayType: 'delayed' }));
const prices = ['7,175.83', '10,452.68', '25,463.81', '59,444.21'];
const times = ['23:45', '19:35', '20:00', '09:45'];
const statusLabels = {
  ar: ['متأخر', 'آخر إغلاق', 'آخر سعر محفوظ', 'آخر سعر محفوظ'],
  en: ['Delayed', 'Last close', 'Last known price', 'Last known price'],
  fr: ['Différé', 'Dernière clôture', 'Dernier cours connu', 'Dernier cours connu'],
};
const headlines = {
  ar: 'الأسواق العالمية تتابع نتائج الشركات وتطورات أسعار الفائدة',
  en: 'Global markets assess company earnings and interest rate expectations',
  fr: 'Les marchés évaluent les résultats des entreprises et les perspectives des taux',
};

async function openWorld(page: Page, language: TvLanguage, theme: 'light' | 'dark') {
  await page.clock.install({ time: new Date(now) });
  await page.addInitScript(({ language, theme }) => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({
      language, theme, displayMode: 'viewing', scene: 'world', ticker: true,
      autoRotate: false, sessionAutoRotate: false, autoHideControls: false,
    }));
  }, { language, theme });
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/tv/news') {
      const stories: TvNews[] = Array.from({ length: 8 }, (_, index) => ({
        id: `summary-news-${index}`, title: `${index + 1} · ${headlines[language]}`,
        source: 'QA newsroom', publishedAt: '2026-11-19T16:23:00Z',
        url: `https://example.test/news/${index}`,
      }));
      return route.fulfill({ json: { stories, generatedAt: now } });
    }
    if (url.pathname === '/api/tv/snapshot') {
      const quotes: TvQuote[] = Array.from({ length: 6 }, (_, index) => ({
        symbol: `QA${index}`, name: `Test company ${index + 1}`, nameAr: `شركة الاختبار ${index + 1}`,
        price: 1288.2 + index, currency: 'EUR', changePercent: index % 2 ? 1.17 : -1.84,
        source: 'QA provider', observedAt: '2026-11-19T16:38:00Z', receivedAt: now,
        status: 'closed', exchange: 'QA', country: 'NL', changeBasis: 'session', delayType: 'eod',
      }));
      return route.fulfill({ json: { group: 'world', scene: 'world', summary, quotes,
        total: quotes.length, available: quotes.length, generatedAt: now } });
    }
    return route.fulfill({ json: { markets: [], stories: [], items: [], total: 0 } });
  });
  await openAndroidTvPackage(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.tv-scene-summary')).toHaveCount(4);
  await expect(page.locator('.tv-scene-headlines .tv-news-card')).toHaveCount(8);
  await expect(page.locator('.tv-scene-row')).toHaveCount(6);
}

async function expectSummaryGeometry(cards: Locator) {
  await expect.poll(() => cards.evaluateAll(elements => elements.flatMap((card, index) => {
    const issues: string[] = [], bounds = card.getBoundingClientRect(), label = `Summary ${index + 1}: `;
    const outside = (a: DOMRect, b: DOMRect) => a.left < b.left - 1 || a.right > b.right + 1
      || a.top < b.top - 1 || a.bottom > b.bottom + 1;
    const overlaps = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
      && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    if (bounds.left < -1 || bounds.right > innerWidth + 1 || bounds.top < -1 || bounds.bottom > innerHeight + 1) {
      issues.push(label + 'outside the viewport');
    }
    if (card.scrollWidth > card.clientWidth + 2 || card.scrollHeight > card.clientHeight + 2) issues.push(label + 'card overflow');
    const parts = [...card.querySelectorAll(':scope > .tv-scene-summary-name, :scope > .tv-scene-summary-value, :scope > .tv-scene-change, :scope > .tv-quote-evidence')];
    if (parts.length !== 4) issues.push(label + 'missing name, price, change or evidence');
    const textBoxes: { text: string; box: DOMRect }[] = [];
    for (const part of parts) {
      const box = part.getBoundingClientRect();
      if (!box.width || !box.height || outside(box, bounds)) issues.push(label + part.className + ' outside card');
      // Range rectangles detect overflowing/clipped glyphs that a min-width:0
      // parent rectangle alone would miss, including an ellipsized index name.
      const walker = document.createTreeWalker(part, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const content = node.textContent || '', text = content.trim();
        if (!text || node.parentElement?.closest('[aria-hidden="true"]')) continue;
        const range = document.createRange(), start = content.indexOf(text);
        range.setStart(node, start);
        range.setEnd(node, start + text.length);
        const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
        if (!rects.length) issues.push(label + `invisible text: ${text}`);
        if (part.matches('.tv-scene-summary-value') && /\d/.test(text)
          && rects.some(rect => Math.abs(rect.top - rects[0].top) > 1)) issues.push(label + 'price digits wrap');
        for (const rect of rects) {
          if (outside(rect, bounds)) issues.push(label + `text outside card: ${text}`);
          for (let ancestor = node.parentElement; ancestor && ancestor !== card.parentElement; ancestor = ancestor.parentElement) {
            const style = getComputedStyle(ancestor), clip = ancestor.getBoundingClientRect();
            if ((/(hidden|clip|auto|scroll)/.test(style.overflowX) && (rect.left < clip.left - 1 || rect.right > clip.right + 1))
              || (/(hidden|clip|auto|scroll)/.test(style.overflowY) && (rect.top < clip.top - 1 || rect.bottom > clip.bottom + 1))) {
              issues.push(label + `clipped text: ${text}`);
              break;
            }
          }
          textBoxes.push({ text, box: rect });
        }
      }
    }
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      if (overlaps(parts[i].getBoundingClientRect(), parts[j].getBoundingClientRect())) {
        issues.push(label + parts[i].className + ' overlaps ' + parts[j].className);
      }
    }
    for (let i = 0; i < textBoxes.length; i++) for (let j = i + 1; j < textBoxes.length; j++) {
      if (overlaps(textBoxes[i].box, textBoxes[j].box)) issues.push(label + `text overlap: ${textBoxes[i].text} / ${textBoxes[j].text}`);
    }
    return issues;
  })), 'Full names, significant price digits, units and evidence remain separate and unclipped').toEqual([]);
}

for (const language of ['ar', 'en', 'fr'] as const) for (const theme of ['light', 'dark'] as const) {
  test(`world summary fit ${language}/${theme}: dated wide values fit beside eight news cards`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openWorld(page, language, theme);
    const cards = page.locator('.tv-scene-summary');
    for (let index = 0; index < summary.length; index++) {
      const card = cards.nth(index), quote = summary[index];
      await expect(card.locator('.tv-scene-summary-name')).toHaveText(language === 'ar' ? quote.nameAr : quote.name);
      await expect(card.locator('.tv-scene-summary-value')).toContainText(prices[index]);
      await expect(card.locator('.tv-scene-source')).toHaveText('Yahoo Finance');
      await expect(card.locator('.tv-status')).toHaveText(statusLabels[language][index]);
      await expect(card.locator('.tv-quote-evidence time')).toHaveText(`2026-11-19 · ${times[index]}`);
      await expect(card.locator('.tv-quote-evidence time')).toHaveAttribute('dateTime', quote.observedAt!);
    }
    for (const [width, height] of [[1920, 1080], [1280, 720], [960, 540]]) {
      await page.setViewportSize({ width, height });
      await expectSummaryGeometry(cards);
      for (const selector of ['.tv-scene-summaries', '.tv-scene-quotes', '.tv-scene-headlines', '.tv-quote-marquee']) {
        await expect(page.locator(selector)).toBeInViewport({ ratio: 0.99 });
      }
      for (const story of await page.locator('.tv-scene-headlines .tv-news-card').all()) {
        await expect(story).toBeInViewport({ ratio: 0.99 });
      }
      if (height >= 720) {
        for (const row of await page.locator('.tv-scene-row').all()) await expect(row).toBeInViewport({ ratio: 0.99 });
      } else {
        // Short TVs may scroll their existing price-table region, while all
        // summaries, news cards and the ticker still remain on one canvas.
        await expect(page.locator('.tv-scene-row').first()).toBeInViewport({ ratio: 0.99 });
      }
      await expect.poll(() => page.locator('[data-tv-root]').evaluate(root => ({
        horizontal: root.scrollWidth <= root.clientWidth + 2,
        vertical: root.scrollHeight <= root.clientHeight + 2,
      }))).toEqual({ horizontal: true, vertical: true });
      await page.screenshot({ path: testInfo.outputPath(`world-summary-${language}-${theme}-${width}.png`) });
    }
  });
}
