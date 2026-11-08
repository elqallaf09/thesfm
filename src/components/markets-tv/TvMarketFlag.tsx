/* eslint-disable @next/next/no-img-element -- Flags are bundled in the offline TV client. */
import { tvOrigin } from '@/lib/markets-tv/client';
export function TvMarketFlag({region}:{region:string}) {
 const base=typeof window!=='undefined'&&tvOrigin()!==window.location.origin?'.':'';
 return <img className="tv-market-flag" src={`${base}/markets-tv/flags/${region.toLowerCase()}.svg`} alt="" aria-hidden="true" width={40} height={30}/>;
}
