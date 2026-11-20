import { closeTvMenu, chooseTvDestination, selectTvProfile } from './packageHarness';
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
function mixedValuations(): TvPortfolioSnapshot {
 const data=fixture(1000,7), quoteTime='2026-11-08T06:50:00Z';
 data.positions.forEach(position=>{position.assetClass='stocks';position.valuationKind='recorded';position.baseCost=null;});
 Object.assign(data.positions[0],{name:'Advanced Micro Devices Inc.',symbol:'AMD',platform:'XTB',valuationKind:'market',quoteStatus:'delayed',source:'QA exchange',valuedAt:quoteTime,holdingCurrency:'KWD',holdingValue:{amount:307,currency:'KWD'},holdingFxSource:'QA holding FX',holdingFxAt:'2026-11-08T06:46:00Z',cost:{amount:800,currency:'EUR'},baseCost:900,costFxSource:'QA capital FX',costFxAt:'2026-11-08T06:47:00Z',recordedValue:{amount:910,currency:'USD'},recordedBaseValue:910,recordedValuedAt:'2026-09-16T12:10:00Z',recordedSource:'Recorded source'});
 Object.assign(data.positions[1],{name:'Advanced Micro Devices Inc.',symbol:'AMD',platform:'zad',freshness:'stale',valuedAt:'2026-09-16T12:10:00Z'});
 Object.assign(data.positions[2],{name:'قطعة أرض · Land valuation',symbol:null,assetClass:'real-estate',valuationKind:'manual',source:null,freshness:'stale',valuedAt:'2026-05-21T12:10:00Z',value:{amount:4100,currency:'USD'},baseValue:4100,baseCost:4000});
 Object.assign(data.positions[3],{name:'Native EUR investment',symbol:'EURQA',valuationKind:'market',quoteStatus:'available',valuationIssue:'fx_unavailable',source:'QA exchange',valuedAt:'2026-11-08T07:09:00Z',value:{amount:123.45,currency:'EUR'},baseValue:null,recordedValue:{amount:100,currency:'EUR'},recordedBaseValue:110,recordedValuedAt:'2026-09-16T12:10:00Z',recordedSource:'Recorded source'});
 Object.assign(data.positions[4],{name:'Closed market investment',valuationKind:'market',quoteStatus:'closed',source:'QA exchange',valuedAt:'2026-11-06T21:00:00Z',holdingCurrency:'KWD',holdingValue:null});
 Object.assign(data.positions[5],{name:'Reference quote investment',valuationKind:'market',quoteStatus:'reference',source:'QA reference',valuedAt:quoteTime});
 Object.assign(data.positions[6],{name:'Undated saved valuation',freshness:'missing',valuedAt:null,holdingCurrency:null,holdingValue:null});
 data.totalValue=data.positions.reduce((sum,position)=>sum+(position.baseValue??0),0);
 data.totalCost=4900;data.costCoverage=2;data.valueCoverage=6;data.marketCoverage=3;data.marketEligible=6;
 data.allocation=[{assetClass:'real-estate',amount:4100,count:1},{assetClass:'stocks',amount:data.totalValue-4100,count:5}];
 return data;
}
async function open(page:Page, language='ar', linked=true, theme: 'light' | 'dark' = 'light', currency='USD') {
 await page.clock.install({time:new Date(instant)});
 await page.addInitScript(({language,linked,token,theme,currency})=>{
  localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({language,theme,autoRotate:false}));
  localStorage.setItem('sfm_currency',currency);if(linked)localStorage.setItem('sfm-markets-tv-device-v1',token);
 },{language,linked,token,theme,currency});
 await page.route('**/api/tv/device', r=>r.fulfill({json:{device:{id:'qa-device',name:'QA TV',expiresAt:'2099-01-01T00:00:00Z',settings:{language,theme,autoRotate:false}},symbols:[],alerts:[]}}));
 await page.route('**/api/tv/snapshot?*', r=>r.fulfill({json:{summary:[],quotes:[],total:0,available:0,generatedAt:instant}}));
 await page.route('**/api/tv/news?*', r=>r.fulfill({json:{stories:[]}}));
 await page.route('https://cdn.simpleicons.org/**', r=>r.fulfill({contentType:'image/svg+xml',body:logoFixture}));
 await page.route('https://financialmodelingprep.com/image-stock/**', r=>r.abort());
 await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);
 if(linked)await selectTvProfile(page,0);
 await closeTvMenu(page);
 await chooseTvDestination(page, 'investments');
 await page.evaluate(()=>document.fonts.ready);
}
async function fits(page:Page) {
 await expect.poll(()=>page.locator('.tv-portfolio,.tv-portfolio-body,.tv-portfolio-positions,.tv-portfolio-position,.tv-portfolio-open,.tv-portfolio-identity,.tv-portfolio-amount,.tv-portfolio-values,.tv-portfolio-allocation').evaluateAll(elements=>elements.flatMap(el=>{
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
 await page.locator('[data-position="record-0"] .tv-portfolio-open').focus();await page.keyboard.press('Enter');
 await expect(page.locator('.tv-portfolio-dialog')).toContainText('Recorded source');
 unauthorized=true;await page.clock.runFor(16000);
 await expect(page.locator('.tv-portfolio-gate')).toContainText('expired');await expect(page.locator('.tv-portfolio-position')).toHaveCount(0);await expect(page.locator('.tv-portfolio-metrics')).toHaveCount(0);
 await expect(page.locator('.tv-portfolio-dialog')).toHaveCount(0);
 await chooseTvDestination(page, 'hall');await chooseTvDestination(page, 'investments');
 await expect(page.locator('.tv-portfolio-position')).toHaveCount(0);expect(await page.evaluate(()=>Object.values(localStorage).join(' '))).not.toContain('Recorded source');
});
test('display currency KWD to USD and back converts totals and manual holdings while preserving recorded currencies',async({page})=>{
 const requested:string[]=[];
 await page.route('**/api/tv/portfolio**',r=>{
  const currency=new URL(r.request().url()).searchParams.get('currency')||'KWD',kwd=currency==='KWD',data=fixture(1000,2);
  requested.push(currency);data.currency=currency;
  Object.assign(data.positions[0],{name:'USD holding',assetClass:'stocks',holdingCurrency:'USD',holdingValue:{amount:1000,currency:'USD'},cost:{amount:800,currency:'USD'},baseValue:kwd?250:1000,baseCost:kwd?200:800});
  Object.assign(data.positions[1],{name:'Manual KWD property',symbol:null,assetClass:'real-estate',valuationKind:'manual',value:{amount:100,currency:'KWD'},holdingCurrency:'KWD',holdingValue:{amount:100,currency:'KWD'},cost:{amount:90,currency:'KWD'},baseValue:kwd?100:400,baseCost:kwd?90:360});
  data.totalValue=kwd?350:1400;data.totalCost=kwd?290:1160;
  data.allocation=data.positions.map(position=>({assetClass:position.assetClass,amount:position.baseValue!,count:1}));
  return r.fulfill({json:data});
 });
 await page.setViewportSize({width:1920,height:1080});await open(page,'en',true,'light','KWD');
 const selector=page.getByRole('combobox',{name:'Display currency'}),usd=page.locator('[data-position="record-0"]'),kwd=page.locator('[data-position="record-1"]');
 const values=page.locator('.tv-portfolio-metrics article').first(),capital=page.locator('.tv-portfolio-metrics article').nth(1);
 for(const currency of ['KWD','USD','KWD']){
  await selector.selectOption(currency);
  const inKwd=currency==='KWD';
  await expect(values.locator('strong')).toHaveText(inKwd?'350.000 KWD':'1,400.00 USD');
  await expect(capital.locator('strong')).toHaveText(inKwd?'290.000 KWD':'1,160.00 USD');
  await expect(usd.locator('.tv-portfolio-display')).toHaveText(inKwd?'250.000 KWD':'1,000.00 USD');
  await expect(kwd.locator('.tv-portfolio-display')).toHaveText(inKwd?'100.000 KWD':'400.00 USD');
  await expect((inKwd?usd:kwd).locator('.tv-portfolio-native')).toHaveAttribute('data-value-kind','original');
  await expect((inKwd?usd:kwd).locator('.tv-portfolio-native')).toContainText(inKwd?'1,000.00 USD':'100.000 KWD');
  await expect(kwd.locator('.tv-portfolio-status')).toHaveText('Manual valuation');
  expect(requested.at(-1)).toBe(currency);
  expect(await page.evaluate(()=>localStorage.getItem('sfm_currency'))).toBe(currency);
  await fits(page);
  await (inKwd?usd:kwd).locator('.tv-portfolio-open').click();
  const cost=page.locator('.tv-portfolio-detail-grid > div').filter({has:page.locator('dt', {hasText:/^Recorded invested capital$/})});
  await expect(cost.locator('.tv-portfolio-display')).toHaveText(inKwd?'200.000 KWD':'360.00 USD');
  await expect(cost.locator('.tv-portfolio-native')).toContainText(inKwd?'800.00 USD':'90.000 KWD');
  await page.keyboard.press('Escape');
 }
 expect(requested).toContain('USD');expect(requested.filter(currency=>currency==='KWD').length).toBeGreaterThanOrEqual(2);
});
for(const language of ['ar','en','fr'])for(const theme of ['light','dark'] as const)test(`twelve investments ${language}/${theme} fit together without pagination at TV sizes`,async({page},testInfo)=>{
 const data=fixture(1000,12);
 data.positions.forEach((position,index)=>{position.name=index%2?'Advanced Micro Devices Inc.':'ليرة فضة';position.symbol=index%2?'AMD':null;position.assetClass=index%2?'stocks':'gold-silver';position.source='Yahoo Finance';position.platform=index%4===1?'XTB':'zad';position.freshness='stale';position.valuedAt='2026-09-16T12:10:00Z';if(index>=6)position.baseCost=null;});
 for(const index of [3,5,7,9,11])Object.assign(data.positions[index],{name:'Taiwan Semiconductor Manufacturing Co. Ltd. ADR',symbol:'TSM'});
 data.positions.forEach(position=>{position.holdingCurrency='KWD';position.holdingValue={amount:position.baseValue!*.307,currency:'KWD'};position.value=position.holdingValue;});
 // An unpriced record is still an investment and must remain visible.
 data.positions[11].baseValue=null;data.positions[11].value=null;data.positions[11].holdingValue=null;data.positions[11].baseCost=null;
 data.totalValue=data.positions.reduce((sum,position)=>sum+(position.baseValue??0),0);data.valueCoverage=11;data.costCoverage=6;data.totalCost=5400;
 data.allocation.forEach(group=>{const known=data.positions.filter(position=>position.assetClass===group.assetClass&&position.baseValue!==null);group.amount=known.reduce((sum,position)=>sum+position.baseValue!,0);group.count=known.length;});
 await page.route('**/api/tv/portfolio**',r=>r.fulfill({json:data}));
 await page.route('https://www.google.com/s2/favicons?domain_url=https://www.tsmc.com&sz=128',r=>r.fulfill({contentType:'image/svg+xml',body:logoFixture}));
 await page.setViewportSize({width:1920,height:1080});await open(page,language,true,theme);
 await expect(page.locator('[data-tv-root]')).toHaveCSS('color-scheme',theme);
 await expect(page.locator('.tv-portfolio-metrics article')).toHaveCount(3);
 await expect(page.locator('.tv-portfolio-metrics article').nth(1)).toContainText('5,400.00');
 await expect(page.locator('.tv-portfolio-metrics article').nth(1)).toContainText(/6\s*(?:من|of|sur)\s*12/);
 await expect(page.locator('.tv-portfolio-position')).toHaveCount(12);
 await expect(page.locator('.tv-portfolio-position .tv-asset-icon')).toHaveCount(12);
 await expect(page.locator('[data-position="record-0"] .tv-asset-icon img')).toHaveAttribute('src',/markets-tv\/assets\/silver\.webp$/);
 await expect(page.locator('[data-position="record-1"] .tv-asset-icon img')).toHaveAttribute('src','https://cdn.simpleicons.org/amd');
 await expect(page.locator('[data-position="record-3"] .tv-portfolio-name')).toHaveText('Taiwan Semiconductor Manufacturing Co. Ltd. ADR');
 await expect(page.locator('[data-position="record-3"] .tv-asset-icon img')).toHaveAttribute('src','https://www.google.com/s2/favicons?domain_url=https://www.tsmc.com&sz=128');
 await expect.poll(()=>page.locator('.tv-portfolio-position .tv-asset-icon img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
 await expect(page.locator('.tv-portfolio-positions .tv-broadcast-pager,.tv-portfolio-pagination')).toHaveCount(0);
 await expect(page.locator('[data-position="record-11"] .tv-portfolio-amount strong')).toContainText('\u2014');
 await expect(page.locator('[data-position="record-1"] .tv-portfolio-open')).toContainText('XTB');
 await expect(page.locator('[data-position="record-3"] .tv-portfolio-open')).toContainText('zad');
 await expect(page.locator('.tv-portfolio-status')).toHaveCount(12);
 await expect(page.locator('.tv-portfolio-native[data-value-kind="original"]')).toHaveCount(11);
 await expect(page.locator('[data-position="record-0"] .tv-portfolio-display')).toHaveText('1,000.00 USD');
 await expect(page.locator('[data-position="record-0"] .tv-portfolio-native')).toContainText('307.000 KWD');
 for(const [width,height] of [[1920,1080],[1536,1009]]){
  await page.setViewportSize({width,height});await fits(page);
  await expect.poll(()=>page.locator('.tv-portfolio-list').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
  for(const position of await page.locator('.tv-portfolio-position').all())await expect(position).toBeInViewport({ratio:1});
  for(const status of await page.locator('.tv-portfolio-status').all())await expect(status).toBeInViewport({ratio:1});
  for(const original of await page.locator('.tv-portfolio-native').all())await expect(original).toBeInViewport({ratio:1});
  await page.screenshot({path:testInfo.outputPath(`portfolio-all-12-${language}-${theme}-${width}.png`)});
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
 await expect(page.locator('[data-position="record-0"] .tv-portfolio-name')).toHaveText('Advanced Micro Devices Inc.');
 await page.locator('[data-position="record-1"] .tv-asset-icon img').dispatchEvent('error');
 await expect(page.locator('[data-position="record-1"] .tv-asset-icon svg')).toBeVisible();
 await fits(page);
});

test('remote reaches every row in larger portfolios without losing records or moving the page',async({page})=>{
 await page.route('**/api/tv/portfolio**',r=>r.fulfill({json:fixture(1000,40)}));
 await page.setViewportSize({width:960,height:540});await open(page,'en');
 await expect(page.locator('.tv-portfolio-position')).toHaveCount(40);
 await fits(page);
 await page.locator('[data-position="record-0"] .tv-portfolio-open').focus();
 for(let row=0;row<39;row++)await page.keyboard.press('ArrowDown');
 await expect(page.locator('[data-position="record-39"] .tv-portfolio-open')).toBeFocused();
 await expect(page.locator('[data-position="record-39"]')).toBeInViewport({ratio:1});
 expect(await page.locator('.tv-portfolio-list').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>document.documentElement.scrollTop)).toBe(0);
 for(const key of ['MediaPause','MediaPlay'])await page.evaluate(key=>document.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true})),key);
 await page.clock.runFor(80000);
 await expect(page.locator('.tv-portfolio-position')).toHaveCount(40);
 await expect(page.locator('[data-position="record-39"] .tv-portfolio-open')).toBeFocused();
});

for(const language of ['ar','en','fr'])test(`portfolio details ${language}: remote OK and Back preserve position and source evidence`,async({page})=>{
 const data=fixture(), selected=data.positions[12];
 await page.route('**/api/tv/portfolio**',r=>r.fulfill({json:data}));
 await page.setViewportSize({width:1920,height:1080});await open(page,language);
 const trigger=page.locator(`[data-position="${selected.id}"] .tv-portfolio-open`), dialog=page.locator('.tv-portfolio-dialog');
 for(const [width,height] of [[960,540],[1920,1080]]){
  await page.setViewportSize({width,height});await trigger.focus();await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();await expect(dialog).toHaveAttribute('aria-modal','true');
  await expect(dialog).toHaveAccessibleName(selected.name);
  await expect(dialog).toContainText('12.75');await expect(dialog).toContainText('900.00');
  await expect(dialog).toContainText('Recorded source');await expect(dialog).toContainText('THE SFM');
  await expect(dialog.locator(`time[datetime="${selected.valuedAt}"]`)).toBeVisible();
  await expect(dialog).toBeInViewport({ratio:1});
  await page.keyboard.press('Tab');
  expect(await dialog.evaluate(element=>element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
  await page.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'OK',bubbles:true,cancelable:true})));
  await expect(dialog).toBeVisible();
  await page.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'BrowserBack',bubbles:true,cancelable:true})));
  await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view','investments');
 }
});

for(const theme of ['light','dark'] as const)test(`portfolio ${theme}: market evidence, manual values and missing FX remain distinct after sync`,async({page},testInfo)=>{
 let data=mixedValuations(), calls=0;
 await page.route('**/api/tv/portfolio**',r=>{calls++;return r.fulfill({json:data});});
 await page.setViewportSize({width:1920,height:1080});await open(page,'en',true,theme);
 await expect(page.locator('.tv-portfolio-position')).toHaveCount(7);
 await expect(page.locator('.tv-portfolio-metrics article').first()).toContainText('9,116.00');
 await expect(page.locator('.tv-portfolio-metrics article').nth(1)).toContainText('4,900.00');
 await expect(page.locator('.tv-portfolio-metrics article').nth(1)).toContainText(/2\s*of\s*7/);
 await expect(page.locator('.tv-portfolio-metrics article').nth(2)).toContainText(/Market prices available:\s*4\s*of\s*6/);
 for(const heading of await page.locator('.tv-portfolio-metrics h2').all())await expect(heading).not.toHaveText(/profit|gain|return/i);
 for(const [id,kind] of [['record-0','market'],['record-1','recorded'],['record-2','manual'],['record-3','market'],['record-4','market'],['record-5','market'],['record-6','recorded']]){
  const status=page.locator(`[data-position="${id}"] .tv-portfolio-status`);
  await expect(status).toHaveAttribute('data-valuation-kind',kind);await expect(status).toBeVisible();await expect(status).not.toHaveText('');
 }
 for(const [id,status] of [['record-0','delayed'],['record-4','closed'],['record-5','reference']])await expect(page.locator(`[data-position="${id}"] .tv-portfolio-status`)).toHaveAttribute('data-status',status);
 for(const [id,label] of [['record-0','Delayed'],['record-1','Older valuation'],['record-2','Older manual valuation'],['record-4','Last close'],['record-5','Daily reference rate'],['record-6','Time unavailable']])await expect(page.locator(`[data-position="${id}"] .tv-portfolio-status`)).toHaveText(label);
 const native=page.locator('[data-position="record-3"]');
 await expect(native.locator('.tv-portfolio-display')).toHaveText('— USD');
 await expect(native.locator('.tv-portfolio-native')).toContainText('123.45 EUR');
 await expect(native.locator('.tv-portfolio-native')).not.toContainText('USD');
 await expect(native.locator('.tv-portfolio-status')).toContainText('Conversion unavailable');
 await expect(page.locator('.tv-portfolio-footer')).toContainText('Portfolio fetched');
 await expect(page.locator('.tv-portfolio-footer time')).toHaveAttribute('datetime',instant);

 const market=page.locator('[data-position="record-0"] .tv-portfolio-open'), dialog=page.locator('.tv-portfolio-dialog');
 await market.focus();await page.keyboard.press('Enter');
 await expect(dialog).toContainText('QA exchange');await expect(dialog).toContainText('Recorded source');
 await expect(dialog.locator('time[datetime="2026-11-08T06:50:00Z"]')).toBeVisible();
 await expect(dialog.locator('time[datetime="2026-09-16T12:10:00Z"]')).toBeVisible();
 await expect(dialog).toContainText('910.00');
 await expect(dialog.locator('.tv-portfolio-detail-value .tv-portfolio-display')).toHaveText('1,000.00 USD');
 await expect(dialog.locator('.tv-portfolio-detail-value .tv-portfolio-native')).toContainText('307.000 KWD');
 await expect(dialog).toContainText('800.00 EUR');await expect(dialog).toContainText('900.00 USD');
 await expect(dialog).toContainText('QA holding FX');await expect(dialog).toContainText('QA capital FX');
 await expect(dialog.locator('time[datetime="2026-11-08T06:46:00Z"]')).toHaveCount(1);
 await expect(dialog.locator('time[datetime="2026-11-08T06:47:00Z"]')).toHaveCount(1);
 await page.keyboard.press('Escape');await expect(market).toBeFocused();
 const quoteFallback=page.locator('[data-position="record-4"]');
 await expect(quoteFallback.locator('.tv-portfolio-native')).toHaveAttribute('data-value-kind','quote');
 await expect(quoteFallback.locator('.tv-portfolio-native')).toHaveText('Valuation currency 1,004.00 USD');
 await expect(page.locator('[data-position="record-6"] .tv-portfolio-native')).toHaveAttribute('data-value-kind','quote');
 await expect(page.locator('[data-position="record-6"] .tv-portfolio-native')).toHaveText('Valuation currency 1,006.00 USD');
 await quoteFallback.locator('.tv-portfolio-open').click();
 await expect(dialog.locator('.tv-portfolio-detail-note')).toContainText('Recorded currency · KWD');
 await expect(dialog.locator('.tv-portfolio-detail-note')).toContainText('Conversion unavailable');
 await page.keyboard.press('Escape');

 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));
 const before=calls, fetchedAt=new Date(await page.evaluate(()=>Date.now())+16000).toISOString();
 data={...data,generatedAt:fetchedAt};await page.clock.runFor(16000);
 await expect.poll(()=>calls).toBeGreaterThan(before);
 await expect(page.locator('.tv-portfolio-footer time')).toHaveAttribute('datetime',fetchedAt);
 await expect(page.locator('[data-position="record-1"] .tv-portfolio-status')).toHaveAttribute('data-status','stale');
 await expect(page.locator('.tv-portfolio-metrics article').first()).toContainText('9,116.00');
 await market.focus();await page.keyboard.press('Enter');
 await expect(dialog.locator('time[datetime="2026-11-08T06:50:00Z"]')).toBeVisible();
 await expect(dialog.locator(`time[datetime="${fetchedAt}"]`)).toHaveCount(0);
 await page.screenshot({path:testInfo.outputPath(`portfolio-${theme}-valuation-evidence.png`)});
 await page.keyboard.press('Escape');await expect(market).toBeFocused();
 await fits(page);await page.screenshot({path:testInfo.outputPath(`portfolio-${theme}-mixed-values.png`)});
});

test('short TV portfolio details scroll by remote without losing currency evidence or return focus',async({page})=>{
 const data=mixedValuations();
 Object.assign(data.positions[0],{
  value:{amount:900,currency:'EUR'},baseValue:1000,
  holdingCurrency:'EUR',holdingValue:{amount:900,currency:'EUR'},holdingFxSource:null,holdingFxAt:null,costFxSource:null,costFxAt:null,
  recordedValue:{amount:800,currency:'EUR'},recordedBaseValue:910,
  fxSource:'QA official exchange rate',fxAt:'2026-11-08T06:45:00Z',
 });
 await page.route('**/api/tv/portfolio**',r=>r.fulfill({json:data}));
 await page.setViewportSize({width:960,height:540});await open(page,'ar');
 const trigger=page.locator('[data-position="record-0"] .tv-portfolio-open');
 await trigger.focus();await page.keyboard.press('Enter');
 const dialog=page.locator('.tv-portfolio-dialog'), content=dialog.locator('.tv-portfolio-detail-content');
 await expect(dialog).toBeInViewport({ratio:1});
 await content.focus();await expect(content).toBeFocused();
 expect(await content.evaluate(element=>element.scrollHeight>element.clientHeight+1)).toBe(true);
 for(let step=0;step<8;step++)await page.keyboard.press('ArrowDown');
 const scrolled=await content.evaluate(element=>element.scrollTop);expect(scrolled).toBeGreaterThan(0);
 await expect(content.locator('time[datetime="2026-11-08T06:45:00Z"]')).toBeInViewport({ratio:1});
 await expect(content).toContainText('QA official exchange rate');
 await expect(content).toContainText('Recorded source');await expect(content).toContainText('800.00 EUR');
 await page.keyboard.press('ArrowUp');expect(await content.evaluate(element=>element.scrollTop)).toBeLessThan(scrolled);
 await page.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'BrowserBack',bubbles:true,cancelable:true})));
 await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
 await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view','investments');
});

test('short landscape browser shows whole holdings and advances the visible range', async ({ page }, testInfo) => {
  const data = fixture(1000, 17);
  const classes = ['stocks', 'real-estate', 'crypto', 'commodities'];
  for (const [index, position] of data.positions.entries()) {
    position.assetClass = classes[index % classes.length];
    position.holdingValue = { amount: 307, currency: 'KWD' };
    position.holdingCurrency = 'KWD';
  }
  data.allocation = classes.map(assetClass => {
    const group = data.positions.filter(item => item.assetClass === assetClass);
    return { assetClass, count: group.length, amount: group.reduce((sum, item) => sum + (item.baseValue ?? 0), 0) };
  });
  await page.route('**/api/tv/portfolio**', route => route.fulfill({ json: data }));
  await page.setViewportSize({ width: 1200, height: 690 });
  await open(page, 'ar');
  const panel = page.locator('.tv-portfolio-list');
  const range = page.locator('.tv-portfolio-range');
  const checkRows = async () => {
    await expect.poll(() => panel.evaluate(list => {
      const bounds = list.getBoundingClientRect();
      return [...list.children].filter(card => {
        const row = card.getBoundingClientRect();
        return row.bottom > bounds.top + 1 && row.top < bounds.bottom - 1
          && (row.top < bounds.top - 1 || row.bottom > bounds.bottom + 1);
      }).length;
    })).toBe(0);
  };
  await expect(range.locator('bdi')).toHaveText(/^1–\d+ \/ 17$/);
  await checkRows();
  await range.getByRole('button', { name: 'التالي' }).click();
  await expect(range.locator('bdi')).not.toHaveText(/^1–/);
  await checkRows();
  await range.getByRole('button', { name: 'السابق' }).click();
  await expect(range.locator('bdi')).toHaveText(/^1–/);
  await checkRows();
  await range.getByRole('button', { name: 'السابق' }).click();
  await expect(page.locator('[data-position="record-16"]')).toBeInViewport({ ratio: 1 });
  await checkRows();
  await page.setViewportSize({ width: 1536, height: 872 });
  await checkRows();
  await page.screenshot({ path: testInfo.outputPath('portfolio-huawei-browser.png') });
  await page.setViewportSize({ width: 960, height: 540 });
  await fits(page);
  await expect(page.locator('.tv-allocation-list > div').last()).toBeInViewport({ ratio: 1 });
  await page.locator('.tv-portfolio-actions select').first().selectOption('bonds');
  await expect(range).toHaveCount(0);
  await expect(page.locator('.tv-portfolio-empty')).toBeVisible();
});
