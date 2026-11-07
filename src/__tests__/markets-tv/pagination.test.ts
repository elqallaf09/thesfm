import { describe, expect, it } from 'vitest';
import { tvCardColumns, tvPagination } from '@/lib/markets-tv/pagination';
describe('TV ticker measurement and recovery',()=>{
 it('retains the last column count while a WebView is hidden or its CSS is unavailable',()=>{
  for(const width of [NaN,Infinity,0,-1])expect(tvCardColumns(width,16)).toBeNull();
  for(const font of [NaN,Infinity,0,-1])expect(tvCardColumns(1200,font)).toBeNull();
  expect(tvCardColumns(960,16)).toBe(4);
  expect(tvCardColumns(3840,16)).toBe(5);
  expect(tvCardColumns(1,16)).toBe(1);
 });
 it('recovers poisoned state and clamps a page when quotes or columns change',()=>{
  expect(tvPagination(8,NaN,NaN)).toEqual({count:1,pages:8,current:0});
  expect(tvPagination(8,3,Infinity)).toEqual({count:3,pages:3,current:0});
  expect(tvPagination(2,3,5)).toEqual({count:3,pages:1,current:0});
  expect(tvPagination(0,0,0)).toEqual({count:1,pages:1,current:0});
  expect(tvPagination(8,3,2)).toEqual({count:3,pages:3,current:2});
  for(const total of [0,NaN,8,Infinity])for(const columns of [0,NaN,3,Infinity])for(const page of [-1,NaN,0,99]){
   const p=tvPagination(total,columns,page);
   expect(Number.isFinite(p.pages)&&Number.isFinite(p.current)&&p.current>=0&&p.current<p.pages).toBe(true);
  }
 });
});
