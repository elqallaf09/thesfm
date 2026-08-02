import { NextResponse } from 'next/server';
import type { SentimentAssetType } from '@/lib/market/sentimentRequest';

export type UnifiedSentimentProvider = 'news' | 'myfxbook' | 'none';
export type SentimentLabel = 'bullish' | 'bearish' | 'neutral' | 'unavailable';
export type UnifiedSentimentCode =
  | 'UNSUPPORTED_ASSET_TYPE'
  | 'NO_DATA'
  | 'NO_SENTIMENT_DATA'
  | 'PROVIDER_DOWN'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'HTML_RESPONSE'
  | 'CLOUDFLARE_BLOCKED'
  | 'MISSING_CREDENTIALS'
  | 'LOGIN_FAILED'
  | 'LOGIN_REJECTED'
  | 'INVALID_SESSION'
  | 'NO_SESSION'
  | 'INVALID_FOREX_PAIR'
  | 'MISSING_PROVIDER'
  | 'SYMBOL_REQUIRED';

const cacheHeaders = {
  'Cache-Control': 'private, no-store',
};

export function sentimentLabel(buyPercent: number | null, sellPercent: number | null): SentimentLabel {
  if (buyPercent === null || sellPercent === null) return 'unavailable';
  if (Math.abs(buyPercent - sellPercent) < 5) return 'neutral';
  return buyPercent > sellPercent ? 'bullish' : 'bearish';
}

function sentimentMessage(code: UnifiedSentimentCode) {
  if (code === 'CLOUDFLARE_BLOCKED') return 'مزود Myfxbook رفض الاتصال من الخادم. قد يكون بسبب حماية Cloudflare أو قيود الحساب المجاني.';
  if (code === 'HTML_RESPONSE') return 'أعاد Myfxbook صفحة HTML بدلاً من JSON. قد يكون الطلب مرفوضاً من بيئة الخادم أو يحتاج إعدادات اتصال مختلفة.';
  if (code === 'MISSING_PROVIDER' || code === 'UNSUPPORTED_ASSET_TYPE') return 'لا يوجد مزود مشاعر موثوق مربوط حالياً لهذا النوع من الأصول.';
  if (code === 'SYMBOL_REQUIRED') return 'اختر أصلاً قبل تحميل مشاعر السوق.';
  if (code === 'MISSING_CREDENTIALS') return 'إعدادات مزود المشاعر غير مكتملة. يرجى إضافة بيانات Myfxbook في Environment Variables ثم إعادة النشر.';
  if (code === 'LOGIN_REJECTED' || code === 'LOGIN_FAILED') return 'تم تأكيد أن بيانات الدخول تعمل من المتصفح، لكن Myfxbook رفض طلب الخادم. تحقق من إعدادات Vercel أو قيود الاتصال من المزود.';
  if (code === 'RATE_LIMIT') return 'تم تجاوز حد طلبات مزود المشاعر مؤقتاً. يرجى المحاولة لاحقاً.';
  if (code === 'TIMEOUT') return 'مزود Myfxbook بطيء حالياً أو لا يستجيب. حاول لاحقاً.';
  if (code === 'INVALID_SESSION') return 'تم تسجيل الدخول إلى Myfxbook بنجاح، لكن تعذر جلب بيانات المشاعر. يرجى فحص طلب بيانات Community Outlook.';
  if (code === 'NO_SESSION') return 'لم يتم استلام جلسة صالحة من Myfxbook. يرجى التحقق من الحساب وإعدادات المزود.';
  if (code === 'PROVIDER_DOWN') return 'تعذر الاتصال بمزود المشاعر حالياً. يرجى المحاولة لاحقاً.';
  return 'لا تتوفر بيانات مشاعر لهذا الأصل من Myfxbook.';
}

function extractNumber(item: Record<string, unknown>, keys: string[], percent = false) {
  for (const key of keys) {
    const value = item[key];
    if (value === null || value === undefined || String(value).trim() === '') continue;
    const normalized = String(value).replace(percent ? '%' : /,/g, '').trim();
    const parsed = typeof value === 'number' ? value : Number(normalized);
    if (Number.isFinite(parsed)) return percent ? Math.max(0, Math.min(100, parsed)) : parsed;
  }
  return null;
}

function primarySentimentValues(items: Array<Record<string, unknown>>) {
  const first = items[0] ?? {};
  return {
    buyPercent: extractNumber(first, ['buyPercent', 'buyPercentage', 'buy', 'longPercentage'], true),
    sellPercent: extractNumber(first, ['sellPercent', 'sellPercentage', 'sell', 'shortPercentage'], true),
  };
}

function primaryLongShortValues(items: Array<Record<string, unknown>>) {
  const first = items[0] ?? {};
  const longPositions = extractNumber(first, ['longPositions', 'buyPositions', 'longPositionCount', 'buyPositionCount']);
  const shortPositions = extractNumber(first, ['shortPositions', 'sellPositions', 'shortPositionCount', 'sellPositionCount']);
  return {
    longPercent: extractNumber(first, ['longPercent', 'longPercentage', 'buyPercent', 'buyPercentage', 'buy'], true),
    shortPercent: extractNumber(first, ['shortPercent', 'shortPercentage', 'sellPercent', 'sellPercentage', 'sell'], true),
    longVolume: extractNumber(first, ['longVolume', 'longLots', 'buyVolume', 'buyLots']),
    shortVolume: extractNumber(first, ['shortVolume', 'shortLots', 'sellVolume', 'sellLots']),
    positions: extractNumber(first, ['positions', 'totalPositions', 'positionCount', 'positionsCount'])
      ?? (longPositions !== null || shortPositions !== null ? (longPositions ?? 0) + (shortPositions ?? 0) : null),
  };
}

export function maskProviderMessage(message: string | null | undefined) {
  if (!message) return null;
  return message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
}

export function unavailableSentimentResponse(input: {
  code: UnifiedSentimentCode;
  symbol: string;
  assetType: SentimentAssetType;
  provider?: UnifiedSentimentProvider;
  legacyCode?: string;
  message?: string;
  providerMessage?: string | null;
  providerStatus?: 'connected' | 'limited' | 'unavailable' | 'needs_setup' | 'timeout';
  cacheStatus?: 'fresh' | 'stale' | 'miss';
  lastCheckedAt?: string | null;
  diagnostics?: Record<string, unknown>;
  suggestions?: string[];
}) {
  const provider = input.provider ?? 'none';
  const responseAssetType = input.assetType === 'metals' ? 'metal' : input.assetType;
  const providerStatus = input.providerStatus
    ?? (input.code === 'MISSING_CREDENTIALS'
      ? 'needs_setup'
      : input.code === 'RATE_LIMIT'
        ? 'limited'
        : input.code === 'TIMEOUT'
          ? 'timeout'
          : 'unavailable');
  const lastCheckedAt = input.lastCheckedAt ?? new Date().toISOString();
  const diagnostics = input.diagnostics ?? null;
  const communityOutlookStatus = typeof diagnostics?.communityOutlookStatus === 'string'
    ? diagnostics.communityOutlookStatus
    : typeof diagnostics?.sentimentStatus === 'string'
      ? diagnostics.sentimentStatus
      : provider === 'myfxbook'
        ? (input.code === 'INVALID_SESSION' ? 'invalid_session_retry_failed' : 'provider_error')
        : null;
  const providerMessage = input.code === 'INVALID_SESSION' ? null : maskProviderMessage(input.providerMessage);

  return NextResponse.json({
    ok: false,
    success: false,
    code: input.code,
    legacyCode: input.legacyCode ?? null,
    symbol: input.symbol,
    assetType: responseAssetType,
    resolvedAssetType: input.assetType,
    assetClass: responseAssetType,
    provider,
    source: provider === 'myfxbook' ? 'Myfxbook' : provider === 'news' ? 'News Sentiment' : null,
    sentimentType: provider === 'myfxbook' ? 'long_short' : provider === 'news' ? 'news' : null,
    sentimentAvailable: false,
    longPercent: null,
    shortPercent: null,
    longVolume: null,
    shortVolume: null,
    positions: null,
    buyPercent: null,
    sellPercent: null,
    sentimentLabel: 'unavailable' as SentimentLabel,
    message: input.message ?? sentimentMessage(input.code),
    providerMessage,
    providerStatus,
    cacheStatus: input.cacheStatus ?? 'miss',
    cached: false,
    stale: false,
    diagnostics,
    loginStatus: typeof diagnostics?.loginStatus === 'string' ? diagnostics.loginStatus : null,
    sessionReceived: typeof diagnostics?.sessionReceived === 'boolean' ? diagnostics.sessionReceived : false,
    sessionUsed: typeof diagnostics?.sessionUsed === 'boolean' ? diagnostics.sessionUsed : false,
    sentimentStatus: communityOutlookStatus,
    communityOutlookStatus,
    diagnosticSource: typeof diagnostics?.source === 'string' ? diagnostics.source : null,
    suggestions: input.suggestions ?? [],
    items: [],
    updatedAt: null,
    updated_at: null,
    lastCheckedAt,
    checkedAt: lastCheckedAt,
  }, { status: 200, headers: cacheHeaders });
}

export function availableSentimentResponse(input: {
  symbol: string;
  assetType: SentimentAssetType;
  provider: Exclude<UnifiedSentimentProvider, 'none'>;
  source: string;
  items: Array<Record<string, unknown>>;
  updatedAt: string | null;
  message?: string | null;
  providerStatus?: 'connected' | 'limited' | 'unavailable' | 'timeout';
  cacheStatus?: 'fresh' | 'stale';
  lastCheckedAt?: string | null;
  diagnostics?: Record<string, unknown>;
}) {
  const { buyPercent, sellPercent } = primarySentimentValues(input.items);
  const { longPercent, shortPercent, longVolume, shortVolume, positions } = primaryLongShortValues(input.items);
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const lastCheckedAt = input.lastCheckedAt ?? updatedAt;
  const responseAssetType = input.assetType === 'metals' ? 'metal' : input.assetType;
  const diagnostics = input.diagnostics ?? null;
  const communityOutlookStatus = typeof diagnostics?.communityOutlookStatus === 'string'
    ? diagnostics.communityOutlookStatus
    : typeof diagnostics?.sentimentStatus === 'string'
      ? diagnostics.sentimentStatus
      : 'success';

  return NextResponse.json({
    ok: true,
    success: true,
    code: null,
    symbol: input.symbol,
    assetType: responseAssetType,
    resolvedAssetType: input.assetType,
    assetClass: responseAssetType,
    provider: input.provider,
    source: input.source,
    sentimentType: input.provider === 'myfxbook' ? 'long_short' : 'news',
    sentimentAvailable: true,
    longPercent,
    shortPercent,
    longVolume,
    shortVolume,
    positions,
    buyPercent,
    sellPercent,
    sentimentLabel: sentimentLabel(buyPercent, sellPercent),
    message: input.message ?? '',
    providerStatus: input.providerStatus ?? 'connected',
    cacheStatus: input.cacheStatus ?? 'fresh',
    cached: input.cacheStatus === 'fresh',
    stale: input.cacheStatus === 'stale',
    diagnostics,
    loginStatus: typeof diagnostics?.loginStatus === 'string' ? diagnostics.loginStatus : null,
    sessionReceived: typeof diagnostics?.sessionReceived === 'boolean' ? diagnostics.sessionReceived : input.provider === 'myfxbook',
    sessionUsed: typeof diagnostics?.sessionUsed === 'boolean' ? diagnostics.sessionUsed : input.provider === 'myfxbook',
    sentimentStatus: communityOutlookStatus,
    communityOutlookStatus,
    diagnosticSource: typeof diagnostics?.source === 'string' ? diagnostics.source : null,
    items: input.items,
    updatedAt,
    updated_at: updatedAt,
    lastCheckedAt,
    checkedAt: lastCheckedAt,
  }, { status: 200, headers: cacheHeaders });
}

