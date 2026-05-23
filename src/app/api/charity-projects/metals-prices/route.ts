import { NextResponse } from 'next/server';

type CachedMetalsPrice = {
  success: boolean;
  source: 'api' | 'manual' | 'fallback';
  currency: 'KWD';
  gold: {
    pricePerGram: number;
    pricePerGram24k: number;
    pricePerGram22k: number;
    pricePerGram21k: number;
    pricePerGram18k: number;
    unit: 'gram';
  };
  silver: { pricePerGram: number; unit: 'gram' };
  updatedAt: string;
  message?: string;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const TROY_OUNCE_GRAMS = 31.1035;
let cachedPrice: CachedMetalsPrice | null = null;
let cachedAt = 0;

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeProviderPayload(payload: any): CachedMetalsPrice | null {
  const currency = String(payload?.currency ?? 'KWD').toUpperCase();
  if (currency !== 'KWD') return null;
  const gold24 = num(
    payload?.gold?.pricePerGram24k ??
    payload?.gold?.pricePerGram ??
    payload?.goldPricePerGram ??
    payload?.gold_gram_kwd ??
    (num(payload?.gold?.pricePerOunce ?? payload?.goldOunceKwd ?? payload?.gold_ounce_kwd) > 0
      ? num(payload?.gold?.pricePerOunce ?? payload?.goldOunceKwd ?? payload?.gold_ounce_kwd) / TROY_OUNCE_GRAMS
      : 0)
  );
  const gold22 = num(payload?.gold?.pricePerGram22k) || gold24 * (22 / 24);
  const gold21 = num(payload?.gold?.pricePerGram21k) || gold24 * (21 / 24);
  const gold18 = num(payload?.gold?.pricePerGram18k) || gold24 * (18 / 24);
  const silver = num(
    payload?.silver?.pricePerGram ??
    payload?.silverPricePerGram ??
    payload?.silver_gram_kwd ??
    (num(payload?.silver?.pricePerOunce ?? payload?.silverOunceKwd ?? payload?.silver_ounce_kwd) > 0
      ? num(payload?.silver?.pricePerOunce ?? payload?.silverOunceKwd ?? payload?.silver_ounce_kwd) / TROY_OUNCE_GRAMS
      : 0)
  );
  if (gold24 <= 0 || silver <= 0) return null;
  return {
    success: true,
    source: 'api',
    currency: 'KWD',
    gold: { pricePerGram: gold24, pricePerGram24k: gold24, pricePerGram22k: gold22, pricePerGram21k: gold21, pricePerGram18k: gold18, unit: 'gram' },
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
      gold: { pricePerGram: 0, pricePerGram24k: 0, pricePerGram22k: 0, pricePerGram21k: 0, pricePerGram18k: 0, unit: 'gram' },
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
      gold: { pricePerGram: 0, pricePerGram24k: 0, pricePerGram22k: 0, pricePerGram21k: 0, pricePerGram18k: 0, unit: 'gram' },
      silver: { pricePerGram: 0, unit: 'gram' },
      updatedAt: new Date().toISOString(),
    });
  }
}
