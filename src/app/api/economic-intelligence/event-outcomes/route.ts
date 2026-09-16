import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OutcomeAction = 'opened' | 'actioned' | 'resolved';

// Errors contain user-scoped context too: never cache any outcome response.
function privateJson(payload: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('cache-control', 'private, no-store');
  return NextResponse.json(payload, { ...init, headers });
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? ''));
}

function normalizeAction(value: unknown): OutcomeAction | null {
  return value === 'opened' || value === 'actioned' || value === 'resolved' ? value : null;
}

function normalizeResolutionCode(value: unknown) {
  const text = String(value ?? '').trim().toLowerCase();
  return /^[a-z0-9_-]{2,64}$/.test(text) ? text : null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request).catch(() => null);
    if (!user) return privateJson({ ok: false, error: { code: 'UNAUTHENTICATED' } }, { status: 401 });

    const limit = checkRateLimitWithMetadata(`user:${user.id}`, {
      max: 60,
      windowMs: 60_000,
      prefix: 'economic-intelligence-event-outcomes',
    });
    if (!limit.allowed) {
      return privateJson({ ok: false, error: { code: 'APPLICATION_RATE_LIMITED' } }, {
        status: 429,
        headers: { 'Retry-After': String(Math.max(1, limit.retryAfterSeconds ?? 60)) },
      });
    }

    let body: Record<string, unknown> | null = null;
    try {
      const value: unknown = await request.json();
      if (value && typeof value === 'object' && !Array.isArray(value)) body = value as Record<string, unknown>;
    } catch { /* Malformed JSON follows the same safe invalid-request response. */ }
    const notificationId = typeof body?.notificationId === 'string' ? body.notificationId : '';
    const action = normalizeAction(body?.action);
    if (!isUuid(notificationId) || !action) {
      return privateJson({ ok: false, error: { code: 'INVALID_REQUEST' } }, { status: 400 });
    }

    const admin = createServerSupabaseAdmin();
    if (!admin) return privateJson({ ok: false, error: { code: 'SERVICE_NOT_CONFIGURED' } }, { status: 503 });

    const existing = await admin.from('notifications')
      .select('id,user_id,source_module,source_id,event_key,metadata,opened_at,actioned_at,resolved_at')
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .eq('source_module', 'economic_intelligence')
      .maybeSingle();
    if (existing.error) return privateJson({ ok: false, error: { code: 'OUTCOME_LOAD_FAILED' } }, { status: 502 });
    if (!existing.data) return privateJson({ ok: false, error: { code: 'EVENT_NOT_FOUND' } }, { status: 404 });

    const now = new Date().toISOString();
    const metadata = existing.data.metadata && typeof existing.data.metadata === 'object' && !Array.isArray(existing.data.metadata) ? existing.data.metadata : {};
    const patch: Record<string, unknown> = {
      metadata: {
        ...metadata,
        last_outcome_action: action,
        last_outcome_at: now,
        causal_claim: false,
      },
    };

    if (action === 'opened') patch.opened_at = existing.data.opened_at ?? now;
    if (action === 'actioned') {
      patch.opened_at = existing.data.opened_at ?? now;
      patch.actioned_at = existing.data.actioned_at ?? now;
      patch.read = true;
      patch.status = 'read';
      patch.read_at = now;
    }
    if (action === 'resolved') {
      patch.opened_at = existing.data.opened_at ?? now;
      patch.resolved_at = existing.data.resolved_at ?? now;
      patch.resolution_code = normalizeResolutionCode(body?.resolutionCode) ?? 'user_marked_resolved';
      patch.read = true;
      patch.status = 'archived';
      patch.read_at = now;
    }

    const updated = await admin.from('notifications').update(patch).eq('id', notificationId).eq('user_id', user.id).eq('source_module', 'economic_intelligence').select('id,source_id,event_key,opened_at,actioned_at,resolved_at,resolution_code').single();
    if (updated.error) return privateJson({ ok: false, error: { code: 'OUTCOME_UPDATE_FAILED' } }, { status: 502 });

    if (action === 'resolved' && updated.data?.source_id) {
      const decisionResult = await admin.from('user_decisions').select('id,analysis').eq('id', updated.data.source_id).eq('user_id', user.id).maybeSingle();
      if (!decisionResult.error && decisionResult.data) {
        const prior = decisionResult.data.analysis && typeof decisionResult.data.analysis === 'object' ? decisionResult.data.analysis : {};
        await admin.from('user_decisions').update({
          analysis: {
            ...prior,
            outcome_tracking: {
              ...(prior as any).outcome_tracking,
              event_id: notificationId,
              event_key: updated.data.event_key,
              resolved_at: updated.data.resolved_at,
              resolution_code: updated.data.resolution_code,
              causal_claim: false,
            },
          },
          updated_at: now,
        }).eq('id', updated.data.source_id).eq('user_id', user.id);
      }
    }

    return privateJson({ ok: true, outcome: updated.data }, { headers: { 'cache-control': 'private, no-store' } });
  } catch {
    // Database transport errors must not leak raw exceptions or private rows.
    return privateJson({ ok: false, error: { code: 'OUTCOME_UNAVAILABLE' } }, { status: 502 });
  }
}
