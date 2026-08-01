export type Lang = 'ar' | 'en' | 'fr';

export type TranslationEntry = Partial<Record<Lang, string>> & {
  ar: string;
  en: string;
};

export type TranslationDictionary = Readonly<Record<string, TranslationEntry>>;

export function translateFromDictionary(dictionary: TranslationDictionary, key: string, lang: Lang) {
  const entry = dictionary[key];
  return entry?.[lang] ?? entry?.en ?? entry?.ar ?? key;
}
