import { normalizeTvSelections, type TvSelections } from './selections';
import { normalizeTvSettings, type TvSettings } from './types';

export const TV_CHANNELS_KEY = 'sfm-markets-tv-channels-v1';
export const TV_CHANNEL_LIMIT = 8;
// UTF-16 storage budget; leave room for this screen's current selections/settings.
export const TV_CHANNEL_STORAGE_LIMIT = 1_000_000;
export type TvChannel = { id: string; name: string; settings: TvSettings; selections: TvSelections };

export function normalizeTvChannels(value: unknown): TvChannel[] {
  if (!Array.isArray(value)) return [];
  const result: TvChannel[] = [];
  let size = 2;
  for (const item of value.slice(0, TV_CHANNEL_LIMIT)) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(item.id)
      || typeof item.name !== 'string' || !item.name.trim() || result.some(channel => channel.id === item.id)) continue;
    const channel: TvChannel = { id: item.id, name: item.name.trim().slice(0, 60),
      settings: normalizeTvSettings(item.settings), selections: normalizeTvSelections(item.selections) };
    size += JSON.stringify(channel).length + 1;
    if (size > TV_CHANNEL_STORAGE_LIMIT) break;
    result.push(channel);
  }
  return result;
}
