import { describe, expect, it } from 'vitest';
import { receiverText, TV_RECEIVER_CHANNELS } from '@/lib/markets-tv/receiver';
import { TV_NEWS_FEEDS, receiverNewsPath, receiverNewsPayload } from '@/lib/markets-tv/newsReceiver';
import { tvPackagedOrigin } from '@/lib/markets-tv/cors';
const story = { id: 'one', title: 'Source headline', source: 'Source', publishedAt: '2026-11-07T11:00:00Z', url: 'https://example.com/one' };
describe('website news channels on TV', () => {
  it('preserves the original five numbers and exposes every added channel in three languages', () => {
    expect(TV_RECEIVER_CHANNELS).toHaveLength(25);
    expect(TV_RECEIVER_CHANNELS.slice(0,5)).toEqual(['allStocks','technology','kuwait','sessions','investments']);
    expect(new Set(Object.values(TV_NEWS_FEEDS)).size).toBe(20);
    for (const channel of TV_RECEIVER_CHANNELS) for (const language of ['ar','en','fr'] as const) expect(receiverText(language,channel)).toBeTruthy();
    expect(receiverNewsPath('underDollarNews','ar')).toBe('/api/market/special-news?topic=stocks-under-1&lang=ar&limit=24');
    expect(receiverNewsPath('shariaNews','fr')).toBe('/api/sharia-stocks/news?lang=fr&limit=24');
  });
  it('rejects wrong scopes, unsafe or undated items and deduplicates source URLs', () => {
    expect(receiverNewsPayload({ items: [story], topic: 'metals-news' }, 'underDollarNews').invalid).toBe(true);
    expect(receiverNewsPayload({ items: [story], category: 'growth' }, 'shariaNews').stories).toEqual([]);
    expect(receiverNewsPayload({ stories: [story] }, 'technology').stories).toEqual([]);
    const feed=receiverNewsPayload({ items: [story,story,{...story,url:'javascript:alert(1)'},{...story,url:'https://example.com/two',publishedAt:'bad'}] },'europeNews');
    expect(feed.stories).toEqual([story]);
    expect(feed.updatedAt).toBeNull();
  });
  it('retains source screening status and labels unknown results instead of assuming compliance', () => {
    for (const screening of ['compliant','needs_review','non_compliant','unclassified'] as const) {
      expect(receiverNewsPayload({ category: 'sharia', items: [{ ...story, shariahStatus: screening }] }, 'shariaNews').stories[0].screening).toBe(screening);
    }
    expect(receiverNewsPayload({ category:'sharia', items:[story] },'shariaNews').stories[0].screening).toBe('unclassified');
    expect(receiverNewsPayload({ items:[story], partialFailure:true, storedFallbackUsed:true, lastSuccessfulUpdate:story.publishedAt },'europeNews')).toMatchObject({partial:true,stored:true,updatedAt:story.publishedAt});
    expect(receiverNewsPayload({ success:false,items:[] },'europeNews').invalid).toBe(true);
  });
  it('allows packaged news reads and their preflight without exposing account or mutation APIs', () => {
    for(const origin of ['null','https://appassets.androidplatform.net']) for(const path of Object.values(TV_NEWS_FEEDS)) {
      expect(tvPackagedOrigin(new Request(`https://www.the-sfm.com${path}`,{headers:{origin}}))).toBe(true);
      expect(tvPackagedOrigin(new Request(`https://www.the-sfm.com${path}`,{method:'OPTIONS',headers:{origin,'access-control-request-method':'GET'}}))).toBe(true);
      for(const method of ['POST','PATCH','DELETE']) expect(tvPackagedOrigin(new Request(`https://www.the-sfm.com${path}`,{method,headers:{origin}}))).toBe(false);
    }
    for(const path of ['/api/admin/market-news/providers','/api/tv/approve','/api/stock-categories/news']) expect(tvPackagedOrigin(new Request(`https://www.the-sfm.com${path}`,{headers:{origin:'null'}}))).toBe(false);
    expect(tvPackagedOrigin(new Request('https://www.the-sfm.com/api/europe-news',{headers:{origin:'https://foreign.example'}}))).toBe(false);
  });
});
