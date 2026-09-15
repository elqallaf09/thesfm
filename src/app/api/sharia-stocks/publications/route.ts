import { NextResponse } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { readPublishedOpinions } from '@/lib/sharia-research/publishedOpinionCatalog';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' };
  const admin = createServerSupabaseAdmin();
  if (!admin) return NextResponse.json({ ok: false, code: 'PUBLICATION_STORAGE_UNAVAILABLE' }, { status: 503, headers });
  try { return NextResponse.json({ ok: true, items: await readPublishedOpinions(admin), disclaimer: 'These dated third-party opinions do not replace the separate SFM screen. Non-membership is not a negative opinion.' }, { headers }); }
  catch { return NextResponse.json({ ok: false, code: 'PUBLICATION_READ_UNAVAILABLE' }, { status: 503, headers }); }
}
