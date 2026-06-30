import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    enabled: false,
    connected: false,
    hasConfiguredModel: false,
    model: null,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
