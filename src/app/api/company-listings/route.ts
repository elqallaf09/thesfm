import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { resolvePublicImageUrl } from '@/lib/server/imageUrlResolver';
import { isSmtpMailConfigured, sendSmtpMail } from '@/lib/server/smtpMail';
import {
  COMPANY_LISTING_SELECT_COLUMNS,
  cleanCompanyText,
  cleanCompanySocialUrl,
  cleanCompanyUrl,
  companyYearOrNull,
  hasInvalidCompanySocialUrl,
  getCompanyRequestUser,
  normalizeCompanyListing,
} from '@/lib/server/companyListingHelpers';
import {
  normalizeCompanyCategory,
  normalizeCompanyStatus,
  splitServices,
  type CompanyListing,
  type CompanyStatus,
} from '@/lib/companyListings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SELECT_COLUMNS = COMPANY_LISTING_SELECT_COLUMNS;
const COMPANY_REVIEW_EMAIL = 'SUPPORT@THE-SFM.COM';

type CompanyPayload = {
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

function escapeHtml(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function getActiveCompanyPlan(userId: string) {
  const admin = createServerSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from('user_subscriptions')
    .select('id,status,plan,billing_interval,current_period_end,stripe_customer_id,stripe_subscription_id')
    .eq('user_id', userId)
    .eq('plan', 'company')
    .eq('status', 'active')
    .limit(1);

  if (error) {
    console.warn('[company-listings] subscription check failed', { code: error.code, message: error.message });
    return null;
  }
  return (data?.[0] as { stripe_customer_id?: string | null; stripe_subscription_id?: string | null } | undefined) ?? null;
}

async function notifyCompanyReviewRequest(request: NextRequest, listing: CompanyListing, submitterEmail?: string | null) {
  if (!isSmtpMailConfigured()) {
    console.warn('[company-listings] review email skipped: SMTP is not configured');
    return;
  }

  const configuredTo = process.env.COMPANY_REVIEW_TO_EMAIL?.trim() || COMPANY_REVIEW_EMAIL;
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
  const reviewUrl = new URL('/sfm-admin-control/companies', siteOrigin).toString();
  const submittedAt = new Date().toLocaleString('ar-KW', { timeZone: 'Asia/Kuwait' });
  const subject = `طلب إدراج شركة جديد: ${listing.company_name}`;
  const text = [
    'يوجد طلب إدراج شركة جديد في THE SFM.',
    '',
    `اسم الشركة: ${listing.company_name}`,
    `التصنيف: ${listing.category}`,
    `الدولة: ${listing.country || 'غير محدد'}`,
    `المدينة: ${listing.city || 'غير محدد'}`,
    `البريد: ${listing.email || submitterEmail || 'غير محدد'}`,
    `الهاتف: ${listing.phone || 'غير محدد'}`,
    `الموقع: ${listing.website_url || 'غير محدد'}`,
    `وقت الإرسال: ${submittedAt}`,
    '',
    `رابط المراجعة: ${reviewUrl}`,
  ].join('\n');

  const html = `
    <div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;background:#f4fbff;padding:24px;color:#0b1b34">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #cfeefa;border-radius:18px;padding:24px">
        <p style="margin:0 0 8px;color:#0b9ead;font-weight:700">THE SFM</p>
        <h1 style="margin:0 0 14px;font-size:24px">طلب إدراج شركة جديد</h1>
        <p style="margin:0 0 20px;line-height:1.8">يوجد شركة تريد إضافة بياناتها إلى دليل الشركات. الرجاء مراجعة الطلب من لوحة الأدمن.</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 22px">
          <tr><td style="padding:8px;border-bottom:1px solid #e6f4f8;color:#64748b">اسم الشركة</td><td style="padding:8px;border-bottom:1px solid #e6f4f8;font-weight:700">${escapeHtml(listing.company_name)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e6f4f8;color:#64748b">التصنيف</td><td style="padding:8px;border-bottom:1px solid #e6f4f8">${escapeHtml(listing.category)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e6f4f8;color:#64748b">الدولة / المدينة</td><td style="padding:8px;border-bottom:1px solid #e6f4f8">${escapeHtml(listing.country || 'غير محدد')} - ${escapeHtml(listing.city || 'غير محدد')}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e6f4f8;color:#64748b">البريد</td><td style="padding:8px;border-bottom:1px solid #e6f4f8">${escapeHtml(listing.email || submitterEmail || 'غير محدد')}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e6f4f8;color:#64748b">الهاتف</td><td style="padding:8px;border-bottom:1px solid #e6f4f8">${escapeHtml(listing.phone || 'غير محدد')}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e6f4f8;color:#64748b">الموقع</td><td style="padding:8px;border-bottom:1px solid #e6f4f8">${escapeHtml(listing.website_url || 'غير محدد')}</td></tr>
          <tr><td style="padding:8px;color:#64748b">وقت الإرسال</td><td style="padding:8px">${escapeHtml(submittedAt)}</td></tr>
        </table>
        <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:linear-gradient(135deg,#22c7d8,#1689f2);color:#ffffff;text-decoration:none;font-weight:700;border-radius:999px;padding:13px 22px">مراجعة الطلب</a>
      </div>
    </div>
  `;

  try {
    await sendSmtpMail({
      to: configuredTo,
      subject,
      text,
      html,
      replyTo: listing.email || submitterEmail || undefined,
      fromName: 'THE SFM Companies',
    });
  } catch (error) {
    console.error('[company-listings] review email failed', {
      companyId: listing.id,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function GET(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'company-listings' });
  if (limited) return limited;

  const category = normalizeCompanyCategory(request.nextUrl.searchParams.get('category'));
  if (!category) return json({ ok: false, code: 'INVALID_CATEGORY', items: [] }, { status: 400 });

  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: true, items: [], stats: null, code: 'SERVICE_NOT_CONFIGURED' });

  const search = cleanCompanyText(request.nextUrl.searchParams.get('q'), 100).toLowerCase();
  const country = cleanCompanyText(request.nextUrl.searchParams.get('country'), 80);
  const city = cleanCompanyText(request.nextUrl.searchParams.get('city'), 80);
  const status = normalizeCompanyStatus(request.nextUrl.searchParams.get('status')) ?? 'approved';
  const publicStatus: CompanyStatus = status === 'approved' ? 'approved' : 'approved';

  try {
    let query = admin
      .from('company_listings')
      .select(SELECT_COLUMNS)
      .eq('category', category)
      .eq('status', publicStatus)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);

    if (country) query = query.ilike('country', `%${country}%`);
    if (city) query = query.ilike('city', `%${city}%`);

    const { data, error } = await query;
    if (error) throw error;
    const items = (data ?? []).map(row => normalizeCompanyListing(row as Record<string, unknown>))
      .filter(item => {
        if (!search) return true;
        const haystack = `${item.company_name} ${item.short_description ?? ''} ${item.country ?? ''} ${item.city ?? ''} ${(item.services ?? []).join(' ')}`.toLowerCase();
        return haystack.includes(search);
      });

    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return json({
      ok: true,
      items,
      stats: {
        total: items.length,
        approved: items.filter(item => item.status === 'approved').length,
        pending: 0,
        addedThisMonth: items.filter(item => item.created_at?.startsWith(monthPrefix)).length,
      },
    });
  } catch (error) {
    console.error('[company-listings] load failed', {
      category,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return json({ ok: false, code: 'LOAD_FAILED', items: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCompanyRequestUser(request);
  if (!user) return json({ ok: false, code: 'AUTH_REQUIRED' }, { status: 401 });

  const companyPlan = await getActiveCompanyPlan(user.id);
  if (!companyPlan) return json({ ok: false, code: 'PAYMENT_REQUIRED' }, { status: 402 });

  let payload: CompanyPayload;
  try {
    payload = await request.json() as CompanyPayload;
  } catch {
    return json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
  }

  const category = normalizeCompanyCategory(payload.category);
  const companyName = cleanCompanyText(payload.companyName, 160);
  if (!category || !companyName) return json({ ok: false, code: 'VALIDATION_ERROR' }, { status: 400 });
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

  const record = {
    user_id: user.id,
    stripe_customer_id: companyPlan.stripe_customer_id ?? null,
    stripe_subscription_id: companyPlan.stripe_subscription_id ?? null,
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
    status: 'pending_review',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from('company_listings')
    .insert(record)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    console.error('[company-listings] submit failed', { code: error.code, message: error.message });
    return json({ ok: false, code: 'SAVE_FAILED' }, { status: 500 });
  }

  const item = normalizeCompanyListing(data as Record<string, unknown>);
  await notifyCompanyReviewRequest(request, item, user.email);

  return json({ ok: true, item });
}
