import { z } from 'zod';
import { REPORT_DATA_TABLES } from '@/lib/data/financeData';
import { specializedReports } from '@/lib/mobile/reportCatalog';
import { mobileAccess,mobileResponse } from '@/lib/server/mobileAccess';
export const dynamic='force-dynamic';
export async function GET(request:Request){const a=await mobileAccess(request);if(a.response)return a.response;const q=new URL(request.url).searchParams;const product=q.get('product'),id=q.get('report');
 const definition=specializedReports.find(r=>r.id===id&&r.products.some(p=>p===product));const table=REPORT_DATA_TABLES.find(t=>t.key===id);
 if(!definition||!table)return mobileResponse({code:'INVALID_REQUEST'},400);
 if(product==='business'){const role=await a.client.from('business_user_roles').select('role').eq('user_id',a.userId).maybeSingle();if(role.error)return mobileResponse({code:'ACCESS_UNAVAILABLE'},503);if(!role.data||!['manager','accountant','employee'].includes(role.data.role))return mobileResponse({code:'FORBIDDEN'},403);}
 const cursor=q.get('cursor');if(cursor&&!z.uuid().safeParse(cursor).success)return mobileResponse({code:'INVALID_REQUEST'},400);
 let query=a.client.from(table.table).select('*').eq('user_id',a.userId).order('id').limit(200);if(cursor)query=query.gt('id',cursor);
 const result=await query;if(result.error)return mobileResponse({code:'LOAD_UNAVAILABLE'},503);const rows=result.data??[];
 return mobileResponse({rows:rows.map(row=>Object.fromEntries(Object.entries(row).filter(([key])=>key!=='user_id'))),nextCursor:rows.length===200?rows.at(-1)?.id:null,generatedAt:new Date().toISOString()});}
