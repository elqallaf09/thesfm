import { NextResponse } from 'next/server';

type CachedMetalsPrice = {
  success: boolean;
  source: 'api' | 'manual' | 'fallback';
  currency: 'KWD';
  gold: { pricePerGram: number; unit: 'gram' };
  silver: { pricePerGram: number; unit: 'gram' };
  updatedAt: string;
  message?: string;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
let cachedPrice: CachedMetalsPrice | null = null;
let cachedAt = 0;

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeProviderPayload(payload: any): CachedMetalsPrice | null {
  const gold = num(payload?.gold?.pricePerGram ?? payload?.goldPricePerGram ?? payload?.gold_gram_kwd);
  const silver = num(payload?.silver?.pricePerGram ?? payload?.silverPricePerGram ?? payload?.silver_gram_kwd);
  const currency = String(payload?.currency ?? 'KWD').toUpperCase();
  if (currency !== 'KWD' || gold <= 0 || silver <= 0) return null;
  return {
    success: true,
    source: 'api',
    currency: 'KWD',
    gold: { pricePerGram: gold, unit: 'gram' },
    silver: { pricePerGram: silver, unit: 'gram' },
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const now = Date.now();
  if (cachedPrice && now - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(cachedPrice);
  }

  const apiUrl = process.env.METALS_API_URL;
  const apiKey = process.env.METALS_API_KEY;

  if (!apiUrl) {
    return NextResponse.json({
      success: false,
      source: 'manual',
      message: 'Metals price API is not configured',
      currency: 'KWD',
      gold: { pricePerGram: 0, unit: 'gram' },
      silver: { pricePerGram: 0, unit: 'gram' },
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    const response = await fetch(apiUrl, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`Metals provider failed: ${response.status}`);
    const normalized = normalizeProviderPayload(await response.json());
    if (!normalized) throw new Error('Metals provider did not return KWD gram prices');
    cachedPrice = normalized;
    cachedAt = now;
    return NextResponse.json(normalized);
  } catch (error) {
    if (cachedPrice) {
      return NextResponse.json({ ...cachedPrice, source: 'fallback' });
    }
    return NextResponse.json({
      success: false,
      source: 'manual',
      message: error instanceof Error ? error.message : 'Metals price API failed',
      currency: 'KWD',
      gold: { pricePerGram: 0, unit: 'gram' },
      silver: { pricePerGram: 0, unit: 'gram' },
      updatedAt: new Date().toISOString(),
    });
  }
}
