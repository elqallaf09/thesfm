import type { TvLanguage } from './types';

const COPY = {
  of: ['من', 'of', 'sur'],
  directoryAssets: ['الأصول في الدليل', 'Directory assets', 'Actifs du répertoire'],
  clearSelection: ['إلغاء تحديد الكل', 'Deselect all', 'Tout désélectionner'],
  inheritSpeed: ['حسب إعداد الشاشة', 'Use screen setting', 'Réglage de l’écran'],
  moveUp: ['تقديم', 'Move up', 'Monter'],
  moveDown: ['تأخير', 'Move down', 'Descendre'],
} satisfies Record<string, [string, string, string]>;

export function marketPickerText(language: TvLanguage, key: keyof typeof COPY) {
  return COPY[key][language === 'ar' ? 0 : language === 'fr' ? 2 : 1];
}
