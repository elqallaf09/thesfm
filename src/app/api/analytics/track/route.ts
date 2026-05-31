import { NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';

const ALLOWED_EVENTS = new Set([
  'page_view',
  'signup',
  'login',
  'logout',
  'add_income',
  'add_expense',
  'add_saving',
  'add_goal',
  'create_project',
  'export_report',
  'use_calculator',
  'open_market_analysis',
  'open_financial_theories',
  'open_reports',
  'open_charity',
  'open_projects',
  'change_language',
]);

const SENSITIVE_KEY_PATTERN = /(amount|value|salary|income_value|expense_value|saving_value|zakat|goal_amount|note|description|phone|mobile|security|password|document|file|private)/i;

function text(value: unknown, limit = 240) {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean ? clean.slice(0, limit) : null;
}

function safeMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, item]) => !SENSITIVE_KEY_PATTERN.test(key) && item != null)
      .map(([key, item]) => [key, typeof item === 'object' ? String(item) : item]),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const eventType = text(body?.event_type, 80);
    if (!eventType || !ALLOWED_EVENTS.has(eventType)) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const admin = createServerSupabaseAdmin();
    if (!admin) return NextResponse.json({ success: false }, { status: 503 });

    const accessToken = text(body?.access_token, 4096);
    const user = accessToken ? await getUserFromBearerToken(accessToken) : null;

    const { error } = await admin.from('analytics_events').insert({
      user_id: user?.id ?? null,
      session_id: text(body?.session_id, 160),
      event_type: eventType,
      page_path: text(body?.page_path, 260),
      page_title: text(body?.page_title, 260),
      module: text(body?.module, 120),
      referrer: text(body?.referrer, 500),
      language: text(body?.language, 12),
      device_type: text(body?.device_type, 80),
      browser: text(body?.browser, 80),
      operating_system: text(body?.operating_system, 80),
      metadata: safeMetadata(body?.metadata),
    });

    if (error) return NextResponse.json({ success: false }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
