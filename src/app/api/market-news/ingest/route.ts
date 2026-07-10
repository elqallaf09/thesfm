import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type { NewsFetchParams } from '@/lib/market-news/types';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function configuredSecret() {
  const value = process.env.CRON_SECRET?.trim() ?? '';
  if (!value || /^(your_|replace_|change_|example|placeholder)/i.test(value)) return '';
  return value;
}

function equalSecret(left: string, right: string) {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function hasCronAccess(request: Request) {
  const secret = configuredSecret();
  if (!secret) return false;
  const authorization = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
  const headerSecret = request.headers.get('x-cron-secret')?.trim() ?? '';
  return equalSecret(authorization, secret) || equalSecret(headerSecret, secret);
}

async function authorize(request: Request) {
  if (hasCronAccess(request)) return true;
  const admin = await requireAdminApiAccess(request, 'admin_dashboard');
  return admin.ok;
}

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function ingestionBatches(): NewsFetchParams[] {
  const common = {
    from: dateDaysAgo(14),
    to: new Date().toISOString().slice(0, 10),
    language: 'en' as const,
    limit: 160,
    forceRefresh: true,
  };
  return [
    { ...common, marketCodes: ['global', 'US'], query: 'financial markets stocks economy' },
    { ...common, marketCodes: ['europe'], countries: ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'CH'], query: 'European markets OR European stocks OR ECB OR eurozone economy' },
    { ...common, marketCodes: ['crypto'], assetTypes: ['crypto'], query: 'cryptocurrency markets regulation ETF' },
    { ...common, marketCodes: ['gulf'], countries: ['KW', 'SA', 'AE', 'QA', 'BH', 'OM'], query: 'stocks OR market OR earnings OR disclosures OR economy OR أسهم OR السوق OR أرباح OR إفصاح OR الاقتصاد OR شركات OR بورصة' },
  ];
}

async function runIngestion(request: Request) {
  if (!await authorize(request)) {
    return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const startedAt = Date.now();
  const batches = ingestionBatches();
  const results = new Array<Awaited<ReturnType<typeof aggregateFinancialNews>>>(batches.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < batches.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await aggregateFinancialNews(batches[index], {
        mode: 'ingest',
        page: 1,
        pageSize: 60,
        sort: 'importance',
        forceExternal: true,
      });
    }
  };
  const settled = await Promise.allSettled([worker(), worker()]);
  const completed = results.filter(Boolean);
  const providerCoverage = completed.flatMap(result => result.providerCoverage);
  const failedBatches = settled.filter(result => result.status === 'rejected').length + (batches.length - completed.length);

  return NextResponse.json({
    ok: completed.length > 0,
    code: failedBatches > 0 ? 'NEWS_INGESTION_PARTIAL' : null,
    batchCount: batches.length,
    completedBatches: completed.length,
    failedBatches,
    storyCount: completed.reduce((total, result) => total + result.total, 0),
    providerCount: providerCoverage.length,
    successfulProviders: providerCoverage.filter(provider => provider.status === 'success').length,
    failedProviders: providerCoverage.filter(provider => provider.status === 'failed').length,
    durationMs: Date.now() - startedAt,
    updatedAt: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(request: Request) {
  return runIngestion(request);
}

export async function POST(request: Request) {
  return runIngestion(request);
}
