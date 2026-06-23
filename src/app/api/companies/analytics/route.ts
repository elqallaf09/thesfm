import { NextRequest, NextResponse } from 'next/server';
import { getCompanyAnalyticsBatch } from '@/lib/server/companyAnalytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get('ids') || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
    .slice(0, 100);

  const items = await getCompanyAnalyticsBatch(ids);
  return NextResponse.json({ ok: true, items });
}
