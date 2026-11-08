import { describe, expect, it } from 'vitest';
import { tvPairErrorText, tvPairHttpError, validTvPair } from '@/lib/markets-tv/pairing';
describe('pairing feedback and response boundaries',()=>{
 const now=Date.parse('2026-11-08T00:00:00Z');
 const valid={code:'AABBCCDDEEFF',secret:'a'.repeat(64),expiresAt:new Date(now+600000).toISOString()};
 it('accepts the server contract and rejects malformed, expired and excessive lifetime codes',()=>{
  expect(validTvPair(valid,now)).toBe(true);
  for(const value of [null,{}, {...valid,secret:'token'}, {...valid,code:'<script>'}, {...valid,expiresAt:new Date(now-1).toISOString()}, {...valid,expiresAt:new Date(now+86400000).toISOString()}])expect(validTvPair(value,now)).toBe(false);
 });
 it('keeps denied origins, rate limits and service failures distinguishable in every language',()=>{
  expect(tvPairHttpError(403)).toBe('forbidden');expect(tvPairHttpError(429)).toBe('rateLimited');expect(tvPairHttpError(503)).toBe('unavailable');
  for(const language of ['ar','en','fr'] as const)expect(new Set(['forbidden','rateLimited','unavailable','network','invalid'].map(key=>tvPairErrorText(language,key as Parameters<typeof tvPairErrorText>[1]))).size).toBe(5);
 });
});
