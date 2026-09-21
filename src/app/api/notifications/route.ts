import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseAdmin, getCurrentUserFromRequest } from '@/lib/server/adminAccess';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control':'private, no-store' };
const schema = z.object({ ids:z.array(z.string().uuid()).min(1).max(100),status:z.enum(['read','unread','archived']) }).strict();
export async function GET(request: NextRequest) {
 const user=await getCurrentUserFromRequest(request).catch(()=>null);
 if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401,headers});
 const db=createServerSupabaseAdmin();if(!db)return NextResponse.json({error:'UNAVAILABLE'},{status:503,headers});
 const offset=Math.max(0,Math.min(10000,Number(request.nextUrl.searchParams.get('offset'))||0));
 const result=await db.from('notifications').select('id,type,title,message,read,link,created_at,status,severity,source_module,action_url,read_at').eq('user_id',user.id).order('created_at',{ascending:false}).order('id').range(Math.floor(offset),Math.floor(offset)+49);
 return result.error?NextResponse.json({error:'LOAD_FAILED'},{status:503,headers}):NextResponse.json({notifications:result.data},{headers});
}
export async function POST(request: NextRequest) {
 const user=await getCurrentUserFromRequest(request).catch(()=>null);
 if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401,headers});
 const body=schema.safeParse(await request.json().catch(()=>null));
 if(!body.success)return NextResponse.json({error:'INVALID_REQUEST'},{status:400,headers});
 const db=createServerSupabaseAdmin();if(!db)return NextResponse.json({error:'UNAVAILABLE'},{status:503,headers});
 const result=await db.from('notifications').update({status:body.data.status,read:body.data.status!=='unread',read_at:body.data.status==='unread'?null:new Date().toISOString()}).eq('user_id',user.id).in('id',body.data.ids).select('id');
 return result.error?NextResponse.json({error:'SAVE_FAILED'},{status:503,headers}):NextResponse.json({ok:true,updated:result.data.length},{headers});
}
