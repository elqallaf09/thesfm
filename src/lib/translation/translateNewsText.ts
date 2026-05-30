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

const TRANSLATION_CACHE_TTL_MS = 5 * 60 * 1000;
const translationCache = new Map<string, { value: NewsTranslationState; timestamp: number }>();

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

function translateEndpoint() {
  const baseUrl = providerUrl();
  if (!baseUrl) return '';
  return /\/translate$/i.test(baseUrl) ? baseUrl : `${baseUrl}/translate`;
}

async function libreTranslate(text: string, source: string, target: AppNewsLanguage) {
  const endpoint = translateEndpoint();
  if (!endpoint || !text.trim()) return null;

  const apiKey = process.env.LIBRETRANSLATE_API_KEY?.trim();
  const body: Record<string, string> = {
    q: text,
    source: source === 'unknown' ? 'auto' : source,
    target,
    format: 'text',
  };
  if (apiKey) body.api_key = apiKey;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
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
  if (cached && Date.now() - cached.timestamp < TRANSLATION_CACHE_TTL_MS) return cached.value;

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
    translationCache.set(cacheKey, { value: originalState, timestamp: Date.now() });
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
    translationCache.set(cacheKey, { value: state, timestamp: Date.now() });
    return state;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[NewsTranslation] Translation failed', {
        targetLanguage: options.targetLanguage,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    translationCache.set(cacheKey, { value: originalState, timestamp: Date.now() });
    return originalState;
  }
}

export async function translateNewsItems<T extends TranslatableNewsItem>(
  items: T[],
  targetLanguage: AppNewsLanguage,
): Promise<Array<T & NewsTranslationState>> {
  const translated: Array<T & NewsTranslationState> = [];
  let nextIndex = 0;
  const concurrency = Math.min(4, items.length);

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const item = items[currentIndex];
      const title = item.titleOriginal || item.title || item.headline || '';
      const summary = item.summaryOriginal || item.summary || title;
      const state = await translateNewsText({
        cacheKey: item.url || item.id,
        title,
        summary,
        targetLanguage,
        languageOriginal: item.languageOriginal,
      });
      translated[currentIndex] = {
        ...item,
        ...state,
        headline: state.title,
        summary: state.summary,
      };
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return translated;
}

export function isNewsTranslationEnabled() {
  return Boolean(providerUrl());
}
