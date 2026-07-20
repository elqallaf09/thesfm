import type { AnalysisResult } from '@/domain/intelligence/contracts';

export const INTELLIGENCE_EXPERIENCE_STATES = [
  'unauthenticated',
  'unauthorized',
  'no_saved_analysis',
  'unsupported_asset',
  'invalid_symbol',
  'insufficient_market_data',
  'stale_data',
  'provider_unavailable',
  'provider_rate_limited',
  'application_rate_limited',
  'database_error',
  'analysis_generation_failed',
  'network_error',
  'successful_empty_history',
  'success',
] as const;

export type IntelligenceExperienceState = (typeof INTELLIGENCE_EXPERIENCE_STATES)[number];
export type IntelligencePresentationLocale = 'ar' | 'en';

export type IntelligenceStatePresentation = {
  code: IntelligenceExperienceState;
  title: string;
  description: string;
  action: string;
};

const COPY: Record<IntelligencePresentationLocale, Record<IntelligenceExperienceState, Omit<IntelligenceStatePresentation, 'code'>>> = {
  ar: {
    unauthenticated: { title: 'تسجيل الدخول مطلوب', description: 'سجّل الدخول للوصول إلى هذا السجل أو لطلب تحديث جديد.', action: 'سجّل الدخول' },
    unauthorized: { title: 'لا تملك صلاحية الوصول', description: 'لا تملك صلاحية استخدام هذا الإجراء للحساب الحالي.', action: 'العودة إلى التحليل' },
    no_saved_analysis: { title: 'لا توجد قراءة محفوظة بعد', description: 'سنطلب تحليلاً جديداً من البيانات المتاحة إذا كان الأصل مدعوماً.', action: 'إنشاء تحليل' },
    unsupported_asset: { title: 'الأصل غير مدعوم', description: 'اختر أصلاً أو سوقاً يدعمه مزود بيانات التحليل.', action: 'اختيار أصل آخر' },
    invalid_symbol: { title: 'رمز الأصل غير صالح', description: 'تحقق من الرمز ونوع الأصل ثم حاول مرة أخرى.', action: 'تعديل الرمز' },
    insufficient_market_data: { title: 'بيانات السوق غير كافية', description: 'لا يمكن إصدار توصية حتى تتوفر بيانات حديثة وكافية من المصدر.', action: 'المحاولة لاحقاً' },
    stale_data: { title: 'البيانات قديمة', description: 'لا يمكن إصدار توصية من بيانات تجاوزت حد الحداثة المعتمد.', action: 'تحديث التحليل' },
    provider_unavailable: { title: 'مزود البيانات غير متاح', description: 'تعذر الحصول على بيانات سوق موثقة؛ لم تُنشأ أي قيم بديلة.', action: 'إعادة المحاولة' },
    provider_rate_limited: { title: 'حد مزود البيانات مؤقتاً', description: 'أوقف مزود البيانات الطلبات مؤقتاً. حاول بعد انتهاء المهلة.', action: 'إعادة المحاولة لاحقاً' },
    application_rate_limited: { title: 'تم بلوغ حد التحديث', description: 'حاول مجدداً بعد انتهاء مهلة الحماية المعروضة.', action: 'انتظار المهلة' },
    database_error: { title: 'تعذر الوصول إلى سجل التحليل', description: 'لم تُعرض بيانات بديلة. أعد المحاولة للتحقق من الاتصال بالسجل.', action: 'إعادة تحميل السجل' },
    analysis_generation_failed: { title: 'تعذر إنشاء التحليل', description: 'لم يكتمل التحليل ولم تُحفظ نتيجة جديدة.', action: 'إعادة المحاولة' },
    network_error: { title: 'تعذر الاتصال بالخدمة', description: 'تحقق من الاتصال ثم أعد المحاولة.', action: 'إعادة المحاولة' },
    successful_empty_history: { title: 'لا يوجد سجل بعد', description: 'لم تُنشأ تحليلات محفوظة لهذا الأصل والأفق في حسابك بعد.', action: 'فتح التحليل' },
    success: { title: 'التحليل متاح', description: 'تم تحميل تحليل يستند إلى بيانات المصدر المتاحة.', action: 'تحديث العرض' },
  },
  en: {
    unauthenticated: { title: 'Sign-in required', description: 'Sign in to access this history or request a fresh refresh.', action: 'Sign in' },
    unauthorized: { title: 'You are not authorized', description: 'This action is not available to the current account.', action: 'Return to analysis' },
    no_saved_analysis: { title: 'No saved reading yet', description: 'A new analysis will be requested from available data when the asset is supported.', action: 'Create analysis' },
    unsupported_asset: { title: 'Unsupported asset', description: 'Choose an asset or market supported by the analysis data provider.', action: 'Choose another asset' },
    invalid_symbol: { title: 'Invalid asset symbol', description: 'Check the symbol and asset type, then try again.', action: 'Edit symbol' },
    insufficient_market_data: { title: 'Insufficient market data', description: 'A recommendation cannot be issued until fresh, sufficient source data is available.', action: 'Try later' },
    stale_data: { title: 'Data is stale', description: 'A recommendation cannot be issued from data beyond the approved freshness limit.', action: 'Refresh analysis' },
    provider_unavailable: { title: 'Data provider unavailable', description: 'Verified market data could not be obtained; no replacement values were created.', action: 'Retry' },
    provider_rate_limited: { title: 'Data provider is rate limited', description: 'The provider has temporarily stopped requests. Retry after the stated delay.', action: 'Retry later' },
    application_rate_limited: { title: 'Refresh limit reached', description: 'Try again after the displayed protection window.', action: 'Wait for retry' },
    database_error: { title: 'Analysis history could not be reached', description: 'No fallback history was shown. Retry to check the history connection.', action: 'Reload history' },
    analysis_generation_failed: { title: 'Analysis could not be generated', description: 'The analysis did not complete and no new result was saved.', action: 'Retry' },
    network_error: { title: 'Service connection failed', description: 'Check your connection and try again.', action: 'Retry' },
    successful_empty_history: { title: 'No history yet', description: 'No saved analyses exist for this asset and horizon in your account.', action: 'Open analysis' },
    success: { title: 'Analysis available', description: 'An analysis based on available source data was loaded.', action: 'Refresh view' },
  },
};

export function intelligencePresentation(
  state: IntelligenceExperienceState,
  locale: IntelligencePresentationLocale,
): IntelligenceStatePresentation {
  return { code: state, ...COPY[locale][state] };
}

export function intelligenceStateFromError(input: { code?: string | null; status?: number | null }): IntelligenceExperienceState {
  if (input.status === 401 || input.code === 'UNAUTHENTICATED') return 'unauthenticated';
  if (input.status === 403 || input.code === 'UNAUTHORIZED' || input.code === 'FORCE_REFRESH_FORBIDDEN') return 'unauthorized';
  if (input.status === 429 || input.code === 'APPLICATION_RATE_LIMITED' || input.code === 'RATE_LIMITED') return 'application_rate_limited';
  switch (input.code) {
    case 'NO_SAVED_ANALYSIS':
    case 'ANALYSIS_NOT_FOUND': return 'no_saved_analysis';
    case 'UNSUPPORTED_ASSET': return 'unsupported_asset';
    case 'INVALID_ASSET':
    case 'INVALID_SYMBOL':
    case 'INVALID_REQUEST': return 'invalid_symbol';
    case 'INSUFFICIENT_MARKET_DATA': return 'insufficient_market_data';
    case 'STALE_DATA': return 'stale_data';
    case 'PROVIDER_RATE_LIMITED': return 'provider_rate_limited';
    case 'PROVIDER_TIMEOUT':
    case 'PROVIDER_UNAVAILABLE': return 'provider_unavailable';
    case 'DATABASE_ERROR':
    case 'PERSISTENCE_UNAVAILABLE': return 'database_error';
    case 'ANALYSIS_GENERATION_FAILED': return 'analysis_generation_failed';
    case 'NETWORK_ERROR': return 'network_error';
    default: return 'analysis_generation_failed';
  }
}

export function intelligenceStateFromResult(result: AnalysisResult | null): IntelligenceExperienceState {
  if (!result) return 'no_saved_analysis';
  if (result.staleData || result.freshness.state === 'STALE') return 'stale_data';
  if (result.recommendation === 'INSUFFICIENT_DATA') return 'insufficient_market_data';
  if (result.persistenceStatus === 'FAILED') return 'database_error';
  return 'success';
}
