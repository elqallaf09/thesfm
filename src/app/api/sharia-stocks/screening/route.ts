import { NextResponse } from 'next/server';
import { loadShariahPublicCatalog } from '@/lib/server/shariahPublicCatalog';
import { boubyanReferenceAvailability } from '@/lib/market/boubyanReference.server';
import { BOUBYAN_METHODOLOGY } from '@/lib/market/boubyanReferenceMetadata';
import { SFM_FTSE_POINT_IN_TIME } from '@/lib/sharia-research/methodologies';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const now = new Date();
  const reference = boubyanReferenceAvailability(now);
  const { items, storage } = await loadShariahPublicCatalog({ now });
  if (!storage.complete && !reference.sourceAvailable && !items.length) {
    return NextResponse.json({ ok: false, code: 'SCREENING_STORAGE_UNAVAILABLE', reference, catalogStorage: storage }, { status: 503, headers });
  }
  const counts = { compliant: 0, non_compliant: 0, needs_review: 0, unclassified: 0 };
  for (const item of items) counts[item.shariahStatus]++;
  const dates = items.map(item => item.lastScreenedAt).filter((date): date is string => Boolean(date)).sort();
  const connected = reference.sourceAvailable || items.some(item => item.screeningSource !== null);
  return NextResponse.json({
    ok: true,
    ...(storage.complete ? {} : { code: 'SCREENING_CATALOG_DEGRADED' }),
    revision: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    items,
    counts,
    updated_at: dates.at(-1) ?? (reference.sourceAvailable ? reference.checkedAt : null),
    sourceConnected: connected,
    screeningSource: reference.sourceAvailable ? reference.id : connected ? 'sfm-evidence-v2' : null,
    sourceName: reference.sourceAvailable ? reference.name : connected ? 'SFM source-verified screening + published fund designations' : null,
    methodology: reference.sourceAvailable ? BOUBYAN_METHODOLOGY
      : { ar: SFM_FTSE_POINT_IN_TIME.nameAr, en: SFM_FTSE_POINT_IN_TIME.name, fr: SFM_FTSE_POINT_IN_TIME.nameFr },
    reference,
    catalogStorage: storage,
    emptyMessage: {
      ar: 'لا توجد نتيجة موثقة لهوية سهم معروفة في الكتالوج. تتوفر روابط قوائم بوبيان للمراجعة.',
      en: 'No verified result for an identified catalog security. Boubyan publication links remain available for review.',
      fr: 'Aucun résultat vérifié pour un titre identifié du catalogue. Les liens des publications Boubyan restent disponibles.',
    },
  }, { headers });
}
