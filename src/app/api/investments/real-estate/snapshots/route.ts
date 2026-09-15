import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';
import { persistValuationSnapshot } from '@/lib/investments/intelligence/persistence';
import type { ValuationEvidence } from '@/lib/investments/intelligence/contracts';
import type { ValuationRangeResult } from '@/lib/investments/intelligence/valuation-range';

export const runtime = 'nodejs';

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' };
function response(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: PRIVATE_HEADERS }); }
function bearer(request: NextRequest) { return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null; }

export async function POST(request: NextRequest) {
  const token = bearer(request);
  const user = token ? await getUserFromBearerToken(token) : null;
  if (!user?.id) return response({ ok: false, code: 'UNAUTHORIZED' }, 401);
  const db = createServerSupabaseAdmin();
  if (!db) return response({ ok: false, code: 'SERVER_STORAGE_UNAVAILABLE' }, 503);

  let body: { positionId?: unknown; valuation?: ValuationRangeResult; evidence?: ValuationEvidence[] };
  try { body = await request.json(); } catch { return response({ ok: false, code: 'INVALID_JSON' }, 400); }
  const positionId = typeof body.positionId === 'string' ? body.positionId.trim() : '';
  if (!positionId || !body.valuation || !Array.isArray(body.evidence)) return response({ ok: false, code: 'INVALID_REQUEST' }, 400);

  const owned = await db.from('investment_positions').select('id').eq('id', positionId).eq('user_id', user.id).maybeSingle();
  if (owned.error) return response({ ok: false, code: 'POSITION_LOOKUP_FAILED' }, 502);
  if (!owned.data) return response({ ok: false, code: 'POSITION_NOT_FOUND' }, 404);

  try {
    const saved = await persistValuationSnapshot(db, { userId: user.id, positionId, valuation: body.valuation, evidence: body.evidence });
    return response({ ok: true, ...saved }, 201);
  } catch (error) {
    console.error('[investments] valuation snapshot persistence failed', { userId: user.id, positionId, error: error instanceof Error ? error.message : String(error) });
    return response({ ok: false, code: 'SNAPSHOT_PERSISTENCE_FAILED' }, 422);
  }
}
