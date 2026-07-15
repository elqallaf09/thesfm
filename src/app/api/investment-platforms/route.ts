import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import {
  cleanPlatformName,
  cleanPlatformType,
  cleanPlatformWebsite,
  normalizePlatformName,
  platformRowToDirectoryItem,
  platformSlug,
  PlatformValidationError,
} from '@/lib/investments/platformDirectory';
import { createServerSupabaseAdmin, getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { INVESTMENT_PLATFORM_TYPES, type InvestmentPlatformType } from '@/types/investmentPlatform';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_COLUMNS = 'id,canonical_name,normalized_name,slug,platform_type,website_url,logo_url,country_code,aliases,status,is_seeded';

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}

function positiveInt(value: string | null, fallback: number, maximum: number) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return fallback;
  return Math.min(number, maximum);
}

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 90, windowMs: 60_000, prefix: 'investment-platform-list' });
  if (limited) return limited;

  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: false, code: 'PLATFORM_DIRECTORY_UNAVAILABLE' }, 503);

  const url = new URL(request.url);
  const query = normalizePlatformName(url.searchParams.get('q') ?? '').slice(0, 80);
  const requestedType = url.searchParams.get('type');
  const platformType = requestedType && INVESTMENT_PLATFORM_TYPES.includes(requestedType as InvestmentPlatformType) ? requestedType : null;
  const page = positiveInt(url.searchParams.get('page'), 1, 1000);
  const limit = positiveInt(url.searchParams.get('limit'), 25, 50);
  const from = (page - 1) * limit;

  let directoryQuery = admin
    .from('investment_platforms')
    .select(PUBLIC_COLUMNS, { count: 'exact' })
    .eq('status', 'approved')
    .order('is_seeded', { ascending: false })
    .order('canonical_name', { ascending: true })
    .range(from, from + limit - 1);

  if (platformType) directoryQuery = directoryQuery.eq('platform_type', platformType);
  if (query) directoryQuery = directoryQuery.ilike('normalized_name', `${query}%`);

  const { data, error, count } = await directoryQuery;
  if (error) {
    console.error('[investment-platforms] list failed', { code: error.code, message: error.message });
    return json({ ok: false, code: 'PLATFORM_DIRECTORY_LOAD_FAILED' }, 500);
  }

  return json({
    ok: true,
    items: (data ?? []).map(row => platformRowToDirectoryItem(row as Record<string, unknown>)),
    page,
    limit,
    total: count ?? 0,
  });
}

export async function POST(request: Request) {
  const limited = rateLimitRequest(request, { max: 6, windowMs: 10 * 60_000, prefix: 'investment-platform-submit' });
  if (limited) return limited;

  const user = await getCurrentUserFromRequest(request);
  if (!user) return json({ ok: false, code: 'AUTH_REQUIRED' }, 401);

  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: false, code: 'PLATFORM_DIRECTORY_UNAVAILABLE' }, 503);

  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const canonicalName = cleanPlatformName(body?.name);
    const normalizedName = normalizePlatformName(canonicalName);
    const platformType = cleanPlatformType(body?.platformType);
    const websiteUrl = cleanPlatformWebsite(body?.websiteUrl);

    const { data: existing, error: existingError } = await admin
      .from('investment_platforms')
      .select(PUBLIC_COLUMNS)
      .eq('normalized_name', normalizedName)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[investment-platforms] duplicate lookup failed', { code: existingError.code, message: existingError.message });
      return json({ ok: false, code: 'PLATFORM_SUBMISSION_FAILED' }, 500);
    }

    if (existing) {
      const item = platformRowToDirectoryItem(existing as Record<string, unknown>);
      if (item.status === 'approved' || item.status === 'pending') {
        return json({ ok: true, item, existing: true }, item.status === 'pending' ? 202 : 200);
      }
      return json({ ok: false, code: 'PLATFORM_NOT_ACCEPTING_SUBMISSIONS' }, 409);
    }

    const id = randomUUID();
    const baseSlug = platformSlug(canonicalName);
    const { data, error } = await admin
      .from('investment_platforms')
      .insert({
        id,
        canonical_name: canonicalName,
        normalized_name: normalizedName,
        slug: `${baseSlug}-${id.slice(0, 8)}`.slice(0, 100),
        platform_type: platformType,
        website_url: websiteUrl,
        logo_url: null,
        aliases: [],
        status: 'pending',
        is_seeded: false,
        created_by: user.id,
      })
      .select(PUBLIC_COLUMNS)
      .single();

    if (error || !data) {
      if (error?.code === '23505') {
        const { data: duplicate } = await admin
          .from('investment_platforms')
          .select(PUBLIC_COLUMNS)
          .eq('normalized_name', normalizedName)
          .maybeSingle();
        if (duplicate) {
          const item = platformRowToDirectoryItem(duplicate as Record<string, unknown>);
          if (item.status === 'approved' || item.status === 'pending') {
            return json({ ok: true, item, existing: true }, item.status === 'pending' ? 202 : 200);
          }
          return json({ ok: false, code: 'PLATFORM_NOT_ACCEPTING_SUBMISSIONS' }, 409);
        }
      }
      console.error('[investment-platforms] submission failed', { code: error?.code, message: error?.message });
      return json({ ok: false, code: 'PLATFORM_SUBMISSION_FAILED' }, 500);
    }

    return json({ ok: true, item: platformRowToDirectoryItem(data as Record<string, unknown>), existing: false }, 202);
  } catch (error) {
    if (error instanceof PlatformValidationError) return json({ ok: false, code: error.code }, 400);
    console.error('[investment-platforms] invalid submission', { message: error instanceof Error ? error.message : String(error) });
    return json({ ok: false, code: 'INVALID_REQUEST' }, 400);
  }
}
