import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/accessPolicy';
import { collectTvCore } from '@/lib/server/markets-tv/collector';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Scheduled by Vercel Cron, which sends `Authorization: Bearer <CRON_SECRET>`. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const started = Date.now();
  const groups = await collectTvCore();
  return NextResponse.json({ ok: true, durationMs: Date.now() - started, groups }, { headers: { 'Cache-Control': 'no-store' } });
}
