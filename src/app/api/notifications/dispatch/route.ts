import { NextRequest,NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/accessPolicy';
import { dispatchNotificationDeliveries } from '@/lib/server/notificationDelivery';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 if(!isCronAuthorized(request))return NextResponse.json({error:'UNAUTHORIZED'},{status:401});
 try{return NextResponse.json(await dispatchNotificationDeliveries(),{headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({error:'DELIVERY_UNAVAILABLE'},{status:503});}
}
