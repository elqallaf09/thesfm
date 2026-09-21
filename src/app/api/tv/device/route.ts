import { normalizeTvSettings } from '@/lib/markets-tv/types';
import { getTvDevice, ownedTvData, publicDevice, saveTvSettings, tvDb } from '@/lib/server/markets-tv/devices';
import { tvDeviceOrigin, tvBody, tvJson } from '@/lib/server/markets-tv/http';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const limit = rateLimitRequest(request, { prefix: 'tv-device', max: 30 }); if (limit) return limit;
  try {
    const device = await getTvDevice(request);
    if (!device?.user_id) return tvJson({ code: 'UNAUTHORIZED' }, 401);
    return tvJson({ device: publicDevice(device), ...await ownedTvData(device.user_id) });
  } catch { return tvJson({ code: 'DEVICE_UNAVAILABLE' }, 503); }
}
export async function PATCH(request: Request) {
  if (!tvDeviceOrigin(request)) return tvJson({ code: 'FORBIDDEN' }, 403);
  const limit = rateLimitRequest(request, { prefix: 'tv-settings', max: 30 }); if (limit) return limit;
  try {
    const device = await getTvDevice(request); if (!device?.user_id) return tvJson({ code: 'UNAUTHORIZED' }, 401);
    const body = await tvBody(request); if (!body) return tvJson({ code: 'INVALID_REQUEST' }, 400);
    const settings = normalizeTvSettings(body.settings); await saveTvSettings(device, settings);
    return tvJson({ settings });
  } catch { return tvJson({ code: 'DEVICE_UNAVAILABLE' }, 503); }
}
export async function DELETE(request: Request) {
  const limit = rateLimitRequest(request, { prefix: 'tv-unlink', max: 20 }); if (limit) return limit;
  if (!tvDeviceOrigin(request)) return tvJson({ code: 'FORBIDDEN' }, 403);
  try {
    const device = await getTvDevice(request); if (!device) return tvJson({ code: 'UNAUTHORIZED' }, 401);
    const { error } = await tvDb().from('markets_tv_devices').update({ state: 'revoked', code_hash: null }).eq('id', device.id).eq('user_id', device.user_id);
    return error ? tvJson({ code: 'DEVICE_UNAVAILABLE' }, 503) : tvJson({ ok: true });
  } catch { return tvJson({ code: 'DEVICE_UNAVAILABLE' }, 503); }
}
