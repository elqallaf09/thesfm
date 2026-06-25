import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import {
  normalizeCompanyCategory,
  normalizeCompanyStatus,
  normalizeCompanyUpdateStatus,
  type CompanyListing,
} from '@/lib/companyListings';
import { normalizeCompanySocialUrl, type CompanySocialPlatform } from '@/lib/companySocialLinks';

export const COMPANY_LISTING_SELECT_COLUMNS = 'id,user_id,stripe_customer_id,stripe_subscription_id,company_name,category,country,city,full_address,google_maps_url,latitude,longitude,short_description,long_description,website_url,email,phone,whatsapp,linkedin_url,twitter_url,instagram_url,founded_year,license_number,regulator_name,services,logo_url,cover_image_url,status,update_status,pending_update,deletion_requested,deletion_requested_at,last_owner_update_at,admin_notes,reviewed_at,reviewed_by,is_featured,created_at,updated_at,approved_at';

function numericOrNull(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function cleanCompanyText(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function cleanCompanyUrl(value: unknown) {
  const raw = cleanCompanyText(value, 500);
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return null;
    if (/[^\x00-\x7F]/.test(url.toString())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function cleanCompanySocialUrl(value: unknown, platform: CompanySocialPlatform) {
  return normalizeCompanySocialUrl(value, platform);
}

export function hasInvalidCompanySocialUrl(value: unknown, platform: CompanySocialPlatform) {
  return cleanCompanyText(value, 500) !== '' && cleanCompanySocialUrl(value, platform) === null;
}

export function companyYearOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 1800 && parsed < 2200 ? Math.trunc(parsed) : null;
}

export async function getCompanyRequestUser(request: NextRequest) {
  const header = request.headers.get('authorization');
  const bearerToken = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('sfm_access_token')?.value ?? '';
  return getUserFromBearerToken(bearerToken || cookieToken);
}

export function normalizeCompanyListing(row: Record<string, unknown>): CompanyListing {
  return {
    id: String(row.id),
    user_id: row.user_id ? String(row.user_id) : null,
    stripe_customer_id: row.stripe_customer_id ? String(row.stripe_customer_id) : null,
    stripe_subscription_id: row.stripe_subscription_id ? String(row.stripe_subscription_id) : null,
    company_name: String(row.company_name ?? ''),
    category: normalizeCompanyCategory(row.category) ?? 'investment',
    country: row.country ? String(row.country) : null,
    city: row.city ? String(row.city) : null,
    full_address: row.full_address ? String(row.full_address) : null,
    google_maps_url: row.google_maps_url ? String(row.google_maps_url) : null,
    latitude: numericOrNull(row.latitude),
    longitude: numericOrNull(row.longitude),
    short_description: row.short_description ? String(row.short_description) : null,
    long_description: row.long_description ? String(row.long_description) : null,
    website_url: row.website_url ? String(row.website_url) : null,
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    whatsapp: row.whatsapp ? String(row.whatsapp) : null,
    linkedin_url: cleanCompanySocialUrl(row.linkedin_url, 'linkedin'),
    twitter_url: cleanCompanySocialUrl(row.twitter_url, 'twitter'),
    instagram_url: cleanCompanySocialUrl(row.instagram_url, 'instagram'),
    founded_year: typeof row.founded_year === 'number' ? row.founded_year : null,
    license_number: row.license_number ? String(row.license_number) : null,
    regulator_name: row.regulator_name ? String(row.regulator_name) : null,
    services: Array.isArray(row.services) ? row.services.map(item => String(item)) : null,
    logo_url: row.logo_url ? String(row.logo_url) : null,
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    status: normalizeCompanyStatus(row.status) ?? 'pending_review',
    update_status: normalizeCompanyUpdateStatus(row.update_status) ?? 'none',
    pending_update: row.pending_update && typeof row.pending_update === 'object' ? row.pending_update as Record<string, unknown> : null,
    deletion_requested: Boolean(row.deletion_requested),
    deletion_requested_at: row.deletion_requested_at ? String(row.deletion_requested_at) : null,
    last_owner_update_at: row.last_owner_update_at ? String(row.last_owner_update_at) : null,
    admin_notes: row.admin_notes ? String(row.admin_notes) : null,
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
    reviewed_by: row.reviewed_by ? String(row.reviewed_by) : null,
    is_featured: Boolean(row.is_featured),
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
    approved_at: row.approved_at ? String(row.approved_at) : null,
  };
}
