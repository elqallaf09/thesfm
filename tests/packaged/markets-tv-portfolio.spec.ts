import { expect, test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { TvPortfolioSnapshot } from '../../src/lib/markets-tv/portfolio';

const token = 'a'.repeat(64), instant = '2026-11-08T07:10:00Z';
function fixture(amount = 1000): TvPortfolioSnapshot {
 const positions = Array.from({length:13}, (_, i) => ({id:`record-${i}`,name:`${i+1} · محفظة الأسهم العالمية Global equity portfolio`,symbol:`QA${i}`,assetClass:i%2?'gold-silver':'stocks',quantity:12.75,value:{amount:amount+i,currency:'USD'},baseValue:amount+i,baseCost:900,platform:'THE SFM',source:'Recorded source',valuedAt:'2026-11-07T12:10:00Z',freshness:'recorded' as const}));
 const stocks=positions.filter(p=>p.assetClass==='stocks').reduce((sum,p)=>sum+p.baseValue,0),gold=positions.filter(p=>p.assetClass==='gold-silver').reduce((sum,p)=>sum+p.baseValue,0);
 return {currency:'USD',generatedAt:instant,total:13,positions,totalValue:stocks+gold,totalCost:11700,valueCoverage:13,costCoverage:13,allocation:[{assetClass:'stocks',amount:stocks,count:7},{assetClass:'gold-silver',amount:gold,count:6}]};
}
async function open(page:Page, language='ar', linked=true) {
 await page.clock.install({time:new Date(instant)});
 await page.addInitScript(({language,linked,token})=>{
  localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({language,autoRotate:false}));
  localStorage.setItem('sfm_currency','USD');if(linked)localStorage.setItem('sfm-markets-tv-device-v1',token);
 },{language,linked,token});
 await page.route('**/api/tv/device', r=>r.fulfill({json:{device:{id:'qa-device',name:'QA TV',expiresAt:'2099-01-01T00:00:00Z',settings:{language,autoRotate:false}},symbols:[],alerts:[]}}));
 await page.route('**/api/tv/snapshot?*', r=>r.fulfill({json:{summary:[],quotes:[],total:0,available:0,generatedAt:instant}}));
 await page.route('**/api/tv/news?*', r=>r.fulfill({json:{stories:[]}}));
 await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);
 await page.locator('.tv-scene-tabs button').nth(7).click();
 await page.evaluate(()=>document.fonts.ready);
}
async function fits(page:Page) {
 await expect.poll(()=>page.locator('.tv-portfolio,.tv-portfolio-body,.tv-portfolio-positions,.tv-portfolio-list,.tv-portfolio-position,.tv-portfolio-allocation').evaluateAll(elements=>elements.flatMap(el=>{
  const b=el.getBoundingClientRect();return [...el.children].filter(c=>{const r=c.getBoundingClientRect();return r.width>0&&r.height>0&&(r.left<b.left-2||r.right>b.right+2||r.top<b.top-2||r.bottom>b.bottom+2);}).map(c=>({parent:el.className,child:c.className}));
 }))).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
}
for(const language of ['ar','en','fr'])test(`portfolio ${language}: paired records, filters and all TV sizes without scrolling`,async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/tv/portfolio**', r=>{expect(r.request().headers()['x-sfm-tv-token']).toBe(token);return r.fulfill({json:fixture()});});
 await page.setViewportSize({width:1536,height:1009});await open(page,language);
 await expect(page.locator('.tv-portfolio-metrics article').first()).toContainText('13,078.00');
 await expect.poll(()=>page.locator('.tv-portfolio-position').count()).toBeGreaterThanOrEqual(3);
 for(const [width,height] of [[960,540],[1280,720],[1536,1009],[1920,1080],[3840,2160]]){
  await page.setViewportSize({width,height});await fits(page);await expect(page.locator('.tv-portfolio-footer')).toBeInViewport({ratio:1});
 }
 const all=page.locator('.tv-portfolio-actions select').first();await all.selectOption('gold-silver');
 await expect(page.locator('.tv-portfolio-positions h2 bdi')).toHaveText('6');
 await all.selectOption('real-estate');await expect(page.locator('.tv-portfolio-empty')).toBeVisible();
 await all.selectOption('all');await expect(page.locator('.tv-portfolio-position').first()).toHaveAttribute('data-position','record-0');
 await page.setViewportSize({width:1536,height:1009});await fits(page);
 if(language==='ar')await page.screenshot({path:testInfo.outputPath('tv18-portfolio.png')});
 expect(errors).toEqual([]);
});
test('portfolio never requests account records before pairing',async({page})=>{
 let calls=0;await page.route('**/api/tv/portfolio**',r=>{calls++;return r.fulfill({json:fixture()});});
 await open(page,'en',false);await expect(page.locator('.tv-portfolio-gate')).toContainText('Link this TV');
 await page.clock.runFor(45000);expect(calls).toBe(0);await expect(page.locator('.tv-portfolio-position')).toHaveCount(0);
});
test('portfolio synchronizes changes and clears all private values immediately on revocation',async({page})=>{
 let data=fixture(),unauthorized=false,calls=0;
 await page.route('**/api/tv/portfolio**',r=>{calls++;return r.fulfill({status:unauthorized?401:200,json:unauthorized?{code:'UNAUTHORIZED'}:data});});
 await open(page,'en');await expect(page.locator('.tv-portfolio-metrics article').first()).toContainText('13,078.00');
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+5000));
 const firstCalls=calls;data=fixture(1500);await page.clock.runFor(16000);
 await expect(page.locator('.tv-portfolio-metrics article').first()).toContainText('19,578.00');expect(calls).toBeGreaterThan(firstCalls);
 unauthorized=true;await page.clock.runFor(16000);
 await expect(page.locator('.tv-portfolio-gate')).toContainText('expired');await expect(page.locator('.tv-portfolio-position')).toHaveCount(0);await expect(page.locator('.tv-portfolio-metrics')).toHaveCount(0);
 await page.locator('[data-tv-focus-key="scene:overview"]').click();await page.locator('.tv-scene-tabs button').nth(7).click();
 await expect(page.locator('.tv-portfolio-position')).toHaveCount(0);expect(await page.evaluate(()=>Object.values(localStorage).join(' '))).not.toContain('Recorded source');
});
test('portfolio pages rotate every forty seconds and follow TV media pause and resume',async({page})=>{
 await page.route('**/api/tv/portfolio**',r=>r.fulfill({json:fixture()}));
 await open(page,'en');await expect(page.locator('.tv-portfolio-position').first()).toHaveAttribute('data-position','record-0');
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+100));
 const pause=page.locator('.tv-portfolio-pagination > button');await pause.click();await page.clock.runFor(80000);
 await expect(page.locator('.tv-portfolio-position').first()).toHaveAttribute('data-position','record-0');
 await pause.click();await page.clock.runFor(39999);await expect(page.locator('.tv-portfolio-position').first()).toHaveAttribute('data-position','record-0');
 await page.clock.runFor(1);await expect(page.locator('.tv-portfolio-position').first()).not.toHaveAttribute('data-position','record-0');
 const second=await page.locator('.tv-portfolio-position').first().getAttribute('data-position');
 await page.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'MediaPause',bubbles:true})));await page.clock.runFor(80000);
 await expect(page.locator('.tv-portfolio-position').first()).toHaveAttribute('data-position',second!);
 await page.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'MediaPlay',bubbles:true})));await page.clock.runFor(40000);
 await expect(page.locator('.tv-portfolio-position').first()).not.toHaveAttribute('data-position',second!);
});

// Only synthetic account records are used. Block unmatched network requests so
// packaged clients cannot accidentally reach a live account or provider.
test.beforeEach(async ({ context }) => {
 await context.route('https://**', route => route.abort('blockedbyclient'));
});

async function freeze(page: Page) {
 await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
}
async function privateValuesAbsent(page: Page) {
 await expect(page.locator('.tv-portfolio-position,.tv-portfolio-metrics,.tv-portfolio-allocation')).toHaveCount(0);
 await expect(page.locator('body')).not.toContainText('Recorded source');
 await expect(page.locator('body')).not.toContainText('13,078.00');
 await expect(page.locator('body')).not.toContainText('19,578.00');
}
async function noPrivatePersistence(page: Page) {
 const stored = await page.evaluate(async () => {
  const values = [...Object.values(localStorage), ...Object.values(sessionStorage)];
  if ('caches' in window) for (const name of await caches.keys()) {
   const cache = await caches.open(name);
   for (const request of await cache.keys()) {
    values.push(request.url);
    const response = await cache.match(request);
    if (response) values.push(await response.text());
   }
  }
  return values.join('\n');
 });
 for (const marker of ['Recorded source', 'record-0', 'Global equity portfolio', '/api/tv/portfolio']) expect(stored).not.toContain(marker);
}
async function suspend(page: Page, reason: 'offline' | 'hidden' | 'pagehide', enabled: boolean) {
 await page.evaluate(({ reason, enabled }) => {
  if (reason === 'pagehide') {
   window.dispatchEvent(new Event(enabled ? 'pagehide' : 'pageshow'));
  } else if (reason === 'offline') {
   Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => !enabled });
   window.dispatchEvent(new Event(enabled ? 'offline' : 'online'));
  } else {
   Object.defineProperty(document, 'hidden', { configurable: true, get: () => enabled });
   Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => enabled ? 'hidden' : 'visible' });
   document.dispatchEvent(new Event('visibilitychange'));
  }
 }, { reason, enabled });
}
// Model a transport which completes despite cancellation. This verifies the
// rendered privacy boundary, not merely Chromium's willingness to abort fetch.
async function allowLatePortfolioResponse(page: Page) {
 await page.addInitScript(() => {
  const original = window.fetch.bind(window);
  window.fetch = (input, init) => {
   const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
   return original(input, url.includes('/api/tv/portfolio') ? { ...init, signal: undefined } : init);
  };
 });
}

test('legacy paired token needs explicit investment approval, not an expiry message', async ({ page }) => {
 await page.route('**/api/tv/portfolio**', route => route.fulfill({ status: 403, json: { code: 'PORTFOLIO_CONSENT_REQUIRED' } }));
 await open(page, 'en');
 await expect(page.locator('.tv-portfolio-gate h2')).toHaveText('Investment access needs your approval');
 await expect(page.locator('.tv-portfolio-gate')).toContainText('Unlink this TV');
 await privateValuesAbsent(page);
 await noPrivatePersistence(page);
});

for (const reason of ['offline', 'hidden', 'pagehide'] as const) test(`portfolio clears immediately when ${reason}, rejects a late response and recovers only with fresh authorization`, async ({ page }) => {
 await allowLatePortfolioResponse(page);
 let calls = 0, hold = false;
 const pending: import('@playwright/test').Route[] = [];
 await page.route('**/api/tv/portfolio**', route => {
  calls++;
  if (!hold) return route.fulfill({ json: fixture() });
  pending.push(route);
 });
 await open(page, 'en');
 await expect(page.locator('.tv-portfolio-metrics')).toContainText('13,078.00');
 await noPrivatePersistence(page);
 await freeze(page);
 const initialCalls = calls;
 hold = true;
 await page.clock.runFor(15000);
 await expect.poll(() => pending.length).toBe(1);
 await suspend(page, reason, true);
 if (reason === 'pagehide') expect(await page.evaluate(() => document.hidden)).toBe(false);
 await privateValuesAbsent(page);
 await pending[0].fulfill({ json: fixture(1500) });
 await page.clock.runFor(1000);
 await privateValuesAbsent(page);
 await page.clock.runFor(45000);
 expect(calls).toBe(initialCalls + 1);
 await suspend(page, reason, false);
 await expect.poll(() => pending.length).toBe(2);
 await privateValuesAbsent(page);
 await pending[1].fulfill({ json: fixture(1500) });
 await expect(page.locator('.tv-portfolio-metrics')).toContainText('19,578.00');
 await noPrivatePersistence(page);
});

for (const status of [503, 429]) test(`portfolio clears on HTTP ${status} and does not restore cached values during recovery`, async ({ page }) => {
 let mode: 'success' | 'error' | 'recover' = 'success';
 let recovery: import('@playwright/test').Route | undefined;
 await page.route('**/api/tv/portfolio**', route => {
  if (mode === 'recover') { recovery = route; return; }
  return route.fulfill(mode === 'success' ? { json: fixture() } : { status, headers: { 'retry-after': '1' }, json: { code: 'UNAVAILABLE' } });
 });
 await open(page, 'en');
 await expect(page.locator('.tv-portfolio-metrics')).toContainText('13,078.00');
 await freeze(page);
 mode = 'error';
 await page.clock.runFor(15000);
 await privateValuesAbsent(page);
 await noPrivatePersistence(page);
 mode = 'recover';
 await page.locator('.tv-portfolio-heading button').click();
 await expect.poll(() => Boolean(recovery)).toBe(true);
 await privateValuesAbsent(page);
 await recovery!.fulfill({ json: fixture(1500) });
 await expect(page.locator('.tv-portfolio-metrics')).toContainText('19,578.00');
});

test('a slow refresh cannot extend the thirty-second display lease', async ({ page }) => {
 let hold = false;
 let delayed: import('@playwright/test').Route | undefined;
 await page.route('**/api/tv/portfolio**', route => {
  if (!hold) return route.fulfill({ json: fixture() });
  delayed = route;
 });
 await open(page, 'en');
 await expect(page.locator('.tv-portfolio-metrics')).toContainText('13,078.00');
 await freeze(page);
 hold = true;
 await page.clock.runFor(15000);
 await expect.poll(() => Boolean(delayed)).toBe(true);
 await expect(page.locator('.tv-portfolio-metrics')).toContainText('13,078.00');
 await page.clock.runFor(14000);
 await expect(page.locator('.tv-portfolio-metrics')).toContainText('13,078.00');
 await page.clock.runFor(1100);
 await privateValuesAbsent(page);
 await noPrivatePersistence(page);
 // A new successful authorization can restore the display, with a fresh lease.
 await delayed!.fulfill({ json: fixture(1500) });
 await expect(page.locator('.tv-portfolio-metrics')).toContainText('19,578.00');
});

test('a revoked refresh cannot be overwritten by a late successful request', async ({ page }) => {
 await allowLatePortfolioResponse(page);
 let mode: 'success' | 'hold' | 'revoked' = 'success';
 let stale: import('@playwright/test').Route | undefined;
 await page.route('**/api/tv/portfolio**', route => {
  if (mode === 'success') return route.fulfill({ json: fixture() });
  if (mode === 'hold') { stale = route; return; }
  return route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } });
 });
 await open(page, 'en');
 await expect(page.locator('.tv-portfolio-metrics')).toContainText('13,078.00');
 await freeze(page);
 mode = 'hold';
 await page.clock.runFor(15000);
 await expect.poll(() => Boolean(stale)).toBe(true);
 mode = 'revoked';
 await page.locator('.tv-portfolio-heading button').click();
 await expect(page.locator('.tv-portfolio-gate')).toContainText('expired');
 await stale!.fulfill({ json: fixture(1500) });
 await page.clock.runFor(1000);
 await privateValuesAbsent(page);
 await noPrivatePersistence(page);
});

test('relinking replaces the token without exposing the previous account snapshot', async ({ page }) => {
 const replacement = 'b'.repeat(64);
 let revoked = false;
 let replacementRequest: import('@playwright/test').Route | undefined;
 await page.route('**/api/tv/portfolio**', route => {
  if (route.request().headers()['x-sfm-tv-token'] === replacement) { replacementRequest = route; return; }
  expect(route.request().headers()['x-sfm-tv-token']).toBe(token);
  return route.fulfill(revoked ? { status: 401, json: { code: 'UNAUTHORIZED' } } : { json: fixture() });
 });
 await page.route('**/api/tv/pair', route => route.fulfill({ json: route.request().method() === 'POST'
  ? { code: 'ABCDEF123456', secret: 'c'.repeat(64), expiresAt: '2099-01-01T00:00:00Z' }
  : { state: 'active', token: replacement } }));
 await open(page, 'en');
 await expect(page.locator('.tv-portfolio-metrics')).toContainText('13,078.00');
 await freeze(page);
 revoked = true;
 await page.locator('.tv-portfolio-heading button').click();
 await expect(page.locator('.tv-portfolio-gate')).toContainText('expired');
 await page.locator('.tv-portfolio-gate button').click();
 // React's lazy panel reveal uses a timer; allow it before freezing pairing polls.
 await page.clock.resume();
 await page.locator('.tv-pair-content button').click();
 await expect(page.locator('.tv-pair-code')).toBeVisible();
 await freeze(page);
 await page.clock.runFor(5100);
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.locator('.tv-scene-tabs button').nth(7).click();
 await expect.poll(() => Boolean(replacementRequest)).toBe(true);
 await privateValuesAbsent(page);
 await replacementRequest!.fulfill({ json: fixture(1500) });
 await expect(page.locator('.tv-portfolio-metrics')).toContainText('19,578.00');
 await expect(page.locator('.tv-portfolio-metrics')).not.toContainText('13,078.00');
 await noPrivatePersistence(page);
});
