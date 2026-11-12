import { NextResponse } from 'next/server';
import { loadCurrentRiskForRequest } from '@/lib/portfolio-risk/service.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const result = await loadCurrentRiskForRequest(request);
  return NextResponse.json(result.ok ? result.snapshot : { code: result.code, data: null }, {
    status: result.ok ? 200 : result.status,
    headers: {
      'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization',
      'X-Content-Type-Options': 'nosniff',
      ...(!result.ok && result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}),
    },
  });
}
