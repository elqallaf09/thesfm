import { NextResponse } from 'next/server';

export async function GET() {
  const configured = Boolean(process.env.CENTRAL_BANK_NEWS_API_KEY?.trim() || process.env.NEWS_API_KEY?.trim());

  if (!configured) {
    return NextResponse.json({
      ok: false,
      success: false,
      code: 'CENTRAL_BANK_NEWS_SOURCE_NOT_CONFIGURED',
      items: [],
      updated_at: null,
    });
  }

  return NextResponse.json({
    ok: false,
    success: false,
    code: 'CENTRAL_BANK_NEWS_PROVIDER_UNAVAILABLE',
    items: [],
    updated_at: null,
  });
}
