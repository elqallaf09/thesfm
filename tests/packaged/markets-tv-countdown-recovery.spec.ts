import { expect, test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const saturday='2026-11-07T10:24:05Z';
const saved={symbol:'^GSPC',name:'S&P 500',nameAr:'إس آند بي 500',price:7000,currency:null,changePercent:1,
 source:'QA source',observedAt:'2026-11-06T21:00:00Z',receivedAt:saturday,status:'stale',changeBasis:'session'};
async function open(page:Page,scene='world'){
 await page.clock.install({time:new Date(saturday)});
 await page.addInitScript(scene=>localStorage.setItem('sfm-markets-tv-settings-v1',JSON.stringify({language:'ar',scene})),scene);
 await page.route('**/api/tv/news?*',r=>r.fulfill({json:{stories:[]}}));
 await page.route('**/api/tv/history',r=>r.fulfill({json:{points:[]}}));
 await page.route('**/api/tv/snapshot?*',r=>r.fulfill({json:{summary:[saved],quotes:[{...saved,symbol:'ASML.AS',name:'ASML',nameAr:'إيه إس إم إل',currency:'EUR',price:1200}],total:1,available:1,generatedAt:saturday}}));
 await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);
}
async function contained(page:Page,selector:string){
 const bad=await page.locator(selector).evaluateAll(elements=>elements.flatMap(element=>{
  const b=element.getBoundingClientRect();return [...element.children].filter(child=>{
   const r=child.getBoundingClientRect();return r.width>0&&(r.left<b.left-2||r.right>b.right+2||r.top<b.top-2||r.bottom>b.bottom+2);
  }).map(child=>({parent:element.className,child:child.className}));
 }));expect(bad).toEqual([]);
}
test('Arabic weekend countdown ticks every second, shows units, and reaches the exact Sunday opening',async({page})=>{
 await page.setViewportSize({width:1536,height:1009});await open(page);
 await page.locator('.tv-scene-tabs button').nth(5).click();
 await expect(page.locator('.tv-session')).toHaveCount(5);
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+100));
 const kw=page.locator('.tv-session[data-market=XKUW]'),ny=page.locator('.tv-session[data-market=XNYS]');
 await page.clock.setSystemTime(new Date(saturday));
 await page.clock.fastForward(1000);
 await expect(kw.locator('.tv-compact-countdown bdi')).toHaveText('00ي 19:35:54');
 await expect(ny.locator('.tv-compact-countdown bdi')).toHaveText('02ي 04:05:54');
 await kw.locator('header button').click();
 await expect(page.locator('.tv-session-qr .tv-session-countdown small')).toHaveText(['يوم','ساعة','دقيقة','ثانية']);
 await expect(page.locator('.tv-session-qr')).toContainText('08/11');
 await page.locator('[data-tv-focus-key=session-source-back]').click();
 await expect(kw).toHaveAttribute('data-open','false');
 await page.clock.fastForward(1000);
 await expect(kw.locator('.tv-compact-countdown bdi')).toHaveText('00ي 19:35:53');
 for(const [width,height] of [[960,540],[1280,720],[1536,1009],[1920,1080]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);
  await contained(page,'.tv-session,.tv-timeline-state,.tv-session-countdown');
  await expect(page.locator('.tv-sessions-note')).toBeInViewport({ratio:1});
  await expect(page.locator('.tv-world-pages')).toBeInViewport({ratio:1});
  await expect(page.locator('.tv-world-grid')).toBeInViewport({ratio:1});
 }
 await page.clock.fastForward(Date.parse('2026-11-08T06:00:00Z')-await page.evaluate(()=>Date.now()));
 await expect(kw).toHaveAttribute('data-open','true');
 await expect(kw.locator('.tv-world-count > small')).toHaveText('يغلق');
 await expect(kw.locator('.tv-compact-countdown bdi')).toHaveText('00ي 04:00:00');
});
test('brief shows dated saved prices with working detail actions instead of empty ranking panels',async({page})=>{
 await open(page);await page.locator('.tv-scene-tabs button').nth(6).click();
 await expect(page.locator('.tv-brief-dashboard h1')).toHaveText('آخر الأسعار المحفوظة');
 await expect(page.locator('.tv-brief-rankings')).toHaveCount(0);
 await expect(page.locator('.tv-brief-saved button')).toHaveCount(2);
 await expect(page.locator('.tv-brief-saved time').first()).toHaveAttribute('dateTime',saved.observedAt);
 for(const [width,height] of [[960,540],[1536,1009]]){
  await page.setViewportSize({width,height});await contained(page,'.tv-brief-dashboard,.tv-brief-saved button');
  await expect(page.locator('.tv-brief-saved button').last()).toBeInViewport({ratio:1});
 }
 await page.locator('.tv-brief-saved button').first().focus();await page.keyboard.press('Enter');
 await expect(page.locator('[data-tv-dialog]')).toBeVisible();
});
test('change map falls back to saved price rows and displays prices when verified changes return',async({page})=>{
 await open(page);await page.locator('[data-tv-focus-key=scene-heatmap]').click();
 await expect(page.locator('.tv-scene-map-notice')).toBeVisible();
 await expect(page.locator('.tv-scene-row')).toHaveCount(1);
 await page.route('**/api/tv/snapshot?*',r=>r.fulfill({json:{summary:[{...saved,status:'closed',observation:{precision:'instant',marketOpen:false}}],quotes:[{...saved,symbol:'ASML.AS',currency:'EUR',price:1200,status:'closed',observation:{precision:'instant',marketOpen:false}}],available:1,total:1,generatedAt:saturday}}));
 await page.reload();await page.locator('[data-tv-focus-key=scene-heatmap]').click();
 await expect(page.locator('.tv-scene-heatmap-price')).toHaveCount(1);
 await expect(page.locator('.tv-scene-heatmap-price').first()).toContainText('1,200');
 await expect(page.locator('.tv-scene-map-notice')).toHaveCount(0);
});
