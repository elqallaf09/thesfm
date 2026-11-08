import { tvOrigin } from '@/lib/markets-tv/client';
const regions=["ae","ar","at","au","be","bh","bm","br","ca","ch","cl","cn","co","cy","cz","de","dk","ee","eg","es","fi","fr","gb","gr","hk","hr","hu","id","ie","in","iq","is","it","jo","jp","kr","kw","kz","lt","lu","lv","ma","mx","my","ng","nl","no","nz","om","pe","ph","pk","pl","ps","pt","qa","ro","rs","ru","sa","se","sg","si","sk","th","tn","tr","tw","us","za"];
export function TvMarketFlag({region}:{region:string}){
 const base=typeof window!=='undefined'&&tvOrigin()!==window.location.origin?'.':'';
 const index=regions.indexOf(region.toLowerCase());
 if(index<0)return <span className="tv-market-flag" aria-hidden="true">{region}</span>;
 return <span className="tv-market-flag" data-region={region} aria-hidden="true" style={{backgroundImage:`url("${base}/markets-tv/flags/markets.webp")`,backgroundSize:'1000% 700%',backgroundPosition:`${(index%10)/9*100}% ${Math.floor(index/10)/6*100}%`}}/>;
}
