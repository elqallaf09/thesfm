import type { TvLanguage } from './types';

export const TV_WALLPAPERS = {
  original: { ar: 'بانوراما البورصة', en: 'Exchange panorama', fr: 'Panorama de la Bourse' },
  'kuwait-bay': { ar: 'أبراج الكويت', en: 'Kuwait Towers', fr: 'Tours du Koweït' },
  'trading-floor': { ar: 'قاعة التداول', en: 'Trading floor', fr: 'Salle des marchés' },
  bullion: { ar: 'سبائك الذهب', en: 'Gold bullion', fr: 'Lingots d’or' },
  tokyo: { ar: 'طوكيو ليلاً', en: 'Tokyo at night', fr: 'Tokyo de nuit' },
  colonnade: { ar: 'أعمدة الزمرد', en: 'Emerald colonnade', fr: 'Colonnade émeraude' },
  dunes: { ar: 'كثبان عند الغروب', en: 'Dunes at dusk', fr: 'Dunes au crépuscule' },
} as const satisfies Record<string, Record<TvLanguage, string>>;

export type TvWallpaper = keyof typeof TV_WALLPAPERS;
export const wallpaperIds = Object.keys(TV_WALLPAPERS) as TvWallpaper[];

export function normalizeWallpaper(input: unknown): TvWallpaper {
  return typeof input === 'string' && Object.prototype.hasOwnProperty.call(TV_WALLPAPERS, input)
    ? input as TvWallpaper : 'original';
}

export function wallpaperPath(id: TvWallpaper, packaged: boolean) {
  const name = id === 'original' ? 'exchange-panorama.webp' : `assets/wallpapers/${id}.webp`;
  return `${packaged ? './' : '/'}markets-tv/${name}`;
}
