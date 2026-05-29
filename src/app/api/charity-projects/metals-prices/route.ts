import { NextResponse } from 'next/server';
import { GET as getMarketMetals } from '@/app/api/market/metals/route';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const response = await getMarketMetals(new Request(new URL('/api/market/metals?currency=KWD', request.url)));
  const data = await response.json();
  const gold = Number(data?.gold?.price || 0);
  const silver = Number(data?.silver?.price || 0);
  const success = Boolean(data?.success && gold > 0 && silver > 0);

  return NextResponse.json({
    success,
    source: success ? data.source : 'manual',
    currency: 'KWD',
    gold: {
      pricePerGram: gold,
      pricePerGram24k: gold,
      pricePerGram22k: gold * (22 / 24),
      pricePerGram21k: gold * (21 / 24),
      pricePerGram18k: gold * (18 / 24),
      unit: 'gram',
    },
    silver: { pricePerGram: silver, unit: 'gram' },
    updatedAt: data?.gold?.lastUpdated || data?.silver?.lastUpdated || new Date().toISOString(),
    message: data?.error || data?.message,
  });
}
