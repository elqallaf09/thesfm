import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';
import { fetchYahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';
import { getMarketMoverConfig } from '@/lib/markets/marketMovers';

export const runtime = 'nodejs';
export const revalidate = 300;

type InvestmentRow = {
  id: string;
  name: string | null;
  amount?: number | string | null;
  current_value?: number | string | null;
  invested_amount?: number | string | null;
  purchase_price?: number | string | null;
  average_buy_price?: number | string | null;
  symbol?: string | null;
  provider_symbol?: string | null;
  market?: string | null;
  asset_type?: string | null;
  currency?: string | null;
  quantity?: number | string | null;
  current_price?: number | string | null;
  current_market_value?: number | string | null;
  price_currency?: string | null;
  last_price?: number | string | null;
  last_price_updated_at?: string | null;
  data_source?: string | null;
};

const MARKET_SUFFIXES: Record<string, string[]> = {
  kuwait: ['.KW'],
  saudi: ['.SR'],
  uae: ['.DU', '.AD'],
  qatar: ['.QA'],
  uk: ['.L'],
  germany: ['.DE'],
  france: ['.PA'],
  italy: ['.MI'],
  spain: ['.MC'],
  netherlands: ['.AS'],
  switzerland: ['.SW'],
  europe: ['.L', '.DE', '.PA', '.MI', '.MC', '.AS', '.SW'],
};

const MARKET_ALIASES: Record<string, string[]> = {
  kuwait: ['kuwait', 'boursa kuwait', 'bourse kuwait', 'kw', 'kse', 'بورصة الكويت', 'الكويت'],
  saudi: ['saudi', 'tadawul', 'tasi', 'sa', 'tdwl', 'السعودية', 'تداول', 'تاسي'],
  uae: ['uae', 'dubai', 'abu dhabi', 'dfm', 'adx', 'ae', 'الإمارات', 'دبي', 'أبوظبي'],
  qatar: ['qatar', 'qe', 'qa', 'قطر', 'بورصة قطر'],
  oman: ['oman', 'muscat', 'msx', 'om', 'عمان', 'مسقط'],
  bahrain: ['bahrain', 'bh', 'bahrain bourse', 'البحرين'],
  uk: ['uk', 'united kingdom', 'london', 'gb', 'ftse', 'بريطانيا', 'المملكة المتحدة', 'لندن'],
  germany: ['germany', 'de', 'frankfurt', 'dax', 'ألمانيا', 'فرانكفورت'],
  france: ['france', 'fr', 'paris', 'cac', 'فرنسا', 'باريس'],
  italy: ['italy', 'it', 'milan', 'mib', 'إيطاليا', 'ميلان'],
  spain: ['spain', 'es', 'madrid', 'ibex', 'إسبانيا', 'مدريد'],
  netherlands: ['netherlands', 'nl', 'amsterdam', 'aex', 'هولندا', 'أمستردام'],
  switzerland: ['switzerland', 'ch', 'smi', 'سويسرا'],
  europe: ['europe', 'eu', 'euro stoxx', 'stoxx', 'أوروبا', 'الأسواق الأوروبية'],
};

const SYMBOL_ALIASES: Record<string, Record<string, string[]>> = {
  kuwait: {
    'NBK.KW': ['nbk', 'national bank of kuwait', 'بنك الكويت الوطني', 'الوطني'],
    'KFH.KW': ['kfh', 'kuwait finance house', 'بيتك', 'بيت التمويل الكويتي'],
    'ZAIN.KW': ['zain', 'zain kuwait', 'زين'],
    'GBK.KW': ['gbk', 'gulf bank', 'بنك الخليج'],
    'BOUBYAN.KW': ['boubyan', 'boubyan bank', 'بنك بوبيان', 'بوبيان'],
    'BURG.KW': ['burg', 'burgan bank', 'بنك برقان', 'برقان'],
  },
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

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = finiteNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function normalizeSearch(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[._/\\|,+()[\]{}:;'"`~!@#$%^&*=?<>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSymbol(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function stripMarketSuffix(symbol: string) {
  return symbol.replace(/\.(SR|KW|DU|AD|QA|L|DE|PA|MI|MC|AS|SW)$/i, '');
}

function hasMarketSuffix(symbol: string, market: string) {
  const suffixes = MARKET_SUFFIXES[market] ?? [];
  return suffixes.some(suffix => symbol.toUpperCase().endsWith(suffix));
}

function marketFieldMatches(row: InvestmentRow, market: string, configMarketName?: string) {
  const rowMarket = normalizeSearch(row.market);
  if (!rowMarket) return false;
  const aliases = [
    market,
    configMarketName,
    ...(MARKET_ALIASES[market] ?? []),
  ].map(normalizeSearch).filter(Boolean);
  return aliases.some(alias => rowMarket === alias || rowMarket.includes(alias) || alias.includes(rowMarket));
}

function configuredSymbolsForMarket(market: string) {
  const config = getMarketMoverConfig(market);
  const symbols = config?.symbols ?? [];
  const direct = new Map<string, { providerSymbol: string; name: string }>();
  for (const item of symbols) {
    const providerSymbols = [item.symbol, ...(item.providerSymbols ?? [])].map(normalizeSymbol).filter(Boolean);
    for (const providerSymbol of providerSymbols) {
      direct.set(providerSymbol, { providerSymbol, name: item.name });
      direct.set(stripMarketSuffix(providerSymbol), { providerSymbol, name: item.name });
    }
  }
  for (const [providerSymbol, aliases] of Object.entries(SYMBOL_ALIASES[market] ?? {})) {
    const normalizedProvider = normalizeSymbol(providerSymbol);
    direct.set(normalizedProvider, { providerSymbol: normalizedProvider, name: aliases[1] ?? stripMarketSuffix(normalizedProvider) });
    direct.set(stripMarketSuffix(normalizedProvider), { providerSymbol: normalizedProvider, name: aliases[1] ?? stripMarketSuffix(normalizedProvider) });
    for (const alias of aliases) direct.set(normalizeSearch(alias).toUpperCase(), { providerSymbol: normalizedProvider, name: aliases[1] ?? alias });
  }
  return direct;
}

function inferProviderSymbols(row: InvestmentRow, market: string) {
  const configured = configuredSymbolsForMarket(market);
  const rawSymbols = [row.provider_symbol, row.symbol]
    .map(normalizeSymbol)
    .filter(Boolean);
  const textCandidates = [row.name, row.symbol, row.provider_symbol]
    .map(normalizeSearch)
    .filter(Boolean);
  const candidates = new Set<string>();

  for (const raw of rawSymbols) {
    candidates.add(raw);
    const configuredMatch = configured.get(raw) ?? configured.get(stripMarketSuffix(raw));
    if (configuredMatch) candidates.add(configuredMatch.providerSymbol);
    if (!hasMarketSuffix(raw, market)) {
      for (const suffix of MARKET_SUFFIXES[market] ?? []) candidates.add(`${stripMarketSuffix(raw)}${suffix}`);
    }
  }

  for (const text of textCandidates) {
    const lookup = configured.get(text.toUpperCase());
    if (lookup) candidates.add(lookup.providerSymbol);
    for (const [providerSymbol, aliases] of Object.entries(SYMBOL_ALIASES[market] ?? {})) {
      if (aliases.some(alias => {
        const normalizedAlias = normalizeSearch(alias);
        return text === normalizedAlias || text.includes(normalizedAlias) || normalizedAlias.includes(text);
      })) {
        candidates.add(normalizeSymbol(providerSymbol));
      }
    }
  }

  return Array.from(candidates).filter(Boolean).slice(0, 5);
}

function rowMatchesMarket(row: InvestmentRow, market: string, configMarketName?: string) {
  if (marketFieldMatches(row, market, configMarketName)) return true;
  const providerSymbols = inferProviderSymbols(row, market);
  if (providerSymbols.length > 0) return true;
  return [row.symbol, row.provider_symbol].map(normalizeSymbol).some(symbol => hasMarketSuffix(symbol, market));
}

function normalizeProviderPrice(value: number | null, currency: string | null, providerSymbol: string) {
  if (value === null) return null;
  const currencyCode = currency?.toUpperCase();
  if (currencyCode === 'KWF' || providerSymbol.toUpperCase().endsWith('.KW')) return value / 1000;
  if (currency === 'GBp' || currencyCode === 'GBX' || currencyCode === 'GBPENCE' || currencyCode === 'GBP PENCE' || currencyCode === 'GBPENNY') return value / 100;
  return value;
}

function normalizeProviderCurrency(currency: string | null, fallback: string | null, providerSymbol: string) {
  const currencyCode = currency?.toUpperCase();
  if (currencyCode === 'KWF' || providerSymbol.toUpperCase().endsWith('.KW')) return 'KWD';
  if (currency === 'GBp' || currencyCode === 'GBX' || currencyCode === 'GBPENCE' || currencyCode === 'GBP PENCE' || currencyCode === 'GBPENNY') return 'GBP';
  return currencyCode ?? fallback?.toUpperCase() ?? null;
}

function concentrationRisk(weight: number | null) {
  if (weight === null) return null;
  if (weight >= 40) return 'high';
  if (weight >= 20) return 'medium';
  return 'low';
}

async function currentUser(request: NextRequest) {
  const header = request.headers.get('authorization');
  const bearerToken = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('sfm_access_token')?.value ?? null;
  return getUserFromBearerToken(bearerToken || cookieToken);
}

async function fetchInvestmentRows(admin: NonNullable<ReturnType<typeof createServerSupabaseAdmin>>, userId: string) {
  const full = await admin
    .from('investment_items')
    .select('id,name,amount,current_value,invested_amount,purchase_price,average_buy_price,symbol,provider_symbol,market,asset_type,currency,quantity,current_price,current_market_value,price_currency,last_price,last_price_updated_at,data_source')
    .eq('user_id', userId);

  if (!full.error) return full.data as InvestmentRow[];

  const fallback = await admin
    .from('investment_items')
    .select('id,name,amount,current_value,symbol,provider_symbol,market,asset_type,currency,quantity,current_price,current_market_value,price_currency,last_price,last_price_updated_at,data_source')
    .eq('user_id', userId);

  if (fallback.error) throw fallback.error;
  return fallback.data as InvestmentRow[];
}

export async function GET(request: NextRequest) {
  const market = normalizeSearch(request.nextUrl.searchParams.get('market'));
  const config = getMarketMoverConfig(market);
  if (!market || !config) {
    return json({ ok: false, code: 'UNSUPPORTED_MARKET', market, items: [] }, { status: 400 });
  }

  const user = await currentUser(request);
  if (!user) {
    return json({ ok: false, code: 'AUTH_REQUIRED', market, items: [] }, { status: 401 });
  }

  const admin = createServerSupabaseAdmin();
  if (!admin) {
    return json({ ok: false, code: 'PORTFOLIO_SERVICE_NOT_CONFIGURED', market, items: [] }, { status: 200 });
  }

  try {
    const investments = await fetchInvestmentRows(admin, user.id);
    if (investments.length === 0) {
      return json({ ok: true, market, marketName: config.marketName, items: [], message: 'NO_PORTFOLIO_INVESTMENTS' });
    }

    const totalPortfolioMarketValue = investments.reduce((sum, row) => {
      const quantity = firstNumber(row.quantity);
      const savedPrice = firstNumber(row.current_price, row.last_price);
      const calculated = quantity !== null && savedPrice !== null ? quantity * savedPrice : null;
      return sum + (firstNumber(row.current_market_value, calculated, row.current_value, row.amount, row.invested_amount) ?? 0);
    }, 0);

    const matches = investments.filter(row => rowMatchesMarket(row, market, config.marketName)).slice(0, 40);
    if (matches.length === 0) {
      return json({ ok: true, market, marketName: config.marketName, items: [], message: 'NO_MATCHING_INVESTMENTS' });
    }

    const items = await Promise.all(matches.map(async row => {
      const providerSymbols = inferProviderSymbols(row, market);
      const displaySymbol = stripMarketSuffix(normalizeSymbol(row.symbol || row.provider_symbol || providerSymbols[0] || row.name || ''));
      const purchasePrice = firstNumber(row.average_buy_price, row.purchase_price);
      const quantity = firstNumber(row.quantity);
      let quote: Awaited<ReturnType<typeof fetchYahooNormalizedQuote>> | null = null;
      if (providerSymbols.length > 0) {
        try {
          quote = await fetchYahooNormalizedQuote({
            requestedSymbol: displaySymbol || providerSymbols[0],
            symbols: providerSymbols,
            name: row.name || displaySymbol || providerSymbols[0],
            debugContext: { route: '/api/markets/portfolio-comparison', market, investmentId: row.id },
          });
        } catch (quoteError) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[portfolio-comparison] quote unavailable', {
              market,
              investmentId: row.id,
              symbols: providerSymbols,
              error: quoteError instanceof Error ? quoteError.message : quoteError,
            });
          }
        }
      }

      const providerSymbol = quote?.symbolUsed ?? providerSymbols[0] ?? normalizeSymbol(row.provider_symbol || row.symbol || '');
      const currentPrice = quote?.available
        ? normalizeProviderPrice(quote.price, quote.currency, providerSymbol)
        : firstNumber(row.current_price, row.last_price);
      const currency = normalizeProviderCurrency(quote?.currency ?? row.price_currency ?? row.currency ?? null, row.currency ?? config.currency, providerSymbol);
      const currentMarketValue = currentPrice !== null && quantity !== null ? currentPrice * quantity : null;
      const costBasis = purchasePrice !== null && quantity !== null ? purchasePrice * quantity : null;
      const unrealizedProfitLoss = currentMarketValue !== null && costBasis !== null ? currentMarketValue - costBasis : null;
      const profitLossPercent = currentPrice !== null && purchasePrice !== null && purchasePrice > 0
        ? ((currentPrice - purchasePrice) / purchasePrice) * 100
        : null;
      const portfolioWeight = currentMarketValue !== null && totalPortfolioMarketValue > 0
        ? (currentMarketValue / totalPortfolioMarketValue) * 100
        : null;

      return {
        id: row.id,
        symbol: displaySymbol || stripMarketSuffix(providerSymbol),
        providerSymbol,
        name: row.name || displaySymbol || providerSymbol,
        quantity,
        purchasePrice,
        currentPrice,
        currency,
        currentMarketValue,
        costBasis,
        unrealizedProfitLoss,
        profitLossPercent,
        portfolioWeight,
        concentrationRisk: concentrationRisk(portfolioWeight),
        latestChangePercent: quote?.changePercent ?? null,
        updated_at: quote?.marketTime ?? row.last_price_updated_at ?? null,
        source: quote?.source ?? row.data_source ?? null,
        unavailable: {
          purchasePrice: purchasePrice === null,
          quantity: quantity === null,
          currentPrice: currentPrice === null,
          marketPriceReason: quote && !quote.available ? quote.unavailableReason ?? 'PRICE_UNAVAILABLE' : null,
        },
      };
    }));

    return json({
      ok: true,
      market,
      marketName: config.marketName,
      totalPortfolioMarketValue,
      items,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[portfolio-comparison] failed', error instanceof Error ? error.message : error);
    return json({ ok: false, code: 'PORTFOLIO_COMPARISON_UNAVAILABLE', market, items: [] }, { status: 200 });
  }
}
