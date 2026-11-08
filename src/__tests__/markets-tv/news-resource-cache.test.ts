import { expect,it,vi } from 'vitest';
import { isPublicTvNews,TvResourceCache,TvResourceError } from '@/components/markets-tv/tvResourceCache';
import { receiverNewsPath,TV_EXTRA_NEWS_CHANNELS } from '@/lib/markets-tv/newsReceiver';
const options=()=>({signal:new AbortController().signal,ttlMs:180000});
it('allowlists exact public channel/language requests and excludes private or tampered paths',()=>{
 for(const language of ['ar','en','fr'] as const)for(const channel of [...TV_EXTRA_NEWS_CHANNELS,'technology','kuwait'] as const)expect(isPublicTvNews(receiverNewsPath(channel,language))).toBe(true);
 for(const path of ['/api/tv/portfolio','/api/tv/device','/api/tv/pair','/api/europe-news?lang=ar&limit=24&ownerId=other','//evil.example/api/europe-news?lang=ar&limit=24','/api/europe-news?lang=invalid&limit=24'])expect(isPublicTvNews(path)).toBe(false);
});
it('reuses public news without changing timestamps and keeps languages and device tokens separate',async()=>{
 const cache=new TvResourceCache(),path=receiverNewsPath('europeNews','en'),data={items:[{title:'source fixture'}],lastSuccessfulUpdate:'2026-11-07T10:00:00Z'},load=vi.fn().mockResolvedValue(data);
 await cache.request(path,options(),load);await cache.request(path,options(),load);expect(load).toHaveBeenCalledTimes(1);expect(cache.peek(path)).toEqual(data);
 expect(cache.peek(receiverNewsPath('europeNews','ar'))).toBeNull();expect(cache.peek(path,'device-token')).toBeNull();
 await cache.request(path,{...options(),token:'device-token'},load);expect(load).toHaveBeenCalledTimes(2);
});
it('preserves Retry-After during speculative or manual news refresh',async()=>{
 let now=0;const cache=new TvResourceCache(32,()=>now),path=receiverNewsPath('gulfNews','ar'),load=vi.fn().mockRejectedValue(new TvResourceError('RATE_LIMITED',429,240000));
 await expect(cache.request(path,options(),load)).rejects.toThrow();
 now=1000;await expect(cache.request(path,{...options(),force:true},load)).rejects.toThrow();expect(load).toHaveBeenCalledTimes(1);
});
