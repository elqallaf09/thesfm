import { openAndroidTvPackage, openTvMenu, closeTvMenu } from './packageHarness';
import { expect, test } from '@playwright/test';
import { TV_EXTRA_NEWS_CHANNELS, TV_NEWS_FEEDS } from '../../src/lib/markets-tv/newsReceiver';
import { receiverText } from '../../src/lib/markets-tv/receiver';
import { expectNewsPage } from '../helpers/tv-news-pages';

for (const language of ['ar','en','fr'] as const) test(`all news channels: ${language} navigation, source isolation and TV fit`, async ({page}) => {
  await page.setViewportSize({width:1920,height:1080});
  await page.addInitScript(language => {
    if (!localStorage.getItem('sfm-markets-tv-settings-v1')) localStorage.setItem('sfm-markets-tv-settings-v1',JSON.stringify({language,broadcastChannel:'europeNews'}));
  },language);
  const requested: string[]=[];
  await page.route('**/api/**',route=>{
    const url=new URL(route.request().url());requested.push(url.pathname+url.search);
    const topic=url.searchParams.get('topic'), category=url.pathname.match(/\/([a-z]+)-stocks\/news/)?.[1];
    const items=Array.from({length:24},(_,index)=>({id:`${url.pathname}-${topic}-${index}`,title:`${topic||category||url.pathname} ${index} · أخبار الشركات المدرجة ونتائج أعمالها المالية وتطورات الأسواق من المصدر الأصلي`,source:'QA source',publishedAt:'2026-11-07T12:00:00Z',url:`https://example.com/${topic||category||'region'}/${index}`,shariahStatus:index%2?'needs_review':'unclassified'}));
    return route.fulfill({json:{items,topic,category,success:true,lastSuccessfulUpdate:'2026-11-07T13:00:00Z'}});
  });
  await openAndroidTvPackage(page);
  await expect(page.locator('.tv-headline-items button').first()).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  const nav=page.locator('.tv-side-menu-items');
  for (let index=0;index<TV_EXTRA_NEWS_CHANNELS.length;index++) {
    const channel=TV_EXTRA_NEWS_CHANNELS[index];
    await page.locator('[data-tv-focus-key="news-topics"]').click();
    const target = page.locator(`[data-tv-focus-key="topic:${channel}"]`);
    for (const [width, height] of [[960,540],[1920,1080]]) {
      await page.setViewportSize({ width, height });
      await target.focus();
      await expect(target).toBeInViewport();
    }
    await target.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.tv-side-menu')).toHaveCount(0);
    await expect(page.locator('.tv-receiver-heading h1')).toHaveText(receiverText(language,channel));
    const path=TV_NEWS_FEEDS[channel], parsed=new URL(path,'https://www.the-sfm.com');
    const label=parsed.searchParams.get('topic')||parsed.pathname.match(/\/([a-z]+)-stocks\/news/)?.[1]||parsed.pathname;
    await expectNewsPage(page, 24, 6);
    await expect(page.locator('.tv-headline-items button').first()).toContainText(label);
    for(const [width,height] of [[960,540],[1920,1080]]) {
      await page.setViewportSize({width,height});
      await expectNewsPage(page, 24, height <= 650 ? 2 : 6);
      await expect(page.locator('.tv-receiver-screen')).toBeInViewport({ratio:1});
      await expect(page.locator('.tv-headline-items button').last()).toBeInViewport({ratio:1});
    }
    if(channel==='shariaNews') {
      await expect(page.locator('.tv-news-screening').first()).toHaveAttribute('title', receiverText(language, 'unclassified'));
      await expect(page.locator('.tv-news-screening').first()).toHaveText({ ar: 'غير مصنّف', en: 'Unclassified', fr: 'Non classé' }[language]);
    }
  }
  expect(requested.some(path=>path.includes('snapshot')||path.includes('portfolio'))).toBe(false);
  // Native channel keys traverse the additional channels and wrap to the originals.
  await page.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'ChannelDown',bubbles:true})));
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view','cyclicalNews');
  await page.reload();await closeTvMenu(page);
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('data-tv-view','cyclicalNews');
  await openTvMenu(page);
  await expect(nav.locator('[aria-current=page]')).toHaveAttribute('data-tv-focus-key','menu:news');
  await page.keyboard.press('Escape');
  await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));
  const cards=page.locator('.tv-headline-items button');
  await expectNewsPage(page, 24, 6);
  const headlines=await cards.locator('.tv-news-title').allTextContents();
  await cards.last().focus();
  await page.clock.runFor(80000);
  await expect(cards.locator('.tv-news-title')).toHaveText(headlines);
  await expect(cards.last()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toContainText(headlines[headlines.length-1]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(cards.last()).toBeFocused();
});
