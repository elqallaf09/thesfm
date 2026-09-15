import { NextRequest, NextResponse } from 'next/server';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import { analyzeRealEstateAsset } from '@/lib/investments/intelligence/analyst';
import { assessRealEstateReadiness } from '@/lib/investments/intelligence/readiness';
import type { RealEstateAssetInput } from '@/lib/investments/intelligence/real-estate';

export const runtime = 'nodejs';
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
const bearer = (request: NextRequest) => request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;

function validAsset(value: unknown): value is RealEstateAssetInput {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<RealEstateAssetInput>;
  return typeof item.countryCode === 'string' && /^[A-Z]{2}$/.test(item.countryCode) && typeof item.propertyType === 'string' && item.propertyType.length > 0;
}

export async function POST(request: NextRequest) {
  const token = bearer(request);
  const user = token ? await getUserFromBearerToken(token) : null;
  if (!user?.id) return reply({ ok: false, code: 'UNAUTHORIZED' }, 401);
  let body: { asset?: unknown; outputCurrency?: unknown };
  try { body = await request.json(); } catch { return reply({ ok: false, code: 'INVALID_JSON' }, 400); }
  if (!validAsset(body.asset)) return reply({ ok: false, code: 'INVALID_ASSET' }, 400);
  const outputCurrency = typeof body.outputCurrency === 'string' && /^[A-Z]{3}$/.test(body.outputCurrency) ? body.outputCurrency : 'USD';
  const preflight = assessRealEstateReadiness(body.asset, []);
  if (!preflight.checks.assetIdentity || !preflight.checks.area) return reply({ ok: false, code: 'ASSET_DETAILS_INCOMPLETE', readiness: preflight }, 422);
  const analysis = await analyzeRealEstateAsset(body.asset, outputCurrency, []);
  return reply({ ok: true, analysis, readiness: preflight });
}
