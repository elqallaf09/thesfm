import { NextResponse } from 'next/server';

export async function GET() {
  const configured = Boolean(process.env.ECONOMIC_CALENDAR_API_KEY?.trim());

  if (!configured) {
    return NextResponse.json({
      success: false,
      code: 'economic_calendar_not_configured',
      message: 'ECONOMIC_CALENDAR_API_KEY is not configured.',
      events: [],
      updated_at: new Date().toISOString(),
    }, { status: 503 });
  }

  return NextResponse.json({
    success: false,
    code: 'economic_calendar_provider_missing',
    message: 'Economic calendar provider integration is not configured for this deployment.',
    events: [],
    updated_at: new Date().toISOString(),
  }, { status: 501 });
}
