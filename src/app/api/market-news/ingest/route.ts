import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type { NewsFetchParams } from '@/lib/market-news/types';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
// ADMIN_API_POLICY_EXCEPTION: cron-or-admin-news-ingest

// Two workers each process at most two batches. Bound every provider window so
// a slow regional feed cannot consume the entire Vercel function lifetime and
// discard the batches that already persisted successfully.
const PROVIDER_BUDGET_MS = 12_000;
// Leave enough headroom for Next.js to serialize the response before Vercel's
// 60 second hard limit. A database write can occasionally stall after the
// provider window has completed, so the route also needs an end-to-end budget.
const INGESTION_BUDGET_MS = 45_000;

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
    // Market scope selects the right providers. A generic text query here
    // would discard official issuer notices whose titles do not contain our
    // chosen keywords (for example a property purchase announcement).
    { ...common, marketCodes: ['gulf'], countries: ['KW', 'SA', 'AE', 'QA', 'BH', 'OM'] },
  ];
}

async function runIngestion(request: Request) {
  if (!await authorize(request)) {
    return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const startedAt = Date.now();
  const batches = ingestionBatches();
  const results = new Array<Awaited<ReturnType<typeof aggregateFinancialNews>>>(batches.length);
  const controller = new AbortController();
  let cursor = 0;
  const worker = async () => {
    while (cursor < batches.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await aggregateFinancialNews({ ...batches[index], signal: controller.signal }, {
        mode: 'ingest',
        page: 1,
        pageSize: 60,
        sort: 'importance',
        forceExternal: true,
        providerBudgetMs: PROVIDER_BUDGET_MS,
      });
    }
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<'deadline'>(resolve => {
    timer = setTimeout(() => {
      controller.abort(new Error('NEWS_INGESTION_DEADLINE'));
      resolve('deadline');
    }, INGESTION_BUDGET_MS);
    timer.unref?.();
  });
  const outcome = await Promise.race([
    Promise.allSettled([worker(), worker()]).then(() => 'settled' as const),
    deadline,
  ]);
  if (timer) clearTimeout(timer);
  const completed = results.filter(Boolean);
  const providerCoverage = completed.flatMap(result => result.providerCoverage);
  const failedBatches = batches.length - completed.length;

  return NextResponse.json({
    ok: completed.length > 0,
    code: failedBatches > 0 ? 'NEWS_INGESTION_PARTIAL' : null,
    batchCount: batches.length,
    completedBatches: completed.length,
    failedBatches,
    deadlineExceeded: outcome === 'deadline',
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
