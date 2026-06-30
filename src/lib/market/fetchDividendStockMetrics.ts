export type DividendStockMetric = {
  symbol: string;
  dividendYield: number | null;
  payoutRatio: number | null;
  annualDividend: number | null;
  exDividendDate: string | null;
  paymentDate: string | null;
  recordDate: string | null;
  declarationDate: string | null;
  currency: string | null;
  source: 'Finnhub' | 'Yahoo Finance' | 'FMP';
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

type FmpDividendCalendarRecord = Record<string, unknown>;

const FMP_DIVIDEND_TIMEOUT_MS = 9000;
const FMP_DIVIDEND_LOOKAHEAD_DAYS = 365;

type FinnhubDividendCalendarItem = {
  date?: string;
  amount?: number | null;
  adjustedAmount?: number | null;
  payDate?: string;
  recordDate?: string;
  declarationDate?: string;
  currency?: string;
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

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean ? clean : null;
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
    recordDate: null,
    declarationDate: null,
    currency: null,
    source: 'Yahoo Finance',
    available: false,
    unavailableReason,
  };
}

function hasUsableFinnhubKey(apiKey?: string) {
  const key = apiKey?.trim();
  return Boolean(key && key !== 'your_key_here');
}

function hasUsableFmpKey(apiKey?: string) {
  const key = apiKey?.trim();
  return Boolean(key && key !== 'your_key_here');
}

function metricWithSource(
  symbol: string,
  source: DividendStockMetric['source'],
  values: Omit<DividendStockMetric, 'symbol' | 'source' | 'available' | 'unavailableReason'>,
): DividendStockMetric {
  const available = [
    values.dividendYield,
    values.payoutRatio,
    values.annualDividend,
    values.exDividendDate,
    values.paymentDate,
    values.recordDate,
    values.declarationDate,
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
    recordDate: null,
    declarationDate: null,
    currency: null,
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
    recordDate: null,
    declarationDate: null,
    currency: stringOrNull(metric.currency),
  });
}

function normalizeFmpDividendCalendarRecord(
  symbol: string,
  record: FmpDividendCalendarRecord,
): DividendStockMetric | null {
  const candidateSymbol = stringOrNull(record.symbol) ?? stringOrNull(record.ticker);
  if (candidateSymbol && candidateSymbol.toUpperCase() !== symbol.toUpperCase()) return null;

  const exDividendDate = dateOrNull(record.exDividendDate ?? record.date ?? record.exDate);
  const paymentDate = dateOrNull(record.paymentDate ?? record.payDate);
  const recordDate = dateOrNull(record.recordDate);
  const declarationDate = dateOrNull(record.declarationDate ?? record.declaredDate);
  const annualDividend = numberOrNull(record.dividend)
    ?? numberOrNull(record.amount)
    ?? numberOrNull(record.adjDividend)
    ?? numberOrNull(record.adjustedAmount);
  const dividendYield = numberOrNull(record.dividendYield) ?? numberOrNull(record.yield);

  return metricWithSource(symbol, 'FMP', {
    dividendYield,
    payoutRatio: null,
    annualDividend,
    exDividendDate,
    paymentDate,
    recordDate,
    declarationDate,
    currency: stringOrNull(record.currency),
  });
}

async function fetchFmpDividendPayload(url: URL) {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(FMP_DIVIDEND_TIMEOUT_MS),
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('fmp_dividend_payload_not_found');
    }
    throw new Error(`fmp_dividend_payload_http_${response.status}`);
  }
  return response.json().catch(() => null);
}

async function fetchFmpDividendCalendar(symbol: string, apiKey?: string): Promise<DividendStockMetric> {
  if (!hasUsableFmpKey(apiKey)) return emptyMetric(symbol, 'fmp_api_key_not_configured');

  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + FMP_DIVIDEND_LOOKAHEAD_DAYS * 86400 * 1000).toISOString().slice(0, 10);

  const stableUrl = new URL('https://financialmodelingprep.com/stable/dividends-calendar');
  stableUrl.searchParams.set('from', from);
  stableUrl.searchParams.set('to', to);
  stableUrl.searchParams.set('symbol', symbol);
  stableUrl.searchParams.set('apikey', apiKey?.trim() ?? '');

  try {
    let payload: unknown;
    try {
      payload = await fetchFmpDividendPayload(stableUrl);
    } catch (error) {
      if (error instanceof Error && error.message === 'fmp_dividend_payload_not_found') {
        const legacyUrl = new URL('https://financialmodelingprep.com/api/v3/stock_dividend_calendar');
        legacyUrl.searchParams.set('from', from);
        legacyUrl.searchParams.set('to', to);
        legacyUrl.searchParams.set('symbol', symbol);
        legacyUrl.searchParams.set('apikey', apiKey?.trim() ?? '');
        payload = await fetchFmpDividendPayload(legacyUrl);
      } else {
        throw error;
      }
    }

    if (!payload) return emptyMetric(symbol, 'fmp_dividend_payload_parse_failed');

    const records = Array.isArray(payload)
      ? payload as FmpDividendCalendarRecord[]
      : Array.isArray((payload as Record<string, unknown>)?.data)
        ? (payload as { data: FmpDividendCalendarRecord[] }).data
        : [];

    const normalized = records
      .map(record => normalizeFmpDividendCalendarRecord(symbol, objectOrNull(record) ?? {}))
      .filter((metric): metric is DividendStockMetric => Boolean(metric))
      .filter(metric =>
        metric.dividendYield !== null
        || metric.annualDividend !== null
        || metric.exDividendDate !== null
        || metric.paymentDate !== null
        || metric.recordDate !== null
        || metric.declarationDate !== null);

    if (normalized.length === 0) return emptyMetric(symbol, 'provider_returned_empty');

    const now = Date.now();
    const withDate = normalized
      .map(metric => {
        const candidateDates = [
          metric.exDividendDate,
          metric.paymentDate,
          metric.recordDate,
          metric.declarationDate,
        ]
          .map(value => (value ? Date.parse(value) : NaN))
          .filter((value): value is number => Number.isFinite(value))
          .sort((a, b) => a - b);
        return {
          metric,
          firstKnownDate: candidateDates[0] ?? null,
        };
      })
      .filter((item): item is { metric: DividendStockMetric; firstKnownDate: number } => item.firstKnownDate !== null)
      .sort((a, b) => a.firstKnownDate - b.firstKnownDate);

    const selected = withDate.find(item => item.firstKnownDate >= now)?.metric
      ?? withDate[0]?.metric
      ?? normalized[0];

    return selected ?? emptyMetric(symbol, 'provider_returned_empty_dividend_metrics');
  } catch (error) {
    return emptyMetric(symbol, error instanceof Error ? error.message : 'fmp_dividend_calendar_fetch_failed');
  }
}

async function fetchFinnhubDividendCalendar(symbol: string, apiKey?: string): Promise<{ exDividendDate: string | null; paymentDate: string | null }> {
  if (!hasUsableFinnhubKey(apiKey)) return { exDividendDate: null, paymentDate: null };
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + 180 * 86400 * 1000).toISOString().slice(0, 10);
  const params = new URLSearchParams({ symbol, from, to, token: apiKey?.trim() ?? '' });
  try {
    const response = await fetch(`https://finnhub.io/api/v1/stock/dividend?${params.toString()}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return { exDividendDate: null, paymentDate: null };
    const body = await response.json().catch(() => null) as FinnhubDividendCalendarItem[] | null;
    if (!Array.isArray(body) || body.length === 0) return { exDividendDate: null, paymentDate: null };
    const upcoming = [...body].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))[0];
    return {
      exDividendDate: upcoming?.date ? dateOrNull(upcoming.date) : null,
      paymentDate: upcoming?.payDate ? dateOrNull(upcoming.payDate) : null,
    };
  } catch {
    return { exDividendDate: null, paymentDate: null };
  }
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
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
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

export async function fetchDividendStockMetric(
  symbol: string,
  apiKey?: string,
  fmpApiKey?: string,
): Promise<DividendStockMetric> {
  const [finnhubMetric, yahooMetric, fmpMetric, calendarDates] = await Promise.all([
    fetchFinnhubDividendMetric(symbol, apiKey),
    fetchYahooDividendMetric(symbol),
    fetchFmpDividendCalendar(symbol, fmpApiKey),
    fetchFinnhubDividendCalendar(symbol, apiKey),
  ]);

  const metricSource = fmpMetric.available ? fmpMetric : (finnhubMetric.available ? finnhubMetric : yahooMetric);

  const merged: DividendStockMetric = {
    ...metricSource,
    exDividendDate: fmpMetric.exDividendDate
      ?? calendarDates.exDividendDate
      ?? metricSource.exDividendDate,
    paymentDate: fmpMetric.paymentDate
      ?? calendarDates.paymentDate
      ?? metricSource.paymentDate,
    recordDate: fmpMetric.recordDate ?? metricSource.recordDate,
    declarationDate: fmpMetric.declarationDate ?? metricSource.declarationDate,
    annualDividend: fmpMetric.annualDividend ?? metricSource.annualDividend,
    dividendYield: fmpMetric.dividendYield ?? metricSource.dividendYield,
    currency: fmpMetric.currency ?? metricSource.currency,
    source: fmpMetric.available ? 'FMP' : metricSource.source,
  };

  merged.available = [
    merged.dividendYield,
    merged.payoutRatio,
    merged.annualDividend,
    merged.exDividendDate,
    merged.paymentDate,
    merged.recordDate,
    merged.declarationDate,
  ].some(value => value !== null);
  merged.unavailableReason = merged.available ? undefined : metricSource.unavailableReason;

  return merged;
}

export async function fetchDividendStockMetrics(
  symbols: string[],
  finnhubApiKey?: string,
  fmpApiKey?: string,
) {
  const settled = await Promise.allSettled(symbols.map(symbol => fetchDividendStockMetric(
    symbol,
    finnhubApiKey ?? process.env.FINNHUB_API_KEY,
    fmpApiKey ?? process.env.FMP_API_KEY,
  )));

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
