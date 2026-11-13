import { expect, test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { TvLanguage, TvQuote } from '../../src/lib/markets-tv/types';
const now='2026-11-06T15:00:00Z';
const symbols=['^GSPC','^DJI','^NDX','^FTSE','^GDAXI','^N225'];
function quotes():TvQuote[]{return symbols.map((symbol,i)=>({symbol,name:['S&P 500','Dow Jones','Nasdaq 100','FTSE 100','DAX 40','Nikkei 225'][i],nameAr:['إس آند بي 500','داو جونز','ناسداك 100','فوتسي 100','داكس 40','نيكاي 225'][i],price:6000+i*5000,currency:null,changePercent:i===0?-.4:-.2-i,source:'QA source',observedAt:now,receivedAt:now,delayType:'delayed',status:'delayed',exchange:null,country:null,changeBasis:'session'}));}
async function open(page:Page,language:TvLanguage){
  await page.clock.install({time:new Date(now)});
  await page.addInitScript(language=>localStorage.setItem('sfm-markets-tv-settings-v1',JSON.stringify({language,scene:'overview'})),language);
  await page.route('**/api/tv/snapshot?*',r=>r.fulfill({json:{group:'global',scene:'overview',summary:quotes(),quotes:[],available:0,total:0,selectionTotal:6,generatedAt:now}}));
  await page.route('**/api/tv/news?*',r=>r.fulfill({json:{stories:[{id:'qa',title:'خبر اختبار عن الأسواق العالمية / Market news fixture',source:'QA',publishedAt:now,url:'https://example.com/news'}]}}));
  await page.route('**/api/tv/history',r=>r.fulfill({json:{symbol:'^GSPC',sessionDate:'2026-11-06',source:'QA source',fetchedAt:now,points:[{at:'2026-11-06T14:30:00Z',price:5999},{at:'2026-11-06T14:35:00Z',price:6002},{at:'2026-11-06T14:40:00Z',price:6000}]}}));
  await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);
  await expect(page.locator('.tv-hall-row')).toHaveCount(6);
  await page.evaluate(()=>document.fonts.ready);
}
async function contained(page:Page,selector:string){
  const bad=await page.locator(selector).evaluateAll(elements=>elements.flatMap(el=>{
    const b=el.getBoundingClientRect();return [...el.children].filter(child=>{const r=child.getBoundingClientRect();return r.width>0 && (r.left<b.left-2||r.right>b.right+2||r.top<b.top-2||r.bottom>b.bottom+2);}).map(child=>({parent:el.className,child:child.className}));
  }));expect(bad).toEqual([]);
}
for(const language of ['ar','en','fr'] as const)test(`Obsidian ${language} overview, world market cards and brief fit TV/tablet`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page,language);
  for(const [width,height] of [[960,540],[1280,720],[1536,1009],[1920,1080],[3840,2160]]){
    await page.setViewportSize({width,height});
    await contained(page,'.tv-hall-market-table,.tv-hall-row,.tv-hall-sessions');
    await expect(page.locator('.tv-hall-market-table')).toBeInViewport({ratio:1});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(height+1);
  }
  await page.setViewportSize({width:1920,height:1080});
  const tabs=page.locator('.tv-scene-tabs button');await tabs.nth(5).click();
  await expect(page.locator('.tv-session')).toHaveCount(5);
  await contained(page,'.tv-session,.tv-session-countdown');
  await expect(page.locator('.tv-world-pages')).toBeInViewport({ratio:1});
  await tabs.nth(6).click();
  await expect(page.locator('.tv-brief-metrics article')).toHaveCount(4);
  await expect(page.locator('.tv-ranking-empty')).toBeVisible();
  for(const [width,height] of [[960,540],[1280,720],[1536,1009],[1920,1080]]){
    await page.setViewportSize({width,height});
    await contained(page,'.tv-brief-dashboard');
    await expect(page.locator('.tv-brief-rankings')).toBeInViewport({ratio:1});
  }
  expect(errors).toEqual([]);
});
test('Tweaks persists all four accents across views, reload and light mode',async({page})=>{
  await open(page,'en');await page.locator('[data-tv-focus-key=settings]').click();
  for(const accent of ['blue','green','purple','champagne']){
    await page.locator(`.tv-accent-options [data-accent=${accent}]`).click();
    await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-accent',accent);
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('sfm-markets-tv-settings-v1')!).accent)).toBe(accent);
  }
  await page.getByRole('button',{name:'Light',exact:true}).click();await page.keyboard.press('Escape');
  await expect(page.locator('[data-tv-root]')).toHaveClass(/tv-light/);
  await page.reload();await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-accent','champagne');
});
test('missing prices remain explicit without a fabricated chart',async({page})=>{
  await open(page,'en');
  await page.route('**/api/tv/snapshot?*',r=>r.fulfill({json:{group:'global',scene:'overview',summary:quotes().map(q=>({...q,price:null,changePercent:null,source:null,status:'unavailable',issue:'rate_limited'})),quotes:[],total:0,available:0,generatedAt:now}}));
  await page.route('**/api/tv/history',r=>r.fulfill({json:{symbol:'^GSPC',points:[],issue:'access_denied'}}));
  await page.reload();
  await expect(page.locator('.tv-hall-row [data-status=unavailable].tv-quote-evidence')).toHaveCount(6);
  await expect(page.locator('.tv-session-chart svg')).toHaveCount(0);
  await page.locator('.tv-hall-identity button').first().focus();await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-dialog]')).toBeVisible();
  await expect(page.locator('.tv-hall-price strong').first()).toHaveText('—');
});
