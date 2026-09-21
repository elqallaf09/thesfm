import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { cleanTvCode, tvDb, tvHash } from '@/lib/server/markets-tv/devices';
import { sameOrigin, tvAccount, tvBody, tvJson } from '@/lib/server/markets-tv/http';
export const dynamic = 'force-dynamic';
async function authorize(request: Request) {
  const limited = rateLimitRequest(request, { prefix: 'tv-account', max: request.method === 'POST' ? 8 : 30 });
  if (limited) return { response: limited };
  if (request.method !== 'GET' && !sameOrigin(request)) return { response: tvJson({ code: 'FORBIDDEN' }, 403) };
  const user = await tvAccount(request);
  return user ? { user } : { response: tvJson({ code: 'UNAUTHORIZED' }, 401) };
}
export async function GET(request: Request) {
  const access = await authorize(request); if (access.response) return access.response;
  try {
    const { data, error } = await tvDb().from('markets_tv_devices').select('id,name,created_at,expires_at,state')
      .eq('user_id', access.user!.userId).in('state', ['approved', 'active']).gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }).limit(30);
    return error ? tvJson({ code: 'DEVICE_UNAVAILABLE' }, 503) : tvJson({ devices: data });
  } catch { return tvJson({ code: 'DEVICE_UNAVAILABLE' }, 503); }
}
export async function POST(request: Request) {
  const access = await authorize(request); if (access.response) return access.response;
  const body = await tvBody(request); const code = cleanTvCode(body?.code);
  if (!/^[A-F0-9]{12}$/.test(code)) return tvJson({ code: 'INVALID_CODE' }, 400);
  try {
    const { data, error } = await tvDb().from('markets_tv_devices')
      .update({ user_id: access.user!.userId, state: 'approved', approved_at: new Date().toISOString(), code_hash: null })
      .eq('code_hash', tvHash(code)).eq('state', 'pending').is('user_id', null)
      .gt('expires_at', new Date().toISOString()).select('name').maybeSingle();
    if (error) return tvJson({ code: 'PAIR_UNAVAILABLE' }, 503);
    return data ? tvJson({ ok: true, name: data.name }) : tvJson({ code: 'INVALID_CODE' }, 400);
  } catch { return tvJson({ code: 'PAIR_UNAVAILABLE' }, 503); }
}
export async function DELETE(request: Request) {
  const access = await authorize(request); if (access.response) return access.response;
  const body = await tvBody(request);
  if (typeof body?.id !== 'string' || !/^[a-f0-9-]{36}$/.test(body.id)) return tvJson({ code: 'INVALID_REQUEST' }, 400);
  try {
    const { error } = await tvDb().from('markets_tv_devices').update({ state: 'revoked', code_hash: null })
      .eq('id', body.id).eq('user_id', access.user!.userId);
    return error ? tvJson({ code: 'DEVICE_UNAVAILABLE' }, 503) : tvJson({ ok: true });
  } catch { return tvJson({ code: 'DEVICE_UNAVAILABLE' }, 503); }
}
