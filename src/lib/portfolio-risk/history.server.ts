import 'server-only';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { loadCanonicalInvestmentPositions, InvestmentCanonicalNotReadyError } from '@/lib/investments/canonicalPositions.server';
import { authorizeRiskRequest, type RiskServiceFailure } from './service.server';
import { adaptVerifiedHistory, HISTORY_SCHEMA, HISTORY_VERIFICATION, isRecord, type HistoricalRiskSnapshot, type StoredHistoryEvidence } from './historyEvidence';

const SELECT = 'id,user_id,source,observed_at,received_at,payload';
const unavailable = (code: string, status = 422): RiskServiceFailure => ({ ok: false, code, status });

/** Read-only, no fallback to raw connector data, current-price proxies or older failed batches. */
export async function loadHistoricalRiskForRequest(request: Request): Promise<{ ok: true; snapshot: HistoricalRiskSnapshot } | RiskServiceFailure> {
  const access = await authorizeRiskRequest(request);
  if (!access.ok) return access;
  try {
    const { positions } = await loadCanonicalInvestmentPositions(access.userId);
    if (!positions.length || positions.length >= 5000) return unavailable('HISTORY_POSITION_COVERAGE_MISMATCH');
    const currencies = new Set(positions.map(position => position.valuation.baseCurrency));
    const currency = positions[0].valuation.baseCurrency;
    if (currencies.size !== 1 || !currency || !/^[A-Z]{3}$/.test(currency)) return unavailable('HISTORY_SCOPE_MISMATCH');
    const publicTypes = new Set(['STOCK', 'FUND', 'BOND', 'CRYPTO', 'GOLD', 'SILVER', 'COMMODITY']);
    const expectedPositions = positions.map(position => {
      const type = position.asset.type?.trim().toUpperCase() || 'OTHER';
      const identifier = position.asset.identifier?.trim();
      const symbol = position.asset.symbol?.trim().toUpperCase();
      const exchange = position.asset.exchangeCode?.trim().toUpperCase();
      const assetId = identifier ? JSON.stringify([type, identifier]) : symbol && exchange ? JSON.stringify([type, exchange, symbol]) : publicTypes.has(type) ? '' : JSON.stringify(['private-position', position.id]);
      return { id: position.id, assetId };
    });
    if (expectedPositions.some(position => !position.assetId)) return unavailable('HISTORY_POSITION_IDENTITY_MISMATCH');
    const db = createServerSupabaseAdmin();
    if (!db) return unavailable('HISTORY_DATA_UNAVAILABLE', 503);
    // Authenticated clients have SELECT/DELETE only. The public connector forces
    // verification=user_connector_supplied; it cannot manufacture this marker.
    const history = await db.from('sfm_integration_snapshots').select(SELECT)
      .eq('user_id', access.userId).eq('source', 'custom')
      .eq('payload->>schema', HISTORY_SCHEMA).eq('payload->>verification', HISTORY_VERIFICATION)
      .order('observed_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle();
    if (history.error) return unavailable('HISTORY_DATA_UNAVAILABLE', 503);
    if (!history.data) return unavailable('HISTORY_NOT_IMPORTED');
    const payload: unknown = history.data.payload;
    if (!isRecord(payload) || typeof payload.calendarId !== 'string' || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(payload.calendarId)) return unavailable('HISTORY_INVALID_CALENDAR');
    const calendar = await db.from('sfm_integration_snapshots').select(SELECT)
      .eq('user_id', access.userId).eq('id', payload.calendarId).maybeSingle();
    if (calendar.error) return unavailable('HISTORY_DATA_UNAVAILABLE', 503);
    if (!calendar.data) return unavailable('HISTORY_INVALID_CALENDAR');
    const result = adaptVerifiedHistory({
      ownerId: access.userId, history: history.data as StoredHistoryEvidence, calendar: calendar.data as StoredHistoryEvidence,
      expectedPositions, expectedCurrency: currency, now: Date.now(),
    });
    return result.ok ? result : unavailable(result.code);
  } catch (error) {
    return unavailable(error instanceof InvestmentCanonicalNotReadyError ? 'CANONICAL_INVESTMENTS_NOT_READY' : 'HISTORY_DATA_UNAVAILABLE', 503);
  }
}
