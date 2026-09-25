import {expect,test} from '@playwright/test';
import {userAuthStatePath} from './auth-state';
const authenticated=Boolean(process.env.E2E_USER_EMAIL&&process.env.E2E_USER_PASSWORD);
test.use({storageState:userAuthStatePath,trace:'off',screenshot:'off',video:'off'});
// These authenticated pages share one isolated Preview fixture. Keep the language
// variants serial so concurrent requests cannot turn transient fixture contention
// into user-visible error states while still requiring every page to load cleanly.
test.describe.configure({mode:'serial'});
const pages=[
 {url:'/economic-intelligence/advisors',titles:['المستشارون العشرة','Ten advisors','Dix conseillers']},
 {url:'/notifications/channels',titles:['قنوات التنبيهات','Notification channels','Canaux de notification']},
 {url:'/settings/integrations',titles:['التطبيقات والتكاملات','Apps and integrations','Applications et intégrations']},
] as const;
for(const [index,lang] of ['ar','en','fr'].entries())test(`new account workspaces retain language, labels and mobile reflow: ${lang}`,async({page})=>{
 test.skip(!authenticated,'Requires the isolated authenticated Preview fixture.');test.slow();
 await page.addInitScript(language=>localStorage.setItem('sfm_lang',language),lang);
 // Next.js mounts a visually hidden route announcer with role="alert" in a shadow
 // root once the App Router hydrates. It is not an error state, so exclude it.
 const pageAlerts=page.getByRole('alert').and(page.locator(':not(#__next-route-announcer__)'));
 for(const item of pages){
  await page.goto(item.url,{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{level:1,name:item.titles[index],exact:true})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir',lang==='ar'?'rtl':'ltr');
  await expect.poll(async()=>pageAlerts.count(),{timeout:30_000}).toBe(0);
  await expect.poll(()=>page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-document.documentElement.clientWidth)).toBeLessThanOrEqual(4);
 }
});
