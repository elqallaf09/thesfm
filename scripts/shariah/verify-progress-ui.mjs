// Isolated real-component browser tests. All data below is synthetic and never persisted.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';
const require = createRequire(import.meta.url);
const viteRequire = createRequire(createRequire(require.resolve('vitest/package.json')).resolve('vite/package.json'));
const { build } = viteRequire('esbuild');
const root = process.cwd();
const work = await mkdtemp(path.join(tmpdir(), 'shariah-ui-'));
const proof = path.resolve(process.env.SHARIAH_UI_PROOF_DIR || path.join(work, 'proof'));
await mkdir(proof, { recursive: true });
const labels = {
  admin_permission_dashboard: 'لوحة الإدارة', admin_shariah_desc: 'اختبار واجهة معزول ببيانات اصطناعية — ليس تقرير إنتاج.',
  admin_shariah_manual_review: 'المراجعة اليدوية', admin_shariah_select: 'اختر سهمًا من الجدول لبدء المراجعة.',
  admin_shariah_symbol: 'الرمز', admin_name: 'الاسم', admin_shariah_market: 'السوق', admin_status: 'الحالة', admin_shariah_last_review: 'آخر مراجعة',
  admin_shariah_title: 'تصنيفات التوافق الشرعي', admin_shariah_review: 'مراجعة',
  admin_search: 'بحث', admin_shariah_load_error: 'تعذّر تحميل البيانات.',
  admin_shariah_search_placeholder: 'ابحث بالرمز أو الاسم', admin_shariah_loading: 'يجري التحميل',
  admin_shariah_compliant: 'متوافق', admin_shariah_non_compliant: 'غير متوافق',
  admin_shariah_needs_review: 'يحتاج مراجعة', admin_shariah_unclassified: 'غير مصنف',
};
await build({ absWorkingDir: root, stdin: {
  contents: "import React from 'react'; import {createRoot} from 'react-dom/client'; import Page from './src/app/sfm-admin-control/shariah/ShariahAdminClient'; createRoot(document.getElementById('app')).render(<Page reviewer='Synthetic test reviewer'/>);",
  resolveDir: root, loader: 'tsx', sourcefile: 'isolated-progress-test.tsx',
}, bundle: true, platform: 'browser', jsx: 'automatic', outfile: path.join(work, 'app.js'),
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'test-only-language', setup(plugin) {
    plugin.onResolve({ filter: /^@\/hooks\/useLanguage$/ }, () => ({ path: 'language', namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
      contents: `const labels=${JSON.stringify(labels)}; const t=(key)=>labels[key]||key; export function useLanguage(){return {lang:'ar',dir:'rtl',t}}`, loader: 'js',
    }));
  } }],
});
const bundle = await readFile(path.join(work, 'app.js'));
const html = '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--background:#f7f8fc;--surface:#fff;--border:#cfd4e3;--primary:#5142e9;--primary-foreground:white;--foreground:#152448;--foreground-secondary:#566079;--foreground-muted:#58627e;--radius-panel:12px;--radius-control:8px;--font-ui:Arial;--font-data:monospace}body{font-family:Arial;padding:20px;background:var(--background)}button,input{font:inherit}</style><div id="app"></div></html>';
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
const rows = [
  { id: '00000000-0000-4000-8000-000000000001', symbol: 'JPM', name: 'Synthetic bank example', asset_type: 'stock', exchange: 'NYSE', shariah_status: 'non_compliant' },
  { id: '00000000-0000-4000-8000-000000000002', symbol: 'TSLA', name: 'Synthetic retry example', asset_type: 'stock', exchange: 'NASDAQ', shariah_status: 'unclassified', shariah_refresh_error: 'official_provider_timed_out' },
];
const catalog = (patch={}) => ({ ok: true, items: rows, counts: { compliant: 0, non_compliant: 1, needs_review: 0, unclassified: 1 }, lastRun: null, ...patch });
const batch = (runId, patch={}) => ({ runId, ok: true, scanned: 3, updated: 3, failed: [], hasMore: false, ...patch });
const tests = [];
async function scenario(name, handler, verify) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
  const posts = []; let gets = 0;
  // Pure offline transport: no browser network access or authentication bypass.
  await page.exposeFunction('__fixtureRequest', async ({ method, body, url }) => {
    if (method === 'POST') posts.push(JSON.parse(body)); else gets++;
    const custom = await handler({ method, postNumber: posts.length, getNumber: gets, url });
    return custom ?? { body: catalog() };
  });
  await page.setContent(html);
  await page.evaluate(() => {
    window.fetch = (url, options = {}) => new Promise((resolve, reject) => {
      const signal = options.signal;
      if (signal?.aborted) { reject(signal.reason); return; }
      const aborted = () => reject(signal.reason);
      signal?.addEventListener('abort', aborted, { once: true });
      window.__fixtureRequest({ url: String(url), method: options.method || 'GET', body: options.body }).then(result => {
        if (signal?.aborted) return;
        if (result.abort) reject(new TypeError('Synthetic lost response'));
        else resolve(new Response(JSON.stringify(result.body), { status: result.status || 200, headers: { 'content-type': 'application/json' } }));
      }, reject).finally(() => signal?.removeEventListener('abort', aborted));
    });
  });
  await page.addScriptTag({ content: bundle.toString() });
  await page.getByRole('cell', { name: 'JPM', exact: true }).waitFor();
  await verify(page, posts);
  await page.screenshot({ path: path.join(proof, `${name}.png`), fullPage: true });
  tests.push({ name, status: 'passed', posts: posts.length, reads: gets });
  await page.close();
}
const start = page => page.getByRole('button', { name: 'تحديث التصنيفات المستحقة الآن', exact: true }).click();
try {
  await scenario('partial-success', async ({ method, postNumber }) => method === 'POST' ? { body: postNumber === 1
    ? batch('run-1', { ok: false, updated: 2, hasMore: true, failed: [{ symbol: 'TSLA', reason: 'official_provider_timed_out' }] }) : batch('run-2') } : null,
  async (page, posts) => {
    await start(page);
    await page.getByText('اكتمل التشغيل جزئيًا.', { exact: false }).waitFor({ timeout: 15000 });
    assert.match(await page.locator('.evidence-panel [role="status"]').first().innerText(), /5\s*\/\s*6/);
    assert.equal(posts.length, 2); assert.deepEqual(posts, [{ limit: 3 }, { limit: 3 }]);
  });
  await scenario('read-failed-after-save', async ({ method, getNumber }) => method === 'POST' ? { body: batch('saved') }
    : getNumber > 1 ? { status: 503, body: { ok: false, code: 'LOAD_FAILED' } } : null,
  async (page, posts) => {
    await start(page);
    await page.getByText('الحفظ مؤكد، لكن تعذّر تحديث عرض الجدول.', { exact: false }).waitFor();
    assert.match(await page.locator('.evidence-panel [role="status"]').first().innerText(), /3\s*\/\s*3/);
    assert.equal(await page.getByRole('cell', { name: 'JPM', exact: true }).count(), 1); assert.equal(posts.length, 1);
  });
  await scenario('counts-only-unavailable', async () => ({ body: catalog({ counts: null, countsError: 'SHARIAH_COUNTS_UNAVAILABLE' }) }),
  async page => { await page.getByText('تعذّر تحديث العدادات فقط.', { exact: false }).waitFor(); assert.equal(await page.locator('tbody tr').count(), 2); });
  await scenario('targeted-retry', async ({ method }) => method === 'POST' ? { body: batch('retry', { scanned: 1, updated: 1 }) } : null,
  async (page, posts) => {
    await page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'TSLA', exact: true }) }).getByRole('button', { name: 'مراجعة', exact: true }).click();
    await page.getByRole('button', { name: 'إعادة محاولة السهم المحدد فقط', exact: true }).click();
    await page.getByText('اكتملت الدفعات المطلوبة وحُفظت نتائجها.', { exact: true }).waitFor();
    assert.deepEqual(posts, [{ limit: 1, symbolId: rows[1].id, force: true }]);
  });
  await scenario('lost-response-no-replay', async ({ method, postNumber }) => method === 'POST'
    ? postNumber === 1 ? { body: batch('first', { hasMore: true }) } : { abort: true } : null,
  async (page, posts) => {
    await start(page); await page.getByText('تعذّر تأكيد بقية التشغيل.', { exact: false }).waitFor({ timeout: 15000 });
    assert.match(await page.locator('.evidence-panel [role="status"]').first().innerText(), /3\s*\/\s*3/);
    assert.equal(posts.length, 2);
  });
  await scenario('expired-session', async ({ method }) => method === 'POST' ? { status: 401, body: { code: 'UNAUTHORIZED' } } : null,
  async (page, posts) => { await start(page); await page.getByText('انتهت الجلسة أو لا تتوفر الصلاحية.', { exact: false }).waitFor(); assert.equal(posts.length, 1); });
  await scenario('malformed-read-preserves-rows', async ({ method, getNumber }) => method === 'POST' ? { body: batch('saved') }
    : getNumber > 1 ? { body: {} } : null,
  async page => { await start(page); await page.getByText('الحفظ مؤكد، لكن تعذّر تحديث عرض الجدول.', { exact: false }).waitFor(); assert.equal(await page.locator('tbody tr').count(), 2); });
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await scenario('stop-and-duplicate-clicks', async ({ method }) => method === 'POST' ? await held : null,
  async (page, posts) => {
    await page.getByRole('button', { name: 'تحديث التصنيفات المستحقة الآن', exact: true }).evaluate(button => { button.click(); button.click(); });
    await page.getByRole('button', { name: 'إيقاف بعد الدفعة الحالية', exact: true }).waitFor();
    await page.waitForTimeout(1100); // Verify the real elapsed timer rather than a fabricated percent.
    await page.getByText('الوقت المنقضي', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'إيقاف بعد الدفعة الحالية', exact: true }).click();
    release({ body: batch('stopped', { hasMore: true }) });
    await page.getByText('توقفت بعد الدفعة الحالية.', { exact: false }).waitFor();
    assert.equal(posts.length, 1);
  });
  await scenario('mobile-readability', async () => null,
  async page => {
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    assert.equal(await page.getByRole('button', { name: 'تحديث التصنيفات المستحقة الآن', exact: true }).isVisible(), true);
  });
  await writeFile(path.join(proof, 'summary.json'), JSON.stringify({ synthetic: true, testTarget: 'actual ShariahAdminClient and ShariahEvidencePanel', tests }, null, 2));
  console.log(JSON.stringify({ passed: tests.length, failed: 0, proof }));
} finally {
  await browser.close(); await rm(path.join(work, 'app.js'), { force: true });
}
