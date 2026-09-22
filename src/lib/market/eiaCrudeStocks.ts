const EIA_COMMERCIAL_CRUDE_STOCKS_URL = 'https://www.eia.gov/dnav/pet/PET_STOC_WSTK_A_EPC0_SAX_MBBL_W.htm';

export type EiaCrudeStocksSnapshot = {
  source: 'U.S. Energy Information Administration';
  sourceUrl: string;
  series: 'U.S. commercial crude oil stocks excl. lease stock';
  unit: 'million barrels';
  latest: number;
  previous: number;
  weeklyChange: number;
  weeklyChangePct: number;
  asOf: string;
  previousAsOf: string;
  releaseDate: string | null;
  fetchedAt: string;
};

function round(value: number, digits = 3) {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&mdash;|&#8212;/gi, '—');
}

function htmlRows(html: string) {
  const text = decodeHtml(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/tr\s*>/gi, '\n')
    .replace(/<\/t[dh]\s*>/gi, '|')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '');

  return text
    .split('\n')
    .map(row => row.split('|').map(cell => cell.replace(/\s+/g, ' ').trim()).filter(Boolean))
    .filter(row => row.length > 0);
}

function parseDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return null;
  const year = Number(match[3].length === 2 ? '20' + match[3] : match[3]);
  const month = Number(match[1]);
  const day = Number(match[2]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isFinite(date.getTime()) && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : null;
}

function parseStockValue(value: string) {
  const cleaned = value.replace(/,/g, '').trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function releaseDateFromHtml(html: string) {
  const text = decodeHtml(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const match = text.match(/Release Date:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  return match ? parseDate(match[1]) : null;
}

export function parseEiaCommercialCrudeStocksHtml(html: string, fetchedAt = new Date().toISOString()): EiaCrudeStocksSnapshot | null {
  const rows = htmlRows(html);
  const dateRow = rows.find(row => row.map(parseDate).filter(Boolean).length >= 2);
  if (!dateRow) return null;

  const dates = dateRow.map(parseDate).filter((value): value is string => Boolean(value));
  if (dates.length < 2) return null;

  const usRow = rows.find(row => {
    const first = row[0]?.replace(/\s+/g, '').toUpperCase();
    if (first !== 'U.S.' && first !== 'US' && first !== 'U.S') return false;
    return row.slice(1).map(parseStockValue).filter((value): value is number => value !== null).length >= 2;
  });
  if (!usRow) return null;

  const values = usRow
    .slice(1)
    .map(parseStockValue)
    .filter((value): value is number => value !== null)
    .slice(-dates.length);
  if (values.length < 2) return null;

  const latestThousandBarrels = values.at(-1)!;
  const previousThousandBarrels = values.at(-2)!;
  const latest = latestThousandBarrels / 1000;
  const previous = previousThousandBarrels / 1000;
  const weeklyChange = latest - previous;

  return {
    source: 'U.S. Energy Information Administration',
    sourceUrl: EIA_COMMERCIAL_CRUDE_STOCKS_URL,
    series: 'U.S. commercial crude oil stocks excl. lease stock',
    unit: 'million barrels',
    latest: round(latest),
    previous: round(previous),
    weeklyChange: round(weeklyChange),
    weeklyChangePct: previous > 0 ? round((weeklyChange / previous) * 100, 2) : 0,
    asOf: dates.at(-1)!,
    previousAsOf: dates.at(-2)!,
    releaseDate: releaseDateFromHtml(html),
    fetchedAt,
  };
}

export async function fetchEiaCommercialCrudeStocks(): Promise<EiaCrudeStocksSnapshot | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  timer.unref?.();
  try {
    const response = await fetch(EIA_COMMERCIAL_CRUDE_STOCKS_URL, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
      },
      signal: controller.signal,
      next: { revalidate: 900 },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) return null;
    const html = await response.text();
    if (html.length > 2_000_000) return null;
    return parseEiaCommercialCrudeStocksHtml(html);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export { EIA_COMMERCIAL_CRUDE_STOCKS_URL };
