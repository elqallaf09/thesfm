import {expect,test} from '@playwright/test';
import {openAndroidTvPackage} from './packageHarness';
test('packaged pairing explains HTTP failures and permits a successful retry',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('sfm-markets-tv-settings-v1',JSON.stringify({language:'en',scene:'overview'})));
 await page.route('**/api/tv/snapshot?*',r=>r.fulfill({json:{summary:[],quotes:[],total:0,available:0}}));
 await page.route('**/api/tv/news?*',r=>r.fulfill({json:{stories:[]}}));
 let status=403,posts=0;
 await page.route('**/api/tv/pair',r=>{
  if(r.request().method()!=='POST')return r.fulfill({json:{state:'pending'}});
  posts++;
  return status===201?r.fulfill({status,json:{code:'ABCDEF123456',secret:'a'.repeat(64),expiresAt:new Date(Date.now()+600000).toISOString()}}):r.fulfill({status,json:{code:'TEST_FAILURE'}});
 });
 await openAndroidTvPackage(page);
 await page.locator('[data-tv-focus-key=pair]').click();
 const create=page.locator('.tv-pair-content button');
 for(const [code,message] of [[403,'This device could not start pairing'],[429,'Too many pairing attempts'],[503,'Pairing is temporarily unavailable']] as const){
  status=code;await create.click();await expect(page.getByRole('alert')).toContainText(message);await expect(create).toBeEnabled();await expect(page.locator('.tv-pair-code')).toHaveCount(0);
 }
 status=201;await create.click();await expect(page.locator('.tv-pair-code')).toHaveText('ABCD — EF12 — 3456');expect(posts).toBe(4);
});
