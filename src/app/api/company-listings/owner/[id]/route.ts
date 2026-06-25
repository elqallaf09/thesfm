import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { resolvePublicImageUrl } from '@/lib/server/imageUrlResolver';
import {
  COMPANY_LISTING_SELECT_COLUMNS,
  cleanCompanyText,
  cleanCompanySocialUrl,
  cleanCompanyUrl,
  companyYearOrNull,
  getCompanyRequestUser,
  hasInvalidCompanySocialUrl,
  normalizeCompanyListing,
} from '@/lib/server/companyListingHelpers';
import { normalizeCompanyCategory, splitServices } from '@/lib/companyListings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OwnerPayload = {
  companyName?: unknown;
  category?: unknown;
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

async function ownerCompany(id: string, userId: string) {
  const admin = createServerSupabaseAdmin();
  if (!admin) return { admin: null, company: null, error: 'SERVICE_NOT_CONFIGURED' };
  const { data, error } = await admin
    .from('company_listings')
    .select(COMPANY_LISTING_SELECT_COLUMNS)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[company-listings/owner] lookup failed', { id, code: error.code, message: error.message });
    return { admin, company: null, error: 'LOAD_FAILED' };
  }
  return { admin, company: data ? normalizeCompanyListing(data as Record<string, unknown>) : null, error: null };
}

async function buildUpdateRecord(payload: OwnerPayload) {
  const category = normalizeCompanyCategory(payload.category);
  const companyName = cleanCompanyText(payload.companyName, 160);
  if (!category || !companyName) return { error: 'VALIDATION_ERROR' as const, record: null };
  if (
    hasInvalidOptionalUrl(payload.websiteUrl) ||
    hasInvalidCompanySocialUrl(payload.linkedinUrl, 'linkedin') ||
    hasInvalidCompanySocialUrl(payload.twitterUrl, 'twitter') ||
    hasInvalidCompanySocialUrl(payload.instagramUrl, 'instagram') ||
    hasInvalidOptionalUrl(payload.logoUrl) ||
    hasInvalidOptionalUrl(payload.coverImageUrl) ||
    hasInvalidOptionalUrl(payload.googleMapsUrl) ||
    !isValidOptionalEmail(payload.email) ||
    !isValidOptionalPhone(payload.phone) ||
    !isValidOptionalPhone(payload.whatsapp)
  ) {
    return { error: 'VALIDATION_ERROR' as const, record: null };
  }

  const logoUrl = cleanCompanyUrl(payload.logoUrl);
  const coverImageUrl = cleanCompanyUrl(payload.coverImageUrl);
  const resolvedLogo = logoUrl ? await resolvePublicImageUrl(logoUrl) : null;
  const resolvedCoverImage = coverImageUrl ? await resolvePublicImageUrl(coverImageUrl) : null;
  if ((logoUrl && !resolvedLogo?.ok) || (coverImageUrl && !resolvedCoverImage?.ok)) {
    return { error: 'IMAGE_URL_NOT_RESOLVED' as const, record: null };
  }

  return {
    error: null,
    record: {
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
      linkedin_url: cleanCompanySocialUrl(payload.linkedinUrl, 'linkedin'),
      twitter_url: cleanCompanySocialUrl(payload.twitterUrl, 'twitter'),
      instagram_url: cleanCompanySocialUrl(payload.instagramUrl, 'instagram'),
      founded_year: companyYearOrNull(payload.foundedYear),
      license_number: cleanCompanyText(payload.licenseNumber, 180) || null,
      regulator_name: cleanCompanyText(payload.regulatorName, 180) || null,
      services: splitServices(payload.services),
      logo_url: resolvedLogo?.ok ? resolvedLogo.imageUrl : null,
      cover_image_url: resolvedCoverImage?.ok ? resolvedCoverImage.imageUrl : null,
    },
  };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCompanyRequestUser(request);
  if (!user) return json({ ok: false, code: 'AUTH_REQUIRED' }, { status: 401 });
  const { id } = await context.params;
  const { admin, company, error } = await ownerCompany(id, user.id);
  if (!admin) return json({ ok: false, code: error }, { status: 503 });
  if (!company) return json({ ok: false, code: error ?? 'NOT_FOUND' }, { status: error ? 500 : 404 });

  let payload: OwnerPayload;
  try {
    payload = await request.json() as OwnerPayload;
  } catch {
    return json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
  }

  const { record, error: validationError } = await buildUpdateRecord(payload);
  if (!record) return json({ ok: false, code: validationError }, { status: 400 });

  const now = new Date().toISOString();
  const updatePayload = company.status === 'approved'
    ? {
        pending_update: record,
        update_status: 'pending_update',
        deletion_requested: false,
        deletion_requested_at: null,
        last_owner_update_at: now,
      }
    : {
        ...record,
        status: 'pending_review',
        update_status: 'none',
        pending_update: null,
        deletion_requested: false,
        deletion_requested_at: null,
        admin_notes: null,
        reviewed_at: null,
        reviewed_by: null,
        last_owner_update_at: now,
      };

  const { data, error: updateError } = await admin
    .from('company_listings')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(COMPANY_LISTING_SELECT_COLUMNS)
    .single();

  if (updateError) {
    console.error('[company-listings/owner] update failed', { id, code: updateError.code, message: updateError.message });
    return json({ ok: false, code: 'SAVE_FAILED' }, { status: 500 });
  }

  return json({
    ok: true,
    item: normalizeCompanyListing(data as Record<string, unknown>),
    pendingReview: company.status === 'approved',
  });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCompanyRequestUser(request);
  if (!user) return json({ ok: false, code: 'AUTH_REQUIRED' }, { status: 401 });
  const { id } = await context.params;
  const { admin, company, error } = await ownerCompany(id, user.id);
  if (!admin) return json({ ok: false, code: error }, { status: 503 });
  if (!company) return json({ ok: false, code: error ?? 'NOT_FOUND' }, { status: error ? 500 : 404 });

  if (company.status === 'approved') {
    const now = new Date().toISOString();
    const { data, error: updateError } = await admin
      .from('company_listings')
      .update({
        deletion_requested: true,
        deletion_requested_at: now,
        update_status: 'deletion_requested',
        last_owner_update_at: now,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select(COMPANY_LISTING_SELECT_COLUMNS)
      .single();

    if (updateError) {
      console.error('[company-listings/owner] deletion request failed', { id, code: updateError.code, message: updateError.message });
      return json({ ok: false, code: 'SAVE_FAILED' }, { status: 500 });
    }
    return json({ ok: true, deletionRequested: true, item: normalizeCompanyListing(data as Record<string, unknown>) });
  }

  const { error: deleteError } = await admin
    .from('company_listings')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('[company-listings/owner] delete failed', { id, code: deleteError.code, message: deleteError.message });
    return json({ ok: false, code: 'DELETE_FAILED' }, { status: 500 });
  }

  return json({ ok: true, deleted: true });
}
