export type DividendStockMetric = {
  symbol: string;
  dividendYield: number | null;
  payoutRatio: number | null;
  annualDividend: number | null;
  exDividendDate: string | null;
  paymentDate: string | null;
  source: 'Finnhub' | 'Yahoo Finance';
  available: boolean;
  unavailableReason?: string;
};

type YahooWrappedValue = {
  raw?: unknown;
  fmt?: string;
  longFmt?: string;
};

type YahooQuoteSummaryResult = {
  summaryDetail?: Record<string, unknown>;
  defaultKeyStatistics?: Record<string, unknown>;
  calendarEvents?: Record<string, unknown>;
};

type YahooQuoteSummaryResponse = {
  quoteSummary?: {
    result?: YahooQuoteSummaryResult[];
    error?: unknown;
  };
};

type FinnhubMetricResponse = {
  metric?: Record<string, unknown>;
};

function objectOrNull(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function unwrapRaw(value: unknown) {
  const wrapped = objectOrNull(value) as YahooWrappedValue | null;
  return wrapped && 'raw' in wrapped ? wrapped.raw : value;
}

function numberOrNull(value: unknown) {
  const unwrapped = unwrapRaw(value);
  if (typeof unwrapped === 'number') return Number.isFinite(unwrapped) ? unwrapped : null;
  if (typeof unwrapped === 'string') {
    const parsed = Number(unwrapped.replace(/[%,$]/g, '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function dateOrNull(value: unknown) {
  const unwrapped = unwrapRaw(value);
  if (typeof unwrapped === 'number' && Number.isFinite(unwrapped) && unwrapped > 0) {
    return new Date(unwrapped * 1000).toISOString();
  }
  if (typeof unwrapped === 'string' && unwrapped.trim()) {
    const parsed = new Date(unwrapped);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

function emptyMetric(symbol: string, unavailableReason: string): DividendStockMetric {
  return {
    symbol,
    dividendYield: null,
    payoutRatio: null,
    annualDividend: null,
    exDividendDate: null,
    paymentDate: null,
    source: 'Yahoo Finance',
    available: false,
    unavailableReason,
  };
}

function hasUsableFinnhubKey(apiKey?: string) {
  const key = apiKey?.trim();
  return Boolean(key && key !== 'your_key_here');
}

function metricWithSource(symbol: string, source: DividendStockMetric['source'], values: Omit<DividendStockMetric, 'symbol' | 'source' | 'available' | 'unavailableReason'>): DividendStockMetric {
  const available = [
    values.dividendYield,
    values.payoutRatio,
    values.annualDividend,
    values.exDividendDate,
    values.paymentDate,
  ].some(value => value !== null);

  return {
    symbol,
    ...values,
    source,
    available,
    ...(available ? {} : { unavailableReason: 'provider_returned_empty_dividend_metrics' }),
  };
}

function normalizeDividendMetric(symbol: string, result: YahooQuoteSummaryResult): DividendStockMetric {
  const summaryDetail = objectOrNull(result.summaryDetail);
  const defaultStats = objectOrNull(result.defaultKeyStatistics);
  const calendarEvents = objectOrNull(result.calendarEvents);

  const dividendYield = numberOrNull(summaryDetail?.dividendYield)
    ?? numberOrNull(summaryDetail?.trailingAnnualDividendYield);
  const payoutRatio = numberOrNull(defaultStats?.payoutRatio);
  const annualDividend = numberOrNull(summaryDetail?.dividendRate)
    ?? numberOrNull(summaryDetail?.trailingAnnualDividendRate);
  const exDividendDate = dateOrNull(calendarEvents?.exDividendDate)
    ?? dateOrNull(summaryDetail?.exDividendDate);
  const paymentDate = dateOrNull(calendarEvents?.dividendDate);
  return metricWithSource(symbol, 'Yahoo Finance', {
    dividendYield,
    payoutRatio,
    annualDividend,
    exDividendDate,
    paymentDate,
  });
}

function normalizeFinnhubMetric(symbol: string, metric: Record<string, unknown>): DividendStockMetric {
  return metricWithSource(symbol, 'Finnhub', {
    dividendYield: numberOrNull(metric.dividendYieldIndicatedAnnual)
      ?? numberOrNull(metric.dividendYield5Y),
    payoutRatio: numberOrNull(metric.payoutRatioAnnual)
      ?? numberOrNull(metric.payoutRatioTTM),
    annualDividend: numberOrNull(metric.dividendPerShareAnnual)
      ?? numberOrNull(metric.dividendPerShareTTM),
    exDividendDate: null,
    paymentDate: null,
  });
}

async function fetchFinnhubDividendMetric(symbol: string, apiKey?: string): Promise<DividendStockMetric> {
  if (!hasUsableFinnhubKey(apiKey)) return emptyMetric(symbol, 'finnhub_api_key_not_configured');
  const params = new URLSearchParams({ symbol, metric: 'all', token: apiKey?.trim() ?? '' });
  try {
    const response = await fetch(`https://finnhub.io/api/v1/stock/metric?${params.toString()}`, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(9000),
      headers: { accept: 'application/json' },
    });
    const body = await response.json().catch(() => null) as FinnhubMetricResponse | null;
    if (!response.ok) return emptyMetric(symbol, `provider_http_${response.status}`);
    const metric = objectOrNull(body?.metric);
    if (!metric) return emptyMetric(symbol, 'provider_returned_empty');
    return normalizeFinnhubMetric(symbol, metric);
  } catch (error) {
    return emptyMetric(symbol, error instanceof Error ? error.message : 'finnhub_dividend_metric_fetch_failed');
  }
}

async function fetchYahooDividendMetric(symbol: string): Promise<DividendStockMetric> {
  const modules = ['summaryDetail', 'defaultKeyStatistics', 'calendarEvents'].join(',');
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
  try {
    const response = await fetch(url, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(9000),
      headers: {
        accept: 'application/json',
        'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
      },
    });
    const body = await response.json().catch(() => null) as YahooQuoteSummaryResponse | null;
    const result = body?.quoteSummary?.result?.[0] ?? null;
    if (!response.ok) return emptyMetric(symbol, `provider_http_${response.status}`);
    if (!result) return emptyMetric(symbol, 'provider_returned_empty');
    return normalizeDividendMetric(symbol, result);
  } catch (error) {
    return emptyMetric(symbol, error instanceof Error ? error.message : 'dividend_metric_fetch_failed');
  }
}

export async function fetchDividendStockMetric(symbol: string, apiKey?: string): Promise<DividendStockMetric> {
  const finnhubMetric = await fetchFinnhubDividendMetric(symbol, apiKey);
  if (finnhubMetric.available) return finnhubMetric;
  return fetchYahooDividendMetric(symbol);
}

export async function fetchDividendStockMetrics(symbols: string[]) {
  const apiKey = process.env.FINNHUB_API_KEY;
  const settled = await Promise.allSettled(symbols.map(symbol => fetchDividendStockMetric(symbol, apiKey)));
  const entries = settled.flatMap((result, index): Array<[string, DividendStockMetric]> => {
    const symbol = symbols[index] ?? '';
    if (!symbol) return [];
    return [[
      symbol,
      result.status === 'fulfilled'
        ? result.value
        : emptyMetric(symbol, result.reason instanceof Error ? result.reason.message : 'dividend_metric_fetch_failed'),
    ]];
  });
  return new Map<string, DividendStockMetric>(entries);
}
