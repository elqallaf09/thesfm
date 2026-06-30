import { NextResponse } from 'next/server';
import { proxyHealth } from '@/lib/market/marketDataProvider';

export async function GET() {
  const health = await proxyHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
