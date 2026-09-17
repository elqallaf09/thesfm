import { NextResponse } from 'next/server';
import { listSfmMarketSources, sfmPrimarySourceReadiness } from '@/lib/sfm-market/sourceRegistry';
import { SFM_MARKET_ENGINE_NAME, SFM_MARKET_ENGINE_VERSION, SFM_MARKET_SCHEMA_VERSION } from '@/lib/sfm-market/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sources = listSfmMarketSources();
  return NextResponse.json({
    ok: true,
    engine: SFM_MARKET_ENGINE_NAME,
    engineVersion: SFM_MARKET_ENGINE_VERSION,
    schemaVersion: SFM_MARKET_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    readiness: sfmPrimarySourceReadiness(),
    sources,
    rules: {
      publicPageIsNotAFeed: true,
      licenseRequiredBeforeRedistribution: true,
      provenanceRequired: true,
      fabricatedMarketValues: false,
    },
  }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
