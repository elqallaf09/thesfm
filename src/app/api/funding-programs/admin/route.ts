import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FUNDING_TYPES = new Set([
  'bank_loan',
  'sme_financing',
  'government_support',
  'startup_grant',
  'investor_funding',
  'revenue_based_financing',
  'crowdfunding',
  'self_funding',
  'government_fund',
  'angel',
  'venture_capital',
  'accelerator',
  'incubator',
  'islamic_finance',
  'grant',
  'strategic_partner',
  'other',
]);

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(init?.headers ?? {}),
    },
  });
}

function cleanString(value: unknown, maxLength = 2000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function cleanNumber(value: unknown) {
  const number = typeof value === 'number' ? value : Number(cleanString(value, 40));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function linesToJson(value: unknown) {
  const lines = cleanString(value, 8000)
    .split(/\r?\n|;/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 30);
  return lines.length ? lines : null;
}

function normalizeUrl(value: unknown) {
  const url = cleanString(value, 600);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiAccess(request, 'business_management');
  if (!auth.ok) return json({ ok: false, code: auth.code }, { status: auth.status });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
  }

  const nameAr = cleanString(payload.name_ar ?? payload.nameAr, 240);
  const nameEn = cleanString(payload.name_en ?? payload.nameEn, 240) || null;
  const fundingType = cleanString(payload.funding_type ?? payload.fundingType, 80) || 'other';
  const officialUrl = normalizeUrl(payload.official_url ?? payload.officialUrl);
  if (!nameAr || !officialUrl || !FUNDING_TYPES.has(fundingType)) {
    return json({ ok: false, code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const minAmount = cleanNumber(payload.min_amount ?? payload.minAmount);
  const maxAmount = cleanNumber(payload.max_amount ?? payload.maxAmount);
  if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
    return json({ ok: false, code: 'INVALID_AMOUNT_RANGE' }, { status: 400 });
  }

  const admin = auth.admin;

  const record = {
    name_ar: nameAr,
    name_en: nameEn,
    country: cleanString(payload.country, 120) || null,
    funding_type: fundingType,
    provider_type: cleanString(payload.provider_type ?? payload.providerType, 120) || null,
    currency: cleanString(payload.currency, 8).toUpperCase() || 'KWD',
    min_amount: minAmount,
    max_amount: maxAmount,
    eligibility_requirements: linesToJson(payload.eligibility_requirements ?? payload.eligibilityRequirements),
    required_documents: linesToJson(payload.required_documents ?? payload.requiredDocuments),
    official_url: officialUrl,
    is_verified: Boolean(payload.is_verified ?? payload.isVerified),
    source_name: cleanString(payload.source_name ?? payload.sourceName, 220) || null,
    business_activity: cleanString(payload.business_activity ?? payload.businessActivity, 140) || null,
    required_readiness_score: cleanNumber(payload.required_readiness_score ?? payload.requiredReadinessScore) ?? 70,
    notes: cleanString(payload.notes, 2000) || null,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from('funding_programs')
    .insert(record)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[funding-programs] admin insert failed', { code: error.code, message: error.message });
    return json({ ok: false, code: 'INSERT_FAILED' }, { status: 500 });
  }

  return json({ ok: true, item: data });
}
