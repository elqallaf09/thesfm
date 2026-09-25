import { createHash,createHmac,timingSafeEqual } from 'node:crypto';
import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function same(a:string,b:string){const x=Buffer.from(a);const y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
const telegram=z.object({message:z.object({text:z.string().max(256),chat:z.object({id:z.number().int(),type:z.literal('private')})}).optional()});
const whatsapp=z.object({entry:z.array(z.object({changes:z.array(z.object({value:z.object({metadata:z.object({phone_number_id:z.string()}).optional(),messages:z.array(z.object({from:z.string().regex(/^\d{6,20}$/),text:z.object({body:z.string().max(256)}).optional()})).optional(),statuses:z.array(z.object({id:z.string(),status:z.enum(['sent','delivered','read','failed'])})).optional()})}))}))});
export async function GET(request:NextRequest,{params}:{params:Promise<{provider:string}>}){
 if((await params).provider!=='whatsapp')return new NextResponse(null,{status:404});
 const expected=process.env.SFM_NOTIFY_META_VERIFY_TOKEN;
 if(!expected||request.nextUrl.searchParams.get('hub.mode')!=='subscribe'||!same(request.nextUrl.searchParams.get('hub.verify_token')??'',expected))return new NextResponse(null,{status:403});
 return new NextResponse(request.nextUrl.searchParams.get('hub.challenge')??'',{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:NextRequest,{params}:{params:Promise<{provider:string}>}){
 const {provider}=await params;if(provider!=='telegram'&&provider!=='whatsapp')return new NextResponse(null,{status:404});
 const raw=await request.text();if(raw.length>65536)return new NextResponse(null,{status:413});
 if(provider==='telegram'){
  const secret=process.env.SFM_NOTIFY_TELEGRAM_WEBHOOK_SECRET;
  if(!secret||!same(request.headers.get('x-telegram-bot-api-secret-token')??'',secret))return new NextResponse(null,{status:403});
 }else{
  const secret=process.env.SFM_NOTIFY_META_APP_SECRET;
  if(!secret||!same(request.headers.get('x-hub-signature-256')??'','sha256='+createHmac('sha256',secret).update(raw).digest('hex')))return new NextResponse(null,{status:403});
 }
 const db=createServerSupabaseAdmin();if(!db)return new NextResponse(null,{status:503});
 let body:unknown;try{body=JSON.parse(raw);}catch{return new NextResponse(null,{status:400});}
 const links:Array<{token:string;destination:Record<string,string>}>=[];
 if(provider==='telegram'){
  const parsed=telegram.safeParse(body);if(!parsed.success)return NextResponse.json({ok:true});
  const message=parsed.data.message;const token=message?.text.match(/^\/start ([\w-]{32})$/)?.[1];
  if(message&&token)links.push({token,destination:{chatId:String(message.chat.id)}});
 }else{
  const parsed=whatsapp.safeParse(body);if(!parsed.success)return NextResponse.json({ok:true});
  for(const entry of parsed.data.entry)for(const change of entry.changes){
   if(change.value.metadata?.phone_number_id!==process.env.SFM_NOTIFY_WHATSAPP_PHONE_ID)continue;
   for(const message of change.value.messages??[]){const token=message.text?.body.match(/^SFM ([\w-]{32})$/)?.[1];if(token)links.push({token,destination:{phone:message.from}});}
   for(const status of change.value.statuses??[]){
    if(status.status==='delivered'||status.status==='read'||status.status==='failed'){
     const result=await db.from('sfm_notification_deliveries').update({status:status.status==='failed'?'failed':'delivered',error_code:status.status==='failed'?'PROVIDER_DELIVERY_FAILED':null}).eq('provider_id',status.id).in('status',['accepted','delivered']);
     if(result.error)return new NextResponse(null,{status:503});
    }
   }
  }
 }
 for(const link of links){const result=await db.rpc('sfm_verify_notification_channel',{p_hash:createHash('sha256').update(link.token).digest('hex'),p_channel:provider,p_destination:link.destination});if(result.error)return new NextResponse(null,{status:503});}
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}
