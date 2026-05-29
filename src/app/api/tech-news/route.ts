import { NextResponse } from 'next/server';
import { fetchTechNews } from '@/lib/market/fetchTechNews';

export const revalidate = 300;

export async function GET() {
  try {
    const payload = await fetchTechNews();
    return NextResponse.json(payload, {
      headers: {
        'cache-control': 's-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[TechNews] Failed to load market news', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load tech market news',
        reason: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 },
    );
  }
}
