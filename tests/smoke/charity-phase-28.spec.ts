import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

type Language = 'ar' | 'en' | 'fr';
type Theme = 'light' | 'dark';

const artifactDir = path.join(process.cwd(), 'artifacts', 'charity-phase-28');
const localQaEnabled = process.env.SFM_LOCAL_CHARITY_QA === '1';
const localQaBaseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:3400';

async function openExperience(
  browser: Browser,
  options: {
    path: string;
    marker: string;
    language: Language;
    theme: Theme;
    viewport: { width: number; height: number };
  },
) {
  const context = await browser.newContext({ viewport: options.viewport, colorScheme: options.theme });
  await context.addCookies([{ name: 'sfm_access_token', value: 'qa-token', url: localQaBaseUrl }]);
  await context.addInitScript(({ language, theme }) => {
    localStorage.setItem('sfm_lang', language);
    localStorage.setItem('the-sfm-theme', theme);
    const now = Math.floor(Date.now() / 1000);
    const user = {
      id: '00000000-0000-4000-8000-000000000028',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'charity-qa@local.invalid',
      email_confirmed_at: new Date(now * 1000).toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { name: 'Charity QA' },
      identities: [],
      created_at: new Date(now * 1000).toISOString(),
    };
    localStorage.setItem('sb-127-auth-token', JSON.stringify({
      access_token: 'qa-token',
      token_type: 'bearer',
      expires_in: 86_400,
      expires_at: now + 86_400,
      refresh_token: 'qa-refresh-token',
      user,
    }));
  }, { language: options.language, theme: options.theme });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/api/market/metals**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      source: 'api',
      gold: { price: 33, currency: 'KWD', unit: 'gram', lastUpdated: '2026-07-12T05:00:00.000Z' },
      silver: { price: 0.8, currency: 'KWD', unit: 'gram', lastUpdated: '2026-07-12T05:00:00.000Z' },
    }),
  }));

  await page.goto(options.path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  const root = page.locator(`[data-charity-experience="${options.marker}"]`);
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('dir', options.language === 'ar' ? 'rtl' : 'ltr');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  return { context, page, pageErrors };
}

async function capture(page: Page, name: string) {
  await mkdir(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true });
}

async function closeCleanly(context: BrowserContext, pageErrors: string[]) {
  expect(pageErrors, `Unexpected browser runtime errors: ${pageErrors.join(' | ')}`).toEqual([]);
  await context.close();
}

test.describe('Phase 2.8 Zakat, Khums and Charity experience', () => {
  test.skip(!localQaEnabled, 'Set SFM_LOCAL_CHARITY_QA=1 and use the local mock Supabase harness.');

  test('Charity Center is readable across desktop, tablet, mobile, locales, and themes', async ({ browser }) => {
    test.setTimeout(120_000);
    const modes = [
      { name: 'desktop-en-light', language: 'en', theme: 'light', viewport: { width: 1440, height: 900 } },
      { name: 'desktop-ar-dark', language: 'ar', theme: 'dark', viewport: { width: 1440, height: 900 } },
      { name: 'tablet-fr-light', language: 'fr', theme: 'light', viewport: { width: 1024, height: 768 } },
      { name: 'tablet-en-dark', language: 'en', theme: 'dark', viewport: { width: 1024, height: 768 } },
      { name: 'mobile-ar-light', language: 'ar', theme: 'light', viewport: { width: 390, height: 844 } },
      { name: 'mobile-fr-dark', language: 'fr', theme: 'dark', viewport: { width: 390, height: 844 } },
    ] as const;

    for (const mode of modes) {
      const session = await openExperience(browser, {
        path: '/charity',
        marker: 'center',
        language: mode.language,
        theme: mode.theme,
        viewport: mode.viewport,
      });
      await expect(session.page.locator('a[href="/zakat"]').first()).toBeVisible();
      await expect(session.page.locator('a[href="/khums"]').first()).toBeVisible();
      await expect(session.page.locator('a[href="/charity/donations"]').first()).toBeVisible();
      await expect(session.page.locator('a[href="/charity-projects?tab=beneficiaries"]').first()).toBeVisible();
      await capture(session.page, `center-${mode.name}`);
      await closeCleanly(session.context, session.pageErrors);
    }
  });

  test('independent workflows remain responsive and URL-addressable', async ({ browser }) => {
    test.setTimeout(120_000);
    const workflows = [
      { name: 'zakat-calculation', path: '/zakat?tab=calculation', marker: 'zakat', language: 'en', theme: 'light', viewport: { width: 1440, height: 900 }, tab: 'calculation' },
      { name: 'khums-distribution', path: '/khums?tab=distribution', marker: 'khums', language: 'ar', theme: 'dark', viewport: { width: 1024, height: 768 }, tab: 'distribution' },
      { name: 'projects-presentation', path: '/charity-projects?tab=projects', marker: 'projects', language: 'en', theme: 'dark', viewport: { width: 1440, height: 900 }, tab: 'projects' },
      { name: 'zakat-project-scope', path: '/charity-projects?tab=projects&scope=zakat', marker: 'projects', language: 'en', theme: 'light', viewport: { width: 1024, height: 768 }, tab: 'projects' },
      { name: 'projects-beneficiaries', path: '/charity-projects?tab=beneficiaries', marker: 'projects', language: 'fr', theme: 'light', viewport: { width: 390, height: 844 }, tab: 'beneficiaries' },
      { name: 'reports-register', path: '/charity-projects?tab=reports', marker: 'projects', language: 'en', theme: 'light', viewport: { width: 1024, height: 768 }, tab: 'reports' },
      { name: 'charity-print-report', path: '/charity-projects/report?year=2026', marker: 'report', language: 'fr', theme: 'dark', viewport: { width: 1024, height: 768 } },
      { name: 'voluntary-donations', path: '/charity/donations', marker: 'donations', language: 'en', theme: 'dark', viewport: { width: 390, height: 844 } },
    ] as const;

    for (const workflow of workflows) {
      const session = await openExperience(browser, workflow);
      if ('tab' in workflow) {
        await expect(session.page).toHaveURL(new RegExp(`[?&]tab=${workflow.tab}(?:&|$)`));
        const panel = session.page.locator(`[role="tabpanel"][id$="-panel-${workflow.tab}"]`);
        await expect(panel).toBeVisible();
      }
      await capture(session.page, workflow.name);
      await closeCleanly(session.context, session.pageErrors);
    }
  });

  test('desktop workflow tabs expose keyboard and screen-reader relationships', async ({ browser }) => {
    const workflows = [
      { path: '/zakat', marker: 'zakat', count: 8 },
      { path: '/khums', marker: 'khums', count: 7 },
      { path: '/charity-projects', marker: 'projects', count: 8 },
    ];

    for (const workflow of workflows) {
      const session = await openExperience(browser, {
        ...workflow,
        language: 'en',
        theme: 'light',
        viewport: { width: 1440, height: 900 },
      });
      const tablist = session.page.getByRole('tablist');
      await expect(tablist).toBeVisible();
      const tabs = tablist.getByRole('tab');
      await expect(tabs).toHaveCount(workflow.count);
      const active = tablist.locator('[role="tab"][aria-selected="true"]');
      await expect(active).toHaveCount(1);
      const first = tabs.first();
      await first.focus();
      await first.press('ArrowRight');
      await expect(tabs.nth(1)).toBeFocused();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
      const controls = await tabs.nth(1).getAttribute('aria-controls');
      expect(controls).toBeTruthy();
      await expect(session.page.locator(`#${controls}`)).toHaveAttribute('role', 'tabpanel');
      await closeCleanly(session.context, session.pageErrors);
    }
  });

  test('charity dialogs trap focus, isolate the background, and restore the trigger', async ({ browser }) => {
    const session = await openExperience(browser, {
      path: '/charity-projects?tab=projects',
      marker: 'projects',
      language: 'en',
      theme: 'light',
      viewport: { width: 1440, height: 900 },
    });
    const trigger = session.page.getByRole('button', { name: 'New Charity Project' }).first();
    await trigger.focus();
    await trigger.click();
    const dialog = session.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(session.page.locator('.sfm-dashboard-page-shell')).toHaveAttribute('aria-hidden', 'true');
    await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);

    const focusable = dialog.locator('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
    const first = focusable.first();
    const last = focusable.last();
    await last.focus();
    await last.press('Tab');
    await expect(first).toBeFocused();
    await first.press('Shift+Tab');
    await expect(last).toBeFocused();
    await dialog.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(session.page.locator('.sfm-dashboard-page-shell')).not.toHaveAttribute('aria-hidden', 'true');
    await closeCleanly(session.context, session.pageErrors);
  });
});
