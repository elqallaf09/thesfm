import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { build, normalizePath } from 'vite';

// Mount the real owner form without Next authentication, external services, or
// a second production build. Only Next's navigation link is replaced; the form,
// React events, resource hook, and request serialization remain production code.
let harnessHtml = '';
test.beforeAll(async () => {
 const entry = normalizePath(resolve('tests/packaged/.tv-consent-harness.tsx'));
 const result = await build({
  configFile: false,
  root: process.cwd(),
  logLevel: 'error',
  resolve: { alias: { '@': resolve('src') } },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  plugins: [{
   name: 'owner-consent-test-harness',
   resolveId(id) { if (id === entry) return entry; if (id === 'next/link') return '\0consent-link'; },
   load(id) {
    if (id === '\0consent-link') return "import { createElement } from 'react'; export default function Link(props) { return createElement('a', props); }";
    if (id === entry) return "import { createRoot } from 'react-dom/client'; import { TvAccount } from '@/components/markets-tv/TvAccount'; createRoot(document.getElementById('root')).render(<TvAccount />);";
   },
  }],
  build: { write: false, minify: false, target: 'chrome85', rollupOptions: { input: entry, output: { format: 'iife', inlineDynamicImports: true } } },
 });
 const outputs = (Array.isArray(result) ? result : [result]).flatMap(item => 'output' in item ? item.output : []);
 const script = outputs.filter(item => item.type === 'chunk').map(item => item.code).join('\n').replaceAll('</script', '<\\/script');
 const styles = outputs.flatMap(item => item.type === 'asset' && item.fileName.endsWith('.css') ? [String(item.source)] : []).join('\n');
 harnessHtml = `<!doctype html><html><head><style>${styles}</style></head><body><div id="root"></div><script>${script}</script></body></html>`;
});

test.beforeEach(async ({ context, page }) => {
 await context.route('**/*', route => route.abort('blockedbyclient'));
 await page.route('https://tv-consent.test/tv/pair', route => route.fulfill({ contentType: 'text/html', body: harnessHtml }));
});

test('owner approval is optional, defaults unchecked, and submits only the explicit choice', async ({ page }) => {
 const submissions: { code: string; portfolioConsent: boolean }[] = [];
 await page.route('**/api/tv/account', route => {
  if (route.request().method() === 'POST') submissions.push(route.request().postDataJSON());
  return route.fulfill({ json: route.request().method() === 'POST' ? { ok: true } : { devices: [] } });
 });
 await page.goto('https://tv-consent.test/tv/pair#ABCDEF123456');
 await page.getByRole('button', { name: 'English', exact: true }).click();
 const checkbox = page.getByRole('checkbox');
 const code = page.locator('form input:not([type="checkbox"])');
 const submit = page.locator('form button[type="submit"]');
 await expect(code).toHaveValue('ABCDEF123456');
 await expect(checkbox).not.toBeChecked();
 await expect(checkbox).toHaveAccessibleDescription(/Anyone viewing this screen can see the values/);
 await expect(submit).toBeEnabled();
 await submit.click();
 await expect.poll(() => submissions).toEqual([{ code: 'ABCDEF123456', portfolioConsent: false }]);
 await expect(code).toHaveValue('');
 await expect(checkbox).not.toBeChecked();
 await expect(page).toHaveURL('https://tv-consent.test/tv/pair');
 expect(await page.evaluate(() => sessionStorage.getItem('sfm-tv-pair-code'))).toBeNull();
 await code.fill('123456ABCDEF');
 await checkbox.check();
 await submit.click();
 await expect.poll(() => submissions.length).toBe(2);
 expect(submissions[1]).toEqual({ code: '123456ABCDEF', portfolioConsent: true });
 await expect(code).toHaveValue('');
 await expect(checkbox).not.toBeChecked();
 await expect(submit).toBeDisabled();
});

test('editing a pairing code withdraws consent and failed approval cannot silently authorize another TV', async ({ page }) => {
 const submissions: { code: string; portfolioConsent: boolean }[] = [];
 await page.route('**/api/tv/account', route => {
  if (route.request().method() !== 'POST') return route.fulfill({ json: { devices: [] } });
  submissions.push(route.request().postDataJSON());
  return route.fulfill({ status: 400, json: { code: 'INVALID_CODE' } });
 });
 await page.goto('https://tv-consent.test/tv/pair');
 const checkbox = page.getByRole('checkbox');
 const code = page.locator('form input:not([type="checkbox"])');
 const submit = page.locator('form button[type="submit"]');
 await expect(checkbox).not.toBeChecked();
 await code.fill('ABCDEF123456');
 await checkbox.check();
 await code.fill('123456ABCDEF');
 await expect(checkbox).not.toBeChecked();
 await submit.click();
 await expect.poll(() => submissions).toEqual([{ code: '123456ABCDEF', portfolioConsent: false }]);
 await expect(submit).toBeEnabled();
 await expect(checkbox).not.toBeChecked();
 await checkbox.check();
 await submit.click();
 await expect.poll(() => submissions.length).toBe(2);
 expect(submissions[1].portfolioConsent).toBe(true);
 await expect(submit).toBeEnabled();
 await code.fill('AABBCC112233');
 await expect(checkbox).not.toBeChecked();
});

test('restoring a pairing code never restores investment consent, and controls lock during submission', async ({ page }) => {
 let pending: import('@playwright/test').Route | undefined;
 await page.addInitScript(() => {
  sessionStorage.setItem('sfm-tv-pair-code', 'ABCDEF123456');
  localStorage.setItem('portfolioConsent', 'true');
  sessionStorage.setItem('portfolioConsent', 'true');
 });
 await page.route('**/api/tv/account', route => {
  if (route.request().method() === 'POST') { pending = route; return; }
  return route.fulfill({ json: { devices: [] } });
 });
 await page.goto('https://tv-consent.test/tv/pair');
 const checkbox = page.getByRole('checkbox');
 const code = page.locator('form input:not([type="checkbox"])');
 const submit = page.locator('form button[type="submit"]');
 await expect(code).toHaveValue('ABCDEF123456');
 await expect(checkbox).not.toBeChecked();
 await checkbox.check();
 await submit.click();
 await expect.poll(() => Boolean(pending)).toBe(true);
 await expect(checkbox).toBeDisabled();
 await expect(code).toBeDisabled();
 await expect(submit).toBeDisabled();
 expect(pending!.request().postDataJSON()).toEqual({ code: 'ABCDEF123456', portfolioConsent: true });
 await pending!.fulfill({ json: { ok: true } });
 await expect(code).toHaveValue('');
 await expect(checkbox).toBeEnabled();
 await expect(checkbox).not.toBeChecked();
});
