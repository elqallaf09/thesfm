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

test('ticker resumes continuous movement after touch playback',async({page})=>{
  await page.setViewportSize({width:1536,height:1009}); await open(page,'en');
  const ticker=page.locator('.tv-quote-marquee'), track=ticker.locator('.tv-marquee-track'), playback=ticker.locator('.tv-marquee-toggle');
  await playback.click(); await expect(track).toHaveCSS('animation-play-state','paused');
  await playback.click(); await page.mouse.move(0,0);
  await expect(track).toHaveCSS('animation-play-state','running');
  const before=await track.evaluate(el=>getComputedStyle(el).transform);
  await expect.poll(()=>track.evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
});
test('remote quote focus holds the strip but playback focus does not',async({page})=>{
  await page.setViewportSize({width:1536,height:1009}); await open(page,'en');
  const ticker=page.locator('.tv-quote-marquee'), track=ticker.locator('.tv-marquee-track');
  await ticker.locator('.tv-marquee-set:not([aria-hidden]) button').first().focus();
  await expect(track).toHaveCSS('animation-name','none');
  await ticker.locator('.tv-marquee-toggle').focus();
  await expect(track).toHaveCSS('animation-name','tv-quote-scroll');
  await expect(track).toHaveCSS('animation-play-state','running');
});
