import { TV_ATLAS_CITIES } from '../../../src/lib/markets-tv/atlas';
import type { Language } from './api';

/** Fit the unmirrored 2:1 Robinson artwork before applying shared pin percentages. */
export function nativeAtlasSize(width: number, height: number, padding = 20) {
  const fittedWidth = Math.max(0, Math.min(width - padding * 2, (height - padding * 2) * 2));
  return { width: fittedWidth, height: fittedWidth / 2 };
}

export function nativeAtlasFormatters(language: Language) {
  return TV_ATLAS_CITIES.map(city => ({
    ...city,
    weekday: new Intl.DateTimeFormat(language, { timeZone: city.zone, weekday: 'long' }),
    clock: new Intl.DateTimeFormat(`${language}-u-nu-latn`, { timeZone: city.zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
  }));
}
