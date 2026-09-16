import { NextRequest, NextResponse } from 'next/server';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
import { analyzeRealEstateAsset } from '@/lib/investments/intelligence/analyst';
import { assessRealEstateReadiness } from '@/lib/investments/intelligence/readiness';
import { parseRealEstateAsset, readPropertyJson } from '@/lib/investments/intelligence/request-validation';

export const runtime = 'nodejs';
export const maxDuration = 60;
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Vary: 'Authorization' };
const reply = (body: unknown, status = 200, extra: Record<string, string> = {}) => NextResponse.json(body, { status, headers: { ...PRIVATE_HEADERS, ...extra } });

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const user = token ? await getUserFromBearerToken(token) : null;
    if (!user?.id) return reply({ ok: false, code: 'UNAUTHORIZED' }, 401);
    const rate = checkRateLimitWithMetadata(user.id, { max: 6, windowMs: 60_000, prefix: 'property-analysis' });
    if (!rate.allowed) return reply({ ok: false, code: 'RATE_LIMITED' }, 429, { 'Retry-After': String(rate.retryAfterSeconds) });
    let raw: unknown;
    try { raw = await readPropertyJson(request); } catch (error) {
      const oversized = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE';
      return reply({ ok: false, code: oversized ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON' }, oversized ? 413 : 400);
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return reply({ ok: false, code: 'INVALID_ASSET' }, 400);
    const body = raw as Record<string, unknown>;
    const asset = parseRealEstateAsset(body.asset);
    if (!asset) return reply({ ok: false, code: 'INVALID_ASSET' }, 400);
    if (body.outputCurrency !== undefined && (typeof body.outputCurrency !== 'string' || !/^[A-Z]{3}$/.test(body.outputCurrency))) return reply({ ok: false, code: 'INVALID_CURRENCY' }, 400);
    const outputCurrency = typeof body.outputCurrency === 'string' ? body.outputCurrency : 'USD';
    const preflight = assessRealEstateReadiness(asset, []);
    if (!preflight.checks.assetIdentity || !preflight.checks.area) return reply({ ok: false, code: 'ASSET_DETAILS_INCOMPLETE', readiness: preflight }, 422);
    const analysis = await analyzeRealEstateAsset(asset, outputCurrency, []);
    return reply({ ok: true, analysis, readiness: preflight });
  } catch { return reply({ ok: false, code: 'ANALYSIS_UNAVAILABLE' }, 503); }
}
