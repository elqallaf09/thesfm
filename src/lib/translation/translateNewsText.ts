export type AppNewsLanguage = 'ar' | 'en' | 'fr';

export type NewsTranslationState = {
  titleOriginal: string;
  summaryOriginal: string;
  languageOriginal: string;
  title: string;
  summary: string;
  translatedTo: AppNewsLanguage;
  isTranslated: boolean;
  translationSource: 'LibreTranslate' | 'original';
};

type TranslatableNewsItem = {
  id: string;
  url?: string;
  headline?: string;
  summary?: string;
  titleOriginal?: string;
  summaryOriginal?: string;
  languageOriginal?: string;
  title?: string;
  translatedTo?: AppNewsLanguage;
  isTranslated?: boolean;
  translationSource?: string;
};

const translationCache = new Map<string, NewsTranslationState>();

export function normalizeNewsLanguage(value: string | null | undefined): AppNewsLanguage {
  return value === 'en' || value === 'fr' || value === 'ar' ? value : 'ar';
}

function detectLanguage(text: string): AppNewsLanguage | 'unknown' {
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[àâçéèêëîïôûùüÿœæ]/i.test(text)) return 'fr';
  if (/[a-z]/i.test(text)) return 'en';
  return 'unknown';
}

function providerUrl() {
  return process.env.LIBRETRANSLATE_URL?.trim().replace(/\/$/, '') || '';
}

async function libreTranslate(text: string, source: string, target: AppNewsLanguage) {
  const baseUrl = providerUrl();
  if (!baseUrl || !text.trim()) return null;

  const response = await fetch(`${baseUrl}/translate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      q: text,
      source: source === 'unknown' ? 'auto' : source,
      target,
      format: 'text',
      api_key: process.env.LIBRETRANSLATE_API_KEY?.trim() || undefined,
    }),
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`LibreTranslate returned ${response.status}`);
  const json = await response.json().catch(() => null) as { translatedText?: string } | null;
  return typeof json?.translatedText === 'string' ? json.translatedText.trim() : null;
}

export async function translateNewsText(options: {
  cacheKey: string;
  title: string;
  summary: string;
  targetLanguage: AppNewsLanguage;
  languageOriginal?: string | null;
}): Promise<NewsTranslationState> {
  const titleOriginal = options.title.trim();
  const summaryOriginal = options.summary.trim();
  const originalLanguage = options.languageOriginal || detectLanguage(`${titleOriginal} ${summaryOriginal}`);
  const cacheKey = `newsTranslation:${options.cacheKey}:${options.targetLanguage}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  const originalState: NewsTranslationState = {
    titleOriginal,
    summaryOriginal,
    languageOriginal: originalLanguage,
    title: titleOriginal,
    summary: summaryOriginal,
    translatedTo: options.targetLanguage,
    isTranslated: false,
    translationSource: 'original',
  };

  if (!providerUrl() || originalLanguage === options.targetLanguage) {
    translationCache.set(cacheKey, originalState);
    return originalState;
  }

  try {
    const [translatedTitle, translatedSummary] = await Promise.all([
      libreTranslate(titleOriginal, originalLanguage, options.targetLanguage),
      libreTranslate(summaryOriginal, originalLanguage, options.targetLanguage),
    ]);
    const state: NewsTranslationState = {
      ...originalState,
      title: translatedTitle || titleOriginal,
      summary: translatedSummary || summaryOriginal,
      isTranslated: Boolean(translatedTitle || translatedSummary),
      translationSource: translatedTitle || translatedSummary ? 'LibreTranslate' : 'original',
    };
    translationCache.set(cacheKey, state);
    return state;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[NewsTranslation] Translation failed', {
        targetLanguage: options.targetLanguage,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    translationCache.set(cacheKey, originalState);
    return originalState;
  }
}

export async function translateNewsItems<T extends TranslatableNewsItem>(
  items: T[],
  targetLanguage: AppNewsLanguage,
): Promise<Array<T & NewsTranslationState>> {
  const translated = await Promise.all(items.map(async item => {
    const title = item.titleOriginal || item.title || item.headline || '';
    const summary = item.summaryOriginal || item.summary || title;
    const state = await translateNewsText({
      cacheKey: item.url || item.id,
      title,
      summary,
      targetLanguage,
      languageOriginal: item.languageOriginal,
    });
    return {
      ...item,
      ...state,
      headline: state.title,
      summary: state.summary,
    };
  }));
  return translated;
}

export function isNewsTranslationEnabled() {
  return Boolean(providerUrl());
}
