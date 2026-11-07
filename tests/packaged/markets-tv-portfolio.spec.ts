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
