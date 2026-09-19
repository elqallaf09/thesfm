'use client';
/* eslint-disable @next/next/no-img-element -- Shared with offline packaged TV clients without the Next image runtime. */
import { useMemo, useState } from 'react';
import { Building2, Coins, Globe2 } from 'lucide-react';
import { getAssetVisualMeta, resolveAssetIdentity } from '@/lib/assetVisuals';
import type { TvGroup, TvQuote } from '@/lib/markets-tv/types';
export function TvAssetIcon({ quote, group }: { quote: Pick<TvQuote, 'symbol' | 'name' | 'exchange'>; group: TvGroup }) {
  const [failed, setFailed] = useState('');
  const visual = useMemo(() => {
    const input = { symbol: group === 'crypto' ? `${quote.symbol.split('/')[0]}-USD` : quote.symbol.replace('/', ''), name: quote.name, exchange: quote.exchange, assetType: ['crypto','forex'].includes(group) ? group : group === 'global' ? 'index' : group === 'commodities' ? 'commodity' : 'stock' };
    const meta = getAssetVisualMeta(input);
    // A bare overseas ticker must never receive a same-ticker US company's logo.
    if (quote.exchange?.startsWith('TD_') && !resolveAssetIdentity(input).verified) meta.logoUrl = null;
    return meta;
  }, [quote.symbol, quote.name, quote.exchange, group]);
  const logo = visual.logoUrl && visual.logoUrl !== failed ? visual.logoUrl : null;
  return <span className="tv-asset-icon" aria-hidden="true" data-kind={group}>
    {logo ? <img src={logo} alt="" width="36" height="36" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(logo)}/> : group === 'forex' ? <span className="tv-currency-icon" dir="ltr">{quote.symbol.split('/').map((s,i) => <b key={i}>{s}</b>)}</span> : group === 'global' ? <Globe2/> : group === 'commodities' || group === 'crypto' ? <Coins/> : <><Building2/><b>{quote.symbol.split(/[./-]/)[0].slice(0,4)}</b></>}
  </span>;
}
