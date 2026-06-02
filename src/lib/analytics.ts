'use client';

import { supabase } from '@/integrations/supabase/client';

export type AnalyticsEventType =
  | 'page_view'
  | 'section_view'
  | 'account_created'
  | 'button_click'
  | 'signup'
  | 'login'
  | 'logout'
  | 'add_income'
  | 'add_expense'
  | 'add_saving'
  | 'add_goal'
  | 'create_project'
  | 'export_report'
  | 'use_calculator'
  | 'open_market_analysis'
  | 'open_financial_theories'
  | 'open_reports'
  | 'open_charity'
  | 'open_projects'
  | 'change_language';

type TrackPayload = {
  page_path?: string;
  page_title?: string;
  module?: string;
  section_name?: string;
  referrer?: string;
  language?: string;
  metadata?: Record<string, unknown>;
};

const SESSION_KEY = 'sfm_analytics_session_id';
const SENSITIVE_KEYS = [
  'amount',
  'value',
  'salary',
  'income',
  'expense',
  'saving',
  'zakat',
  'goal',
  'note',
  'notes',
  'description',
  'phone',
  'mobile',
  'security_answer',
  'securityAnswer',
  'password',
  'document',
  'file',
  'private',
];

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `sfm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getAnalyticsSessionId() {
  if (typeof window === 'undefined') return '';
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const next = randomId();
    localStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return randomId();
  }
}

function deviceType(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/android/.test(ua) && !/mobile/.test(ua)) return 'tablet';
  if (/iphone|ipod|android|mobile/.test(ua)) return 'mobile';
  return 'desktop';
}

function browser(userAgent: string) {
  if (/edg\//i.test(userAgent)) return 'Edge';
  if (/crios|chrome/i.test(userAgent) && !/edg\//i.test(userAgent)) return 'Chrome';
  if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) return 'Safari';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  return 'Other';
}

function operatingSystem(userAgent: string) {
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';
  if (/android/i.test(userAgent)) return 'Android';
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/mac os|macintosh/i.test(userAgent)) return 'macOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  return 'Other';
}

function sanitizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key, value]) => {
        const lowerKey = key.toLowerCase();
        return value != null && !SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive.toLowerCase()));
      })
      .map(([key, value]) => [key, typeof value === 'object' ? String(value) : value]),
  );
}

export function moduleFromPath(pathname: string) {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/income')) return 'income';
  if (pathname.startsWith('/expenses')) return 'expenses';
  if (pathname.startsWith('/debts')) return 'debts';
  if (pathname.startsWith('/savings')) return 'savings';
  if (pathname.startsWith('/goals')) return 'goals';
  if (pathname.startsWith('/projects')) return 'projects';
  if (pathname.startsWith('/reports')) return 'reports';
  if (pathname.startsWith('/financial-theories')) return 'financial_theories';
  if (pathname.startsWith('/ebooks')) return 'ebooks';
  if (pathname.startsWith('/market')) return 'market';
  if (pathname.startsWith('/ai')) return 'financial_ai';
  if (pathname.startsWith('/charity') || pathname.startsWith('/zakat')) return 'charity';
  if (pathname.startsWith('/business')) return 'business';
  if (pathname.startsWith('/investment-offers')) return 'investment_offers';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'other';
}

export async function trackEvent(eventType: AnalyticsEventType, payload: TrackPayload = {}) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/sfm-admin-control')) return;

  const ua = navigator.userAgent || '';
  const sessionResult = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  const body = {
    event_type: eventType,
    session_id: getAnalyticsSessionId(),
    page_path: payload.page_path ?? window.location.pathname,
    page_title: payload.page_title ?? document.title,
    module: payload.module ?? moduleFromPath(payload.page_path ?? window.location.pathname),
    section_name: payload.section_name ?? payload.module ?? moduleFromPath(payload.page_path ?? window.location.pathname),
    referrer: payload.referrer ?? document.referrer,
    language: payload.language ?? document.documentElement.lang ?? 'ar',
    device_type: deviceType(ua),
    browser: browser(ua),
    os: operatingSystem(ua),
    operating_system: operatingSystem(ua),
    metadata: sanitizeMetadata(payload.metadata),
    access_token: sessionResult.data.session?.access_token ?? null,
  };

  const serializedBody = JSON.stringify(body);

  try {
    if (typeof navigator.sendBeacon === 'function' && serializedBody.length < 60000) {
      const sent = navigator.sendBeacon(
        '/api/analytics/track',
        new Blob([serializedBody], { type: 'application/json' }),
      );
      if (sent) return;
    }

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: serializedBody,
      keepalive: serializedBody.length < 60000,
    });
  } catch {
    // Analytics must never interrupt the user flow.
  }
}
