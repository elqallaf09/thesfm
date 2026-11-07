import {expect,test} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const base={price:100,changePercent:1,currency:'USD',source:'QA fixture',observedAt:new Date().toISOString(),receivedAt:new Date().toISOString(),status:'closed',changeBasis:'session',country:'US'};
test('bundled gold, silver and company logos render offline at tablet sizes',async({page})=>{
 await page.setViewportSize({width:1536,height:1009});
 await page.addInitScript(()=>localStorage.setItem('sfm-markets-tv-settings-v1',JSON.stringify({language:'ar',scene:'assets'})));
 const summary=[['COMEX:GC1!','Gold','الذهب · عقد مستمر','COMEX'],['COMEX:SI1!','Silver','الفضة · عقد مستمر','COMEX'],['NYMEX:CL1!','WTI','نفط WTI · عقد مستمر','NYMEX'],['NYMEX:NG1!','Gas','الغاز · عقد مستمر','NYMEX']].map(([symbol,name,nameAr,exchange])=>({...base,symbol,name,nameAr,exchange}));
 const quotes=['TSLA','AAPL','MSFT'].map(symbol=>({...base,symbol,name:symbol,nameAr:symbol,exchange:'NASDAQ'}));
 await page.route('https://**/*',r=>{const u=r.request().url();return u.includes('/api/tv/snapshot?')?r.fulfill({json:{group:'commodities',scene:'assets',summary,quotes,total:3,available:3,generatedAt:new Date().toISOString()}}):u.includes('/api/tv/news?')?r.fulfill({json:{stories:[]}}):r.abort();});
 await page.goto(pathToFileURL(resolve('.tv-build/web/index.html')).href);
 await expect(page.locator('.tv-scene-summaries img')).toHaveCount(2);
 await expect(page.locator('.tv-scene-row img')).toHaveCount(3);
 await expect.poll(()=>page.locator('.tv-scene-summaries img,.tv-scene-row img').evaluateAll(nodes=>nodes.every(n=>(n as HTMLImageElement).complete&&(n as HTMLImageElement).naturalWidth>0))).toBe(true);
 for(const [width,height] of [[1536,1009],[960,540],[1920,1080]]){
  await page.setViewportSize({width,height});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  await expect(page.locator('.tv-scene-summaries')).toBeInViewport({ratio:1});
  const clipped=await page.locator('.tv-scene-summary').evaluateAll(nodes=>nodes.some(n=>n.scrollWidth>n.clientWidth+2));expect(clipped).toBe(false);
 }
 await page.setViewportSize({width:1536,height:1009});
 await page.screenshot({path:'../visual-qa-build14.png'});
});
