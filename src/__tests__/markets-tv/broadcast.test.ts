import { describe,expect,it } from 'vitest';
import { tvSessionPageSize,compactCountdown,TV_BROADCAST_PAGE_MS } from '@/lib/markets-tv/broadcast';
import { normalizeTvSettings } from '@/lib/markets-tv/types';
describe('broadcast paging',()=>{
 it('balances all 81 markets into five complete pages with no duplicates or omissions',()=>{
  const size=tvSessionPageSize(81);expect(size).toBe(17);
  const pages=Array.from({length:Math.ceil(81/size)},(_,p)=>Array.from({length:81},(_,i)=>i).slice(p*size,(p+1)*size));
  expect(pages.map(p=>p.length)).toEqual([17,17,17,17,13]);expect(pages.flat()).toHaveLength(81);expect(new Set(pages.flat()).size).toBe(81);
  expect(tvSessionPageSize(5)).toBe(5);expect(tvSessionPageSize(0)).toBe(1);expect(tvSessionPageSize(NaN)).toBe(1);expect(TV_BROADCAST_PAGE_MS).toBe(40000);
 });
 it('keeps days explicit and seconds exact in compact countdowns',()=>{
  expect(compactCountdown(90061000,'ar')).toBe('01ي 01:01:01');expect(compactCountdown(1000,'en')).toBe('00d 00:00:01');expect(compactCountdown(null,'fr')).toBe('—');expect(compactCountdown(NaN,'ar')).toBe('—');
 });
 it('enables market-hours rotation by default and preserves a paused preference',()=>{
  expect(normalizeTvSettings({}).sessionAutoRotate).toBe(true);expect(normalizeTvSettings({sessionAutoRotate:false}).sessionAutoRotate).toBe(false);
 });
});
