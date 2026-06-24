import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildTraderHealthPayload, normalizeTraderCompatPath, TRADER_MARKET_CATEGORIES } from '@/lib/trader/compatApi';
import type { TraderStatus } from '@/lib/trader/types';

function readProjectFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('thesfm trader compatibility API', () => {
  it('does not fall back to localhost or a private loopback API destination', () => {
    const route = readProjectFile('src/app/api/thesfm-trader/[...path]/route.ts');

    expect(route).not.toContain('127.0.0.1');
    expect(route).not.toContain('localhost');
    expect(route).not.toContain('THE_SFM_TRADER_API_BASE_URL');
  });

  it('keeps trader static assets on relative internal API routes', () => {
    const staticRoute = readProjectFile('src/app/thesfm-trader-own/app/[[...path]]/route.ts');

    expect(staticRoute).not.toContain('/api/thesfm-trader/');
    expect(staticRoute).not.toContain('fetch("/api/thesfm-trader/');
  });

  it('normalizes older cached trader API paths without self-fetching', () => {
    expect(normalizeTraderCompatPath(['trader', 'scanner', 'results'])).toEqual(['scanner', 'results']);
    expect(normalizeTraderCompatPath(['recommendations'])).toEqual(['recommendations']);
  });

  it('exposes all trader market categories with correct Kuwait currency', () => {
    const ids = new Set(TRADER_MARKET_CATEGORIES.map((market) => market.id));
    for (const id of ['forex', 'us-stocks', 'crypto', 'commodities', 'gulf-markets', 'saudi', 'kuwait', 'uae', 'qatar', 'bahrain', 'oman', 'european-stocks', 'asian-stocks', 'technology-stocks', 'food-stocks', 'pharma-stocks', 'banking-stocks', 'energy-stocks', 'ai-stocks', 'semiconductors']) {
      expect(ids.has(id)).toBe(true);
    }

    expect(TRADER_MARKET_CATEGORIES.find((market) => market.id === 'kuwait')?.currency).toBe('KWD');
    expect(TRADER_MARKET_CATEGORIES.some((market) => market.currency === 'KWF')).toBe(false);
  });

  it('reports health without exposing transport internals', () => {
    const unavailable: TraderStatus = {
      marketData: { configured: true, connected: false, provider: 'Yahoo Finance', delayed: true, lastSuccessfulUpdate: null },
      scanner: {
        running: false,
        lastScanStartedAt: null,
        lastScanCompletedAt: null,
        scannedAssets: 0,
        generatedSignals: 0,
        lastErrorCode: 'NO_SUPPORTED_PROVIDER_RESULTS',
      },
    };
    const healthy: TraderStatus = {
      marketData: { configured: true, connected: true, provider: 'Yahoo Finance', delayed: true, lastSuccessfulUpdate: '2026-06-24T10:00:00.000Z' },
      scanner: {
        running: false,
        lastScanStartedAt: '2026-06-24T09:59:00.000Z',
        lastScanCompletedAt: '2026-06-24T10:00:00.000Z',
        scannedAssets: 20,
        generatedSignals: 5,
        lastErrorCode: null,
      },
    };

    expect(buildTraderHealthPayload(unavailable)).toMatchObject({
      status: 'unavailable',
      marketData: 'unavailable',
      recommendations: 'unavailable',
      scanner: 'unavailable',
    });
    expect(buildTraderHealthPayload(healthy)).toMatchObject({
      status: 'ok',
      marketData: 'available',
      recommendations: 'available',
      scanner: 'available',
      lastSuccessfulUpdate: '2026-06-24T10:00:00.000Z',
    });
  });
});
