import { createHash,randomBytes } from 'node:crypto';
import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseAdmin,getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),label:z.string().trim().min(1).max(80),scopes:z.array(z.enum(['portfolio:read','notifications:read','snapshots:write'])).min(1).max(3),days:z.number().int().min(1).max(90)}).strict(),
 z.object({action:z.literal('revoke'),id:z.string().uuid()}).strict(),
]);
export async function GET(request:NextRequest){
 const user=await getCurrentUserFromRequest(request).catch(()=>null);if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401,headers});
 const db=createServerSupabaseAdmin();if(!db)return NextResponse.json({error:'UNAVAILABLE'},{status:503,headers});
 const [keys,snapshots]=await Promise.all([db.from('sfm_integration_keys').select('id,label,scopes,expires_at,revoked_at,created_at,last_used_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100),db.from('sfm_integration_snapshots').select('id,source,external_id,observed_at,received_at,payload').eq('user_id',user.id).order('received_at',{ascending:false}).limit(20)]);
 if(keys.error||snapshots.error)return NextResponse.json({error:'UNAVAILABLE'},{status:503,headers});
 return NextResponse.json({keys:keys.data,snapshots:snapshots.data},{headers});
}
export async function POST(request:NextRequest){
 const user=await getCurrentUserFromRequest(request).catch(()=>null);if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401,headers});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'INVALID_REQUEST'},{status:400,headers});
 const db=createServerSupabaseAdmin();if(!db)return NextResponse.json({error:'UNAVAILABLE'},{status:503,headers});
 const body=parsed.data;
 if(body.action==='revoke'){const result=await db.from('sfm_integration_keys').update({revoked_at:new Date().toISOString()}).eq('id',body.id).eq('user_id',user.id);return NextResponse.json({ok:!result.error},{status:result.error?503:200,headers});}
 const rate=checkRateLimitWithMetadata(user.id,{max:5,windowMs:3600000,prefix:'integration-key-create'});if(!rate.allowed)return NextResponse.json({error:'RATE_LIMITED'},{status:429,headers});
 const count=await db.from('sfm_integration_keys').select('id',{count:'exact',head:true}).eq('user_id',user.id).is('revoked_at',null).gt('expires_at',new Date().toISOString());
 if(count.error)return NextResponse.json({error:'UNAVAILABLE'},{status:503,headers});
 if((count.count??0)>=10)return NextResponse.json({error:'KEY_LIMIT'},{status:409,headers});
 const token='sfm_'+randomBytes(32).toString('base64url');
 const result=await db.from('sfm_integration_keys').insert({user_id:user.id,label:body.label,scopes:[...new Set(body.scopes)],expires_at:new Date(Date.now()+body.days*86400000).toISOString(),token_hash:createHash('sha256').update(token).digest('hex')});
 if(result.error)return NextResponse.json({error:'SAVE_FAILED'},{status:503,headers});
 return NextResponse.json({token},{headers});
}
