'use client';
/* eslint-disable @next/next/no-img-element -- Also rendered by packaged TV WebViews. */
import { useMemo, useState, type CSSProperties } from 'react';
import { Coins, Flame, Droplets } from 'lucide-react';
import { getAssetVisualMeta, resolveAssetIdentity } from '@/lib/assetVisuals';
import { tvIndexMarks, tvListingMark } from '@/lib/markets-tv/assetMarks';
import type { TvGroup, TvQuote } from '@/lib/markets-tv/types';
import './asset-marks.css';

const companySymbols = new Set(['TSLA','AAPL','MSFT','NVDA','AMZN','GOOGL']);
const listingLogos: Record<string, string[]> = {
  'ASML.AS': ['TD_XAMS','EURONEXT','XAMS'], 'SAP.DE': ['TD_XETR','XETR'],
  'NESN.SW': ['TD_XSWX','SIX','XSWX'], '7203.T': ['TD_XTKS','TSE','XTKS'],
  '6758.T': ['TD_XTKS','TSE','XTKS'], '0700.HK': ['TD_XHKG','HKEX','XHKG'],
};
const metalFile: Record<string,string> = { 'GC=F':'gold.webp','XAUUSD':'gold.webp','COMEX:GC1!':'gold.webp','SI=F':'silver.webp','XAGUSD':'silver.webp','COMEX:SI1!':'silver.webp' };

function assetPath(file: string) {
  const packaged = typeof window !== 'undefined' && Boolean((window as Window & { SFM_TV_ORIGIN?: string }).SFM_TV_ORIGIN);
  return `${packaged ? './' : '/'}markets-tv/assets/${file}`;
}

type IconQuote = Pick<TvQuote, 'symbol' | 'name' | 'exchange' | 'displaySymbol'>;

type IconProps = { quote: IconQuote; group?: TvGroup };

export function TvAssetIcon({ quote, group }: IconProps) {
  return <TvResolvedIcon key={JSON.stringify([quote.symbol, quote.exchange, quote.name, group])} quote={quote} group={group}/>;
}

function TvResolvedIcon({ quote, group }: IconProps) {
  const [attempt, setAttempt] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState('');
  const { symbol, name, exchange, displaySymbol } = quote;
  const index = tvIndexMarks.get(symbol);
  const kind: TvGroup = symbol.startsWith('^') || symbol === 'FTSEMIB.MI' || symbol === '000001.SS' ? 'global'
    : /^(BTC|ETH|SOL|XRP|BNB|DOGE|ADA)[/-]/.test(symbol) ? 'crypto'
    : /^[A-Z]{3}\/[A-Z]{3}$/.test(symbol) ? 'forex'
    : metalFile[symbol] || /^(CL=F|NG=F|BZ=F|NYMEX:)/.test(symbol) ? 'commodities' : group || 'world';
  const urls = useMemo(() => {
    if (kind === 'global') return index ? [`https://s3-symbol-logo.tradingview.com/indices/${index.image}--big.svg`] : [];
    const listing = tvListingMark(symbol, exchange);
    if (listing) return listing.file ? [assetPath(listing.file)] : listing.urls;
    const local = metalFile[symbol] || (listingLogos[symbol]?.includes(exchange || '') ? symbol.toLowerCase() + '.png' : null)
      || (companySymbols.has(symbol) && /^(US|NASDAQ|NYSE|XNAS|XNYS)$/.test(exchange || '') ? symbol.toLowerCase() + '.png' : null);
    if (local) return [assetPath(local)];
    const input = {
      symbol: kind === 'crypto' ? symbol.split(/[/-]/)[0] + '-USD' : symbol.replace('/', ''), name, exchange,
      assetType: ['crypto','forex'].includes(kind) ? kind : kind === 'commodities' ? 'commodity' : 'stock',
    };
    if (exchange?.startsWith('TD_') && !resolveAssetIdentity(input).verified) return [];
    const url = getAssetVisualMeta(input).logoUrl;
    return url ? [url] : [];
  }, [kind, symbol, name, exchange, index]);
  const ticker = displaySymbol || symbol;
  const url = urls[attempt];
  const loaded = Boolean(url && url === loadedUrl);
  return <span className="tv-asset-icon tv-identity-mark" aria-hidden="true" dir="ltr"
    data-kind={kind} data-metal={Boolean(metalFile[symbol])} data-index-mark={index ? true : undefined} data-issuer={symbol === 'SVIX' && urls[0]?.endsWith('/svix.png') ? 'svix' : undefined}
    data-logo-state={loaded ? 'loaded' : url ? 'loading' : 'fallback'}
    style={index ? { '--tv-mark-color': index.color } as CSSProperties : undefined}>
    {!loaded && (index ? <span className="tv-index-lettering"><span>{index.label}</span><strong>{index.number}</strong></span>
      : kind === 'forex' ? <span className="tv-currency-icon">{symbol.split('/').map((s,i) => <b key={i}>{s}</b>)}</span>
      : kind === 'commodities' && /NG/.test(symbol) ? <Flame/>
      : kind === 'commodities' && /CL|BZ/.test(symbol) ? <Droplets/>
      : kind === 'commodities' || kind === 'crypto' ? <Coins/>
      : <span className="tv-ticker-lettering" data-long={ticker.length > 6}>{ticker}</span>)}
    {url && <img key={url} src={url} alt="" width="64" height="64" loading="lazy" decoding="async" referrerPolicy="no-referrer"
      className="tv-mark-image" onLoad={() => setLoadedUrl(url)} onError={() => setAttempt(attempt + 1)}/>}
  </span>;
}
