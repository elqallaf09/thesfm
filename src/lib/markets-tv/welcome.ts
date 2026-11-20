import type { TvLanguage } from './types';
export const TV_WELCOME_EVENT = 'sfm-tv-replay-welcome';
export const welcomeText = (language: TvLanguage) => ({
  ar: { replay: 'إعادة الافتتاحية بالصوت' },
  en: { replay: 'Replay introduction with sound' },
  fr: { replay: 'Rejouer l’introduction avec le son' },
})[language];
