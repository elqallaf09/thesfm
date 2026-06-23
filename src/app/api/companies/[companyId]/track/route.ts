import { NextRequest, NextResponse } from 'next/server';
import { isCompanyAnalyticsEventType } from '@/lib/companyAnalytics';
import { COMPANY_ANALYTICS_SESSION_COOKIE, trackCompanyAnalyticsEvent } from '@/lib/server/companyAnalytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const eventType = (body as Record<string, unknown>).eventType;

  if (!isCompanyAnalyticsEventType(eventType)) {
    return json({ ok: false, code: 'INVALID_EVENT_TYPE' }, 400);
  }

  const result = await trackCompanyAnalyticsEvent(request, companyId, eventType);
  const response = json({ ok: result.ok, code: result.code, inserted: result.inserted }, result.status);

  if (result.shouldSetSessionCookie) {
    response.cookies.set(COMPANY_ANALYTICS_SESSION_COOKIE, result.sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    });
  }

  return response;
}
