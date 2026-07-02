import { messageCodeForStatus } from '@/lib/providers/shared';
import {
  createMarketFeatureDiagnostic,
  normalizeProviderApiStatus,
  type MarketFeatureDiagnosticStatus,
  type MarketFeatureKey,
} from '@/lib/market/featureDiagnostics';
import type {
  TraderCalendarDataMap,
  TraderCalendarFeature,
  TraderProviderResult,
} from '@/lib/trader/providers/types';

const FEATURE_KEYS: Record<TraderCalendarFeature, MarketFeatureKey> = {
  earnings: 'earnings',
  dividends: 'dividends',
  ipos: 'ipos',
  economic: 'economic_calendar',
};

const EMPTY_MESSAGES_AR: Record<TraderCalendarFeature, string> = {
  earnings: 'لا توجد أرباح ضمن الفترة المحددة',
  dividends: 'لا توجد توزيعات ضمن الفترة المحددة',
  ipos: 'لا توجد اكتتابات ضمن الفترة المحددة',
  economic: 'لا توجد بيانات ضمن الفترة المحددة',
};

const STATUS_MESSAGES_AR: Record<MarketFeatureDiagnosticStatus, string> = {
  available: 'البيانات متاحة لهذه الميزة',
  empty: 'لا توجد بيانات ضمن الفترة المحددة',
  rate_limited: 'تم الوصول إلى حد استخدام مزود البيانات مؤقتاً',
  unauthorized: 'هذه البيانات غير متاحة في الخطة الحالية لمزود البيانات',
  not_configured: 'لم يتم تفعيل مزود البيانات لهذه الميزة',
  provider_error: 'تعذر تحميل البيانات من مزود هذه الميزة',
};

function providerLabel(provider: string | null) {
  if (provider === 'fmp') return 'FMP';
  if (provider === 'finnhub') return 'Finnhub';
  if (provider === 'tradingeconomics') return 'Trading Economics';
  return provider ?? 'unknown';
}

function calendarStatus(
  result: TraderProviderResult<unknown>,
  count: number,
): MarketFeatureDiagnosticStatus {
  if (result.status === 'success') return count > 0 ? 'available' : 'empty';
  if (result.status === 'not_entitled' || result.status === 'forbidden') return 'unauthorized';
  return normalizeProviderApiStatus(result.status);
}

function messageForStatus(feature: TraderCalendarFeature, status: MarketFeatureDiagnosticStatus) {
  return status === 'empty' ? EMPTY_MESSAGES_AR[feature] : STATUS_MESSAGES_AR[status];
}

export function createTraderCalendarRoutePayload<K extends TraderCalendarFeature>(
  feature: K,
  result: TraderProviderResult<TraderCalendarDataMap[K]>,
) {
  const items = Array.isArray(result.data) ? result.data : [];
  const count = result.resultCount ?? items.length;
  const status = calendarStatus(result as TraderProviderResult<unknown>, count);
  const diagnostic = createMarketFeatureDiagnostic({
    feature: FEATURE_KEYS[feature],
    provider: providerLabel(result.provider),
    status,
    data: items,
    count,
    message: messageForStatus(feature, status),
    lastUpdated: result.lastUpdated ?? result.lastSuccessfulUpdate,
  });
  const code = result.messageCode ?? (status === 'empty'
    ? `${feature}_calendar_no_events`
    : messageCodeForStatus(result.status));

  return {
    ...diagnostic,
    feature,
    featureKey: FEATURE_KEYS[feature],
    provider: result.provider ? providerLabel(result.provider) : diagnostic.provider,
    providerId: result.provider,
    providerLabel: providerLabel(result.provider),
    providerStatus: status,
    source: result.provider,
    items,
    data: items,
    events: items,
    count,
    resultCount: count,
    cached: result.cached,
    stale: result.stale,
    range: result.range,
    lastUpdated: diagnostic.lastUpdated,
    lastSuccessfulUpdate: result.lastSuccessfulUpdate,
    updated_at: result.lastSuccessfulUpdate ?? diagnostic.lastUpdated,
    messageCode: code,
    code,
    failureReason: result.failureReason,
    providerStatusCode: result.providerStatusCode,
    supportedFeatures: result.supportedFeatures,
    legacyStatus: result.status,
    success: diagnostic.ok,
  };
}
