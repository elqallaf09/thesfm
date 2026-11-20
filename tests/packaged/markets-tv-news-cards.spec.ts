import { openAndroidTvPackage, openTvHeaderActions, closeTvHeaderActions, chooseTvBroadcast } from './packageHarness';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectNewsPage } from '../helpers/tv-news-pages';

type Language = 'ar' | 'en' | 'fr';
type Theme = 'light' | 'dark';
type View = 'hall' | 'allStocks' | 'world' | 'kuwait' | 'europeNews' | 'shariaNews';
const instant = '2026-11-18T21:05:00Z';
const previousKuwaitDay = '2026-11-18T20:26:00Z';
const imageOrigin = 'https://news-images.example.test';
const fixtureImage = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><rect width="240" height="180" fill="#23494c"/><path d="M20 140L70 100L120 120L175 50L220 30" fill="none" stroke="#d4af6a" stroke-width="10"/></svg>';
const titles = {
  ar: 'الأسواق العالمية تتابع نتائج الشركات وتطورات أسعار الفائدة مع ترقب المستثمرين بيانات الاقتصاد والسيولة',
  en: 'Global markets assess company earnings and interest rate expectations as investors await economic and liquidity data',
  fr: 'Les marchés évaluent les résultats des entreprises et les perspectives des taux avant les prochaines données économiques',
};
const screeningStatuses = ['compliant', 'needs_review', 'non_compliant', 'unclassified'] as const;
const screeningLabels = {
  ar: ['متوافق حسب المصدر', 'يحتاج مراجعة شرعية', 'غير متوافق', 'الحالة الشرعية غير معروفة'],
  en: ['Compliant per source', 'Screening needs review', 'Non-compliant', 'Screening status unknown'],
  fr: ['Conforme selon la source', 'Conformité à revoir', 'Non conforme', 'Conformité inconnue'],
};
const compactScreeningLabels = {
  ar: ['متوافق', 'يحتاج مراجعة', 'غير متوافق', 'غير مصنّف'],
  en: ['Compliant', 'Review needed', 'Non-compliant', 'Unclassified'],
  fr: ['Conforme', 'À vérifier', 'Non conforme', 'Non classé'],
};

function newsItems(count: number, language: Language) {
  return Array.from({ length: count }, (_, index) => ({
    id: 'news-' + index,
    title: String(index + 1) + ' · ' + titles[language],
    source: 'QA newsroom',
    publishedAt: index % 2 ? instant : previousKuwaitDay,
    url: 'https://example.com/news/' + index,
    ...(index === 1 ? {} : { imageUrl: imageOrigin + (index === 2 ? '/broken.svg' : '/market.svg') }),
  }));
}

async function openNews(page: Page, language: Language, theme: Theme, view: View, brokenResponse?: Promise<void>) {
  await page.clock.install({ time: new Date(instant) });
  await page.addInitScript(({ language, theme, view }) => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({
      language, theme, displayMode: view === 'allStocks' ? 'browse' : 'viewing',
      autoRotate: false, sessionAutoRotate: false, scene: view === 'world' ? 'world' : 'overview',
      ...(view === 'kuwait' || view === 'europeNews' || view === 'shariaNews' ? { broadcastChannel: view } : {}),
    }));
  }, { language, theme, view });
  await page.route(imageOrigin + '/**', async route => {
    if (new URL(route.request().url()).pathname === '/broken.svg') {
      if (brokenResponse) await brokenResponse;
      return route.fulfill({ status: 404, contentType: 'image/svg+xml', body: '' });
    }
    return route.fulfill({ contentType: 'image/svg+xml', body: fixtureImage });
  });
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url()), channel = url.searchParams.get('channel') || 'all';
    if (url.pathname.includes('news')) {
      const count = url.pathname === '/api/tv/news' ? channel === 'all' ? 8 : 12 : 24;
      const sharia = url.pathname === '/api/sharia-stocks/news';
      const stories = newsItems(count, language).map((story, index) => ({ ...story,
        ...(sharia ? { shariahStatus: screeningStatuses[index % screeningStatuses.length] } : {}),
      }));
      return route.fulfill({ json: { stories, items: stories, channel, success: true,
        ...(sharia ? { category: 'sharia' } : {}),
        generatedAt: instant, lastSuccessfulUpdate: instant } });
    }
    if (url.pathname === '/api/tv/catalog') return route.fulfill({ json: { markets: [
      { id: 'QA', group: 'us', labelAr: 'سوق الاختبار', labelEn: 'QA market', labelFr: 'Marché test', count: 18, status: 'directory' },
    ] } });
    if (url.pathname === '/api/tv/instruments') {
      const size = Number(url.searchParams.get('pageSize') || 6), current = Number(url.searchParams.get('page') || 0);
      const items = Array.from({ length: size }, (_, index) => ({
        symbol: 'TEST' + index, name: 'Test company ' + index, nameAr: 'شركة الاختبار ' + index, currency: 'USD', region: 'US',
      }));
      return route.fulfill({ json: { items, total: 18, directoryTotal: 18, page: current, pageSize: size } });
    }
    if (url.pathname === '/api/tv/snapshot') {
      const quotes = Array.from({ length: 6 }, (_, index) => ({
        symbol: 'TEST' + index, name: 'Test company ' + index, nameAr: 'شركة الاختبار ' + index,
        price: 20 + index, currency: 'USD', changePercent: index % 2 ? 1.1 : -1.3,
        changeBasis: 'session', source: 'QA provider', observedAt: instant, receivedAt: instant,
        status: 'available', delayType: 'realtime', exchange: 'QA', country: 'US',
      }));
      return route.fulfill({ json: { group: url.searchParams.get('group'), market: url.searchParams.get('market') || undefined,
        scene: url.searchParams.get('scene') || undefined, summary: quotes.slice(0, 4), quotes,
        total: 6, available: 6, generatedAt: instant } });
    }
    return route.fulfill({ json: {} });
  });
  await openAndroidTvPackage(page);
  await page.evaluate(() => document.fonts.ready);
  const count = view === 'kuwait' ? 12 : view === 'europeNews' || view === 'shariaNews' ? 24 : 8;
  const cards = page.locator('.tv-news-card');
  if (view === 'europeNews' || view === 'shariaNews') {
    const viewport = page.viewportSize()!;
    await expectNewsPage(page, count, viewport.width >= 1500 ? 6 : viewport.height <= 650 ? 2 : 4);
  } else await expect(cards).toHaveCount(count);
  return cards;
}

async function expectBrandedFallback(thumbnail: Locator) {
  await expect(thumbnail).toHaveAttribute('data-news-image', 'fallback');
  const image = thumbnail.locator('img');
  await expect(image).toHaveAttribute('src', /^\.?\/markets-tv\/sfm-news-fallback\.webp$/);
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  await expect(image).toHaveCSS('object-fit', 'contain');
}

async function expectCardGeometry(cards: Locator, direction: 'rtl' | 'ltr', viewport = true) {
  await expect.poll(() => cards.evaluateAll((elements, { direction, viewport }) => elements.flatMap((card, index) => {
    const violations: string[] = [], bounds = card.getBoundingClientRect();
    const thumbnail = card.querySelector('.tv-news-thumbnail')!, title = card.querySelector('.tv-news-title')!;
    const evidence = card.querySelector('.tv-news-evidence')!;
    const thumbBox = thumbnail.getBoundingClientRect(), titleBox = title.getBoundingClientRect();
    const parts = [thumbnail, title, evidence];
    const name = 'Card ' + (index + 1) + ': ';
    if (bounds.left < -1 || bounds.right > innerWidth + 1 || (viewport && (bounds.top < -1 || bounds.bottom > innerHeight + 1))) violations.push(name + 'outside viewport');
    if (card.scrollHeight > card.clientHeight + 2 || card.scrollWidth > card.clientWidth + 2) violations.push(name + 'card overflow');
    if (thumbBox.width < 24 || thumbBox.height < 18) violations.push(name + 'thumbnail too small');
    if (direction === 'rtl' ? thumbBox.left < titleBox.right - 1 : thumbBox.right > titleBox.left + 1) violations.push(name + 'thumbnail is not beside the headline in reading order');
    for (const part of parts) {
      const box = part.getBoundingClientRect();
      if (!box.width || !box.height || box.left < bounds.left - 1 || box.right > bounds.right + 1 || box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1) violations.push(name + part.className + ' outside card');
    }
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i].getBoundingClientRect(), b = parts[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) violations.push(name + parts[i].className + ' overlaps ' + parts[j].className);
    }
    const leaves = card.querySelectorAll('.tv-news-title,.tv-news-evidence > bdi,.tv-news-evidence time,.tv-news-evidence time > span,.tv-news-screening');
    for (const leaf of leaves) {
      const box = leaf.getBoundingClientRect(), size = parseFloat(getComputedStyle(leaf).fontSize);
      if (size < 13 || box.width < size || box.height < size || box.left < bounds.left - 1 || box.right > bounds.right + 1 || box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1) violations.push(name + leaf.className + ' unreadable or clipped');
      if (leaf.matches('.tv-news-screening') && (leaf.scrollWidth > leaf.clientWidth + 1 || leaf.scrollHeight > leaf.clientHeight + 1)) violations.push(name + 'screening label clipped');
    }
    const metadata = [...evidence.children];
    for (let i = 0; i < metadata.length; i++) for (let j = i + 1; j < metadata.length; j++) {
      const a = metadata[i].getBoundingClientRect(), b = metadata[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) violations.push(name + 'source, date or screening overlap');
    }
    return violations;
  }), { direction, viewport }), 'Thumbnail, headline, source and full date each retain their own readable space').toEqual([]);
}

async function expectKuwaitQuoteGeometry(page: Page, count: number) {
  const quotes = page.locator('.tv-receiver-quotes .tv-market-strip-item');
  await expect(quotes).toHaveCount(count);
  await expect.poll(() => quotes.evaluateAll(elements => elements.flatMap(card => {
    const violations: string[] = [], bounds = card.getBoundingClientRect();
    const symbol = card.querySelector('.tv-strip-symbol b')!.textContent || '';
    const price = card.querySelector('.tv-strip-price')!, change = card.querySelector('.tv-strip-change')!;
    const evidence = card.querySelector('.tv-strip-evidence')!;
    const index = Number(symbol.replace('TEST', '')), expectedPrice = (20 + index).toFixed(2);
    if (price.textContent?.trim().replace(/\s+/g, ' ') !== expectedPrice + ' USD') violations.push(symbol + ': incomplete price');
    if (change.textContent?.trim() !== (index % 2 ? '+1.10%' : '-1.30%')) violations.push(symbol + ': incomplete change');
    if (!evidence.textContent?.includes('QA provider') || !evidence.textContent?.includes('00:05')) violations.push(symbol + ': incomplete source or time');
    const parts = [price, change, evidence];
    for (const part of parts) {
      const box = part.getBoundingClientRect();
      if (!box.width || !box.height || box.left < bounds.left - 1 || box.right > bounds.right + 1 || box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1) violations.push(symbol + ': ' + part.className + ' outside quote');
      if (part.scrollWidth > part.clientWidth + 1 || part.scrollHeight > part.clientHeight + 1) violations.push(`${symbol}: ${part.className} clipped (client ${part.clientWidth}×${part.clientHeight}, scroll ${part.scrollWidth}×${part.scrollHeight})`);
    }
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i].getBoundingClientRect(), b = parts[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) violations.push(symbol + ': price, change or evidence overlap');
    }
    return violations;
  })), 'Kuwait quotes retain the complete number, change and evidence in separate visible spaces').toEqual([]);
}

async function expectRemoteStory(page: Page, cards: Locator, title: string) {
  await cards.first().focus();
  const direction = await cards.evaluateAll(elements => {
    const first = elements[0].getBoundingClientRect(), second = elements[1].getBoundingClientRect();
    return Math.abs(second.top - first.top) > Math.abs(second.left - first.left)
      ? 'ArrowDown' : second.left > first.left ? 'ArrowRight' : 'ArrowLeft';
  });
  await page.keyboard.press(direction);
  await expect(cards.nth(1)).toBeFocused();
  await cards.last().focus();
  await expect(cards.last()).toBeInViewport({ ratio: 0.99 });
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toContainText(title);
  await expect(page.getByRole('dialog')).toContainText('QA newsroom');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(cards.last()).toBeFocused();
}

for (const language of ['ar', 'en', 'fr'] as const) for (const theme of ['light', 'dark'] as const) {
  test('news cards ' + language + '/' + theme + ': all stories, thumbnails and dates fit landscape and portrait', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 1920, height: 1080 });
    const cards = await openNews(page, language, theme, 'europeNews');
    const headlines = newsItems(24, language).map(story => story.title), direction = language === 'ar' ? 'rtl' : 'ltr';
    await expect(cards.locator('.tv-news-title')).toHaveText(headlines.slice(0, 6));
    await expect(cards.first().locator('.tv-news-thumbnail')).toHaveAttribute('data-news-image', 'available');
    await expect.poll(() => cards.first().locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expectBrandedFallback(cards.nth(1).locator('.tv-news-thumbnail'));
    await expectBrandedFallback(cards.nth(2).locator('.tv-news-thumbnail'));
    await expect(cards.nth(1).locator('.tv-news-evidence > bdi')).toHaveText('QA newsroom');
    await expect(cards.nth(2).locator('.tv-news-evidence > bdi')).toHaveText('QA newsroom');
    await expect(cards.first().locator('time')).toHaveAttribute('aria-label', '2026-11-18 · 23:26');
    await expect(cards.first().locator('time')).toContainText('2026-11-18');
    await expect(cards.nth(1).locator('time')).toHaveAttribute('aria-label', '00:05');
    await expect(page.locator('.tv-news-desk .tv-broadcast-pager')).toBeVisible();
    await expect(page.locator('.tv-headline-playback')).toHaveCount(0);
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      await expectNewsPage(page, 24, height <= 650 ? 2 : width < 1500 ? 4 : 6);
      await expectCardGeometry(cards, direction);
      await expect(cards.first().locator('.tv-news-title')).toHaveCSS('direction', direction);
      await page.screenshot({ path: testInfo.outputPath('news-' + language + '-' + theme + '-' + width + '.png') });
    }
    await cards.first().focus();
    await page.clock.runFor(80000);
    await expect(cards.locator('.tv-news-title')).toHaveText(headlines.slice(0, 6));
    await expect(cards.first()).toBeFocused();
    await expectRemoteStory(page, cards, headlines[5]);
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNewsPage(page, 24, 2);
    await expectCardGeometry(cards, direction, false);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expectRemoteStory(page, cards, headlines[1]);
    await page.screenshot({ path: testInfo.outputPath('news-' + language + '-' + theme + '-portrait.png') });
    expect(errors).toEqual([]);
  });
}

for (const language of ['ar', 'en', 'fr'] as const) {
  test('news cards ' + language + '/sharia: all 24 screening labels and full dates fit compact TVs', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 960, height: 540 });
    const cards = await openNews(page, language, 'light', 'shariaNews');
    const headlines = newsItems(24, language).map(story => story.title);
    for (let offset = 0; offset < 24; offset += 2) {
      await expect(cards.locator('.tv-news-title')).toHaveText(headlines.slice(offset, offset + 2));
      await expect(cards.locator('.tv-news-screening')).toHaveText(Array.from({ length: 2 }, (_, index) => compactScreeningLabels[language][(offset + index) % 4]));
      for (let index = 0; index < 2; index++) {
        await expect(cards.nth(index).locator('.tv-news-screening')).toHaveAttribute('title', screeningLabels[language][(offset + index) % 4]);
      }
      await expectCardGeometry(cards, language === 'ar' ? 'rtl' : 'ltr');
      await page.locator('[data-tv-focus-key="news-next"]').click();
    }
    await expect(cards.first().locator('time')).toHaveAttribute('aria-label', '2026-11-18 · 23:26');
    await expect(cards.first().locator('time')).toContainText('2026-11-18');
    for (const [width, height] of [[960, 540], [1280, 720]]) {
      await page.setViewportSize({ width, height });
      await expectNewsPage(page, 24, height <= 650 ? 2 : 4);
      await expectCardGeometry(cards, language === 'ar' ? 'rtl' : 'ltr');
      await page.screenshot({ path: testInfo.outputPath('news-sharia-' + language + '-' + width + '.png') });
    }
    await cards.first().focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toContainText(screeningLabels[language][0]);
    await expect(page.getByRole('dialog')).toContainText(newsItems(24, language)[0].title);
    await page.keyboard.press('Escape');
    await expect(cards.first()).toBeFocused();
  });
}

for (const theme of ['light', 'dark'] as const) for (const view of ['hall', 'allStocks', 'world', 'kuwait'] as const) {
  test('news cards ' + theme + '/' + view + ': every received story remains visible with quotes', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const cards = await openNews(page, 'ar', theme, view), count = view === 'kuwait' ? 12 : 8;
    const headlines = newsItems(count, 'ar').map(story => story.title);
    await expect(cards.locator('.tv-news-title')).toHaveText(headlines);
    await expect(cards.first().locator('time')).toHaveAttribute('aria-label', '2026-11-18 · 23:26');
    await expect(page.locator('.tv-news-board .tv-broadcast-pager,.tv-headline-playback')).toHaveCount(0);
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      await expectCardGeometry(cards, 'rtl');
      await expect.poll(() => page.locator('[data-tv-root]').evaluate(root => root.scrollHeight <= root.clientHeight + 2)).toBe(true);
      if (view === 'hall' || view === 'allStocks') {
        await expect(page.locator('.tv-hall-row')).toHaveCount(height <= 650 ? 3 : 6);
        for (const selector of ['.tv-hall-market-table', '.tv-quote-marquee']) await expect(page.locator(selector)).toBeInViewport({ ratio: 1 });
      }
      if (view === 'kuwait') await expectKuwaitQuoteGeometry(page, height <= 650 ? 4 : 6);
      await page.screenshot({ path: testInfo.outputPath('news-' + view + '-' + theme + '-' + width + '.png') });
    }
    await cards.last().focus();
    await page.clock.runFor(80000);
    await expect(cards.locator('.tv-news-title')).toHaveText(headlines);
    await expect(cards.last()).toBeFocused();
    await expectRemoteStory(page, cards, headlines[count - 1]);
  });
}

test('a failed provider image keeps its reserved size and article readable', async ({ page }) => {
  let releaseBroken: () => void = () => undefined;
  const brokenResponse = new Promise<void>(resolve => { releaseBroken = resolve; });
  await page.setViewportSize({ width: 1280, height: 720 });
  const cards = await openNews(page, 'en', 'light', 'europeNews', brokenResponse), broken = cards.nth(2);
  const geometry = () => broken.evaluate(card => [card, card.querySelector('.tv-news-thumbnail')!, card.querySelector('.tv-news-title')!].map(element => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }));
  await expect(broken.locator('.tv-news-thumbnail')).toHaveAttribute('data-news-image', 'available');
  const before = await geometry();
  releaseBroken();
  await expectBrandedFallback(broken.locator('.tv-news-thumbnail'));
  expect(await geometry()).toEqual(before);
  await expect(broken.locator('.tv-news-title')).toHaveText(newsItems(24, 'en')[2].title);
  await expect(broken.locator('.tv-news-evidence > bdi')).toHaveText('QA newsroom');
  await expect(broken.locator('time')).toHaveAttribute('aria-label', '2026-11-18 · 23:26');
  await broken.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toContainText(newsItems(24, 'en')[2].title);
  await expect(page.getByRole('dialog')).toContainText('QA newsroom');
  await expectBrandedFallback(page.getByRole('dialog').locator('.tv-news-thumbnail'));
  await page.keyboard.press('Escape');
  await expect(broken).toBeFocused();
});

test('refreshed articles replace missing or failed images with the new provider photo', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const cards = await openNews(page, 'en', 'dark', 'europeNews');
  for (const index of [1, 2]) await expectBrandedFallback(cards.nth(index).locator('.tv-news-thumbnail'));
  const replacementUrl = imageOrigin + '/recovered.svg';
  await page.route('**/api/europe-news?**', route => {
    const stories = newsItems(24, 'en').map((story, index) => index === 1 || index === 2 ? { ...story, imageUrl: replacementUrl } : story);
    return route.fulfill({ json: { items: stories, success: true, generatedAt: instant, lastSuccessfulUpdate: instant } });
  });
  const tools = await openTvHeaderActions(page);
  await Promise.all([
    page.waitForResponse('**/api/europe-news?**'),
    tools.locator('[data-tv-focus-key="refresh"]').click(),
  ]);
  await closeTvHeaderActions(page);
  for (const index of [1, 2]) {
    const card = cards.nth(index), thumbnail = card.locator('.tv-news-thumbnail');
    await expect(thumbnail).toHaveAttribute('data-news-image', 'available');
    await expect(thumbnail.locator('img')).toHaveAttribute('src', replacementUrl);
    await expect.poll(() => thumbnail.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(card.locator('.tv-news-evidence > bdi')).toHaveText('QA newsroom');
  }
  await expectCardGeometry(cards, 'ltr');
});

test('an unavailable bundled fallback keeps SFM NEWS visible without an image retry loop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const cards = await openNews(page, 'en', 'light', 'europeNews');
  await expectBrandedFallback(cards.nth(1).locator('.tv-news-thumbnail'));
  let requests = 0;
  // Register after the package harness so this precise failure overrides its asset route.
  await page.route('**/markets-tv/sfm-news-fallback.webp', route => {
    requests++;
    return route.fulfill({ status: 404, body: '' });
  });
  await page.reload();
  await expectNewsPage(page, 24, 4);
  for (const index of [1, 2]) {
    const thumbnail = cards.nth(index).locator('.tv-news-thumbnail');
    await expect(thumbnail).toHaveAttribute('data-news-image', 'fallback');
    await expect(thumbnail.locator('img')).toHaveCount(0);
    await expect(thumbnail).toHaveText(/SFM\s*NEWS/);
    await expect(thumbnail).toBeVisible();
    await expect(cards.nth(index).locator('.tv-news-evidence > bdi')).toHaveText('QA newsroom');
  }
  await expectCardGeometry(cards, 'ltr');
  expect(requests).toBeGreaterThan(0);
  const failedRequests = requests;
  await page.clock.runFor(10000);
  expect(requests).toBe(failedRequests);
  const tools = await openTvHeaderActions(page);
  await Promise.all([
    page.waitForResponse('**/api/europe-news?**'),
    tools.locator('[data-tv-focus-key="refresh"]').click(),
  ]);
  await closeTvHeaderActions(page);
  await expect(cards.nth(1).locator('.tv-news-thumbnail')).toHaveText(/SFM\s*NEWS/);
  await expect(cards.nth(2).locator('.tv-news-thumbnail')).toHaveText(/SFM\s*NEWS/);
  expect(requests).toBe(failedRequests);
});

for (const [channel, theme] of [['growthNews', 'light'], ['unusualNews', 'dark']] as const) {
  test(`${channel} recovers publisher photos without showing a cropped logo or blocking headlines`, async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 864 });
    await openNews(page, 'ar', theme, 'europeNews');
    const logo = 'https://s.yimg.com/rz/stage/p/yahoo_finance_en-US_h_p_finance_2.png';
    const stories = newsItems(4, 'ar').map((item, index) => ({
      ...item, id: 'story-' + String(index).padStart(24, '0'),
      imageUrl: [logo, undefined, imageOrigin + '/broken.svg', imageOrigin + '/market.svg'][index],
    }));
    const growth = channel === 'growthNews';
    await page.route(growth ? '**/api/growth-stocks/news?**' : '**/api/market/special-news?topic=unusual-moves-news**',
      route => route.fulfill({ json: { items: stories, ...(growth ? { category: 'growth' } : { topic: 'unusual-moves-news' }), lastSuccessfulUpdate: instant } }));
    const lookups = new Set<string>();
    let release!: () => void;
    const delayed = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/tv/news/photo/*', async route => {
      const id = new URL(route.request().url()).pathname.split('/').pop()!;
      lookups.add(id);
      if (id === stories[1].id) return route.fulfill({ status: 404, body: '' });
      await delayed;
      return route.fulfill({ contentType: 'image/svg+xml', body: fixtureImage });
    });
    await chooseTvBroadcast(page, channel);
    const cards = page.locator('.tv-news-card');
    await expect(cards).toHaveCount(4);
    await expect(cards.first().locator('.tv-news-title')).toHaveText(stories[0].title);
    await expect(cards.locator(`img[src="${logo}"]`)).toHaveCount(0);
    await expect(cards.first().locator('img[src$="sfm-news-fallback.webp"]')).toBeVisible();
    release();
    for (const index of [0, 2]) {
      const thumbnail = cards.nth(index).locator('.tv-news-thumbnail');
      await expect(thumbnail).toHaveAttribute('data-news-image', 'available');
      await expect(thumbnail.locator('img')).toHaveAttribute('src', new RegExp('/api/tv/news/photo/' + stories[index].id + '$'));
    }
    await expectBrandedFallback(cards.nth(1).locator('.tv-news-thumbnail'));
    await expect(cards.nth(3).locator('img')).toHaveAttribute('src', imageOrigin + '/market.svg');
    expect([...lookups].sort()).toEqual(stories.slice(0, 3).map(item => item.id));
    await cards.first().click();
    await expect(page.getByRole('dialog').locator('.tv-news-thumbnail')).toHaveAttribute('data-news-image', 'available');
    await expect(page.getByRole('dialog')).toContainText(stories[0].title);
  });
}
