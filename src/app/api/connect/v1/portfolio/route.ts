import { NextResponse } from 'next/server';
import { integrationAccess } from '@/lib/server/integrationAccess';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store'};const access=await integrationAccess(request,'portfolio:read');if(!access)return NextResponse.json({error:'INVALID_EXPIRED_OR_RATE_LIMITED_KEY'},{status:401,headers});
 const raw=new URL(request.url).searchParams.get('offset');const offset=Math.max(0,Math.min(100000,Number(raw)||0));
 const result=await access.db.from('investment_items').select('id,name,amount,currency,updated_at').eq('user_id',access.userId).order('id').range(Math.floor(offset),Math.floor(offset)+99);
 return result.error?NextResponse.json({error:'UNAVAILABLE'},{status:503,headers}):NextResponse.json({schemaVersion:1,source:'user_records',liveQuotes:false,items:result.data,nextOffset:result.data.length===100?Math.floor(offset)+100:null},{headers});
}
