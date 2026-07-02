export type MarketFeatureDiagnosticStatus =
  | 'available'
  | 'empty'
  | 'rate_limited'
  | 'unauthorized'
  | 'not_configured'
  | 'provider_error';

export type MarketFeatureKey =
  | 'earnings'
  | 'dividends'
  | 'ipos'
  | 'economic_calendar'
  | 'market_news'
  | 'company_profiles'
  | 'symbols'
  | 'prices'
  | 'technical_analysis'
  | string;

export type MarketFeatureDiagnostic<T = unknown> = {
  ok: boolean;
  provider: string;
  feature: MarketFeatureKey;
  status: MarketFeatureDiagnosticStatus;
  data: T[];
  count: number;
  message: string;
  lastUpdated: string;
};

type MarketFeatureDiagnosticInput<T = unknown> = {
  feature: MarketFeatureKey;
  provider?: string | null;
  providerStatus?: string | null;
  status?: string | null;
  data?: T[] | null;
  count?: number | null;
  message?: string | null;
  lastUpdated?: string | null;
};

const STATUS_MESSAGES_AR: Record<MarketFeatureDiagnosticStatus, string> = {
  available: 'البيانات متاحة لهذه الميزة',
  empty: 'لا توجد بيانات ضمن الفترة المحددة',
  rate_limited: 'تم الوصول إلى حد استخدام مزود البيانات مؤقتاً',
  unauthorized: 'هذه البيانات غير متاحة في الخطة الحالية لمزود البيانات',
  not_configured: 'لم يتم تفعيل مزود البيانات لهذه الميزة',
  provider_error: 'تعذر تحميل البيانات من مزود هذه الميزة',
};

function hasArabicText(value: string | null | undefined) {
  return /[\u0600-\u06FF]/.test(String(value ?? ''));
}

export function normalizeProviderApiStatus(input?: string | null): MarketFeatureDiagnosticStatus {
  const status = String(input ?? '').trim().toLowerCase();
  if (!status) return 'provider_error';
  if (['available', 'success', 'connected', 'healthy', 'configured'].includes(status)) return 'available';
  if (['empty', 'no_data', 'no_results', 'not_found'].includes(status)) return 'empty';
  if (['rate_limited', 'provider_rate_limited', 'http_429', '429', 'limit', 'limited'].includes(status)) return 'rate_limited';
  if ([
    'unauthorized',
    'forbidden',
    'not_entitled',
    'access_denied',
    'permission_denied',
    '401',
    '403',
  ].includes(status)) return 'unauthorized';
  if (['not_configured', 'missing', 'missing_provider', 'missing_api_key', 'provider_not_configured'].includes(status)) return 'not_configured';
  return 'provider_error';
}

export function createMarketFeatureDiagnostic<T = unknown>(
  input: MarketFeatureDiagnosticInput<T>,
): MarketFeatureDiagnostic<T> & {
  success: boolean;
  providerStatus: MarketFeatureDiagnosticStatus;
  resultCount: number;
  total: number;
  dataQuality: 'available' | 'unavailable';
  providerMessage: string;
  updatedAt: string;
  generatedAt: string;
  diagnostics: {
    feature: MarketFeatureKey;
    provider: string;
    status: MarketFeatureDiagnosticStatus;
    count: number;
    message: string;
    lastUpdated: string;
  };
} {
  const data = Array.isArray(input.data) ? input.data : [];
  const count = Number.isFinite(Number(input.count)) ? Number(input.count) : data.length;
  const requestedStatus = normalizeProviderApiStatus(input.status ?? input.providerStatus);
  const status = requestedStatus === 'available' && count <= 0 ? 'empty' : requestedStatus;
  const ok = status === 'available' && count > 0;
  const generatedAt = new Date().toISOString();
  const lastUpdated = input.lastUpdated || generatedAt;
  const message = hasArabicText(input.message)
    ? String(input.message)
    : STATUS_MESSAGES_AR[status];
  const provider = String(input.provider ?? '').trim() || 'unknown';

  return {
    ok,
    success: ok,
    provider,
    feature: input.feature,
    status,
    providerStatus: status,
    data,
    count,
    resultCount: count,
    total: count,
    dataQuality: ok ? 'available' : 'unavailable',
    message,
    providerMessage: message,
    lastUpdated,
    updatedAt: lastUpdated,
    generatedAt,
    diagnostics: {
      feature: input.feature,
      provider,
      status,
      count,
      message,
      lastUpdated,
    },
  };
}
