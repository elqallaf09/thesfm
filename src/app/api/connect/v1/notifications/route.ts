import { NextResponse } from 'next/server';
import { integrationAccess } from '@/lib/server/integrationAccess';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store'};const access=await integrationAccess(request,'notifications:read');if(!access)return NextResponse.json({error:'INVALID_EXPIRED_OR_RATE_LIMITED_KEY'},{status:401,headers});
 const result=await access.db.from('notifications').select('id,type,title,message,read,created_at').eq('user_id',access.userId).order('created_at',{ascending:false}).limit(50);
 return result.error?NextResponse.json({error:'UNAVAILABLE'},{status:503,headers}):NextResponse.json({schemaVersion:1,notifications:result.data},{headers});
}
