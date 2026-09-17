import { NextResponse } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { SHARIAH_UNIVERSE } from '@/lib/market/shariahUniverse';
import { publishedShariahFundCatalogItem } from '@/lib/market/shariahPublishedFundProfiles';
import { publicCatalogItem } from '@/lib/sharia-research/publicCatalog';
import { SFM_FTSE_POINT_IN_TIME } from '@/lib/sharia-research/methodologies';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET() {
  const admin = createServerSupabaseAdmin();
  if (!admin) return NextResponse.json({ ok: false, code: 'SCREENING_STORAGE_UNAVAILABLE' }, { status: 503, headers });
  try {
    const items: Array<ReturnType<typeof publicCatalogItem> | NonNullable<ReturnType<typeof publishedShariahFundCatalogItem>>> = [];
    const protectedDecisions = new Set<string>();
    // Paginate the actual catalog, not a hand-written stock list or a provider-key flag.
    for (let offset = 0; ; offset += 1000) {
      const result = await admin.from('market_symbols')
        .select('id,symbol,name,asset_type,exchange,sector,shariah_status,shariah_source,shariah_reason,shariah_last_reviewed_at,shariah_manual_override,shariah_screening_data')
        .eq('is_active', true).in('asset_type', ['stock', 'etf']).order('id').range(offset, offset + 999);
      if (result.error) throw new Error('CATALOG_READ_FAILED');
      for (const row of result.data ?? []) {
        if (row.shariah_status === 'non_compliant' || row.shariah_manual_override === true) {
          protectedDecisions.add(row.symbol.toUpperCase());
        }
      }
      items.push(...(result.data ?? []).map(row => publicCatalogItem(row)));
      if ((result.data?.length ?? 0) < 1000) break;
    }

    // Sponsor-published Shariah ETFs are a different evidence class from
    // conventional ETFs. A stale/generic persisted fund-review state must not
    // hide a current, exact sponsor-published Shariah designation. This does
    // not claim an independent THE SFM fatwa or certification.
    const universeBySymbol = new Map(SHARIAH_UNIVERSE.map(item => [item.symbol.toUpperCase(), item]));
    for (let index = 0; index < items.length; index++) {
      const currentItem = items[index];
      // A published sponsor designation never overrides an explicit stored decision.
      if (protectedDecisions.has(currentItem.symbol.toUpperCase())) continue;
      if ('publishedShariahDesignation' in currentItem && currentItem.publishedShariahDesignation) continue;
      const universeItem = universeBySymbol.get(items[index].symbol.toUpperCase());
      if (!universeItem) continue;
      const published = publishedShariahFundCatalogItem(universeItem);
      if (!published) continue;
      items[index] = {
        ...items[index],
        ...published,
        name: items[index].name || published.name,
        sector: items[index].sector || published.sector,
        exchange: items[index].exchange ?? published.exchange,
      };
    }

    // Also expose reviewed sponsor-published Shariah ETFs that are not yet in
    // market_symbols, so the public fund list does not silently drop them.
    const present = new Set(items.map(item => item.symbol.toUpperCase()));
    for (const universeItem of SHARIAH_UNIVERSE) {
      if (present.has(universeItem.symbol.toUpperCase())) continue;
      const published = publishedShariahFundCatalogItem(universeItem);
      if (!published) continue;
      items.push(published);
      present.add(universeItem.symbol.toUpperCase());
    }

    const counts = { compliant: 0, non_compliant: 0, needs_review: 0, unclassified: 0 };
    for (const item of items) counts[item.shariahStatus]++;
    const dates = items.map(item => item.lastScreenedAt).filter((date): date is string => Boolean(date)).sort();
    const connected = items.some(item => item.screeningSource !== null);
    return NextResponse.json({ ok: true, revision: process.env.VERCEL_GIT_COMMIT_SHA ?? null, items, counts, updated_at: dates.at(-1) ?? null,
      sourceConnected: connected, screeningSource: connected ? 'sfm-evidence-v2' : null,
      sourceName: connected ? 'SFM source-verified screening + published fund designations' : null,
      methodology: { ar: SFM_FTSE_POINT_IN_TIME.nameAr, en: SFM_FTSE_POINT_IN_TIME.name, fr: SFM_FTSE_POINT_IN_TIME.nameFr },
      emptyMessage: { ar: 'لا توجد نتيجة فحص محفوظة بعد', en: 'No persisted screening result yet', fr: 'Aucun résultat de filtrage enregistré' },
    }, { headers });
  } catch { return NextResponse.json({ ok: false, code: 'SCREENING_READ_FAILED' }, { status: 503, headers }); }
}
