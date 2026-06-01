import { NextResponse } from 'next/server';

export async function GET() {
  const configured = Boolean(process.env.CENTRAL_BANK_NEWS_API_KEY?.trim() || process.env.NEWS_API_KEY?.trim());

  if (!configured) {
    return NextResponse.json({
      success: false,
      code: 'central_bank_news_not_configured',
      message: 'CENTRAL_BANK_NEWS_API_KEY or NEWS_API_KEY is not configured.',
      items: [],
      updated_at: new Date().toISOString(),
    }, { status: 503 });
  }

  return NextResponse.json({
    success: false,
    code: 'central_bank_news_provider_missing',
    message: 'Central bank news provider integration is not configured for this deployment.',
    items: [],
    updated_at: new Date().toISOString(),
  }, { status: 501 });
}
