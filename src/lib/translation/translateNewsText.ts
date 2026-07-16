import 'server-only';
import { getSupabasePrivilegedConfig } from '@/lib/server/supabaseEnvironment';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AppNewsLanguage = 'ar' | 'en' | 'fr';

export type NewsTranslationState = {
  titleOriginal: string;
  summaryOriginal: string;
  languageOriginal: string;
  title: string;
  summary: string;
  translatedTo: AppNewsLanguage;
  isTranslated: boolean;
  translationSource: 'Anthropic' | 'OpenAI' | 'LibreTranslate' | 'MyMemory' | 'cache' | 'original';
};

type TranslatableNewsItem = {
  id: string;
  source: string;
  publishedAt: string;
  url?: string;
  headline?: string;
  summary?: string;
  titleOriginal?: string;
  summaryOriginal?: string;
  languageOriginal?: string;
  title?: string;
  translatedTo?: string;
  isTranslated?: boolean;
  translationSource?: string;
};

const TRANSLATION_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const translationCache = new Map<string, { value: NewsTranslationState; timestamp: number }>();
let supabaseAdmin: SupabaseClient | null | undefined;
let loggedMissingProvider = false;

const PROTECTED_TERMS = [
  'Apple', 'Microsoft', 'Nvidia', 'NVIDIA', 'AMD', 'Intel', 'Tesla', 'Meta', 'Google', 'Alphabet', 'Amazon', 'Oracle',
  'Broadcom', 'Qualcomm', 'Adobe', 'Salesforce', 'Netflix', 'Shopify', 'Uber', 'Palantir', 'Cloudflare', 'CrowdStrike',
  'AAPL', 'MSFT', 'NVDA', 'INTC', 'TSLA', 'META', 'GOOGL', 'GOOG', 'AMZN', 'ORCL', 'AVGO', 'QCOM', 'ADBE', 'CRM',
  'NFLX', 'SHOP', 'UBER', 'PLTR', 'NET', 'CRWD', 'PANW', 'FTNT', 'ASML', 'ARM', 'IBM', 'MarketWatch',
  'The Motley Fool', 'Yahoo Finance', 'Reuters', 'CNBC', 'Finnhub', 'Google News', 'The Verge',
];

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

function hasTranslationProvider() {
  return hasPremiumTranslationProvider() || process.env.NEWS_ENABLE_PUBLIC_TRANSLATION_FALLBACK === 'true';
}

function hasPremiumTranslationProvider() {
  return Boolean(
    process.env.ANTHROPIC_API_KEY?.trim()
    || process.env.AI_GATEWAY_TOKEN?.trim()
    || process.env.OPENAI_API_KEY?.trim()
    || providerUrl(),
  );
}

function getSupabaseAdmin() {
  if (supabaseAdmin !== undefined) return supabaseAdmin;
  const config = getSupabasePrivilegedConfig();
  supabaseAdmin = config
    ? createClient(config.url, config.secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  return supabaseAdmin;
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

function extractJsonObject(text: string) {
  const cleaned = text.replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return JSON.parse(cleaned.slice(start, end + 1)) as { title?: unknown; summary?: unknown };
}

function translationSystemPrompt(targetLanguage: AppNewsLanguage) {
  const targetName: Record<AppNewsLanguage, string> = {
    ar: 'Modern Standard Arabic',
    en: 'English',
    fr: 'French',
  };
  return [
    'You are a professional financial and technology news translator.',
    `Translate the supplied news title and summary into ${targetName[targetLanguage]}.`,
    'Keep company names, stock tickers, source names, URLs, currency symbols, numbers, percentages, and dates unchanged.',
    'Do not add facts, advice, commentary, labels, markdown, or placeholders.',
    'Use natural market/technology terminology, not literal broken translation.',
    'Return strict JSON only with string fields "title" and "summary".',
  ].join(' ');
}

async function translateWithAnthropic(title: string, summary: string, targetLanguage: AppNewsLanguage) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || process.env.AI_GATEWAY_TOKEN?.trim();
  if (!apiKey) return null;
  const isGateway = Boolean(process.env.AI_GATEWAY_TOKEN?.trim());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 24000);
  try {
    const response = await fetch(isGateway ? 'https://ai-gateway.vercel.sh/v1/anthropic/messages' : 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_NEWS_TRANSLATION_MODEL || process.env.ANTHROPIC_MARKET_MODEL || 'claude-3-5-haiku-latest',
        max_tokens: 700,
        temperature: 0,
        system: translationSystemPrompt(targetLanguage),
        messages: [{
          role: 'user',
          content: JSON.stringify({ targetLanguage, title, summary }),
        }],
      }),
    });
    if (!response.ok) throw new Error(`Anthropic returned ${response.status}`);
    const payload = await response.json();
    const text = payload?.content?.find?.((item: { type?: string; text?: string }) => item.type === 'text')?.text;
    const parsed = typeof text === 'string' ? extractJsonObject(text) : null;
    if (typeof parsed?.title !== 'string' || typeof parsed.summary !== 'string') return null;
    return { title: parsed.title.trim(), summary: parsed.summary.trim(), source: 'Anthropic' as const };
  } finally {
    clearTimeout(timeout);
  }
}

async function translateWithOpenAI(title: string, summary: string, targetLanguage: AppNewsLanguage) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 24000);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_NEWS_TRANSLATION_MODEL || process.env.OPENAI_RECEIPT_MODEL || 'gpt-4.1-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: translationSystemPrompt(targetLanguage) },
          { role: 'user', content: JSON.stringify({ targetLanguage, title, summary }) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    const parsed = typeof text === 'string' ? extractJsonObject(text) : null;
    if (typeof parsed?.title !== 'string' || typeof parsed.summary !== 'string') return null;
    return { title: parsed.title.trim(), summary: parsed.summary.trim(), source: 'OpenAI' as const };
  } finally {
    clearTimeout(timeout);
  }
}

function protectText(text: string) {
  const replacements: Array<{ token: string; value: string }> = [];
  let protectedText = text;
  for (const term of PROTECTED_TERMS.sort((a, b) => b.length - a.length)) {
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=$|[^\\p{L}\\p{N}])`, 'gu');
    protectedText = protectedText.replace(pattern, (match, prefix: string, value: string) => {
      const token = `SFMTERM${replacements.length}TOKEN`;
      replacements.push({ token, value });
      return `${prefix}${token}`;
    });
  }
  return { protectedText, replacements };
}

function restoreText(text: string, replacements: Array<{ token: string; value: string }>) {
  return replacements.reduce((current, item) => current.replace(new RegExp(item.token, 'g'), item.value), text);
}

async function translateWithLibre(title: string, summary: string, originalLanguage: string, targetLanguage: AppNewsLanguage) {
  if (!providerUrl()) return null;
  const titleProtected = protectText(title);
  const summaryProtected = protectText(summary);
  const [translatedTitle, translatedSummary] = await Promise.all([
    libreTranslate(titleProtected.protectedText, originalLanguage, targetLanguage),
    libreTranslate(summaryProtected.protectedText, originalLanguage, targetLanguage),
  ]);
  if (!translatedTitle && !translatedSummary) return null;
  return {
    title: translatedTitle ? restoreText(translatedTitle, titleProtected.replacements) : title,
    summary: translatedSummary ? restoreText(translatedSummary, summaryProtected.replacements) : summary,
    source: 'LibreTranslate' as const,
  };
}

async function translateWithMyMemory(title: string, summary: string, originalLanguage: string, targetLanguage: AppNewsLanguage) {
  const sourceLanguage = ['ar', 'en', 'fr'].includes(originalLanguage) ? originalLanguage : 'en';
  const langpair = `${sourceLanguage}|${targetLanguage}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    async function fetchOne(text: string): Promise<string | null> {
      if (!text.trim()) return null;
      const url = new URL('https://api.mymemory.translated.net/get');
      url.searchParams.set('q', text.slice(0, 500));
      url.searchParams.set('langpair', langpair);
      // Adding email increases rate limit from 1k to 50k/day
      const memEmail = process.env.MYMEMORY_EMAIL?.trim();
      if (memEmail) url.searchParams.set('de', memEmail);
      const r = await fetch(url.toString(), { signal: controller.signal });
      if (!r.ok) return null;
      const json = await r.json().catch(() => null) as { responseData?: { translatedText?: string }; responseStatus?: number } | null;
      if (json?.responseStatus !== 200 || !json?.responseData?.translatedText) return null;
      const translated = json.responseData.translatedText.trim();
      // MyMemory returns "PLEASE SELECT TWO DISTINCT LANGUAGES" on same-lang requests
      if (translated.toUpperCase().startsWith('PLEASE SELECT')) return null;
      return translated;
    }
    const [translatedTitle, translatedSummary] = await Promise.all([fetchOne(title), fetchOne(summary)]);
    if (!translatedTitle && !translatedSummary) return null;
    return { title: translatedTitle || title, summary: translatedSummary || summary, source: 'MyMemory' as const };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function isUsableTranslation<T extends { title: string; summary: string; source: string }>(
  value: T | null,
  originalTitle: string,
  originalSummary: string,
): value is T {
  if (!value?.title.trim() || !value.summary.trim()) return false;
  return value.title.trim() !== originalTitle.trim() || value.summary.trim() !== originalSummary.trim();
}

async function readPersistentCache(cacheKey: string, targetLanguage: AppNewsLanguage) {
  const db = getSupabaseAdmin();
  if (!db) return null;
  try {
    const { data, error } = await db
      .from('news_translations')
      .select('original_title,original_summary,translated_title,translated_summary,updated_at')
      .eq('news_url', cacheKey)
      .eq('language', targetLanguage)
      .maybeSingle();
    if (error || !data) return null;
    const updatedAt = new Date(String(data.updated_at ?? '')).getTime();
    if (!Number.isFinite(updatedAt) || Date.now() - updatedAt > TRANSLATION_CACHE_TTL_MS) return null;
    return {
      titleOriginal: String(data.original_title ?? ''),
      summaryOriginal: String(data.original_summary ?? ''),
      languageOriginal: 'en',
      title: String(data.translated_title ?? ''),
      summary: String(data.translated_summary ?? ''),
      translatedTo: targetLanguage,
      isTranslated: true,
      translationSource: 'cache' as const,
    } satisfies NewsTranslationState;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[NewsTranslation] Persistent cache read failed', { reason: error instanceof Error ? error.message : String(error) });
    }
    return null;
  }
}

async function writePersistentCache(options: {
  cacheKey: string;
  source?: string;
  titleOriginal: string;
  summaryOriginal: string;
  targetLanguage: AppNewsLanguage;
  translatedTitle: string;
  translatedSummary: string;
}) {
  const db = getSupabaseAdmin();
  if (!db) return;
  try {
    await db.from('news_translations').upsert({
      news_url: options.cacheKey,
      source: options.source ?? null,
      original_title: options.titleOriginal,
      original_summary: options.summaryOriginal,
      language: options.targetLanguage,
      translated_title: options.translatedTitle,
      translated_summary: options.translatedSummary,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'news_url,language' });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[NewsTranslation] Persistent cache write failed', { reason: error instanceof Error ? error.message : String(error) });
    }
  }
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

  if (originalLanguage === options.targetLanguage) {
    translationCache.set(cacheKey, { value: originalState, timestamp: Date.now() });
    return originalState;
  }

  if (!hasTranslationProvider()) {
    if (process.env.NODE_ENV !== 'production' && !loggedMissingProvider) {
      loggedMissingProvider = true;
      console.warn('[NewsTranslation] Translation unavailable, showing original content');
    }
    translationCache.set(cacheKey, { value: originalState, timestamp: Date.now() });
    return originalState;
  }

  const persistentCached = await readPersistentCache(options.cacheKey, options.targetLanguage);
  if (persistentCached) {
    const state = {
      ...persistentCached,
      titleOriginal,
      summaryOriginal,
      languageOriginal: originalLanguage,
    };
    translationCache.set(cacheKey, { value: state, timestamp: Date.now() });
    return state;
  }

  try {
    const translated = await translateWithAnthropic(titleOriginal, summaryOriginal, options.targetLanguage)
      ?? await translateWithOpenAI(titleOriginal, summaryOriginal, options.targetLanguage)
      ?? await translateWithLibre(titleOriginal, summaryOriginal, originalLanguage, options.targetLanguage)
      ?? (process.env.NEWS_ENABLE_PUBLIC_TRANSLATION_FALLBACK === 'true'
        ? await translateWithMyMemory(titleOriginal, summaryOriginal, originalLanguage, options.targetLanguage)
        : null);
    if (!isUsableTranslation(translated, titleOriginal, summaryOriginal)) {
      translationCache.set(cacheKey, { value: originalState, timestamp: Date.now() });
      return originalState;
    }
    const state: NewsTranslationState = {
      ...originalState,
      title: translated.title,
      summary: translated.summary,
      isTranslated: true,
      translationSource: translated.source,
    };
    translationCache.set(cacheKey, { value: state, timestamp: Date.now() });
    await writePersistentCache({
      cacheKey: options.cacheKey,
      titleOriginal,
      summaryOriginal,
      targetLanguage: options.targetLanguage,
      translatedTitle: state.title,
      translatedSummary: state.summary,
    });
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

// Max articles translated per API call — keeps Vercel function well under timeout.
// Articles beyond this limit are returned in their original language and can be
// translated lazily by subsequent requests once they land in persistent cache.
const TRANSLATE_LIMIT = 16;

export async function translateNewsItems<T extends TranslatableNewsItem>(
  items: T[],
  targetLanguage: AppNewsLanguage,
): Promise<Array<T & NewsTranslationState>> {
  const translated: Array<T & NewsTranslationState> = [];

  // Pass-through helper: wraps an item with an originalState so it always
  // matches the return type even when we skip translation.
  function passThrough(item: T, index: number): void {
    const title = item.titleOriginal || item.title || item.headline || '';
    const summary = item.summaryOriginal || item.summary || title;
    const originalLanguage = item.languageOriginal || detectLanguage(`${title} ${summary}`);
    translated[index] = {
      ...item,
      titleOriginal: title,
      summaryOriginal: summary,
      languageOriginal: originalLanguage,
      title,
      summary,
      translatedTo: targetLanguage,
      isTranslated: false,
      translationSource: 'original',
      headline: title,
    };
  }

  // Separate items: eagerly translate the first TRANSLATE_LIMIT, skip the rest
  const eager = items.slice(0, TRANSLATE_LIMIT);
  const deferred = items.slice(TRANSLATE_LIMIT);

  // Pre-fill deferred items immediately (no API call needed)
  deferred.forEach((item, i) => passThrough(item, TRANSLATE_LIMIT + i));

  // Translate eager items with higher concurrency (6) for speed
  let nextIndex = 0;
  const concurrency = Math.min(6, eager.length);

  async function worker() {
    while (nextIndex < eager.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const item = eager[currentIndex];
      const title = item.titleOriginal || item.title || item.headline || '';
      const summary = item.summaryOriginal || item.summary || title;
      try {
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
      } catch {
        // On any error fall back to original text
        passThrough(item, currentIndex);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return translated;
}

export function isNewsTranslationEnabled() {
  return hasTranslationProvider();
}
