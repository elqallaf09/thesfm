import { expect, test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { TvPortfolioSnapshot } from '../../src/lib/markets-tv/portfolio';

const token = 'a'.repeat(64), instant = '2026-11-08T07:10:00Z';
const logoFixture = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path fill="#111" d="M8 8h48v48H40V24H8Z"/></svg>';
function fixture(amount = 1000, total = 13): TvPortfolioSnapshot {
 const positions = Array.from({length:total}, (_, i) => ({id:`record-${i}`,name:`${i+1} · محفظة الأسهم العالمية Global equity portfolio`,symbol:`QA${i}`,assetClass:i%2?'gold-silver':'stocks',quantity:12.75,value:{amount:amount+i,currency:'USD'},baseValue:amount+i,baseCost:900,platform:'THE SFM',source:'Recorded source',valuedAt:'2026-11-07T12:10:00Z',freshness:'recorded' as const}));
 const stocks=positions.filter(p=>p.assetClass==='stocks').reduce((sum,p)=>sum+p.baseValue,0),gold=positions.filter(p=>p.assetClass==='gold-silver').reduce((sum,p)=>sum+p.baseValue,0);
 return {currency:'USD',generatedAt:instant,total,positions,totalValue:stocks+gold,totalCost:900*total,valueCoverage:total,costCoverage:total,allocation:[{assetClass:'stocks',amount:stocks,count:Math.ceil(total/2)},{assetClass:'gold-silver',amount:gold,count:Math.floor(total/2)}]};
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
 await page.route('https://cdn.simpleicons.org/**', r=>r.fulfill({contentType:'image/svg+xml',body:logoFixture}));
 await page.route('https://financialmodelingprep.com/image-stock/**', r=>r.abort());
 await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);
 await page.locator('.tv-scene-tabs button').nth(7).click();
 await page.evaluate(()=>document.fonts.ready);
}
async function fits(page:Page) {
 await expect.poll(()=>page.locator('.tv-portfolio,.tv-portfolio-body,.tv-portfolio-positions,.tv-portfolio-position,.tv-portfolio-identity,.tv-portfolio-allocation').evaluateAll(elements=>elements.flatMap(el=>{
  const b=el.getBoundingClientRect();return [...el.children].filter(c=>{const r=c.getBoundingClientRect();return r.width>0&&r.height>0&&(r.left<b.left-2||r.right>b.right+2||r.top<b.top-2||r.bottom>b.bottom+2);}).map(c=>({parent:el.className,child:c.className}));
 }))).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
}
for(const language of ['ar','en','fr'])test(`portfolio ${language}: all paired records, filters and contained scrolling at all TV sizes`,async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/tv/portfolio**', r=>{expect(r.request().headers()['x-sfm-tv-token']).toBe(token);return r.fulfill({json:fixture()});});
 await page.setViewportSize({width:1536,height:1009});await open(page,language);
 await expect(page.locator('.tv-portfolio-metrics article').first()).toContainText('13,078.00');
 await expect(page.locator('.tv-portfolio-position')).toHaveCount(13);
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
for(const language of ['ar','en','fr'])test(`twelve investments ${language} fit together without pagination at TV sizes`,async({page},testInfo)=>{
 const data=fixture(1000,12);
 data.positions.forEach((position,index)=>{position.name=index%2?'Advanced Micro Devices Inc.':'ليرة فضة';position.symbol=index%2?'AMD':null;position.assetClass=index%2?'stocks':'gold-silver';position.source='Yahoo Finance';});
 // An unpriced record is still an investment and must remain visible.
 data.positions[11].baseValue=null;data.positions[11].value=null;data.positions[11].baseCost=null;
 data.totalValue=data.positions.reduce((sum,position)=>sum+(position.baseValue??0),0);data.valueCoverage=11;data.costCoverage=11;data.totalCost=9900;
 data.allocation.forEach(group=>{const known=data.positions.filter(position=>position.assetClass===group.assetClass&&position.baseValue!==null);group.amount=known.reduce((sum,position)=>sum+position.baseValue!,0);group.count=known.length;});
 await page.route('**/api/tv/portfolio**',r=>r.fulfill({json:data}));
 await page.setViewportSize({width:1920,height:1080});await open(page,language);
 await expect(page.locator('.tv-portfolio-position')).toHaveCount(12);
 await expect(page.locator('.tv-portfolio-position .tv-asset-icon')).toHaveCount(12);
 await expect(page.locator('[data-position="record-0"] .tv-asset-icon img')).toHaveAttribute('src',/markets-tv\/assets\/silver\.webp$/);
 await expect(page.locator('[data-position="record-1"] .tv-asset-icon img')).toHaveAttribute('src','https://cdn.simpleicons.org/amd');
 await expect.poll(()=>page.locator('.tv-portfolio-position .tv-asset-icon img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
 await expect(page.locator('.tv-portfolio-positions .tv-broadcast-pager,.tv-portfolio-pagination')).toHaveCount(0);
 await expect(page.locator('[data-position="record-11"] .tv-portfolio-amount strong')).toHaveText(['\u2014','\u2014']);
 for(const [width,height] of [[1920,1080],[1536,1009]]){
  await page.setViewportSize({width,height});await fits(page);
  await expect.poll(()=>page.locator('.tv-portfolio-list').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
  for(const position of await page.locator('.tv-portfolio-position').all())await expect(position).toBeInViewport({ratio:1});
  if(language==='ar')await page.screenshot({path:testInfo.outputPath(`portfolio-all-12-${width}.png`)});
 }
 await page.clock.runFor(120000);
 await expect(page.locator('.tv-portfolio-position')).toHaveCount(12);
 await expect(page.locator('.tv-portfolio-position').first()).toHaveAttribute('data-position','record-0');
 await expect(page.locator('.tv-portfolio-position').last()).toHaveAttribute('data-position','record-11');
});

test('every asset class has an icon and missing company artwork keeps a visible symbol',async({page})=>{
 const data=fixture(1000,10);
 const assets=[['stocks','AMD','Advanced Micro Devices Inc.'],['gold-silver',null,'ليرة فضة'],['gold-silver','XAU/KWD','سبيكة ذهب'],['real-estate',null,'Property'],['funds',null,'Fund'],['bonds',null,'Bond'],['commodities',null,'Oil or Gas'],['overview',null,'Investment'],['stocks',null,'Unknown company'],['crypto','BTC','Bitcoin']];
 data.positions.forEach((position,index)=>{[position.assetClass,position.symbol,position.name]=assets[index] as [string,string|null,string];});
 await page.route('**/api/tv/portfolio**',r=>r.fulfill({json:data}));
 await page.setViewportSize({width:1920,height:1080});await open(page,'en');
 await expect(page.locator('.tv-portfolio-position .tv-asset-icon')).toHaveCount(10);
 await expect(page.locator('[data-position="record-0"] .tv-asset-icon img')).toHaveAttribute('src','https://cdn.simpleicons.org/amd');
 await expect(page.locator('[data-position="record-1"] .tv-asset-icon img')).toHaveAttribute('src',/silver\.webp$/);
 await expect(page.locator('[data-position="record-2"] .tv-asset-icon img')).toHaveAttribute('src',/gold\.webp$/);
 await expect(page.locator('[data-position="record-9"] .tv-asset-icon img')).toHaveAttribute('src','https://cdn.simpleicons.org/bitcoin/F7931A');
 for(let index=3;index<9;index++)await expect(page.locator(`[data-position="record-${index}"] .tv-asset-icon svg`)).toBeVisible();
 // The shared logo renderer must keep its stock symbol when artwork is unavailable.
 await page.locator('[data-position="record-0"] .tv-asset-icon img').dispatchEvent('error');
 await expect(page.locator('[data-position="record-0"] .tv-asset-icon svg')).toBeVisible();
 await expect(page.locator('[data-position="record-0"] .tv-asset-icon b')).toHaveText('AMD');
 await expect(page.locator('[data-position="record-0"] h3')).toHaveText('Advanced Micro Devices Inc.');
 await page.locator('[data-position="record-1"] .tv-asset-icon img').dispatchEvent('error');
 await expect(page.locator('[data-position="record-1"] .tv-asset-icon svg')).toBeVisible();
 await fits(page);
});

test('remote reaches every row in larger portfolios without losing records or moving the page',async({page})=>{
 await page.route('**/api/tv/portfolio**',r=>r.fulfill({json:fixture(1000,40)}));
 await page.setViewportSize({width:960,height:540});await open(page,'en');
 await expect(page.locator('.tv-portfolio-position')).toHaveCount(40);
 await fits(page);
 await page.locator('[data-position="record-0"]').focus();
 for(let row=0;row<39;row++)await page.keyboard.press('ArrowDown');
 await expect(page.locator('[data-position="record-39"]')).toBeFocused();
 await expect(page.locator('[data-position="record-39"]')).toBeInViewport({ratio:1});
 expect(await page.locator('.tv-portfolio-list').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>document.documentElement.scrollTop)).toBe(0);
 for(const key of ['MediaPause','MediaPlay'])await page.evaluate(key=>document.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true})),key);
 await page.clock.runFor(80000);
 await expect(page.locator('.tv-portfolio-position')).toHaveCount(40);
 await expect(page.locator('[data-position="record-39"]')).toBeFocused();
});
