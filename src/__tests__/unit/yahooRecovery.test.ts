import {afterEach,describe,expect,it,vi} from 'vitest';
import {runWithConcurrency,withRetry} from '@/lib/trader/scannerExecutor';
import {fetchYahooHistory} from '@/lib/market/fetchYahooHistory';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
describe('scanner recovery',()=>{
 it('finishes an exhausted queue even when its stop flag turns true',async()=>{let stop=false;const result=await runWithConcurrency([1],1,async()=>{stop=true;return 1;},{shouldStop:()=>stop});expect(result).toMatchObject({processedCount:1,stopped:false});});
 it('does not truncate a provider retry-after and retry too early',async()=>{const worker=vi.fn().mockResolvedValue('limited');await withRetry(worker,{maxRetries:2,baseDelayMs:1,maxDelayMs:10,isRetryable:()=>true,getRetryAfterMs:()=>60000});expect(worker).toHaveBeenCalledOnce();});
 it('does not cache HTTP 429 failures',async()=>{const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('{}',{status:429,headers:{'Retry-After':'60'}}));const first=await fetchYahooHistory('RECOVERY-TEST','stock','2y','1d');expect(first).toMatchObject({success:false,retryAfterMs:60000});await fetchYahooHistory('RECOVERY-TEST','stock','2y','1d');expect(fetcher).toHaveBeenCalledTimes(2);});
 it('shares observed quote and preserves null volume',async()=>{vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({chart:{result:[{meta:{symbol:'RECOVERY-QUOTE',currency:'USD',regularMarketPrice:110,regularMarketTime:1793664000,regularMarketPreviousClose:100,chartPreviousClose:50},timestamp:[1793577600,1793664000],indicators:{quote:[{close:[100,110],volume:[null,null]}]}}]}}));const result=await fetchYahooHistory('RECOVERY-QUOTE','stock','2y','1d');expect(result.success&&result.quoteSnapshot).toMatchObject({price:110,previousClose:100});expect(result.success&&result.history[0].volume).toBeNull();});
});
