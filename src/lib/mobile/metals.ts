export type MetalObservation={price:number|null;lastUpdated:string|null;currency:string|null};
export function goldSilverRatio(gold:MetalObservation|null,silver:MetalObservation|null,now=Date.now()){
 if(!gold||!silver||gold.currency!=='USD'||silver.currency!=='USD'||!(gold.price!>0)||!(silver.price!>0))return null;
 const g=Date.parse(gold.lastUpdated||''),s=Date.parse(silver.lastUpdated||'');
 if(!Number.isFinite(g)||!Number.isFinite(s)||g>now||s>now||now-g>900000||now-s>900000||Math.abs(g-s)>300000)return null;
 return gold.price!/silver.price!;
}
