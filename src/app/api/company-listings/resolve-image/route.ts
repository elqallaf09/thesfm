import { NextRequest, NextResponse } from 'next/server';
import { resolvePublicImageUrl } from '@/lib/server/imageUrlResolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get('url');
  const result = await resolvePublicImageUrl(sourceUrl);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code },
      {
        status: 400,
        headers: { 'Cache-Control': 'public, max-age=300' },
      },
    );
  }

  return NextResponse.json(
    { ok: true, imageUrl: result.imageUrl },
    {
      headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
    },
  );
}
