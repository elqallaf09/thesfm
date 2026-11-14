import { expect, test, type Page } from '@playwright/test';
import { openAndroidTvPackage } from './packageHarness';
const instant='2026-11-07T10:24:05Z';
async function open(page:Page,language='ar'){
 await page.addInitScript(language=>{
  if(!localStorage.getItem('sfm-markets-tv-settings-v1'))localStorage.setItem('sfm-markets-tv-settings-v1',JSON.stringify({language,scene:'world'}));
 },language);
 await page.clock.install({time:new Date(instant)});
 await page.route('**/api/tv/news?*',r=>r.fulfill({json:{stories:[]}}));
 await page.route('**/api/tv/history',r=>r.fulfill({json:{points:[]}}));
 await page.route('**/api/tv/snapshot?*',r=>r.fulfill({json:{summary:Array.from({length:8},(_,i)=>({symbol:`QA${i}`,name:`Test ${i}`,nameAr:`اختبار ${i}`,price:100+i,currency:'USD',changePercent:1,source:'QA',observedAt:instant,receivedAt:instant,status:'available',changeBasis:'session'})),quotes:[],total:0,available:0,generatedAt:instant}}));
 await openAndroidTvPackage(page);
}
async function contained(page:Page){
 await expect.poll(()=>page.locator('.tv-world-grid,.tv-session,.tv-timeline-state,.tv-session-countdown').evaluateAll(elements=>elements.flatMap(el=>{
  const box=el.getBoundingClientRect();return [...el.children].filter(child=>{const r=child.getBoundingClientRect();return r.width>0&&(r.left<box.left-2||r.right>box.right+2||r.top<box.top-2||r.bottom>box.bottom+2);}).map(child=>({parent:el.className,child:child.className}));
 }))).toEqual([]);
}
for(const language of ['ar','en','fr'])test(`world sessions ${language}: select all, paginate, filter, persist and clear`,async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1536,height:1009});await open(page,language);
 await page.locator('.tv-scene-tabs button').nth(5).click();
 await expect(page.locator('.tv-session')).toHaveCount(5);
 await page.locator('[data-tv-focus-key=sessions-choose]').click();
 await expect(page.getByRole('checkbox')).toHaveCount(81);
 expect(await page.locator('.tv-session-options').innerText()).not.toMatch(/Israel|إسرائيل|Israël|XTAE/);
 await page.locator('.tv-session-picker-actions button').first().click();
 await expect(page.getByRole('checkbox',{checked:true})).toHaveCount(81);
 await page.locator('[data-tv-focus-key=sessions-done]').click();
 await expect(page.locator('.tv-session')).toHaveCount(17);
 if(language==='ar')await page.screenshot({path:testInfo.outputPath('world-sessions-1536.png')});
 const visited=new Set<string>();
 for(let i=0;i<5;i++){
  for(const id of await page.locator('.tv-session').evaluateAll(elements=>elements.map(e=>e.getAttribute('data-market')!)))visited.add(id);
  await expect(page.locator('.tv-session .tv-market-flag')).toHaveCount(await page.locator('.tv-session').count());
  await expect.poll(()=>page.locator('.tv-session .tv-market-flag').evaluateAll(async elements=>{const images=await Promise.all(elements.map(el=>new Promise<boolean>(resolve=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth===1600&&image.naturalHeight===840);image.onerror=()=>resolve(false);image.src=getComputedStyle(el).backgroundImage.slice(5,-2);})));return images.every(Boolean);})).toBe(true);
  await contained(page);await page.locator('[data-tv-focus-key=sessions-next]').click();
 }
 expect(visited.size).toBe(81);
 for(const [width,height] of [[960,540],[1280,720],[1536,1009],[1920,1080],[3840,2160]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);await contained(page);
  await expect(page.locator('.tv-sessions-note')).toBeInViewport({ratio:1});
  await expect(page.locator('.tv-world-pages')).toBeInViewport({ratio:1});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 }
 await page.setViewportSize({width:1536,height:1009});
 await page.locator('[data-tv-focus-key=sessions-choose]').click();
 await page.locator('.tv-session-picker-actions button').nth(1).click();
 await page.locator('.tv-session-search input').fill('فلسطين');
 await expect(page.getByRole('checkbox')).toHaveCount(1);await page.getByRole('checkbox').click();
 await page.locator('[data-tv-focus-key=sessions-done]').click();
 await expect(page.locator('.tv-session')).toHaveCount(1);await expect(page.locator('.tv-session')).toHaveAttribute('data-market','XPAE');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sfm-markets-tv-settings-v1')||'{}').sessionIds)).toEqual(['XPAE']);
 await page.reload();await expect(page.locator('[data-tv-focus-key="scene:world"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('.tv-scene-tabs button').first().click();
 await expect(page.locator('.tv-hall-session')).toHaveCount(1);await expect(page.locator('.tv-hall-session')).toContainText(language==='ar'?'بورصة فلسطين':language==='fr'?'Bourse de Palestine':'Palestine Exchange');
 await page.locator('.tv-scene-tabs button').nth(5).click();
 await expect(page.locator('.tv-session')).toHaveCount(1);await expect(page.locator('.tv-session')).toHaveAttribute('data-market','XPAE');
 await page.locator('[data-tv-focus-key=sessions-choose]').click();await page.locator('.tv-session-picker-actions button').nth(1).click();await page.locator('[data-tv-focus-key=sessions-done]').click();
 await expect(page.locator('.tv-world-empty')).toBeVisible();await expect(page.locator('.tv-world-pages bdi')).toHaveText('1 / 1');
 expect(errors).toEqual([]);
});
test('ticker survives invalid WebView font measurements and resizes without NaN',async({page})=>{
 await page.setViewportSize({width:960,height:540});await open(page,'en');
 const ticker=page.locator('.tv-quote-marquee'),track=ticker.locator('.tv-marquee-track');
 await expect(ticker).toBeVisible();
 await page.evaluate(()=>{const original=window.getComputedStyle.bind(window);window.getComputedStyle=(element,pseudo)=>{const result=original(element,pseudo);return element.matches('.tv-marquee-set')?new Proxy(result,{get(target,key){return key==='fontSize'?'unavailable':Reflect.get(target,key,target);}}):result;};});
 for(const [width,height] of [[1000,560],[1280,720]]){
   await page.setViewportSize({width,height});
   await expect.poll(()=>track.evaluate(el=>getComputedStyle(el).animationDuration)).toMatch(/^[0-9.]+s$/);
   await expect(ticker).not.toHaveAttribute('style',/NaN/);
 }
 await ticker.locator('.tv-marquee-toggle').click();await expect(track).toHaveCSS('animation-play-state','paused');
});
