import 'server-only';
import { createHash } from 'node:crypto';
import { createServerSupabaseAdmin } from './adminAccess';
export async function integrationAccess(request:Request,scope:string){
 const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')??'';
 if(!/^sfm_[\w-]{43}$/.test(token))return null;
 const db=createServerSupabaseAdmin();if(!db)return null;
 const result=await db.rpc('sfm_authorize_integration',{p_hash:createHash('sha256').update(token).digest('hex'),p_scope:scope});
 return result.error||!result.data?null:{db,userId:String(result.data)};
}
