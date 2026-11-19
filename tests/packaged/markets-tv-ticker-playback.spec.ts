import { closeTvMenu, openTvHeaderActions, closeTvHeaderActions, chooseTvDestination } from './packageHarness';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { TvDisplayMode, TvLanguage, TvQuote } from '../../src/lib/markets-tv/types';
const now='2026-11-06T15:00:00Z';
const symbols=['^GSPC','^DJI','^NDX','^FTSE','^GDAXI','^N225'];
function quotes():TvQuote[]{return symbols.map((symbol,i)=>({symbol,name:['S&P 500','Dow Jones','Nasdaq 100','FTSE 100','DAX 40','Nikkei 225'][i],nameAr:['إس آند بي 500','داو جونز','ناسداك 100','فوتسي 100','داكس 40','نيكاي 225'][i],price:6000+i*5000,currency:null,changePercent:i===0?-.4:-.2-i,source:'QA source',observedAt:now,receivedAt:now,delayType:'delayed',status:'delayed',exchange:null,country:null,changeBasis:'session'}));}
async function open(page:Page,language:TvLanguage,displayMode:TvDisplayMode='viewing'){
  await page.clock.install({time:new Date(now)});
  await page.addInitScript(({language,displayMode})=>{
    sessionStorage.setItem('sfm-tv-welcome-shown','1');
    localStorage.setItem('sfm-markets-tv-settings-v1',JSON.stringify({language,displayMode,scene:'overview',autoRotate:false,marketIds:['global'],groups:['global']}));
  },{language,displayMode});
  await page.route('**/api/tv/catalog',r=>r.fulfill({json:{markets:[{id:'global',group:'global',labelAr:'المؤشرات العالمية',labelEn:'World indices',labelFr:'Indices mondiaux',count:6,status:'selected'}]}}));
  await page.route('**/api/tv/instruments?*',r=>r.fulfill({json:{items:quotes().map(quote=>({...quote,region:'US'})),total:6,directoryTotal:6,page:0,pageSize:6}}));
  await page.route('**/api/tv/snapshot?*',r=>r.fulfill({json:{group:'global',scene:'overview',summary:quotes(),quotes:quotes(),available:6,total:6,selectionTotal:6,generatedAt:now}}));
  await page.route('**/api/tv/news?*',r=>r.fulfill({json:{stories:[0,1,2].map(index=>({id:`qa-${index}`,title:`خبر اختبار عن الأسواق العالمية / Market news fixture ${index+1}`,source:'QA',publishedAt:now,url:`https://example.com/news/${index}`}))}}));
  await page.route('**/api/tv/history',r=>r.fulfill({json:{symbol:'^GSPC',sessionDate:'2026-11-06',source:'QA source',fetchedAt:now,points:[{at:'2026-11-06T14:30:00Z',price:5999},{at:'2026-11-06T14:35:00Z',price:6002},{at:'2026-11-06T14:40:00Z',price:6000}]}}));
  await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);await closeTvMenu(page);
  if(displayMode==='strips') await expect(page.locator('.tv-market-strip-track')).toHaveCount(1);
  else await expect(page.locator('.tv-hall-row')).toHaveCount(6);
  await page.evaluate(()=>document.fonts.ready);
}

async function includeWebsiteMotionGuard(page:Page){
  // Standalone packages do not include globals.css. Exercise the actual web
  // rule too: its !important duration used to defeat the TV's Play button.
  const css=readFileSync(resolve('src/app/globals.css'),'utf8');
  const duration=css.indexOf('animation-duration: 0.01ms !important;');
  expect(duration,'the website reduced-motion guard is part of this regression').toBeGreaterThan(0);
  const start=css.lastIndexOf('@media (prefers-reduced-motion: reduce)',duration);
  expect(start).toBeGreaterThan(0);
  let end=css.indexOf('{',start),depth=0;
  for(;end<css.length;end++){
    if(css[end]==='{')depth++;
    if(css[end]==='}'&&--depth===0){end++;break;}
  }
  await page.addStyleTag({content:css.slice(start,end)});
}

async function expectContinuousMovement(track:Locator){
  await expect(track).toHaveCSS('animation-play-state','running');
  await expect(track).toHaveCSS('animation-iteration-count','infinite');
  expect(await track.evaluate(el=>parseFloat(getComputedStyle(el).animationDuration))).toBeGreaterThan(1);
  let before=await track.evaluate(el=>getComputedStyle(el).transform);
  await expect.poll(()=>track.evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
  before=await track.evaluate(el=>getComputedStyle(el).transform);
  await expect.poll(()=>track.evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
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

test('strips keep moving behind quote details and preserve explicit Pause through the overlay',async({page})=>{
  await page.setViewportSize({width:1536,height:1009});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await open(page,'en','strips');
  const track=page.locator('.tv-market-strip-track'),playback=page.locator('[data-tv-focus-key=ticker-playback]');
  const quote=page.locator('.tv-market-strip-set[aria-hidden=false] .tv-market-strip-item').first(),dialog=page.locator('[data-tv-dialog]');
  await page.mouse.move(0,0);
  await expectContinuousMovement(track);
  await openTvHeaderActions(page);
  await expect(playback).toHaveAttribute('aria-pressed','false');
  await closeTvHeaderActions(page);
  await quote.focus(); await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  // Selecting a quote holds its track only until remote focus enters details.
  await expect(dialog.getByRole('button',{name:'Close',exact:true})).toBeFocused();
  await expectContinuousMovement(track);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await openTvHeaderActions(page);
  await expect(playback).toHaveAttribute('aria-pressed','false');
  await playback.focus(); await page.keyboard.press('Enter');
  await expect(playback).toHaveAttribute('aria-pressed','true');
  await expect(track).toHaveCSS('animation-play-state','paused');
  await closeTvHeaderActions(page);
  await quote.focus(); await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Close',exact:true})).toBeFocused();
  await expect(track).toHaveCSS('animation-name','tv-scroll');
  await expect(track).toHaveCSS('animation-play-state','paused');
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await openTvHeaderActions(page);
  await playback.focus();
  await expect(playback).toHaveAttribute('aria-pressed','true');
  await expect(track).toHaveCSS('animation-play-state','paused');
  await page.keyboard.press('Enter');
  await expect(playback).toHaveAttribute('aria-pressed','false');
  await expectContinuousMovement(track);
});

for(const mode of ['viewing','browse','strips'] as const) test(`${mode} first Play restores continuous motion under the website reduced-motion guard`,async({page})=>{
  await page.setViewportSize({width:960,height:720});
  await page.emulateMedia({reducedMotion:'reduce'});
  await open(page,'en',mode);
  await includeWebsiteMotionGuard(page);
  const track=page.locator(mode==='strips'?'.tv-market-strip-track':'.tv-marquee-track');
  const viewport=page.locator(mode==='strips'?'.tv-market-strip-window':'.tv-marquee-viewport');
  const playback=page.locator(mode==='strips'?'[data-tv-focus-key=ticker-playback]':'.tv-marquee-toggle');
  await expect(track).toHaveCSS('animation-name','none');
  if(mode==='strips') await openTvHeaderActions(page);
  await expect(playback).toHaveAttribute('aria-pressed','true');
  // Scrollbar/touch scrolling need not focus a quote or emit a blur event.
  expect(await viewport.evaluate(element=>{element.scrollLeft=100;return element.scrollLeft;})).toBeGreaterThan(0);
  await playback.focus(); await page.keyboard.press('Enter');
  await expect(playback).toBeFocused();
  await expect(playback).toHaveAttribute('aria-pressed','false');
  await expect.poll(()=>viewport.evaluate(element=>element.scrollLeft)).toBe(0);
  await expectContinuousMovement(track);
  await page.keyboard.press('Enter');
  await expect(playback).toHaveAttribute('aria-pressed','true');
  await expect(track).toHaveCSS('animation-play-state','paused');
  expect(await page.locator('[aria-hidden=true] [tabindex="0"]').count()).toBe(0);
});

test('all news stays visible across display changes while ticker playback remains independent',async({page})=>{
  await page.setViewportSize({width:1536,height:1009});
  await page.emulateMedia({reducedMotion:'reduce'});
  await open(page,'en');
  await includeWebsiteMotionGuard(page);
  const band=page.locator('.tv-headline-band'),cards=band.locator('.tv-headline-story');
  await expect(cards).toHaveCount(3);
  await expect(band.locator('.tv-headline-playback,button.tv-headline-label')).toHaveCount(0);
  const headlines=await cards.locator('.tv-news-title').allTextContents();
  await cards.nth(1).focus();
  await page.clock.runFor(80000);
  await expect(cards.locator('.tv-news-title')).toHaveText(headlines);
  await expect(cards.nth(1)).toBeFocused();
  await expect(page.locator('.tv-marquee-toggle')).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toContainText('fixture 2');
  await page.keyboard.press('Escape');
  await expect(cards.nth(1)).toBeFocused();
  await chooseTvDestination(page, 'allStocks');
  await expect(page.locator('.tv-all-stocks')).toBeVisible();
  await expect(cards.locator('.tv-news-title')).toHaveText(headlines);
  await expect(page.locator('.tv-marquee-toggle')).toHaveAttribute('aria-pressed','true');
  await page.locator('.tv-marquee-toggle').focus();
  await page.keyboard.press('Enter');
  await expectContinuousMovement(page.locator('.tv-marquee-track'));
  await page.clock.runFor(80000);
  await expect(cards.locator('.tv-news-title')).toHaveText(headlines);
  await chooseTvDestination(page, 'hall');
  await expect(cards.locator('.tv-news-title')).toHaveText(headlines);
  await expect(page.locator('.tv-marquee-toggle')).toHaveAttribute('aria-pressed','false');
});

test('all-stocks media play/pause follows ticker state while the scene is fixed',async({page})=>{
  await page.setViewportSize({width:1536,height:1009});
  await page.emulateMedia({reducedMotion:'reduce'});
  await open(page,'en','browse');
  const playback=page.locator('.tv-marquee-toggle'),track=page.locator('.tv-marquee-track');
  await expect(playback).toHaveAttribute('aria-pressed','true');
  const mediaToggle=()=>page.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'MediaPlayPause',bubbles:true})));
  await mediaToggle(); await expect(playback).toHaveAttribute('aria-pressed','false');
  await expectContinuousMovement(track);
  await mediaToggle(); await expect(playback).toHaveAttribute('aria-pressed','true');
  await expect(track).toHaveCSS('animation-play-state','paused');
  await expect(page.locator('.tv-all-stocks')).toBeVisible();
});
