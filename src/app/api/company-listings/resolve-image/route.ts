import { NextRequest, NextResponse } from 'next/server';
import { resolvePublicImageUrl } from '@/lib/server/imageUrlResolver';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const limited = rateLimitRequest(request, {
    max: 30,
    windowMs: 60_000,
    prefix: 'company-image-resolver',
  });
  if (limited) return limited;

  const sourceUrl = request.nextUrl.searchParams.get('url');
  const result = await resolvePublicImageUrl(sourceUrl);

  if (!result.ok) {
    const status = result.code === 'FETCH_FAILED'
      ? 502
      : result.code === 'NO_IMAGE_FOUND'
        ? 404
        : 400;
    return NextResponse.json(
      { ok: false, code: result.code },
      {
        status,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  }

  return NextResponse.json(
    { ok: true, imageUrl: result.imageUrl },
    {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
