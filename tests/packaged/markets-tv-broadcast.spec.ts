import { expect, test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { TV_SESSION_IDS } from '../../src/lib/markets-tv/sessionSelection';
const instant='2026-11-08T07:10:00Z';
const title={ar:'تدفقات الأسهم العالمية تصمد أمام التغيرات الاقتصادية وتوقعات أسعار الفائدة مع ترقب المستثمرين نتائج الشركات الكبرى',en:'Global equity flows remain resilient as investors assess interest rate expectations and the latest earnings reports from major companies',fr:'Les marchés mondiaux résistent alors que les investisseurs évaluent les perspectives des taux et les résultats des grandes entreprises'};
async function open(page:Page,language:'ar'|'en'|'fr'='ar',scene='overview'){
 await page.clock.install({time:new Date(instant)});
 await page.addInitScript(({language,scene,ids})=>localStorage.setItem('sfm-markets-tv-settings-v1',JSON.stringify({language,scene,sessionIds:ids})),{language,scene,ids:[...TV_SESSION_IDS]});
 const symbols=['^GSPC','^DJI','^NDX','^FTSE','^GDAXI','^N225'];
 const quote=(i:number)=>({symbol:symbols[i]||`QA${i}`,name:['S&P 500','Dow Jones','Nasdaq 100','FTSE 100','DAX 40','Nikkei 225'][i%6],nameAr:['إس آند بي 500','داو جونز','ناسداك 100','فوتسي 100','داكس 40','نيكاي 225'][i%6],price:6000+i*1000,currency:null,changePercent:i%2?-2.4:1.3,changeBasis:'session',source:'QA source',observedAt:instant,receivedAt:instant,status:'available',delayType:'realtime'});
 await page.route('**/api/tv/snapshot?*',r=>r.fulfill({json:{summary:Array.from({length:6},(_,i)=>quote(i)),quotes:Array.from({length:6},(_,i)=>quote(i+6)),total:6,available:6,generatedAt:instant}}));
 await page.route('**/api/tv/news?*',r=>r.fulfill({json:{stories:Array.from({length:5},(_,i)=>({id:`news${i}`,title:`${i+1} · ${title[language]}`,source:'Asharq Al-Awsat Economy',publishedAt:instant,url:'https://example.com/news'}))}}));
 await page.route('**/api/tv/history',r=>r.fulfill({json:{sessionDate:'2026-11-06',source:'QA source',points:[{at:'2026-11-06T14:30:00Z',price:6000},{at:'2026-11-06T21:00:00Z',price:6005}]}}));
 await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);await page.evaluate(()=>document.fonts.ready);
}
async function fits(page:Page,selector:string){
 await expect.poll(()=>page.locator(selector).evaluateAll(elements=>elements.flatMap(element=>{
  const b=element.getBoundingClientRect();return [...element.children].filter(child=>{const r=child.getBoundingClientRect();return r.width>0&&r.height>0&&(r.left<b.left-2||r.right>b.right+2||r.top<b.top-2||r.bottom>b.bottom+2);}).map(child=>({parent:element.className,child:child.className,box:{top:b.top,bottom:b.bottom},childBox:{top:child.getBoundingClientRect().top,bottom:child.getBoundingClientRect().bottom}}));
 }))).toEqual([]);
}
for(const language of ['ar','en','fr'] as const)test(`TV ${language}: all markets use five pages and advance at exactly forty seconds`,async({page})=>{
 await page.setViewportSize({width:1536,height:1009});await open(page,language);await page.locator('.tv-scene-tabs button').nth(5).click();
 await expect(page.locator('.tv-world-pages > bdi')).toHaveText('1 / 5');await expect(page.locator('.tv-session')).toHaveCount(17);
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+100));
 const kw=page.locator('[data-market=XKUW]'),ny=page.locator('[data-market=XNYS]');
 await expect(kw).toHaveAttribute('data-open','true');await expect(ny).toHaveAttribute('data-open','false');
 const colors=await page.evaluate(()=>[document.querySelector('[data-market=XKUW]')!,document.querySelector('[data-market=XNYS]')!].map(e=>getComputedStyle(e).backgroundColor));expect(colors[0]).not.toBe(colors[1]);
 await page.locator('[data-tv-focus-key=sessions-playback]').click();await page.locator('[data-tv-focus-key=sessions-playback]').click();
 await page.clock.runFor(39999);await expect(page.locator('.tv-world-pages > bdi')).toHaveText('1 / 5');
 await page.clock.runFor(1);await expect(page.locator('.tv-world-pages > bdi')).toHaveText('2 / 5');
 await page.locator('[data-tv-focus-key=sessions-playback]').click();await page.clock.runFor(80000);await expect(page.locator('.tv-world-pages > bdi')).toHaveText('2 / 5');
 await page.locator('[data-tv-focus-key=sessions-playback]').click();await page.clock.runFor(40000);await expect(page.locator('.tv-world-pages > bdi')).toHaveText('3 / 5');
 const seen=new Set<string>();
 for(let i=0;i<5;i++){for(const id of await page.locator('.tv-session').evaluateAll(es=>es.map(e=>e.getAttribute('data-market')!)))seen.add(id);await page.locator('[data-tv-focus-key=sessions-next]').click();}
 expect(seen.size).toBe(81);
 for(const [width,height] of [[960,540],[1280,720],[1536,1009],[1920,1080],[3840,2160]]){
  await page.setViewportSize({width,height});await fits(page,'.tv-world-sessions,.tv-world-grid,.tv-session,.tv-world-data');
  await expect(page.locator('.tv-sessions-note')).toBeInViewport({ratio:1});
  expect(await page.locator('.tv-world-grid').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
 }
});
for(const language of ['ar','en','fr'] as const)test(`TV ${language}: full news and movers remain visible without sidebar scrolling`,async({page},testInfo)=>{
 await page.setViewportSize({width:1536,height:1009});await open(page,language);
 for(const scene of ['overview','world']){
  await page.locator(`[data-tv-focus-key="scene:${scene}"]`).click();
  if(scene==='world') await expect(page.locator('.tv-scene-movers')).toBeVisible();
  await expect(page.locator(scene==='overview'?'.tv-headline-story':'.tv-scene-headlines button[data-tv-focus-key^="story:"]').first()).toContainText(title[language]);
  for(const [width,height] of [[960,540],[1280,720],[1536,1009],[1920,1080],[3840,2160]]){
   await page.setViewportSize({width,height});await fits(page,scene==='overview'?'.tv-hall-market-table,.tv-hall-row,.tv-hall-sessions,.tv-headline-band':'.tv-scene-sidebar,.tv-now-panel,.tv-scene-headlines,.tv-scene-movers,.tv-broadcast-heading,.tv-headline-items,.tv-mover-items');
   for(const selector of scene==='overview'?['.tv-headline-band','.tv-hall-market-table']:['.tv-scene-headlines','.tv-scene-movers']){
    await expect(page.locator(selector)).toBeInViewport({ratio:1});
    expect(await page.locator(selector).evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
   }
  }
 }
 if(language==='ar'){await page.setViewportSize({width:1536,height:1009});await page.locator('[data-tv-focus-key="scene:overview"]').click();await page.screenshot({path:testInfo.outputPath('tv18-overview.png')});}
});
