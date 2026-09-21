import { createHash,randomBytes } from 'node:crypto';
import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseAdmin,getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { notificationConfiguration } from '@/lib/server/notificationChannels';
import { allowedPushEndpoint } from '@/lib/notifications/deliveryPolicy';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('connect'),channel:z.enum(['email','telegram','whatsapp','push']),consent:z.literal(true),locale:z.enum(['ar','en','fr']),subscription:z.object({endpoint:z.string().max(2000).refine(allowedPushEndpoint),keys:z.object({p256dh:z.string().regex(/^[\w-]{87}$/),auth:z.string().regex(/^[\w-]{22}$/)})}).optional()}).strict(),
 z.object({action:z.literal('disconnect'),id:z.string().uuid()}).strict(),
 z.object({action:z.literal('quiet'),id:z.string().uuid(),start:z.number().int().min(0).max(1439).nullable(),end:z.number().int().min(0).max(1439).nullable(),timezone:z.string().max(80).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}})}).strict(),
]);
export async function GET(request:NextRequest){
 const user=await getCurrentUserFromRequest(request).catch(()=>null);if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401,headers});
 const db=createServerSupabaseAdmin();if(!db)return NextResponse.json({error:'UNAVAILABLE'},{status:503,headers});
 const [channels,deliveries]=await Promise.all([db.from('sfm_notification_channels').select('id,channel,enabled,verified_at,quiet_start,quiet_end,timezone').eq('user_id',user.id).order('created_at'),db.from('sfm_notification_deliveries').select('id,channel_id,status,attempts,error_code,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30)]);
 if(channels.error||deliveries.error)return NextResponse.json({error:'UNAVAILABLE'},{status:503,headers});
 return NextResponse.json({channels:channels.data,deliveries:deliveries.data,configuration:notificationConfiguration(),vapidPublicKey:process.env.SFM_NOTIFY_VAPID_PUBLIC_KEY??null},{headers});
}
export async function POST(request:NextRequest){
 const user=await getCurrentUserFromRequest(request).catch(()=>null);if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401,headers});
 const limit=checkRateLimitWithMetadata(user.id,{max:10,windowMs:60000,prefix:'notification-link'});if(!limit.allowed)return NextResponse.json({error:'RATE_LIMITED'},{status:429,headers});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'INVALID_REQUEST'},{status:400,headers});
 const db=createServerSupabaseAdmin();if(!db)return NextResponse.json({error:'UNAVAILABLE'},{status:503,headers});const body=parsed.data;
 if(body.action==='disconnect'){
  const result=await db.from('sfm_notification_channels').delete().eq('id',body.id).eq('user_id',user.id);
  return NextResponse.json({ok:!result.error},{status:result.error?503:200,headers});
 }
 if(body.action==='quiet'){
  const result=await db.from('sfm_notification_channels').update({quiet_start:body.start,quiet_end:body.end,timezone:body.timezone}).eq('id',body.id).eq('user_id',user.id);
  return NextResponse.json({ok:!result.error},{status:result.error?503:200,headers});
 }
 if(!notificationConfiguration()[body.channel])return NextResponse.json({error:'CHANNEL_NOT_CONFIGURED'},{status:503,headers});
 if(body.channel==='telegram'||body.channel==='whatsapp'){
  const token=randomBytes(24).toString('base64url');const hash=createHash('sha256').update(token).digest('hex');
  const result=await db.from('sfm_notification_link_codes').insert({token_hash:hash,user_id:user.id,channel:body.channel,locale:body.locale,expires_at:new Date(Date.now()+600000).toISOString()});
  if(result.error)return NextResponse.json({error:'SAVE_FAILED'},{status:503,headers});
  const url=body.channel==='telegram'?`https://t.me/${encodeURIComponent(process.env.SFM_NOTIFY_TELEGRAM_USERNAME!)}?start=${token}`:`https://wa.me/${process.env.SFM_NOTIFY_WHATSAPP_NUMBER!.replace(/\D/g,'')}?text=${encodeURIComponent('SFM '+token)}`;
  return NextResponse.json({url,expiresIn:600},{headers});
 }
 if(body.channel==='email'&&(!user.email||!user.email_confirmed_at))return NextResponse.json({error:'VERIFIED_EMAIL_REQUIRED'},{status:400,headers});
 if(body.channel==='push'&&!body.subscription)return NextResponse.json({error:'SUBSCRIPTION_REQUIRED'},{status:400,headers});
 const destination=body.channel==='email'?{email:user.email}:body.subscription!;
 const deviceKey=body.channel==='push'?createHash('sha256').update(body.subscription!.endpoint).digest('hex'):'';
 const result=await db.from('sfm_notification_channels').upsert({user_id:user.id,channel:body.channel,device_key:deviceKey,destination,enabled:true,verified_at:new Date().toISOString(),locale:body.locale},{onConflict:'user_id,channel,device_key'});
 return NextResponse.json({ok:!result.error},{status:result.error?503:200,headers});
}
