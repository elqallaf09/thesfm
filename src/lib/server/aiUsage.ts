import { NextResponse } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';

export const AI_USAGE_FEATURES = [
  'all',
  'receipt_scan',
  'market_ai_insight',
  'market_agent_explanation',
  'project_ai_advisor',
  'project_expense_analysis',
  'project_pitch_deck',
  'project_pitch_deck_export',
  'projects_chat',
  'daily_tip',
] as const;

export type AiUsageFeature = typeof AI_USAGE_FEATURES[number];

type AiUsageLimitRow = {
  feature: string;
  daily_limit: number | null;
  is_enabled: boolean | null;
  is_blocked: boolean | null;
};

type AiUsageEventRow = {
  feature: string;
  units: number | null;
};

export type AiUsageDecision = {
  allowed: boolean;
  code?: 'AI_DAILY_LIMIT_REACHED' | 'AI_USAGE_DISABLED' | 'AI_USAGE_TRACKING_UNAVAILABLE' | 'AI_USAGE_TRACKING_FAILED';
  feature: AiUsageFeature;
  scope?: AiUsageFeature;
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
  usageDate: string;
  untracked?: boolean;
  messageArabic?: string;
  messageEnglish?: string;
};

type ConsumeAiUsageOptions = {
  userId: string;
  feature: AiUsageFeature;
  units?: number;
  metadata?: Record<string, unknown>;
};

const DEFAULT_DAILY_LIMIT = 20;
const DEFAULT_FEATURE_LIMITS: Partial<Record<AiUsageFeature, number>> = {
  receipt_scan: 10,
  market_ai_insight: 12,
  market_agent_explanation: 20,
  project_ai_advisor: 12,
  project_expense_analysis: 20,
  project_pitch_deck: 8,
  project_pitch_deck_export: 4,
  projects_chat: 20,
  daily_tip: 3,
};

const FEATURE_ENV_KEYS: Partial<Record<AiUsageFeature, string>> = {
  receipt_scan: 'AI_RECEIPT_SCAN_DAILY_LIMIT',
  market_ai_insight: 'AI_MARKET_INSIGHT_DAILY_LIMIT',
  market_agent_explanation: 'AI_MARKET_AGENT_DAILY_LIMIT',
  project_ai_advisor: 'AI_PROJECT_ADVISOR_DAILY_LIMIT',
  project_expense_analysis: 'AI_PROJECT_EXPENSE_DAILY_LIMIT',
  project_pitch_deck: 'AI_PROJECT_PITCH_DECK_DAILY_LIMIT',
  project_pitch_deck_export: 'AI_PROJECT_PITCH_DECK_EXPORT_DAILY_LIMIT',
  projects_chat: 'AI_PROJECTS_CHAT_DAILY_LIMIT',
  daily_tip: 'AI_DAILY_TIP_DAILY_LIMIT',
};

export function isAiUsageFeature(value: unknown): value is AiUsageFeature {
  return typeof value === 'string' && AI_USAGE_FEATURES.includes(value as AiUsageFeature);
}

function readLimitFromEnv(key: string | undefined, fallback: number) {
  if (!key) return fallback;
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function defaultDailyLimit() {
  return readLimitFromEnv('AI_DAILY_LIMIT_DEFAULT', DEFAULT_DAILY_LIMIT);
}

function defaultFeatureLimit(feature: AiUsageFeature) {
  if (feature === 'all') return defaultDailyLimit();
  return readLimitFromEnv(FEATURE_ENV_KEYS[feature], DEFAULT_FEATURE_LIMITS[feature] ?? defaultDailyLimit());
}

function kuwaitDayNumber(date = new Date()) {
  return Math.floor((date.getTime() + 3 * 60 * 60 * 1000) / 86_400_000);
}

function kuwaitDate(date = new Date()) {
  return new Date(kuwaitDayNumber(date) * 86_400_000).toISOString().slice(0, 10);
}

function nextKuwaitMidnightIso(date = new Date()) {
  const nextDay = kuwaitDayNumber(date) + 1;
  return new Date(nextDay * 86_400_000 - 3 * 60 * 60 * 1000).toISOString();
}

function sumUnits(rows: AiUsageEventRow[], feature?: AiUsageFeature) {
  return rows
    .filter(row => !feature || row.feature === feature)
    .reduce((sum, row) => sum + Math.max(0, Number(row.units ?? 0) || 0), 0);
}

function limitNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}

function blockedDecision(feature: AiUsageFeature, scope: AiUsageFeature, usageDate: string, resetAt: string): AiUsageDecision {
  return {
    allowed: false,
    code: 'AI_USAGE_DISABLED',
    feature,
    scope,
    limit: 0,
    used: 0,
    remaining: 0,
    usageDate,
    resetAt,
    messageArabic: 'تم إيقاف استخدام الذكاء الاصطناعي لهذا الحساب حالياً.',
    messageEnglish: 'AI usage is currently disabled for this account.',
  };
}

function limitReachedDecision(
  feature: AiUsageFeature,
  scope: AiUsageFeature,
  limit: number,
  used: number,
  usageDate: string,
  resetAt: string,
): AiUsageDecision {
  return {
    allowed: false,
    code: 'AI_DAILY_LIMIT_REACHED',
    feature,
    scope,
    limit,
    used,
    remaining: 0,
    usageDate,
    resetAt,
    messageArabic: 'تم الوصول إلى حد استخدام الذكاء الاصطناعي اليومي لهذا الحساب. يرجى المحاولة غداً أو رفع الحد من لوحة الإدارة.',
    messageEnglish: 'This account reached its daily AI usage limit. Try again tomorrow or increase the limit from admin settings.',
  };
}

function untrackedDecision(feature: AiUsageFeature, usageDate: string, resetAt: string): AiUsageDecision {
  return {
    allowed: process.env.NODE_ENV !== 'production',
    code: process.env.NODE_ENV === 'production' ? 'AI_USAGE_TRACKING_UNAVAILABLE' : undefined,
    feature,
    limit: 0,
    used: 0,
    remaining: 0,
    usageDate,
    resetAt,
    untracked: true,
    messageArabic: 'تعذر تفعيل عداد استخدام الذكاء الاصطناعي لأن إعدادات الخادم غير مكتملة.',
    messageEnglish: 'AI usage tracking is not available because server settings are incomplete.',
  };
}

export async function consumeAiUsage(options: ConsumeAiUsageOptions): Promise<AiUsageDecision> {
  const feature = options.feature;
  const units = Math.max(1, Math.floor(options.units ?? 1));
  const usageDate = kuwaitDate();
  const resetAt = nextKuwaitMidnightIso();
  const admin = createServerSupabaseAdmin();

  if (!admin) return untrackedDecision(feature, usageDate, resetAt);

  const { data: limitsData, error: limitsError } = await admin
    .from('ai_usage_limits')
    .select('feature,daily_limit,is_enabled,is_blocked')
    .eq('user_id', options.userId)
    .in('feature', ['all', feature]);

  if (limitsError) {
    return {
      allowed: false,
      code: 'AI_USAGE_TRACKING_FAILED',
      feature,
      limit: 0,
      used: 0,
      remaining: 0,
      usageDate,
      resetAt,
      messageArabic: 'تعذر التحقق من حد استخدام الذكاء الاصطناعي حالياً.',
      messageEnglish: 'Could not verify the AI usage limit right now.',
    };
  }

  const limits = (limitsData ?? []) as AiUsageLimitRow[];
  const allLimit = limits.find(row => row.feature === 'all');
  const featureLimit = limits.find(row => row.feature === feature);

  if (allLimit && (allLimit.is_blocked || allLimit.is_enabled === false)) {
    return blockedDecision(feature, 'all', usageDate, resetAt);
  }
  if (featureLimit && (featureLimit.is_blocked || featureLimit.is_enabled === false)) {
    return blockedDecision(feature, feature, usageDate, resetAt);
  }

  const accountLimit = limitNumber(allLimit?.daily_limit, defaultDailyLimit());
  const specificLimit = limitNumber(featureLimit?.daily_limit, defaultFeatureLimit(feature));

  const { data: eventsData, error: eventsError } = await admin
    .from('ai_usage_events')
    .select('feature,units')
    .eq('user_id', options.userId)
    .eq('usage_date', usageDate);

  if (eventsError) {
    return {
      allowed: false,
      code: 'AI_USAGE_TRACKING_FAILED',
      feature,
      limit: 0,
      used: 0,
      remaining: 0,
      usageDate,
      resetAt,
      messageArabic: 'تعذر قراءة استهلاك الذكاء الاصطناعي الحالي.',
      messageEnglish: 'Could not read the current AI usage count.',
    };
  }

  const events = (eventsData ?? []) as AiUsageEventRow[];
  const totalUsed = sumUnits(events);
  const featureUsed = sumUnits(events, feature);

  if (totalUsed + units > accountLimit) {
    return limitReachedDecision(feature, 'all', accountLimit, totalUsed, usageDate, resetAt);
  }
  if (featureUsed + units > specificLimit) {
    return limitReachedDecision(feature, feature, specificLimit, featureUsed, usageDate, resetAt);
  }

  const { error: insertError } = await admin.from('ai_usage_events').insert({
    user_id: options.userId,
    feature,
    units,
    usage_date: usageDate,
    metadata: {
      ...(options.metadata ?? {}),
      consumedAt: new Date().toISOString(),
    },
  });

  if (insertError) {
    return {
      allowed: false,
      code: 'AI_USAGE_TRACKING_FAILED',
      feature,
      limit: 0,
      used: 0,
      remaining: 0,
      usageDate,
      resetAt,
      messageArabic: 'تعذر تسجيل استخدام الذكاء الاصطناعي حالياً.',
      messageEnglish: 'Could not record AI usage right now.',
    };
  }

  const remainingTotal = Math.max(0, accountLimit - totalUsed - units);
  const remainingFeature = Math.max(0, specificLimit - featureUsed - units);

  return {
    allowed: true,
    feature,
    limit: Math.min(accountLimit, specificLimit),
    used: Math.max(totalUsed, featureUsed) + units,
    remaining: Math.min(remainingTotal, remainingFeature),
    usageDate,
    resetAt,
  };
}

export function aiUsageLimitResponse(decision: AiUsageDecision) {
  const retryAfterSeconds = Math.max(0, Math.ceil((new Date(decision.resetAt).getTime() - Date.now()) / 1000));
  return NextResponse.json({
    ok: false,
    success: false,
    code: decision.code ?? 'AI_DAILY_LIMIT_REACHED',
    feature: decision.feature,
    scope: decision.scope,
    limit: decision.limit,
    used: decision.used,
    remaining: decision.remaining,
    usageDate: decision.usageDate,
    resetAt: decision.resetAt,
    message: decision.messageArabic,
    messageArabic: decision.messageArabic,
    messageEnglish: decision.messageEnglish,
  }, {
    status: decision.code === 'AI_USAGE_TRACKING_UNAVAILABLE' || decision.code === 'AI_USAGE_TRACKING_FAILED' ? 503 : 429,
    headers: {
      'Cache-Control': 'no-store',
      ...(retryAfterSeconds ? { 'Retry-After': String(retryAfterSeconds) } : {}),
    },
  });
}
