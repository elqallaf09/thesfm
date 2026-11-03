import * as positionRoute from '@/app/api/investments/v2/positions/route';
import * as propertyContextRoute from '@/app/api/investments/real-estate/context/route';
import * as route0 from '@/app/api/gold-intelligence/route';
import * as route1 from '@/app/api/market/oil-intelligence/route';
import * as route2 from '@/app/api/investments/real-estate/analyze/route';
import * as route3 from '@/app/api/investments/real-estate/history/route';
import * as route4 from '@/app/api/investments/real-estate/snapshots/route';
import * as route5 from '@/app/api/economic-intelligence/daily-brief/route';
import * as route6 from '@/app/api/economic-intelligence/context/route';
import * as route7 from '@/app/api/economic-intelligence/readiness/route';
import * as route8 from '@/app/api/economic-intelligence/advisor-chat/route';
import * as route9 from '@/app/api/economic-intelligence/advisor-plans/route';
import * as route10 from '@/app/api/economic-intelligence/decision-memory/route';
import * as route11 from '@/app/api/economic-intelligence/provenance/route';
import * as route12 from '@/app/api/integrations/keys/route';
import * as route13 from '@/app/api/stripe/create-portal-session/route';
import * as route14 from '@/app/api/followed-trades/route';

import { NextRequest } from 'next/server';
import { mobileAccess,mobileResponse } from '@/lib/server/mobileAccess';
import { getTraderAccess } from '@/lib/server/traderAccess';
export const dynamic='force-dynamic';export const maxDuration=60;
type Handler=(request:NextRequest)=>Promise<Response|undefined>;
const handlers:Record<string,Partial<Record<string,Handler>>>={'positions':{GET:positionRoute.GET},'property-context':{GET:propertyContextRoute.GET},'gold':{GET:route0.GET,POST:route0.POST},'oil':{GET:route1.GET},'property':{POST:route2.POST},'property-history':{GET:route3.GET},'property-snapshots':{POST:route4.POST},'brief':{GET:route5.GET},'context':{GET:route6.GET},'readiness':{GET:route7.GET,POST:route7.POST,DELETE:route7.DELETE},'advisor':{POST:route8.POST},'plans':{GET:route9.GET,POST:route9.POST},'memory':{GET:route10.GET},'provenance':{GET:route11.GET},'integrations':{GET:route12.GET,POST:route12.POST},'billing':{POST:route13.POST},'trades':{GET:route14.GET,POST:route14.POST}};
async function handle(request:Request,context:{params:Promise<{center:string}>}){
 const access=await mobileAccess(request);if(access.response)return access.response;const {center}=await context.params;
 const handler=handlers[center]?.[request.method];if(!handler)return mobileResponse({code:'NOT_FOUND'},404);
 if(center==='trades'){const trader=await getTraderAccess(request);if(!trader.allowed||trader.userId!==access.userId)return mobileResponse({code:'FORBIDDEN'},403);}
 const raw=request.method==='GET'?undefined:await request.text();if(raw&&raw.length>65536)return mobileResponse({code:'BODY_TOO_LARGE'},413);
 const headers=new Headers({authorization:request.headers.get('authorization')!});if(raw)headers.set('content-type','application/json');
 const forwarded=new NextRequest(request.url,{method:request.method,headers,body:raw});
 try{const response=await handler(forwarded);if(!response)return mobileResponse({code:'LOAD_UNAVAILABLE'},503);response.headers.set('Cache-Control','private, no-store');response.headers.set('Vary','Authorization');return response;}catch{return mobileResponse({code:'LOAD_UNAVAILABLE'},503);}
}
export const GET=handle,POST=handle,DELETE=handle;
