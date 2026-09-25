import { NextResponse } from 'next/server';
import { integrationAccess } from '@/lib/server/integrationAccess';
import { integrationSnapshotSchema } from '@/lib/notifications/integrationSnapshot';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:Request){
 const access=await integrationAccess(request,'snapshots:write');if(!access)return NextResponse.json({error:'INVALID_EXPIRED_OR_RATE_LIMITED_KEY'},{status:401,headers});
 const raw=await request.text();if(raw.length>150000)return NextResponse.json({error:'TOO_LARGE'},{status:413,headers});
 let body:unknown;try{body=JSON.parse(raw);}catch{return NextResponse.json({error:'INVALID_REQUEST'},{status:400,headers});}
 const parsed=integrationSnapshotSchema.safeParse(body);if(!parsed.success)return NextResponse.json({error:'INVALID_REQUEST'},{status:400,headers});
 const input=parsed.data;
 const result=await access.db.from('sfm_integration_snapshots').insert({user_id:access.userId,source:input.source,external_id:input.externalId,observed_at:input.observedAt,payload:{currency:input.currency,balance:input.balance,equity:input.equity,positions:input.positions,verification:'user_connector_supplied'}}).select('id').single();
 if(result.error?.code==='23505'){
  const previous=await access.db.from('sfm_integration_snapshots').select('id,observed_at,payload').eq('user_id',access.userId).eq('source',input.source).eq('external_id',input.externalId).single();
  if(previous.error)return NextResponse.json({error:'UNAVAILABLE'},{status:503,headers});
  const same=Date.parse(previous.data.observed_at)===Date.parse(input.observedAt)&&Array.isArray(previous.data.payload.positions)&&previous.data.payload.positions.length===input.positions.length&&input.positions.every((p,i)=>{const old=previous.data.payload.positions[i];return old.symbol===p.symbol&&old.quantity===p.quantity&&old.value===p.value&&old.currency===p.currency;})&&previous.data.payload.balance===input.balance&&previous.data.payload.equity===input.equity&&previous.data.payload.currency===input.currency;
  return NextResponse.json(same?{ok:true,id:previous.data.id,duplicate:true}:{error:'IDEMPOTENCY_CONFLICT'},{status:same?200:409,headers});
 }
 return result.error?NextResponse.json({error:'SAVE_FAILED'},{status:503,headers}):NextResponse.json({ok:true,id:result.data.id},{status:201,headers});
}
