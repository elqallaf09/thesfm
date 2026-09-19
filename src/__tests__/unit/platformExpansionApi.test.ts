import {beforeEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const mocks=vi.hoisted(()=>({user:vi.fn(),admin:vi.fn(),report:vi.fn(),rate:vi.fn(),configuration:vi.fn()}));
vi.mock('@/lib/server/adminAccess',()=>({getCurrentUserFromRequest:mocks.user,createServerSupabaseAdmin:mocks.admin}));
vi.mock('@/domain/economic-intelligence/advisorCapabilities.server',()=>({loadCapabilityReport:mocks.report}));
vi.mock('@/lib/server/rateLimiter',()=>({checkRateLimitWithMetadata:mocks.rate}));
vi.mock('@/lib/server/notificationChannels',()=>({notificationConfiguration:mocks.configuration}));
import * as notifications from '@/app/api/notifications/route';
import * as channels from '@/app/api/notifications/channels/route';
import * as plans from '@/app/api/economic-intelligence/advisor-plans/route';
import * as keys from '@/app/api/integrations/keys/route';
import {POST as webhook} from '@/app/api/webhooks/notifications/[provider]/route';
import {integrationAccess} from '@/lib/server/integrationAccess';
const request=(body:unknown={})=>new NextRequest('https://example.test/api/test',{method:'POST',body:JSON.stringify(body),headers:{'content-type':'application/json'}});
beforeEach(()=>{vi.resetAllMocks();mocks.user.mockResolvedValue(null);mocks.rate.mockReturnValue({allowed:true});mocks.configuration.mockReturnValue({email:true,telegram:false,whatsapp:false,push:false});});
describe('platform expansion authorization',()=>{
 it.each([['notifications',notifications],['channels',channels],['plans',plans],['keys',keys]] as const)('%s denies anonymous reads and writes before creating an admin client',async(_name,route)=>{
  expect((await route.GET(request())).status).toBe(401);expect((await route.POST(request())).status).toBe(401);expect(mocks.admin).not.toHaveBeenCalled();
 });
 it('requires explicit channel consent and rejects caller-chosen email recipients',async()=>{
  mocks.user.mockResolvedValue({id:'owner',email:'owner@example.test',email_confirmed_at:'2026-09-01'});
  expect((await channels.POST(request({action:'connect',channel:'email',consent:false,locale:'en'}))).status).toBe(400);
  expect((await channels.POST(request({action:'connect',channel:'email',consent:true,locale:'en',email:'other@example.test'}))).status).toBe(400);
  expect(mocks.admin).not.toHaveBeenCalled();
 });
 it('scopes notification updates to the session owner even for foreign IDs',async()=>{
  mocks.user.mockResolvedValue({id:'owner'});
  const query={update:vi.fn(),eq:vi.fn(),in:vi.fn(),select:vi.fn()};query.update.mockReturnValue(query);query.eq.mockReturnValue(query);query.in.mockReturnValue(query);query.select.mockResolvedValue({data:[],error:null});
  mocks.admin.mockReturnValue({from:()=>query});
  const response=await notifications.POST(request({ids:['20000000-0000-4000-8000-000000000002'],status:'read'}));
  expect(response.status).toBe(200);expect(query.eq).toHaveBeenCalledWith('user_id','owner');expect(await response.json()).toEqual({ok:true,updated:0});expect(response.headers.get('cache-control')).toContain('no-store');
 });
 it('rejects missing or invalid webhook signatures before database access',async()=>{
  for(const provider of ['telegram','whatsapp'])expect((await webhook(request(),{params:Promise.resolve({provider})})).status).toBe(403);
  expect(mocks.admin).not.toHaveBeenCalled();
 });
 it('rejects malformed integration keys before database access',async()=>{
  expect(await integrationAccess(new Request('https://example.test'), 'portfolio:read')).toBeNull();expect(mocks.admin).not.toHaveBeenCalled();
 });
 it('hashes integration secrets and asks the database to authorize the exact scope',async()=>{
  const rpc=vi.fn().mockResolvedValue({data:'owner',error:null});mocks.admin.mockReturnValue({rpc});
  const token='sfm_'+'a'.repeat(43);const result=await integrationAccess(new Request('https://example.test',{headers:{authorization:'Bearer '+token}}),'snapshots:write');
  expect(result?.userId).toBe('owner');expect(rpc).toHaveBeenCalledWith('sfm_authorize_integration',{p_hash:expect.stringMatching(/^[0-9a-f]{64}$/),p_scope:'snapshots:write'});expect(JSON.stringify(rpc.mock.calls)).not.toContain(token);
 });
});
