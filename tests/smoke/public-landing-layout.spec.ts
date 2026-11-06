import { expect, test } from '@playwright/test';

// The old unlayered dashboard reset set margins/padding to zero, which passed
// no-overflow checks but anchored the entire public page to one side at 2560px.
for (const lang of ['ar', 'en', 'fr'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`public home stays centered and readable in ${lang}/${theme}`, async ({ page }) => {
      await page.addInitScript(({ lang, theme }) => {
        localStorage.setItem('sfm_lang', lang);
        localStorage.setItem('the-sfm-theme', theme);
      }, { lang, theme });
      await page.goto('/');
      await expect(page.locator('.landing-page')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
      await page.evaluate(() => document.fonts.ready);
      for (const width of [2560, 1440, 834, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        const geometry = await page.locator('.landing-page').evaluate(root => {
          const hero = root.querySelector('section')!;
          const content = hero.firstElementChild!;
          const rect = content.getBoundingClientRect();
          const title = root.querySelector('h1')!;
          const bodyStyle = getComputedStyle(document.body);
          const cardTitle = root.querySelector('h3')!;
          const number = root.querySelector('[class*="featureIndex"]')!;
          const links = [...root.querySelectorAll('header a, header button')].filter(el => el.getBoundingClientRect().width > 0);
          return {
            left: rect.left, right: document.documentElement.clientWidth - rect.right,
            padding: parseFloat(getComputedStyle(content).paddingTop),
            titleSize: parseFloat(getComputedStyle(title).fontSize),
            titleLeading: parseFloat(getComputedStyle(title).lineHeight),
            titleFamily: getComputedStyle(title).fontFamily,
            sectionFamilies: [...root.querySelectorAll('h2')].map(heading => getComputedStyle(heading).fontFamily),
            cardTitleFamily: getComputedStyle(cardTitle).fontFamily,
            numberFamily: getComputedStyle(number).fontFamily,
            bodyFamily: bodyStyle.fontFamily,
            bodySize: parseFloat(bodyStyle.fontSize),
            bodyLeading: parseFloat(bodyStyle.lineHeight),
            loadedFontFamilies: [...document.fonts]
              .filter(face => face.status === 'loaded' && !face.family.toLowerCase().includes('fallback'))
              .map(face => face.family.replace(/[^a-z]/gi, '').toLowerCase()),
            undersizedText: [...root.querySelectorAll('*')].filter(element => {
              const box = element.getBoundingClientRect();
              const hasOwnText = [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
              return hasOwnText && box.width > 0 && box.height > 0 && parseFloat(getComputedStyle(element).fontSize) < 12;
            }).length,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            clippedControls: links.filter(el => { const box = el.getBoundingClientRect(); return box.left < -1 || box.right > innerWidth + 1; }).length,
          };
        });
        expect(Math.abs(geometry.left - geometry.right)).toBeLessThan(2);
        expect(geometry.left).toBeGreaterThanOrEqual(17);
        expect(geometry.padding).toBeGreaterThanOrEqual(40);
        expect(geometry.titleSize).toBe(28);
        expect(geometry.titleLeading).toBe(38);
        expect(geometry.titleFamily.toLowerCase()).toContain('cairo');
        for (const family of geometry.sectionFamilies) expect(family.toLowerCase()).toContain('cairo');
        for (const family of [geometry.bodyFamily, geometry.cardTitleFamily]) {
          expect(family.replace(/[^a-z]/gi, '').toLowerCase()).toContain('ibmplexsansarabic');
        }
        expect(geometry.numberFamily.replace(/[^a-z]/gi, '').toLowerCase()).toContain('ibmplexmono');
        expect(geometry.bodySize).toBe(15);
        expect(geometry.bodyLeading).toBe(24);
        expect(geometry.bodyLeading / geometry.bodySize).toBeGreaterThanOrEqual(1.6);
        expect(geometry.undersizedText).toBe(0);
        for (const family of ['ibmplexsansarabic', 'cairo', 'ibmplexmono']) {
          expect(geometry.loadedFontFamilies.some(loaded => loaded.includes(family))).toBe(true);
        }
        expect(geometry.overflow).toBeLessThanOrEqual(1);
        expect(geometry.clippedControls).toBe(0);
        await expect(page.locator('h1')).toBeVisible();
      }
    });
  }
}

test('public home workspace preview, menu, features and FAQ remain usable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sfm_lang', 'ar'));
  await page.goto('/');
  const preview = page.getByRole('complementary', { name: 'استكشف مساحات المنصة' });
  await preview.getByRole('button', { name: 'الأسواق', exact: true }).click();
  await expect(preview.getByRole('link', { name: 'الأسواق العالمية' })).toHaveAttribute('href', '/global-markets');
  await preview.getByRole('button', { name: 'الأعمال', exact: true }).click();
  await expect(preview.getByRole('link', { name: 'مركز الأعمال' })).toHaveAttribute('href', '/business-hub');
  await page.getByRole('button', { name: 'كل المميزات', exact: true }).click();
  await expect(page.locator('#landing-features article')).toHaveCount(10);
  await page.getByRole('button', { name: 'هل حاسبة الزكاة تحتاج تسجيل؟', exact: true }).click();
  await expect(page.locator('#landing-answer-2')).toBeVisible();
  await expect(page.locator('#landing-answer-0')).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'القائمة الرئيسية', exact: true }).click();
  await expect(page.locator('#landing-mobile-menu')).toBeVisible();
  await page.locator('#landing-mobile-menu').getByRole('link', { name: 'المميزات', exact: true }).click();
  await expect(page.locator('#landing-mobile-menu')).toHaveCount(0);
  // Pricing is currently intentionally disabled by temporary-product-flags.css.
  await expect(page.locator('a[href="#pricing"]').first()).toBeHidden();
});
