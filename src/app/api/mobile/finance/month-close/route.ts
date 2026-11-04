import { z } from 'zod';
import { mobileAccess,mobileResponse } from '@/lib/server/mobileAccess';
export const dynamic='force-dynamic';
export async function GET(request:Request){const a=await mobileAccess(request);if(a.response)return a.response;
 const [closes,events]=await Promise.all([a.client.from('finance_month_closes').select('month,closed_at,totals:snapshot->totals').eq('user_id',a.userId).order('month',{ascending:false}).limit(120),a.client.from('finance_month_events').select('id,month,action,reason,created_at').eq('user_id',a.userId).order('created_at',{ascending:false}).limit(50)]);
 return closes.error||events.error?mobileResponse({code:'LOAD_UNAVAILABLE'},503):mobileResponse({closes:closes.data,events:events.data});}
const schema=z.discriminatedUnion('action',[z.object({action:z.literal('close'),month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),confirmed:z.literal(true)}).strict(),z.object({action:z.literal('reopen'),month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),reason:z.string().trim().min(5).max(500)}).strict()]);
export async function POST(request:Request){const a=await mobileAccess(request);if(a.response)return a.response;const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return mobileResponse({code:'INVALID_REQUEST'},400);const b=parsed.data;
 if(b.month>=new Date().toISOString().slice(0,7))return mobileResponse({code:'INVALID_REQUEST'},400);
 const r=b.action==='close'?await a.client.rpc('finance_close_month',{p_month:b.month+'-01'}):await a.client.rpc('finance_reopen_month',{p_month:b.month+'-01',p_reason:b.reason});
 return r.error?mobileResponse({code:'SAVE_UNAVAILABLE'},409):mobileResponse({ok:true});}
