import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';
import { persistValuationSnapshot } from '@/lib/investments/intelligence/persistence';
import { analyzeRealEstateAsset } from '@/lib/investments/intelligence/analyst';
import { assessRealEstateReadiness } from '@/lib/investments/intelligence/readiness';
import { savedRealEstateContext, validInvestmentId } from '@/lib/investments/realEstateHandoff';

export const runtime = 'nodejs';
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Vary: 'Authorization' };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const user = token ? await getUserFromBearerToken(token) : null;
    if (!user?.id) return reply({ ok: false, code: 'UNAUTHORIZED' }, 401);
    let payload: unknown;
    try { payload = await request.json(); } catch { return reply({ ok: false, code: 'INVALID_JSON' }, 400); }
    const body = record(payload);
    const expected = record(body.valuation);
    if (!validInvestmentId(body.positionId) || expected.status !== 'VALUED'
      || typeof expected.currency !== 'string' || !/^[A-Z]{3}$/.test(expected.currency)
      || ![expected.lowValue, expected.midpointValue, expected.highValue].every(value => typeof value === 'number' && Number.isFinite(value) && value > 0)) {
      return reply({ ok: false, code: 'INVALID_REQUEST' }, 400);
    }
    const positionId = body.positionId;
    const db = createServerSupabaseAdmin();
    if (!db) return reply({ ok: false, code: 'SERVER_STORAGE_UNAVAILABLE' }, 503);
    const owned = await db.from('investment_positions')
      .select('id,legacy_investment_item_id,display_name,asset_type,country_code,purchase_date,total_cost,purchase_currency,migration_state')
      .eq('id', positionId).eq('user_id', user.id).maybeSingle();
    if (owned.error) return reply({ ok: false, code: 'POSITION_LOOKUP_FAILED' }, 503);
    if (!owned.data) return reply({ ok: false, code: 'POSITION_NOT_FOUND' }, 404);
    const position = record(owned.data);
    if (position.asset_type !== 'REAL_ESTATE' || position.migration_state !== 'VERIFIED') {
      return reply({ ok: false, code: 'POSITION_NOT_READY' }, 409);
    }
    const details = await db.from('investment_property_details')
      .select('property_type,country_code,city,municipality,address,land_area,land_area_unit,built_area,built_area_unit')
      .eq('position_id', positionId).eq('user_id', user.id).maybeSingle();
    if (details.error) return reply({ ok: false, code: 'PROPERTY_DETAILS_LOOKUP_FAILED' }, 503);
    const { asset } = savedRealEstateContext(position, record(details.data));
    const readiness = assessRealEstateReadiness(asset, []);
    if (!asset.propertyType || !readiness.checks.assetIdentity || !readiness.checks.area) {
      return reply({ ok: false, code: 'SAVED_ASSET_DETAILS_INCOMPLETE' }, 422);
    }

    // Browser data is a confirmation expectation only. Re-read trusted sources
    // using the owned, stored property. Never persist body.evidence or a claimed result.
    const authoritative = await analyzeRealEstateAsset(asset, expected.currency, []);
    const valuation = authoritative.valuation;
    if (authoritative.status !== 'VALUED' || !valuation || valuation.status !== 'VALUED') {
      return reply({ ok: false, code: 'VERIFIED_VALUATION_UNAVAILABLE' }, 422);
    }
    if (valuation.lowValue !== expected.lowValue || valuation.midpointValue !== expected.midpointValue
      || valuation.highValue !== expected.highValue || valuation.currency !== expected.currency
      || valuation.methodologyVersion !== expected.methodologyVersion) {
      return reply({ ok: false, code: 'VALUATION_CHANGED_REANALYZE' }, 409);
    }
    const saved = await persistValuationSnapshot(db, {
      userId: user.id, positionId, valuation, evidence: authoritative.evidence, subjectAsset: asset,
    });
    return reply({ ok: true, ...saved }, 201);
  } catch {
    return reply({ ok: false, code: 'SNAPSHOT_PERSISTENCE_FAILED' }, 503);
  }
}
