import { describe, expect, it } from 'vitest';
import { shariaHeadlineStock } from '@/lib/market/shariaHeadlineStock';

describe('Sharia TV headline attribution', () => {
  const stocks = new Map([['AAPL', {symbol:'AAPL', name:'Apple', filter:'technology'}], ['NVDA', {symbol:'NVDA', name:'NVIDIA', filter:'technology'}]]);
  const story = {title:'A different issuer reports earnings', symbols:['NVDA', 'AAPL'], sourceId:'news', isOfficial:false, originalUrl:'https://example.com/news'};
  it('rejects incidental ticker tags and resolves the issuer in the original title', () => {
    expect(shariaHeadlineStock(story, stocks)).toBeNull();
    for (const title of ['Apple raises revenue', 'AAPL earnings', 'أعلنت آبل نتائج الربع']) {
      expect(shariaHeadlineStock({...story, title}, stocks)?.symbol).toBe('AAPL');
    }
    expect(shariaHeadlineStock({...story, title:'Pineapple exports rise'}, stocks)).toBeNull();
  });
  it('accepts an issuer release without a company name in its headline', () => {
    expect(shariaHeadlineStock({...story, sourceId:'issuer-aapl', isOfficial:true}, stocks)?.symbol).toBe('AAPL');
  });
});
