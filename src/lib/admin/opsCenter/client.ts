import type { OperationsCenterState, OpsAction } from './types';
import { buildOperationsHealthSummary } from './healthTruth';

export const OPS_CENTER_URL = '/api/admin/ops-center';

export type OpsActionResult = {
  actionId: string;
  ok: boolean;
  messageKey: string;
  completedAt: string;
};

export type OpsActionState = {
  pendingActionId: string | null;
  result: OpsActionResult | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseState(value: unknown): OperationsCenterState {
  if (!isRecord(value) || typeof value.generatedAt !== 'string' || !Number.isFinite(Date.parse(value.generatedAt))
    || !isRecord(value.overview) || !isRecord(value.market) || !Array.isArray(value.market.capabilityMatrix)
    || !Array.isArray(value.featureHealth) || !Array.isArray(value.rootCause)
    || !Array.isArray(value.marketNews) || !isRecord(value.subscriptionReminders)) {
    throw new Error('ops_center_request_invalid_response');
  }
  const state = value as OperationsCenterState;
  return { ...state, ...buildOperationsHealthSummary(state) };
}

async function readPayload(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) {
    const message = response.status === 401 || response.status === 403 ? 'ops_center_request_access_denied'
      : response.status === 429 ? 'ops_center_request_rate_limited' : 'ops_center_request_failed';
    throw new Error(message);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!isRecord(payload) || payload.ok !== true) throw new Error('ops_center_request_invalid_response');
  return payload;
}

export async function fetchOperationsCenterState(signal: AbortSignal): Promise<OperationsCenterState> {
  const response = await fetch(OPS_CENTER_URL, { signal, cache: 'no-store' });
  return parseState((await readPayload(response)).state);
}

export async function executeOperationsAction(action: OpsAction, signal: AbortSignal): Promise<{
  state: OperationsCenterState;
  result: OpsActionResult;
}> {
  const response = await fetch(OPS_CENTER_URL, {
    method: 'POST', signal, cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: action.kind }),
  });
  const payload = await readPayload(response);
  if (!isRecord(payload.result) || payload.result.actionId !== action.kind
    || typeof payload.result.messageKey !== 'string' || !payload.result.messageKey.startsWith('ops_center_action_')
    || typeof payload.result.completedAt !== 'string' || !Number.isFinite(Date.parse(payload.result.completedAt))) {
    throw new Error('ops_center_request_invalid_response');
  }
  return {
    state: parseState(payload.state),
    result: { actionId: action.id, ok: true, messageKey: payload.result.messageKey, completedAt: payload.result.completedAt },
  };
}
