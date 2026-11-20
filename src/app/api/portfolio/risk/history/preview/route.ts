import { NextResponse } from 'next/server';
import { previewHistoryImport } from '@/lib/portfolio-risk/importPreview.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const result = await previewHistoryImport(request);
  return NextResponse.json(result.ok ? result : { ok: false, code: result.code }, {
    status: result.ok ? 200 : result.status,
    headers: {
      'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization',
      'X-Content-Type-Options': 'nosniff',
      ...(!result.ok && result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}),
    },
  });
}
