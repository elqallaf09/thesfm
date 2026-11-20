export const TV_PROFILES_KEY = 'sfm-markets-tv-profiles-v1';
export type TvLocalProfile = { token: string; name: string };
export const validTvProfileToken = (value: unknown): value is string => typeof value === 'string' && value.length === 64 && /^[a-f0-9]{64}$/.test(value);

export function normalizeTvProfiles(value: unknown): TvLocalProfile[] {
  if (!Array.isArray(value)) return [];
  const profiles = new Map<string, TvLocalProfile>();
  for (const item of value) {
    if (!item || typeof item !== 'object' || !validTvProfileToken(item.token) || typeof item.name !== 'string') continue;
    if (!profiles.has(item.token)) profiles.set(item.token, { token: item.token, name: item.name.trim().slice(0, 80) || 'SFM TV' });
    if (profiles.size === 8) break;
  }
  return [...profiles.values()];
}

export function readTvProfiles(): TvLocalProfile[] {
  try { return normalizeTvProfiles(JSON.parse(localStorage.getItem(TV_PROFILES_KEY) || '[]')); } catch { return []; }
}
export function writeTvProfiles(profiles: TvLocalProfile[]) {
  try { localStorage.setItem(TV_PROFILES_KEY, JSON.stringify(normalizeTvProfiles(profiles))); } catch { /* Restricted devices retain the current in-memory session. */ }
}
