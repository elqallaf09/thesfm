export type MarketMoverRegion = 'gulf' | 'europe';

export type MarketMoverId =
  | 'kuwait'
  | 'saudi'
  | 'oman'
  | 'bahrain'
  | 'uae'
  | 'uae-dfm'
  | 'uae-adx'
  | 'qatar'
  | 'uk'
  | 'germany'
  | 'france'
  | 'italy'
  | 'spain'
  | 'netherlands'
  | 'switzerland'
  | 'europe';

export type MarketMoverItem = {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  currency: string;
  changePercent: number | null;
  volume: number | null;
};

export type MarketMoversData = {
  topGainers: MarketMoverItem[];
  topLosers: MarketMoverItem[];
  highestPrice: MarketMoverItem[];
  lowestPrice: MarketMoverItem[];
  highestVolume: MarketMoverItem[];
  lowestVolume: MarketMoverItem[];
};

export type MarketMoversResponse =
  | {
    ok: true;
    market: MarketMoverId;
    marketName: string;
    currency: string;
    updated_at: string;
    source: 'Yahoo Finance';
    data: MarketMoversData;
    warnings?: string[];
  }
  | {
    ok: false;
    code: 'MARKET_MOVERS_UNAVAILABLE' | 'MARKET_MOVERS_NOT_SUPPORTED' | 'UNSUPPORTED_MARKET';
    market: string;
    marketName?: string;
    currency?: string;
    updated_at: string | null;
    source: 'Yahoo Finance';
    data: null;
    message?: string;
  };

type MarketMoverSymbol = {
  symbol: string;
  name: string;
  providerSymbols?: string[];
};

type MarketMoverConfig = {
  id: MarketMoverId;
  region: MarketMoverRegion;
  marketName: string;
  currency: string;
  symbols: MarketMoverSymbol[];
};

type YahooQuoteRow = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketTime?: number;
};

type YahooQuoteResponse = {
  quoteResponse?: {
    result?: YahooQuoteRow[];
  };
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        shortName?: string;
        longName?: string;
        currency?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketVolume?: number;
      };
    }>;
  };
};

const MARKET_MOVER_CONFIGS: MarketMoverConfig[] = [
  {
    id: 'saudi',
    region: 'gulf',
    marketName: 'Saudi Exchange',
    currency: 'SAR',
    symbols: [
      { symbol: '2222.SR', name: 'Saudi Aramco' },
      { symbol: '1120.SR', name: 'Al Rajhi Bank' },
      { symbol: '1180.SR', name: 'Saudi National Bank' },
      { symbol: '2010.SR', name: 'SABIC' },
      { symbol: '7010.SR', name: 'stc' },
      { symbol: '1211.SR', name: 'Maaden' },
      { symbol: '7020.SR', name: 'Etihad Etisalat' },
      { symbol: '1150.SR', name: 'Alinma Bank' },
      { symbol: '1010.SR', name: 'Riyad Bank' },
      { symbol: '4001.SR', name: 'Abdullah Al Othaim Markets' },
    ],
  },
  {
    id: 'kuwait',
    region: 'gulf',
    marketName: 'Boursa Kuwait',
    currency: 'KWD',
    symbols: [
      { symbol: 'KFH.KW', name: 'Kuwait Finance House' },
      { symbol: 'NBK.KW', name: 'National Bank of Kuwait' },
      { symbol: 'ZAIN.KW', name: 'Zain Kuwait' },
      { symbol: 'GBK.KW', name: 'Gulf Bank' },
      { symbol: 'BURG.KW', name: 'Burgan Bank' },
      { symbol: 'MABANEE.KW', name: 'Mabanee' },
      { symbol: 'NIND.KW', name: 'National Industries Group' },
      { symbol: 'AGLTY.KW', name: 'Agility' },
    ],
  },
  {
    id: 'uae',
    region: 'gulf',
    marketName: 'UAE Market',
    currency: 'AED',
    symbols: [
      { symbol: 'EMAAR.AE', name: 'Emaar Properties' },
      { symbol: 'DIB.AE', name: 'Dubai Islamic Bank' },
      { symbol: 'DEWA.AE', name: 'DEWA' },
      { symbol: 'SALIK.AE', name: 'Salik' },
      { symbol: 'DU.AE', name: 'du' },
      { symbol: 'DFM.AE', name: 'Dubai Financial Market' },
      { symbol: 'EMIRATESNBD.AE', name: 'Emirates NBD' },
      { symbol: 'AIRARABIA.AE', name: 'Air Arabia' },
      { symbol: 'EMAARDEV.AE', name: 'Emaar Development' },
      { symbol: 'TALABAT.AE', name: 'Talabat Holding' },
    ],
  },
  {
    id: 'uae-dfm',
    region: 'gulf',
    marketName: 'Dubai Financial Market',
    currency: 'AED',
    symbols: [
      { symbol: 'EMAAR.AE', name: 'Emaar Properties' },
      { symbol: 'DIB.AE', name: 'Dubai Islamic Bank' },
      { symbol: 'DEWA.AE', name: 'DEWA' },
      { symbol: 'SALIK.AE', name: 'Salik' },
      { symbol: 'DU.AE', name: 'du' },
      { symbol: 'DFM.AE', name: 'Dubai Financial Market' },
      { symbol: 'EMIRATESNBD.AE', name: 'Emirates NBD' },
      { symbol: 'AIRARABIA.AE', name: 'Air Arabia' },
      { symbol: 'EMAARDEV.AE', name: 'Emaar Development' },
      { symbol: 'TALABAT.AE', name: 'Talabat Holding' },
    ],
  },
  {
    id: 'uae-adx',
    region: 'gulf',
    marketName: 'Abu Dhabi Securities Exchange',
    currency: 'AED',
    symbols: [],
  },
  {
    id: 'qatar',
    region: 'gulf',
    marketName: 'Qatar Stock Exchange',
    currency: 'QAR',
    symbols: [
      { symbol: 'QNBK.QA', name: 'QNB' },
      { symbol: 'IQCD.QA', name: 'Industries Qatar' },
      { symbol: 'QIBK.QA', name: 'Qatar Islamic Bank' },
      { symbol: 'QEWS.QA', name: 'Qatar Electricity and Water' },
      { symbol: 'ORDS.QA', name: 'Ooredoo' },
      { symbol: 'BRES.QA', name: 'Barwa Real Estate' },
      { symbol: 'MPHC.QA', name: 'Mesaieed Petrochemical' },
    ],
  },
  {
    id: 'oman',
    region: 'gulf',
    marketName: 'Muscat Stock Exchange',
    currency: 'OMR',
    symbols: [],
  },
  {
    id: 'bahrain',
    region: 'gulf',
    marketName: 'Bahrain Bourse',
    currency: 'BHD',
    symbols: [],
  },
  {
    id: 'uk',
    region: 'europe',
    marketName: 'United Kingdom',
    currency: 'GBP',
    symbols: [
      { symbol: 'AZN.L', name: 'AstraZeneca' },
      { symbol: 'SHEL.L', name: 'Shell' },
      { symbol: 'HSBA.L', name: 'HSBC' },
      { symbol: 'ULVR.L', name: 'Unilever' },
      { symbol: 'BP.L', name: 'BP' },
      { symbol: 'GSK.L', name: 'GSK' },
      { symbol: 'REL.L', name: 'RELX' },
      { symbol: 'BATS.L', name: 'British American Tobacco' },
      { symbol: 'LSEG.L', name: 'London Stock Exchange Group' },
      { symbol: 'DGE.L', name: 'Diageo' },
    ],
  },
  {
    id: 'germany',
    region: 'europe',
    marketName: 'Germany',
    currency: 'EUR',
    symbols: [
      { symbol: 'SAP.DE', name: 'SAP' },
      { symbol: 'SIE.DE', name: 'Siemens' },
      { symbol: 'ALV.DE', name: 'Allianz' },
      { symbol: 'DTE.DE', name: 'Deutsche Telekom' },
      { symbol: 'BMW.DE', name: 'BMW' },
      { symbol: 'BAS.DE', name: 'BASF' },
      { symbol: 'MBG.DE', name: 'Mercedes-Benz Group' },
      { symbol: 'VOW3.DE', name: 'Volkswagen' },
      { symbol: 'ADS.DE', name: 'Adidas' },
      { symbol: 'IFX.DE', name: 'Infineon' },
    ],
  },
  {
    id: 'france',
    region: 'europe',
    marketName: 'France',
    currency: 'EUR',
    symbols: [
      { symbol: 'MC.PA', name: 'LVMH' },
      { symbol: 'OR.PA', name: "L'Oreal" },
      { symbol: 'RMS.PA', name: 'Hermes' },
      { symbol: 'TTE.PA', name: 'TotalEnergies' },
      { symbol: 'SAN.PA', name: 'Sanofi' },
      { symbol: 'AIR.PA', name: 'Airbus' },
      { symbol: 'BNP.PA', name: 'BNP Paribas' },
      { symbol: 'AI.PA', name: 'Air Liquide' },
      { symbol: 'SU.PA', name: 'Schneider Electric' },
      { symbol: 'DG.PA', name: 'Vinci' },
    ],
  },
  {
    id: 'italy',
    region: 'europe',
    marketName: 'Italy',
    currency: 'EUR',
    symbols: [
      { symbol: 'ENEL.MI', name: 'Enel' },
      { symbol: 'ENI.MI', name: 'Eni' },
      { symbol: 'ISP.MI', name: 'Intesa Sanpaolo' },
      { symbol: 'UCG.MI', name: 'UniCredit' },
      { symbol: 'STLAM.MI', name: 'Stellantis' },
      { symbol: 'G.MI', name: 'Assicurazioni Generali' },
      { symbol: 'PRY.MI', name: 'Prysmian' },
      { symbol: 'SRG.MI', name: 'Snam' },
      { symbol: 'RACE.MI', name: 'Ferrari' },
    ],
  },
  {
    id: 'spain',
    region: 'europe',
    marketName: 'Spain',
    currency: 'EUR',
    symbols: [
      { symbol: 'SAN.MC', name: 'Banco Santander' },
      { symbol: 'IBE.MC', name: 'Iberdrola' },
      { symbol: 'ITX.MC', name: 'Inditex' },
      { symbol: 'BBVA.MC', name: 'BBVA' },
      { symbol: 'TEF.MC', name: 'Telefonica' },
      { symbol: 'CABK.MC', name: 'CaixaBank' },
      { symbol: 'REP.MC', name: 'Repsol' },
      { symbol: 'AENA.MC', name: 'Aena' },
      { symbol: 'FER.MC', name: 'Ferrovial' },
      { symbol: 'AMS.MC', name: 'Amadeus' },
    ],
  },
  {
    id: 'netherlands',
    region: 'europe',
    marketName: 'Netherlands',
    currency: 'EUR',
    symbols: [
      { symbol: 'ASML.AS', name: 'ASML' },
      { symbol: 'SHELL.AS', name: 'Shell' },
      { symbol: 'INGA.AS', name: 'ING' },
      { symbol: 'ADYEN.AS', name: 'Adyen' },
      { symbol: 'HEIA.AS', name: 'Heineken' },
      { symbol: 'PHIA.AS', name: 'Philips' },
      { symbol: 'WKL.AS', name: 'Wolters Kluwer' },
      { symbol: 'ASM.AS', name: 'ASM International' },
    ],
  },
  {
    id: 'switzerland',
    region: 'europe',
    marketName: 'Switzerland',
    currency: 'CHF',
    symbols: [
      { symbol: 'NESN.SW', name: 'Nestle' },
      { symbol: 'NOVN.SW', name: 'Novartis' },
      { symbol: 'ROG.SW', name: 'Roche' },
      { symbol: 'UBSG.SW', name: 'UBS Group' },
      { symbol: 'ZURN.SW', name: 'Zurich Insurance' },
      { symbol: 'SIKA.SW', name: 'Sika' },
      { symbol: 'CFR.SW', name: 'Richemont' },
      { symbol: 'GIVN.SW', name: 'Givaudan' },
      { symbol: 'ABBN.SW', name: 'ABB' },
      { symbol: 'HOLN.SW', name: 'Holcim' },
    ],
  },
];

const EUROPE_AGGREGATE: MarketMoverConfig = {
  id: 'europe',
  region: 'europe',
  marketName: 'Europe',
  currency: 'EUR',
  symbols: [
    ...MARKET_MOVER_CONFIGS.find(config => config.id === 'germany')!.symbols.slice(0, 4),
    ...MARKET_MOVER_CONFIGS.find(config => config.id === 'france')!.symbols.slice(0, 4),
    ...MARKET_MOVER_CONFIGS.find(config => config.id === 'italy')!.symbols.slice(0, 3),
    ...MARKET_MOVER_CONFIGS.find(config => config.id === 'spain')!.symbols.slice(0, 3),
    ...MARKET_MOVER_CONFIGS.find(config => config.id === 'netherlands')!.symbols.slice(0, 3),
  ],
};

const MARKET_CONFIGS = [...MARKET_MOVER_CONFIGS, EUROPE_AGGREGATE];

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function moverSymbolKey(row: Omit<MarketMoverItem, 'rank'>) {
  return row.symbol.trim().toUpperCase();
}

function uniqueMoverRows(rows: Array<Omit<MarketMoverItem, 'rank'>>) {
  const seen = new Set<string>();
  return rows.filter(row => {
    const key = moverSymbolKey(row);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeProviderPrice(value: number, currency: string | null, providerSymbol: string) {
  const currencyCode = currency?.toUpperCase();
  if (currencyCode === 'KWF' || providerSymbol.endsWith('.KW')) return value / 1000;
  if (currency === 'GBp' || currencyCode === 'GBX') return value / 100;
  if (currencyCode === 'GBP' && providerSymbol.endsWith('.L')) return value;
  if (currencyCode === 'GBP') return value;
  if (currencyCode === 'GBPENCE' || currencyCode === 'GBP PENCE' || currencyCode === 'GBPENNY') return value / 100;
  return value;
}

function normalizeProviderCurrency(currency: string | null, fallback: string) {
  if (currency?.toUpperCase() === 'KWF') return 'KWD';
  if (currency === 'GBp' || currency?.toUpperCase() === 'GBX') return 'GBP';
  return currency?.toUpperCase() ?? fallback;
}

function normalizeProviderChangePercent(price: number, previousClose: number | null, currency: string | null, providerSymbol: string) {
  if (previousClose === null || previousClose <= 0) return null;
  const normalizedPrice = normalizeProviderPrice(price, currency, providerSymbol);
  const normalizedPrevious = normalizeProviderPrice(previousClose, currency, providerSymbol);
  if (normalizedPrevious <= 0) return null;
  return ((normalizedPrice - normalizedPrevious) / normalizedPrevious) * 100;
}

function normalizeSymbolForDisplay(symbol: string) {
  return symbol.replace(/\.(SR|KW|DU|AD|AE|QA|L|DE|PA|MI|MC|AS|SW)$/i, '');
}

function shouldDebugMarketMovers() {
  return process.env.DEBUG_MARKET_DATA === 'true'
    || (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test');
}

function debugMarketMovers(message: string, meta: Record<string, unknown>) {
  if (shouldDebugMarketMovers()) console.info(message, meta);
}

function rowFromYahooQuote(row: YahooQuoteRow, configured: MarketMoverSymbol, config: MarketMoverConfig) {
  const providerSymbol = String(row.symbol ?? '').toUpperCase();
  const price = finiteNumber(row.regularMarketPrice);
  if (price === null || price <= 0) return null;
  const currency = normalizeProviderCurrency(row.currency ?? null, config.currency);
  return {
    symbol: normalizeSymbolForDisplay(configured.symbol),
    name: row.longName ?? row.shortName ?? configured.name,
    price: normalizeProviderPrice(price, row.currency ?? null, providerSymbol),
    currency,
    changePercent: finiteNumber(row.regularMarketChangePercent),
    volume: finiteNumber(row.regularMarketVolume),
  };
}

async function fetchYahooChartRow(providerSymbol: string, configured: MarketMoverSymbol, config: MarketMoverConfig) {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(providerSymbol)}?range=2d&interval=1d`, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10000),
    headers: {
      accept: 'application/json',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  });

  debugMarketMovers('[MarketMovers] Yahoo chart fallback attempt', {
    selectedMarket: config.id,
    exchangeCode: config.marketName,
    endpoint: 'https://query1.finance.yahoo.com/v8/finance/chart',
    providerSymbol,
    responseStatus: response.status,
    fallbackUsed: true,
  });

  if (!response.ok) return null;

  const payload = await response.json().catch(() => null) as YahooChartResponse | null;
  const meta = payload?.chart?.result?.[0]?.meta;
  const price = finiteNumber(meta?.regularMarketPrice);
  if (price === null || price <= 0) return null;
  const previousClose = finiteNumber(meta?.chartPreviousClose) ?? finiteNumber(meta?.previousClose);
  const symbol = String(meta?.symbol ?? providerSymbol).toUpperCase();
  const currency = normalizeProviderCurrency(meta?.currency ?? null, config.currency);

  return {
    symbol: normalizeSymbolForDisplay(configured.symbol),
    name: meta?.longName ?? meta?.shortName ?? configured.name,
    price: normalizeProviderPrice(price, meta?.currency ?? null, symbol),
    currency,
    changePercent: normalizeProviderChangePercent(price, previousClose, meta?.currency ?? null, symbol),
    volume: finiteNumber(meta?.regularMarketVolume),
  };
}

async function fetchYahooRows(config: MarketMoverConfig): Promise<Array<Omit<MarketMoverItem, 'rank'>>> {
  if (config.symbols.length === 0) return [];

  const symbolMap = new Map<string, MarketMoverSymbol>();
  const providerSymbols = config.symbols.flatMap(item => {
    const symbols = item.providerSymbols?.length ? item.providerSymbols : [item.symbol];
    symbols.forEach(providerSymbol => symbolMap.set(providerSymbol.toUpperCase(), item));
    return symbols;
  });
  const params = new URLSearchParams({ symbols: providerSymbols.join(',') });
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?${params.toString()}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
      headers: {
        accept: 'application/json',
        'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
      },
    });

    debugMarketMovers('[MarketMovers] Yahoo quote attempt', {
      selectedMarket: config.id,
      exchangeCode: config.marketName,
      endpoint: 'https://query1.finance.yahoo.com/v7/finance/quote',
      providerSymbols,
      responseStatus: response.status,
      fallbackUsed: !response.ok,
    });

    if (response.ok) {
      const payload = await response.json().catch(() => null) as YahooQuoteResponse | null;
      const rows = payload?.quoteResponse?.result ?? [];
      const normalizedRows = rows
        .map(row => {
          const providerSymbol = String(row.symbol ?? '').toUpperCase();
          const configured = symbolMap.get(providerSymbol);
          return configured ? rowFromYahooQuote(row, configured, config) : null;
        })
        .filter((row): row is Omit<MarketMoverItem, 'rank'> => Boolean(row));
      if (normalizedRows.length > 0) return normalizedRows;
    }
  } catch {
    // The chart fallback below is intentionally used when Yahoo quote is blocked or returns empty data.
  }

  const settled = await Promise.allSettled(providerSymbols.map(providerSymbol => {
    const configured = symbolMap.get(providerSymbol.toUpperCase());
    return configured ? fetchYahooChartRow(providerSymbol, configured, config) : Promise.resolve(null);
  }));

  return settled
    .map(result => result.status === 'fulfilled' ? result.value : null)
    .filter((row): row is Omit<MarketMoverItem, 'rank'> => Boolean(row));
}

function ranked(rows: Array<Omit<MarketMoverItem, 'rank'>>, sorter: (a: Omit<MarketMoverItem, 'rank'>, b: Omit<MarketMoverItem, 'rank'>) => number, limit: number) {
  return rows
    .slice()
    .sort(sorter)
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function rankedByNullable(
  rows: Array<Omit<MarketMoverItem, 'rank'>>,
  selector: (row: Omit<MarketMoverItem, 'rank'>) => number | null,
  direction: 'asc' | 'desc',
  limit: number,
) {
  return ranked(
    rows.filter(row => finiteNumber(selector(row)) !== null),
    (a, b) => {
      const left = finiteNumber(selector(a)) ?? 0;
      const right = finiteNumber(selector(b)) ?? 0;
      return direction === 'asc' ? left - right : right - left;
    },
    limit,
  );
}

function rankedByChange(
  rows: Array<Omit<MarketMoverItem, 'rank'>>,
  direction: 'asc' | 'desc',
  limit: number,
  excludedSymbols = new Set<string>(),
) {
  const candidates = rows.filter(row => {
    const key = moverSymbolKey(row);
    const changePercent = finiteNumber(row.changePercent);
    if (!key || excludedSymbols.has(key) || changePercent === null) return false;
    return direction === 'desc' ? changePercent > 0 : changePercent < 0;
  });
  return ranked(
    candidates,
    (a, b) => {
      const left = finiteNumber(a.changePercent) ?? 0;
      const right = finiteNumber(b.changePercent) ?? 0;
      return direction === 'asc' ? left - right : right - left;
    },
    limit,
  );
}

function buildMoversData(rows: Array<Omit<MarketMoverItem, 'rank'>>, limit: number): MarketMoversData {
  const uniqueRows = uniqueMoverRows(rows);
  const topGainers = rankedByChange(uniqueRows, 'desc', limit);
  const gainerSymbols = new Set(topGainers.map(moverSymbolKey));
  const topLosers = rankedByChange(uniqueRows, 'asc', limit, gainerSymbols);

  return {
    topGainers,
    topLosers,
    highestPrice: ranked(uniqueRows, (a, b) => b.price - a.price, limit),
    lowestPrice: ranked(uniqueRows, (a, b) => a.price - b.price, limit),
    highestVolume: rankedByNullable(uniqueRows, row => row.volume, 'desc', limit),
    lowestVolume: rankedByNullable(uniqueRows, row => row.volume, 'asc', limit),
  };
}

function hasAnyMoverData(data: MarketMoversData) {
  return Object.values(data).some(list => list.length > 0);
}

export function getMarketMoverConfig(market: string) {
  return MARKET_CONFIGS.find(config => config.id === market);
}

export async function fetchMarketMovers(marketInput: string, limitInput = 5): Promise<MarketMoversResponse> {
  const market = marketInput.trim().toLowerCase();
  const config = getMarketMoverConfig(market);
  const limit = Math.max(1, Math.min(5, Math.floor(limitInput)));
  const now = new Date().toISOString();

  if (!config) {
    return {
      ok: false,
      code: 'UNSUPPORTED_MARKET',
      market,
      updated_at: null,
      source: 'Yahoo Finance',
      data: null,
    };
  }

  if (config.symbols.length === 0) {
    debugMarketMovers('[MarketMovers] Market movers skipped', {
      selectedMarket: config.id,
      exchangeCode: config.marketName,
      endpoint: null,
      providerSymbols: [],
      fallbackUsed: false,
      unavailableReason: 'market_movers_not_supported_by_current_provider',
    });

    return {
      ok: false,
      code: 'MARKET_MOVERS_NOT_SUPPORTED',
      market: config.id,
      marketName: config.marketName,
      currency: config.currency,
      updated_at: null,
      source: 'Yahoo Finance',
      data: null,
      message: 'market_movers_not_supported_by_current_provider',
    };
  }

  try {
    const rows = await fetchYahooRows(config);
    const data = buildMoversData(rows, limit);
    if (!hasAnyMoverData(data)) {
      return {
        ok: false,
        code: 'MARKET_MOVERS_UNAVAILABLE',
        market: config.id,
        marketName: config.marketName,
        currency: config.currency,
        updated_at: null,
        source: 'Yahoo Finance',
        data: null,
      };
    }

    return {
      ok: true,
      market: config.id,
      marketName: config.marketName,
      currency: config.currency,
      updated_at: now,
      source: 'Yahoo Finance',
      data,
      warnings: rows.length < limit ? ['provider_returned_limited_rows'] : undefined,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true') {
      console.warn('[MarketMovers] Failed to fetch movers', {
        market: config.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return {
      ok: false,
      code: 'MARKET_MOVERS_UNAVAILABLE',
      market: config.id,
      marketName: config.marketName,
      currency: config.currency,
      updated_at: null,
      source: 'Yahoo Finance',
      data: null,
    };
  }
}
