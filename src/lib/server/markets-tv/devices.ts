import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { normalizeTvSettings, type TvAlert, type TvSettings } from '@/lib/markets-tv/types';
export const tvHash = (value: string) => createHash('sha256').update(value).digest('hex');
export const tvSecret = () => randomBytes(32).toString('hex');
export const tvCode = () => randomBytes(6).toString('hex').toUpperCase();
export function cleanTvCode(input: unknown) {
  return typeof input === 'string' ? input.replace(/[\s-]/g, '').toUpperCase() : '';
}
export type DeviceRow = { id: string; user_id: string | null; name: string; state: string; expires_at: string; settings: unknown };
export function tvDb() {
  const db = createServerSupabaseAdmin();
  if (!db) throw new Error('TV_STORAGE_UNAVAILABLE');
  return db;
}
export async function getTvDevice(request: Request): Promise<DeviceRow | null> {
  const secret = request.headers.get('x-sfm-tv-token');
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) return null;
  const { data, error } = await tvDb().from('markets_tv_devices')
    .select('id,user_id,name,state,expires_at,settings').eq('secret_hash', tvHash(secret))
    .eq('state', 'active').gt('expires_at', new Date().toISOString()).maybeSingle();
  if (error) throw new Error('TV_STORAGE_UNAVAILABLE');
  return data as DeviceRow | null;
}
export async function ownedTvData(userId: string) {
  const db = tvDb();
  const [watchlist, alerts] = await Promise.all([
    db.from('market_watchlist').select('symbol').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    db.from('market_price_alerts').select('id,symbol,alert_type,threshold,currency,status').eq('user_id', userId).in('status', ['saved', 'active']).limit(50),
  ]);
  if (watchlist.error || alerts.error) throw new Error('TV_ACCOUNT_DATA_UNAVAILABLE');
  return {
    symbols: [...new Set((watchlist.data ?? []).map(r => String(r.symbol).toUpperCase()).filter(s => /^[A-Z0-9^][A-Z0-9.^=/_-]{0,39}$/.test(s)))],
    alerts: (alerts.data ?? []).flatMap(r => {
      const threshold = typeof r.threshold === 'number' ? r.threshold : typeof r.threshold === 'string' && r.threshold.trim() ? Number(r.threshold) : NaN;
      return Number.isFinite(threshold) ? [{ ...r, threshold } as TvAlert] : [];
    }),
  };
}
export function publicDevice(row: DeviceRow) {
  return { id: row.id, name: row.name, expiresAt: row.expires_at, settings: normalizeTvSettings(row.settings) };
}
export async function saveTvSettings(row: DeviceRow, settings: TvSettings) {
  const { error } = await tvDb().from('markets_tv_devices').update({ settings }).eq('id', row.id)
    .eq('user_id', row.user_id).eq('state', 'active').gt('expires_at', new Date().toISOString());
  if (error) throw new Error('TV_STORAGE_UNAVAILABLE');
}
