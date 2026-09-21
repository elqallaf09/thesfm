import 'server-only';
import webpush from 'web-push';
import { createServerSupabaseAdmin } from './adminAccess';
import { getSmtpErrorDetails,sendSmtpMail } from './smtpMail';
import { notificationConfiguration } from './notificationChannels';
import { allowedPushEndpoint,deliveryOutcome,inQuietHours } from '@/lib/notifications/deliveryPolicy';
type Delivery={id:string;user_id:string;notification_id:string;channel_id:string;attempt_token:string;attempts:number};
type Channel={id:string;user_id:string;channel:'email'|'telegram'|'whatsapp'|'push';destination:Record<string,unknown>;enabled:boolean;locale:'ar'|'en'|'fr';quiet_start:number|null;quiet_end:number|null;timezone:string};
const text={ar:'لديك تنبيه جديد في THE SFM. افتح مركز التنبيهات للاطلاع عليه.',en:'You have a new THE SFM notification. Open your notification center to review it.',fr:'Vous avez une nouvelle notification THE SFM. Consultez votre centre de notifications.'};
class ProviderError extends Error{constructor(public status:number|null){super('PROVIDER_FAILED');}}
async function send(channel:Channel){
 const message=text[channel.locale];const url='https://www.the-sfm.com/notifications';
 if(channel.channel==='email'){
  const result=await sendSmtpMail({to:String(channel.destination.email),subject:'THE SFM',text:`${message}\n${url}\n\nhttps://www.the-sfm.com/notifications/channels`});
  if(!result.accepted.length)throw new ProviderError(result.responseCode);return null;
 }
 if(channel.channel==='push'){
  const endpoint=String(channel.destination.endpoint);if(!allowedPushEndpoint(endpoint))throw new ProviderError(400);
  await webpush.sendNotification({endpoint,keys:channel.destination.keys as {p256dh:string;auth:string}},JSON.stringify({title:'THE SFM',body:message,url:'/notifications'}),{TTL:3600,timeout:8000,vapidDetails:{subject:process.env.SFM_NOTIFY_VAPID_SUBJECT!,publicKey:process.env.SFM_NOTIFY_VAPID_PUBLIC_KEY!,privateKey:process.env.SFM_NOTIFY_VAPID_PRIVATE_KEY!}});
  return null;
 }
 const endpoint=channel.channel==='telegram'?`https://api.telegram.org/bot${process.env.SFM_NOTIFY_TELEGRAM_TOKEN}/sendMessage`:`https://graph.facebook.com/${process.env.SFM_NOTIFY_META_VERSION}/${process.env.SFM_NOTIFY_WHATSAPP_PHONE_ID}/messages`;
 const body=channel.channel==='telegram'?{chat_id:channel.destination.chatId,text:`${message}\n${url}\nhttps://www.the-sfm.com/notifications/channels`,disable_web_page_preview:true}:{messaging_product:'whatsapp',to:channel.destination.phone,type:'template',template:{name:process.env.SFM_NOTIFY_WHATSAPP_TEMPLATE,language:{code:process.env.SFM_NOTIFY_WHATSAPP_TEMPLATE_LANGUAGE||'en'}}};
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(channel.channel==='whatsapp'?{Authorization:`Bearer ${process.env.SFM_NOTIFY_WHATSAPP_TOKEN}`}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(8000),redirect:'error'});
 if(!response.ok)throw new ProviderError(response.status);
 const payload=await response.json();
 if(channel.channel==='telegram'&&payload.ok!==true)throw new ProviderError(Number(payload.error_code)||null);
 return channel.channel==='whatsapp'?String(payload.messages?.[0]?.id??'')||null:String(payload.result?.message_id??'')||null;
}
export async function dispatchNotificationDeliveries(){
 const db=createServerSupabaseAdmin();if(!db)throw new Error('UNAVAILABLE');
 const claimed=await db.rpc('sfm_claim_notification_deliveries');if(claimed.error)throw new Error('CLAIM_FAILED');
 const jobs=(claimed.data??[]) as Delivery[];
 const results=await Promise.all(jobs.map(async job=>{
  const finish=async(status:string,extra:Record<string,unknown>={})=>{
   const result=await db.from('sfm_notification_deliveries').update({status,...extra}).eq('id',job.id).eq('attempt_token',job.attempt_token).eq('status','sending');
   if(result.error)throw new Error('DELIVERY_STATE_FAILED');return status;
  };
  const [channelResult,notification]=await Promise.all([db.from('sfm_notification_channels').select('*').eq('id',job.channel_id).eq('user_id',job.user_id).maybeSingle(),db.from('notifications').select('id,read,status').eq('id',job.notification_id).eq('user_id',job.user_id).maybeSingle()]);
  if(channelResult.error||notification.error)return finish('queued',{available_at:new Date(Date.now()+900000).toISOString(),error_code:'SOURCE_UNAVAILABLE'});
  const channel=channelResult.data as Channel|null;
  if(!channel?.enabled||!notification.data||notification.data.read||notification.data.status==='archived')return finish('cancelled');
  if(!notificationConfiguration()[channel.channel])return finish('failed',{error_code:'CHANNEL_NOT_CONFIGURED'});
  if(inQuietHours(channel.quiet_start,channel.quiet_end,channel.timezone))return finish('queued',{attempts:job.attempts-1,available_at:new Date(Date.now()+900000).toISOString()});
  // Recheck verified account email before every dispatch; changing email never sends to an old address.
  if(channel.channel==='email'){
   const result=await db.auth.admin.getUserById(job.user_id);
   if(result.error)return finish('queued',{available_at:new Date(Date.now()+900000).toISOString(),error_code:'AUTH_UNAVAILABLE'});
   if(!result.data.user.email_confirmed_at||result.data.user.email!==channel.destination.email)return finish('cancelled');
  }
  let providerId:string|null;
  try{providerId=await send(channel);}catch(error){
   const status=error instanceof ProviderError?error.status:typeof (error as {statusCode?:unknown})?.statusCode==='number'?(error as {statusCode:number}).statusCode:getSmtpErrorDetails(error).responseCode??null;
   const outcome=deliveryOutcome(status);
   if(outcome==='retry'&&job.attempts<4)return finish('queued',{available_at:new Date(Date.now()+Math.pow(2,job.attempts)*900000).toISOString(),error_code:'PROVIDER_RATE_LIMITED'});
   if(channel.channel==='push'&&(status===404||status===410))await db.from('sfm_notification_channels').update({enabled:false}).eq('id',channel.id);
   return finish(outcome==='retry'?'failed':outcome,{error_code:status?`PROVIDER_${status}`:'DELIVERY_UNKNOWN'});
  }
  // Persist outside send's catch: an acknowledgement-write failure must never trigger another send.
  return finish('accepted',{provider_id:providerId,error_code:null});
 }));
 return {processed:jobs.length,statuses:results};
}
