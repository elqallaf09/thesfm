import { NextResponse } from 'next/server';

export async function GET() {
  const configured = Boolean(process.env.MARKET_SENTIMENT_API_KEY?.trim());

  if (!configured) {
    return NextResponse.json({
      success: false,
      code: 'market_sentiment_not_configured',
      message: 'MARKET_SENTIMENT_API_KEY is not configured.',
      items: [],
      updated_at: new Date().toISOString(),
    }, { status: 503 });
  }

  return NextResponse.json({
    success: false,
    code: 'market_sentiment_provider_missing',
    message: 'Market sentiment provider integration is not configured for this deployment.',
    items: [],
    updated_at: new Date().toISOString(),
  }, { status: 501 });
}
