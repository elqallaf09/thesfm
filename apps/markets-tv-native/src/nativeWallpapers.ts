import type { ImageSourcePropType } from 'react-native';
import type { TvWallpaper } from '../../../src/lib/markets-tv/wallpapers';
import type { Language } from './api';
import original from '../assets/wallpapers/original.png';
import kuwaitBay from '../assets/wallpapers/kuwait-bay.png';
import tradingFloor from '../assets/wallpapers/trading-floor.png';
import bullion from '../assets/wallpapers/bullion.png';
import tokyo from '../assets/wallpapers/tokyo.png';
import colonnade from '../assets/wallpapers/colonnade.png';
import dunes from '../assets/wallpapers/dunes.png';

// Lossless PNG copies of the shared WebP art work on both tvOS and Android TV.
// Static imports keep every preview and selected background available offline.
export const NATIVE_WALLPAPERS = {
  original, 'kuwait-bay': kuwaitBay, 'trading-floor': tradingFloor, bullion, tokyo, colonnade, dunes,
} satisfies Record<TvWallpaper, ImageSourcePropType>;

const copy = {
  ar: { title: 'خلفية الشاشة', hint: 'اختر خلفية؛ تُحفظ تلقائيًا على هذا التلفاز.', back: 'رجوع إلى القائمة' },
  en: { title: 'Wallpaper', hint: 'Choose a wallpaper. Your selection is saved on this TV.', back: 'Back to menu' },
  fr: { title: 'Fond d’écran', hint: 'Choisissez un fond. Votre choix est enregistré sur ce téléviseur.', back: 'Retour au menu' },
} as const satisfies Record<Language, { title: string; hint: string; back: string }>;

export function nativeWallpaperText(language: Language, key: keyof typeof copy.ar) { return copy[language][key]; }
