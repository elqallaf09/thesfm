import type { TvLanguage } from './types';
export const TV_WELCOME_EVENT = 'sfm-tv-replay-welcome';
export const welcomeText = (language: TvLanguage) => ({
  ar: { replay: 'إعادة الافتتاحية بالصوت', sound: 'تشغيل بالصوت', skip: 'تخطي', unavailable: 'الصوت غير متاح على هذا الجهاز' },
  en: { replay: 'Replay introduction with sound', sound: 'Play with sound', skip: 'Skip', unavailable: 'Sound is unavailable on this device' },
  fr: { replay: 'Rejouer l’introduction avec le son', sound: 'Activer le son', skip: 'Passer', unavailable: 'Le son est indisponible sur cet appareil' },
})[language];
