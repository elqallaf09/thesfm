import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';
import { isRealEstateInvestment, legacyRealEstateContext, savedRealEstateContext, validInvestmentId } from '@/lib/investments/realEstateHandoff';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Vary: 'Authorization' };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const POSITION_FIELDS = 'id,legacy_investment_item_id,display_name,asset_type,country_code,purchase_date,total_cost,purchase_currency,migration_state';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const user = token ? await getUserFromBearerToken(token) : null;
    if (!user?.id) return reply({ ok: false, code: 'UNAUTHORIZED' }, 401);
    const params = new URL(request.url).searchParams;
    const investmentId = params.get('investmentId');
    const positionId = params.get('positionId');
    if (Boolean(investmentId) === Boolean(positionId) || !validInvestmentId(investmentId ?? positionId)) {
      return reply({ ok: false, code: 'INVALID_ASSET_ID' }, 400);
    }
    const db = createServerSupabaseAdmin();
    if (!db) return reply({ ok: false, code: 'SERVER_STORAGE_UNAVAILABLE' }, 503);

    let legacy: Record<string, unknown> | null = null;
    if (investmentId) {
      // This is a single owner-scoped compatibility read. Only selected facts are returned.
      const result = await db.from('investment_items').select('*').eq('id', investmentId).eq('user_id', user.id).maybeSingle();
      if (result.error) return reply({ ok: false, code: 'ASSET_LOOKUP_FAILED' }, 503);
      if (!result.data) return reply({ ok: false, code: 'ASSET_NOT_FOUND' }, 404);
      legacy = record(result.data);
      if (!isRealEstateInvestment({ assetType: legacy.asset_type, type: legacy.type })) {
        return reply({ ok: false, code: 'NOT_REAL_ESTATE' }, 422);
      }
    }

    const query = db.from('investment_positions').select(POSITION_FIELDS).eq('user_id', user.id);
    const result = investmentId
      ? await query.eq('legacy_investment_item_id', investmentId).maybeSingle()
      : await query.eq('id', positionId!).maybeSingle();
    if (result.error) return reply({ ok: false, code: 'POSITION_LOOKUP_FAILED' }, 503);
    if (!result.data) {
      return legacy
        ? reply({ ok: true, context: legacyRealEstateContext(legacy) })
        : reply({ ok: false, code: 'ASSET_NOT_FOUND' }, 404);
    }
    const position = record(result.data);
    if (position.asset_type !== 'REAL_ESTATE') return reply({ ok: false, code: 'NOT_REAL_ESTATE' }, 422);
    if (position.migration_state === 'EXCLUDED' || position.migration_state === 'ERROR') {
      return reply({ ok: false, code: 'POSITION_NOT_READY' }, 409);
    }
    const details = await db.from('investment_property_details')
      .select('property_type,country_code,city,municipality,address,land_area,land_area_unit,built_area,built_area_unit')
      .eq('position_id', String(position.id)).eq('user_id', user.id).maybeSingle();
    if (details.error) return reply({ ok: false, code: 'PROPERTY_DETAILS_LOOKUP_FAILED' }, 503);
    return reply({ ok: true, context: savedRealEstateContext(position, record(details.data)) });
  } catch {
    // Never leak auth errors, SQL messages or stored property facts in diagnostics.
    return reply({ ok: false, code: 'CONTEXT_UNAVAILABLE' }, 503);
  }
}
