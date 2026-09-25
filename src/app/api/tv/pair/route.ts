import { getClientIp, rateLimitRequest } from '@/lib/server/rateLimiter';
import { cleanTvCode, tvCode, tvDb, tvHash, tvSecret } from '@/lib/server/markets-tv/devices';
import { tvDeviceOrigin, tvBody, tvJson } from '@/lib/server/markets-tv/http';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!tvDeviceOrigin(request)) return tvJson({ code: 'FORBIDDEN' }, 403);
  const limited = rateLimitRequest(request, { prefix: 'tv-pair-create', max: 8, windowMs: 3600000 });
  if (limited) return limited;
  const body = await tvBody(request);
  if (!body) return tvJson({ code: 'INVALID_REQUEST' }, 400);
  const name = typeof body.name === 'string' ? body.name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80) : 'The SFM TV';
  if (!name) return tvJson({ code: 'INVALID_REQUEST' }, 400);
  const code = tvCode(), secret = tvSecret();
  try {
    const { error } = await tvDb().rpc('create_markets_tv_pair', {
      p_name: name, p_code_hash: tvHash(cleanTvCode(code)), p_secret_hash: tvHash(secret),
      p_request_hash: tvHash(getClientIp(request)),
    });
    if (error) return tvJson({ code: error.message.includes('TV_PAIR_RATE_LIMIT') ? 'RATE_LIMITED' : 'PAIR_UNAVAILABLE' }, error.message.includes('TV_PAIR_RATE_LIMIT') ? 429 : 503);
    return tvJson({ code, secret, expiresAt: new Date(Date.now() + 600000).toISOString(), interval: 5 }, 201);
  } catch { return tvJson({ code: 'PAIR_UNAVAILABLE' }, 503); }
}
export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { prefix: 'tv-pair-poll', max: 30 });
  if (limited) return limited;
  const secret = request.headers.get('x-sfm-tv-token');
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) return tvJson({ code: 'UNAUTHORIZED' }, 401);
  try {
    const db = tvDb();
    const { data, error } = await db.from('markets_tv_devices').select('id,state')
      .eq('secret_hash', tvHash(secret)).in('state', ['pending', 'approved']).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (error) return tvJson({ code: 'PAIR_UNAVAILABLE' }, 503);
    if (!data) return tvJson({ code: 'PAIR_EXPIRED' }, 410);
    if (data.state === 'pending') return tvJson({ state: 'pending' });
    const token = tvSecret();
    const { data: activated, error: activateError } = await db.from('markets_tv_devices')
      .update({ state: 'active', code_hash: null, secret_hash: tvHash(token), expires_at: new Date(Date.now() + 30 * 86400000).toISOString() })
      .eq('id', data.id).eq('secret_hash', tvHash(secret)).eq('state', 'approved')
      .gt('expires_at', new Date().toISOString()).select('id').maybeSingle();
    if (activateError) return tvJson({ code: 'PAIR_UNAVAILABLE' }, 503);
    if (!activated) return tvJson({ code: 'PAIR_EXPIRED' }, 410);
    return tvJson({ state: 'active', token });
  } catch { return tvJson({ code: 'PAIR_UNAVAILABLE' }, 503); }
}
