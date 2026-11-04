import { z } from 'zod';
import { NextRequest } from 'next/server';
import { mobileAccess, mobileResponse } from './mobileAccess';
import { businessPermissions, type BusinessRole } from '../businessOperations';
import { calculateModel, scenarioConfig, type Assumptions, type RevenueStream, type CostItem } from '../mobile/projectModel';
import { feasibilityFields, scoreStudy, type Study } from '../mobile/feasibility';
import { POST as advisor } from '@/app/api/projects/[id]/ai-advisor/route';
import { POST as pitch } from '@/app/api/projects/[id]/pitch-deck/route';
const text=z.string().max(4000), numeric=z.string().max(40).refine(v=>v===''||Number.isFinite(Number(v)));
const assumptions=z.object({currency:z.string().regex(/^[A-Z]{3}$/),forecastPeriod:z.enum(['12','24','36','60']),initialCapital:numeric,openingCash:numeric,revenueGrowth:numeric,expenseGrowth:numeric,discountRate:numeric}).strict();
const revenue=z.object({id:text,name:text,startingRevenue:numeric,growthRate:numeric,grossMargin:numeric,notes:text}).strict();
const cost=z.object({id:text,name:text,monthlyCost:numeric,type:z.enum(['fixed','variable','one-time']),growthRate:numeric,notes:text}).strict();
const studySchema=z.object(Object.fromEntries(Object.entries(feasibilityFields).map(([section,keys])=>[section,z.object(Object.fromEntries(keys.map(key=>[key,text.optional()]))).strict()]))).strict();
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('slide'),projectId:z.uuid(),language:z.enum(['ar','en','fr']),slideId:z.string().min(1).max(100),updatedAt:z.string().min(1).max(80),headline:z.string().max(4000),bullets:z.array(z.string().max(2000)).max(30),notes:z.string().max(8000)}).strict(),
 z.object({action:z.literal('model'),projectId:z.uuid(),assumptions,revenue_streams:z.array(revenue).max(100),cost_items:z.array(cost).max(100)}).strict(),
 z.object({action:z.literal('study'),projectId:z.uuid(),study:studySchema}).strict(),
 z.object({action:z.enum(['advisor','pitch']),projectId:z.uuid(),mode:z.string().max(40),language:z.enum(['ar','en','fr']),question:z.string().max(4000).optional(),slideId:z.string().max(100).optional()}).strict(),
]);
export async function projectWorkspace(request: Request) {
 const access=await mobileAccess(request);if(access.response)return access.response;
 const role=await access.client.from('business_user_roles').select('role').eq('user_id',access.userId).maybeSingle();
 if(role.error)return mobileResponse({code:'ACCESS_UNAVAILABLE'},503);
 if(!role.data||!['manager','accountant','employee'].includes(role.data.role))return mobileResponse({code:'FORBIDDEN'},403);
 const canWrite=businessPermissions(role.data.role as BusinessRole).canWriteBusinessModules;
 if(request.method==='GET') {
  const id=new URL(request.url).searchParams.get('id');
  if(!id){const result=await access.client.from('projects').select('id,name,budget,notes,timeline,created_at').eq('user_id',access.userId).order('id').limit(1000);return result.error?mobileResponse({code:'LOAD_UNAVAILABLE'},503):mobileResponse({projects:result.data,canWrite,limited:result.data.length===1000});}
  if(!z.uuid().safeParse(id).success)return mobileResponse({code:'INVALID_REQUEST'},400);
  const project=await access.client.from('projects').select('id,name,budget,notes,timeline,created_at').eq('user_id',access.userId).eq('id',id).maybeSingle();
  if(project.error)return mobileResponse({code:'LOAD_UNAVAILABLE'},503);if(!project.data)return mobileResponse({code:'NOT_FOUND'},404);
  const tables=['project_financial_models','project_feasibility_studies','project_tasks','project_milestones','project_documents','project_income','project_expenses','project_pitch_decks'] as const;
  const results=await Promise.all(tables.map(table=>access.client.from(table).select('*').eq('user_id',access.userId).eq('project_id',id).order('id').limit(1000)));
  if(results.some(r=>r.error))return mobileResponse({code:'LOAD_UNAVAILABLE'},503);
  return mobileResponse({project:project.data,canWrite,limited:results.some(r=>r.data?.length===1000),records:Object.fromEntries(tables.map((t,i)=>[t,results[i].data]))});
 }
 if(!canWrite)return mobileResponse({code:'FORBIDDEN'},403);
 const raw=await request.text();if(raw.length>128000)return mobileResponse({code:'BODY_TOO_LARGE'},413);
 let body:unknown;try{body=JSON.parse(raw);}catch{return mobileResponse({code:'INVALID_REQUEST'},400);}
 const parsed=input.safeParse(body);if(!parsed.success)return mobileResponse({code:'INVALID_REQUEST'},400);const data=parsed.data;
 const owned=await access.client.from('projects').select('id').eq('user_id',access.userId).eq('id',data.projectId).maybeSingle();
 if(owned.error)return mobileResponse({code:'LOAD_UNAVAILABLE'},503);if(!owned.data)return mobileResponse({code:'NOT_FOUND'},404);
 if(data.action==='slide'){
  const existing=await access.client.from('project_pitch_decks').select('id,deck_data,updated_at').eq('user_id',access.userId).eq('project_id',data.projectId).eq('language',data.language).maybeSingle();
  if(existing.error)return mobileResponse({code:'LOAD_UNAVAILABLE'},503);if(!existing.data)return mobileResponse({code:'NOT_FOUND'},404);
  const deck=existing.data.deck_data as {slides?:Array<{id:string;content:Record<string,unknown>}>};if(!Array.isArray(deck?.slides)||!deck.slides.some(slide=>slide.id===data.slideId))return mobileResponse({code:'INVALID_REQUEST'},400);
  const updated={...deck,slides:deck.slides.map(slide=>slide.id===data.slideId?{...slide,content:{...slide.content,headline:data.headline,bullets:data.bullets,notes:data.notes}}:slide)};
  const saved=await access.client.from('project_pitch_decks').update({deck_data:updated,updated_at:new Date().toISOString()}).eq('id',existing.data.id).eq('user_id',access.userId).eq('updated_at',data.updatedAt).select('id,deck_data,updated_at').maybeSingle();
  if(saved.error)return mobileResponse({code:'SAVE_UNAVAILABLE'},503);return saved.data?mobileResponse({ok:true,deck:saved.data}):mobileResponse({code:'CONFLICT'},409);
 }
 if(data.action==='advisor'||data.action==='pitch') {
  const modes=data.action==='advisor'?['summary','risks','actions','plan90','report','chat']:['generate','improve_slide','report_missing_data'];
  if(!modes.includes(data.mode))return mobileResponse({code:'INVALID_REQUEST'},400);
  const forwarded=new NextRequest(new URL('/api/projects/'+data.projectId+'/'+(data.action==='advisor'?'ai-advisor':'pitch-deck'),request.url),{method:'POST',headers:{authorization:request.headers.get('authorization')!,'content-type':'application/json'},body:JSON.stringify({mode:data.mode,lang:data.language,language:data.language,question:data.question,slideId:data.slideId})});
  const result=await (data.action==='advisor'?advisor:pitch)(forwarded,{params:Promise.resolve({id:data.projectId})});result.headers.set('Cache-Control','private, no-store');return result;
 }
 const common={user_id:access.userId,project_id:data.projectId,updated_at:new Date().toISOString()};
 let table:string,payload:Record<string,unknown>;
 if(data.action==='model') {
  const model=calculateModel(data.assumptions as Assumptions,data.revenue_streams as RevenueStream[],data.cost_items as CostItem[]);
  const scenarios=Object.entries(scenarioConfig).map(([id,config])=>({id,...calculateModel(data.assumptions,data.revenue_streams,data.cost_items,config).kpis}));
  if([...model.forecast.flatMap(row=>Object.values(row)),...scenarios.flatMap(row=>Object.values(row).filter(v=>typeof v==='number'))].some(v=>!Number.isFinite(v)))return mobileResponse({code:'INVALID_REQUEST'},400);
  table='project_financial_models';payload={...common,assumptions:data.assumptions,revenue_streams:data.revenue_streams,cost_items:data.cost_items,...model,scenarios};
 }else if(data.action==='study') {const study=data.study as Study,score=scoreStudy(study);table='project_feasibility_studies';payload={...common,market_data:study.market,technical_data:study.technical,financial_data:study.financial,legal_data:study.legal,feasibility_score:score.score,feasibility_status:score.status};}else return mobileResponse({code:'INVALID_REQUEST'},400);
 const saved=await access.client.from(table).upsert(payload,{onConflict:'user_id,project_id'}).select('id').single();
 return saved.error?mobileResponse({code:'SAVE_UNAVAILABLE'},503):mobileResponse({ok:true,id:saved.data.id});
}
