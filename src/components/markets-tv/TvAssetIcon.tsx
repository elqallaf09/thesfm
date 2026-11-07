'use client';
/* eslint-disable @next/next/no-img-element -- Also rendered by packaged TV WebViews. */
import { useMemo, useState } from 'react';
import { Building2, Coins, Globe2, Flame, Droplets } from 'lucide-react';
import { getAssetVisualMeta, resolveAssetIdentity } from '@/lib/assetVisuals';
import type { TvGroup, TvQuote } from '@/lib/markets-tv/types';
const companySymbols = new Set(['TSLA','AAPL','MSFT','NVDA','AMZN','GOOGL']);
const listingLogos:Record<string,string[]>={'ASML.AS':['TD_XAMS','EURONEXT','XAMS'],'SAP.DE':['TD_XETR','XETR'],'NESN.SW':['TD_XSWX','SIX','XSWX'],'7203.T':['TD_XTKS','TSE','XTKS'],'6758.T':['TD_XTKS','TSE','XTKS'],'0700.HK':['TD_XHKG','HKEX','XHKG']};
const metalFile: Record<string,string> = { 'GC=F':'gold.webp','XAUUSD':'gold.webp','COMEX:GC1!':'gold.webp','SI=F':'silver.webp','XAGUSD':'silver.webp','COMEX:SI1!':'silver.webp' };
function assetPath(file:string) {
  const packaged=typeof window!=='undefined'&&Boolean((window as Window & {SFM_TV_ORIGIN?:string}).SFM_TV_ORIGIN);
  return `${packaged?'./':'/'}markets-tv/assets/${file}`;
}
export function TvAssetIcon({ quote, group }: { quote: Pick<TvQuote, 'symbol' | 'name' | 'exchange'>; group?: TvGroup }) {
  const [failed, setFailed] = useState('');
  const kind:TvGroup = quote.symbol.startsWith('^')?'global':/^(BTC|ETH|SOL|XRP|BNB|DOGE|ADA)[/-]/.test(quote.symbol)?'crypto':/^[A-Z]{3}\/[A-Z]{3}$/.test(quote.symbol)?'forex':metalFile[quote.symbol]||/^(CL=F|NG=F|BZ=F|NYMEX:)/.test(quote.symbol)?'commodities':group||'world';
  const visual = useMemo(() => {
    const input = { symbol: kind === 'crypto' ? `${quote.symbol.split(/[/-]/)[0]}-USD` : quote.symbol.replace('/', ''), name: quote.name, exchange: quote.exchange, assetType: ['crypto','forex'].includes(kind) ? kind : kind === 'global' ? 'index' : kind === 'commodities' ? 'commodity' : 'stock' };
    const meta = getAssetVisualMeta(input);
    if (quote.exchange?.startsWith('TD_') && !resolveAssetIdentity(input).verified) meta.logoUrl = null;
    return meta;
  }, [quote.symbol, quote.name, quote.exchange, kind]);
  const local=metalFile[quote.symbol] || (listingLogos[quote.symbol]?.includes(quote.exchange||'')?`${quote.symbol.toLowerCase()}.png`:null) || (companySymbols.has(quote.symbol)&&/^(US|NASDAQ|NYSE|XNAS|XNYS)$/.test(quote.exchange||'')?`${quote.symbol.toLowerCase()}.png`:null);
  const candidate=local?assetPath(local):visual.logoUrl;
  const logo=candidate&&candidate!==failed?candidate:null;
  return <span className="tv-asset-icon" aria-hidden="true" data-kind={kind} data-metal={Boolean(metalFile[quote.symbol])}>
    {logo ? <img src={logo} alt="" width="64" height="64" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(logo)}/> : kind === 'forex' ? <span className="tv-currency-icon" dir="ltr">{quote.symbol.split('/').map((s,i) => <b key={i}>{s}</b>)}</span> : kind === 'global' ? <Globe2/> : /NG/.test(quote.symbol)&&kind==='commodities'?<Flame/> : /CL|BZ/.test(quote.symbol)&&kind==='commodities'?<Droplets/> : kind === 'commodities' || kind === 'crypto' ? <Coins/> : <><Building2/><b>{quote.symbol.split(/[./-]/)[0].slice(0,4)}</b></>}
  </span>;
}
