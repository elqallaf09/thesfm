import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  createServerSupabaseAdmin,
  getUserFromBearerToken,
  isAdminAccessCodeConfigured,
  isAdminEmail,
  verifyAdminSessionToken,
} from '@/lib/server/adminAccess';
import { normalizeCompanyCategory, normalizeCompanyStatus, splitServices } from '@/lib/companyListings';
import { resolvePublicImageUrl } from '@/lib/server/imageUrlResolver';
import {
  COMPANY_LISTING_SELECT_COLUMNS,
  cleanCompanyText,
  cleanCompanyUrl,
  companyYearOrNull,
  normalizeCompanyListing,
} from '@/lib/server/companyListingHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SELECT_COLUMNS = COMPANY_LISTING_SELECT_COLUMNS;

type AdminCompanyPayload = {
  companyName?: unknown;
  category?: unknown;
  status?: unknown;
  country?: unknown;
  city?: unknown;
  fullAddress?: unknown;
  googleMapsUrl?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  shortDescription?: unknown;
  longDescription?: unknown;
  websiteUrl?: unknown;
  email?: unknown;
  phone?: unknown;
  whatsapp?: unknown;
  linkedinUrl?: unknown;
  twitterUrl?: unknown;
  instagramUrl?: unknown;
  foundedYear?: unknown;
  licenseNumber?: unknown;
  regulatorName?: unknown;
  services?: unknown;
  logoUrl?: unknown;
  coverImageUrl?: unknown;
  isFeatured?: unknown;
  adminNotes?: unknown;
};

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(init?.headers ?? {}),
    },
  });
}

async function currentUser(request: NextRequest) {
  const header = request.headers.get('authorization');
  const bearerToken = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('sfm_access_token')?.value ?? '';
  return getUserFromBearerToken(bearerToken || cookieToken);
}

async function requireAdmin(request: NextRequest) {
  const user = await currentUser(request);
  if (!user || !isAdminEmail(user.email)) return null;
  if (isAdminAccessCodeConfigured()) {
    const cookieStore = await cookies();
    if (!verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value, user)) return 'code_required' as const;
  }
  return user;
}

function hasInvalidOptionalUrl(value: unknown) {
  return cleanCompanyText(value, 500) !== '' && cleanCompanyUrl(value) === null;
}

function isValidOptionalEmail(value: unknown) {
  const raw = cleanCompanyText(value, 180);
  return !raw || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}

function isValidOptionalPhone(value: unknown) {
  const raw = cleanCompanyText(value, 80);
  return !raw || /^\+\d{1,4}\s?\d{5,18}$/.test(raw);
}

function coordinateOrNull(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  if (user === 'code_required') return json({ ok: false, code: 'ADMIN_CODE_REQUIRED' }, { status: 428 });
  if (!user) return json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });

  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, { status: 503 });

  const { data, error } = await admin
    .from('company_listings')
    .select(SELECT_COLUMNS)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[company-listings] admin load failed', { code: error.code, message: error.message });
    return json({ ok: false, code: 'LOAD_FAILED' }, { status: 500 });
  }

  return json({ ok: true, items: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin(request);
  if (user === 'code_required') return json({ ok: false, code: 'ADMIN_CODE_REQUIRED' }, { status: 428 });
  if (!user) return json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });

  let payload: { id?: unknown; status?: unknown };
  try {
    payload = await request.json() as { id?: unknown; status?: unknown };
  } catch {
    return json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
  }

  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  const status = normalizeCompanyStatus(payload.status);
  if (!id || !status || status === 'pending_review') {
    return json({ ok: false, code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, { status: 503 });

  const { error } = await admin
    .from('company_listings')
    .update({
      status,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[company-listings] admin update failed', { id, status, code: error.code, message: error.message });
    return json({ ok: false, code: 'UPDATE_FAILED' }, { status: 500 });
  }

  return json({ ok: true });
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin(request);
  if (user === 'code_required') return json({ ok: false, code: 'ADMIN_CODE_REQUIRED' }, { status: 428 });
  if (!user) return json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });

  let payload: AdminCompanyPayload;
  try {
    payload = await request.json() as AdminCompanyPayload;
  } catch {
    return json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
  }

  const category = normalizeCompanyCategory(payload.category);
  const status = normalizeCompanyStatus(payload.status) ?? 'approved';
  const companyName = cleanCompanyText(payload.companyName, 160);

  if (!category || !companyName) {
    return json({ ok: false, code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  if (
    hasInvalidOptionalUrl(payload.websiteUrl) ||
    hasInvalidOptionalUrl(payload.linkedinUrl) ||
    hasInvalidOptionalUrl(payload.twitterUrl) ||
    hasInvalidOptionalUrl(payload.instagramUrl) ||
    hasInvalidOptionalUrl(payload.logoUrl) ||
    hasInvalidOptionalUrl(payload.coverImageUrl) ||
    hasInvalidOptionalUrl(payload.googleMapsUrl) ||
    !isValidOptionalEmail(payload.email) ||
    !isValidOptionalPhone(payload.phone) ||
    !isValidOptionalPhone(payload.whatsapp)
  ) {
    return json({ ok: false, code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, { status: 503 });

  const logoUrl = cleanCompanyUrl(payload.logoUrl);
  const coverImageUrl = cleanCompanyUrl(payload.coverImageUrl);
  const resolvedLogo = logoUrl ? await resolvePublicImageUrl(logoUrl) : null;
  const resolvedCoverImage = coverImageUrl ? await resolvePublicImageUrl(coverImageUrl) : null;

  if ((logoUrl && !resolvedLogo?.ok) || (coverImageUrl && !resolvedCoverImage?.ok)) {
    return json({ ok: false, code: 'IMAGE_URL_NOT_RESOLVED' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const isApproved = status === 'approved';
  const adminNote = cleanCompanyText(payload.adminNotes, 800)
    || 'Admin-created company listing. Payment was waived by an authorized administrator.';

  const record = {
    user_id: user.id,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    company_name: companyName,
    category,
    country: cleanCompanyText(payload.country, 100) || null,
    city: cleanCompanyText(payload.city, 100) || null,
    full_address: cleanCompanyText(payload.fullAddress, 420) || null,
    google_maps_url: cleanCompanyUrl(payload.googleMapsUrl),
    latitude: coordinateOrNull(payload.latitude, -90, 90),
    longitude: coordinateOrNull(payload.longitude, -180, 180),
    short_description: cleanCompanyText(payload.shortDescription, 320) || null,
    long_description: cleanCompanyText(payload.longDescription, 2500) || null,
    website_url: cleanCompanyUrl(payload.websiteUrl),
    email: cleanCompanyText(payload.email, 180).toUpperCase() || null,
    phone: cleanCompanyText(payload.phone, 80) || null,
    whatsapp: cleanCompanyText(payload.whatsapp, 80) || null,
    linkedin_url: cleanCompanyUrl(payload.linkedinUrl),
    twitter_url: cleanCompanyUrl(payload.twitterUrl),
    instagram_url: cleanCompanyUrl(payload.instagramUrl),
    founded_year: companyYearOrNull(payload.foundedYear),
    license_number: cleanCompanyText(payload.licenseNumber, 180) || null,
    regulator_name: cleanCompanyText(payload.regulatorName, 180) || null,
    services: splitServices(payload.services),
    logo_url: resolvedLogo?.ok ? resolvedLogo.imageUrl : null,
    cover_image_url: resolvedCoverImage?.ok ? resolvedCoverImage.imageUrl : null,
    status,
    update_status: 'none',
    pending_update: null,
    deletion_requested: false,
    deletion_requested_at: null,
    admin_notes: adminNote,
    reviewed_at: now,
    reviewed_by: user.email ?? null,
    is_featured: Boolean(payload.isFeatured),
    approved_at: isApproved ? now : null,
    updated_at: now,
  };

  const { data, error } = await admin
    .from('company_listings')
    .insert(record)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    console.error('[company-listings] admin create failed', { code: error.code, message: error.message });
    return json({ ok: false, code: 'SAVE_FAILED' }, { status: 500 });
  }

  return json({ ok: true, item: normalizeCompanyListing(data as Record<string, unknown>) });
}
