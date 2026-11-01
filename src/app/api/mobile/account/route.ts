import { z } from 'zod';
import { mobileAccess, mobileResponse } from '@/lib/server/mobileAccess';

export const dynamic = 'force-dynamic';
const profileFields = 'id,username,display_name,email,avatar_url,preferred_lang,preferred_currency,default_currency,preferred_theme,country';
const updateSchema = z.object({
  display_name: z.string().trim().min(1).max(100).optional(),
  username: z.string().trim().min(3).max(50).regex(/^[\p{L}\p{N}_-]+$/u).optional(),
  preferred_lang: z.enum(['ar', 'en', 'fr']).optional(),
  preferred_currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  preferred_theme: z.enum(['light', 'dark', 'system']).optional(),
}).strict().refine(value => Object.keys(value).length > 0);
export async function GET(request: Request) {
  const access = await mobileAccess(request);
  if (access.response) return access.response;
  const [profile, subscriptions] = await Promise.all([
    access.client.from('profiles').select(profileFields).eq('id', access.userId).maybeSingle(),
    access.client.from('user_subscriptions').select('plan,status,billing_interval,current_period_end').eq('user_id', access.userId),
  ]);
  if (profile.error || subscriptions.error) return mobileResponse({ ok: false, code: 'ACCOUNT_UNAVAILABLE' }, 503);
  return mobileResponse({ ok: true, user: { id: access.userId, email: access.email }, profile: profile.data, subscriptions: subscriptions.data });
}
export async function PATCH(request: Request) {
  const access = await mobileAccess(request);
  if (access.response) return access.response;
  const raw = await request.text();
  if (raw.length > 4096) return mobileResponse({ ok: false, code: 'BODY_TOO_LARGE' }, 413);
  const parsed = updateSchema.safeParse(await Promise.resolve().then(() => JSON.parse(raw)).catch(() => null));
  if (!parsed.success) return mobileResponse({ ok: false, code: 'INVALID_PROFILE' }, 400);
  const result = await access.client.from('profiles').update(parsed.data).eq('id', access.userId).select(profileFields).maybeSingle();
  if (result.error) return mobileResponse({ ok: false, code: 'SAVE_UNAVAILABLE' }, 503);
  return result.data ? mobileResponse({ ok: true, profile: result.data }) : mobileResponse({ ok: false, code: 'NOT_FOUND' }, 404);
}
