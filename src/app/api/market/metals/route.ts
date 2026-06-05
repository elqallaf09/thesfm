import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TROY_OUNCE_GRAMS = 31.1034768;
const DEFAULT_CURRENCY = 'KWD';
const DEFAULT_METALS_PROVIDER_URL = 'https://api.metals.live/v1/spot/gold,silver';
const DEFAULT_EXCHANGE_URL = 'https://open.er-api.com/v6/latest/USD';

type MetalPayload = {
  price: number;
  currency: string;
  unit: 'gram';
  lastUpdated: string;
};

type MetalsResponse = {
  success: boolean;
  gold?: MetalPayload;
  silver?: MetalPayload;
  source?: 'api';
  error?: string;
};

function num(value: unknown) {
  const parsed = typeof value === 'string' ? Number(value.replace(/,/g, '')) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = num(value);
    if (parsed > 0) return parsed;
  }
  return 0;
}

function pick(payload: any, paths: string[]) {
  for (const path of paths) {
    const value = path.split('.').reduce((node, key) => node?.[key], payload);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function providerCurrency(payload: any) {
  return String(
    pick(payload, [
      'currency',
      'base',
      'baseCurrency',
      'gold.currency',
      'data.currency',
      'meta.currency',
    ]) || 'USD'
  ).toUpperCase();
}

function extractOuncePrices(payload: any) {
  if (Array.isArray(payload)) {
    return {
      goldOunce: firstNumber(...payload.map(item => item?.gold)),
      silverOunce: firstNumber(...payload.map(item => item?.silver)),
    };
  }

  const goldOunce = firstNumber(
    pick(payload, ['gold.pricePerOunce', 'gold.price_per_ounce', 'gold.ounce', 'gold.ask', 'gold.price']),
    pick(payload, ['XAU', 'xau', 'GOLD', 'rates.XAU', 'rates.GOLD', 'data.XAU', 'data.gold']),
    pick(payload, ['goldPricePerOunce', 'goldOunce', 'gold_usd_ounce', 'price.gold'])
  );
  const silverOunce = firstNumber(
    pick(payload, ['silver.pricePerOunce', 'silver.price_per_ounce', 'silver.ounce', 'silver.ask', 'silver.price']),
    pick(payload, ['XAG', 'xag', 'SILVER', 'rates.XAG', 'rates.SILVER', 'data.XAG', 'data.silver']),
    pick(payload, ['silverPricePerOunce', 'silverOunce', 'silver_usd_ounce', 'price.silver'])
  );
  return { goldOunce, silverOunce };
}

function extractGramPrices(payload: any) {
  const goldGram = firstNumber(
    pick(payload, ['gold.pricePerGram', 'gold.price_per_gram', 'gold.gram', 'gold.pricePerGram24k']),
    pick(payload, ['goldPricePerGram', 'gold_gram', 'gold_gram_kwd'])
  );
  const silverGram = firstNumber(
    pick(payload, ['silver.pricePerGram', 'silver.price_per_gram', 'silver.gram']),
    pick(payload, ['silverPricePerGram', 'silver_gram', 'silver_gram_kwd'])
  );
  return { goldGram, silverGram };
}

async function fetchJson(url: string, headers?: HeadersInit) {
  const response = await fetch(url, {
    headers,
    cache: 'no-store',
  });
  console.info('[metals] API response status', response.status);
  if (!response.ok) throw new Error(`Provider request failed with status ${response.status}`);
  return response.json();
}

async function fetchYahooOuncePrice(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const payload = await fetchJson(url, { Accept: 'application/json' });
  const result = payload?.chart?.result?.[0];
  return firstNumber(
    result?.meta?.regularMarketPrice,
    result?.indicators?.quote?.[0]?.close?.find((value: unknown) => num(value) > 0),
  );
}

async function fetchYahooMetalsPayload() {
  console.info('[metals] Using Yahoo metals futures fallback');
  const [goldOunce, silverOunce] = await Promise.all([
    fetchYahooOuncePrice('GC=F'),
    fetchYahooOuncePrice('SI=F'),
  ]);

  if (goldOunce <= 0 || silverOunce <= 0) throw new Error('Yahoo fallback did not return usable metals prices');

  return {
    currency: 'USD',
    gold: { pricePerOunce: goldOunce },
    silver: { pricePerOunce: silverOunce },
  };
}

async function fetchProviderPayload() {
  const apiUrl = process.env.METALS_API_URL?.trim();
  const apiKey = process.env.METALS_API_KEY?.trim();
  if (!apiUrl) {
    console.info('[metals] METALS_API_URL missing, using default server-side metals provider');
    try {
      return await fetchJson(DEFAULT_METALS_PROVIDER_URL);
    } catch (error) {
      console.error('[metals] Default metals provider failed', error);
      return fetchYahooMetalsPayload();
    }
  }

  const url = apiKey ? apiUrl.replace('{METALS_API_KEY}', encodeURIComponent(apiKey)) : apiUrl;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (apiKey && url === apiUrl) {
    headers.Authorization = `Bearer ${apiKey}`;
    headers['x-api-key'] = apiKey;
  }

  return fetchJson(url, headers);
}

async function fetchUsdRate(targetCurrency: string) {
  if (targetCurrency === 'USD') return 1;

  const exchangeUrl = process.env.EXCHANGE_API_URL?.trim();
  const exchangeKey = process.env.EXCHANGE_API_KEY?.trim();
  if (!exchangeUrl) {
    const fallbackUrl = DEFAULT_EXCHANGE_URL.replace('{TARGET_CURRENCY}', encodeURIComponent(targetCurrency));
    try {
      const payload = await fetchJson(fallbackUrl);
      const rate = firstNumber(
        pick(payload, [`rates.${targetCurrency}`, `conversion_rates.${targetCurrency}`])
      );
      if (rate > 0) return rate;
    } catch (error) {
      console.error('[metals] Default exchange provider failed', error);
    }

    throw new Error(`No live USD to ${targetCurrency} exchange rate available`);
  }

  const url = exchangeKey ? exchangeUrl.replace('{EXCHANGE_API_KEY}', encodeURIComponent(exchangeKey)) : exchangeUrl;
  const payload = await fetchJson(url, exchangeKey && url === exchangeUrl ? { Authorization: `Bearer ${exchangeKey}`, 'x-api-key': exchangeKey } : undefined);
  const rate = firstNumber(
    pick(payload, [`rates.${targetCurrency}`, targetCurrency, `conversion_rates.${targetCurrency}`]),
    targetCurrency === 'KWD' ? pick(payload, ['kwd', 'KWD']) : undefined
  );
  if (rate <= 0) throw new Error(`Missing USD to ${targetCurrency} exchange rate`);
  return rate;
}

export async function GET(request: Request) {
  const targetCurrency = new URL(request.url).searchParams.get('currency')?.toUpperCase() || DEFAULT_CURRENCY;
  console.info('[metals] Metals API request started', { targetCurrency });

  try {
    const payload = await fetchProviderPayload();
    const sourceCurrency = providerCurrency(payload);
    const { goldGram, silverGram } = extractGramPrices(payload);
    const { goldOunce, silverOunce } = extractOuncePrices(payload);

    console.info('[metals] Gold price received', { goldGram, goldOunce, sourceCurrency });
    console.info('[metals] Silver price received', { silverGram, silverOunce, sourceCurrency });

    const conversionRate = sourceCurrency === targetCurrency
      ? 1
      : sourceCurrency === 'USD'
        ? await fetchUsdRate(targetCurrency)
        : 0;

    if (conversionRate <= 0) throw new Error(`Unsupported currency conversion ${sourceCurrency} to ${targetCurrency}`);
    console.info('[metals] Currency conversion rate', { from: sourceCurrency, to: targetCurrency, conversionRate });

    const goldPerGram = (goldGram > 0 ? goldGram : goldOunce / TROY_OUNCE_GRAMS) * conversionRate;
    const silverPerGram = (silverGram > 0 ? silverGram : silverOunce / TROY_OUNCE_GRAMS) * conversionRate;
    if (goldPerGram <= 0 || silverPerGram <= 0) throw new Error('Provider did not return usable gold and silver prices');

    const now = new Date().toISOString();
    console.info('[metals] Final per gram price', { gold: goldPerGram, silver: silverPerGram, currency: targetCurrency });

    return NextResponse.json({
      success: true,
      gold: { price: goldPerGram, currency: targetCurrency, unit: 'gram', lastUpdated: now },
      silver: { price: silverPerGram, currency: targetCurrency, unit: 'gram', lastUpdated: now },
      source: 'api',
    } satisfies MetalsResponse);
  } catch (error) {
    console.error('[metals] Error details', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Metals API failed',
    } satisfies MetalsResponse, { status: 502 });
  }
}
