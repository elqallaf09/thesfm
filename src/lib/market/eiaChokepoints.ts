const EIA_GLOBAL_ENERGY_SECURITY_URL = 'https://www.eia.gov/outlooks/steo/report/energysecurity/article.php';

export type EiaChokepointFlow = {
  id: 'hormuz' | 'bab_el_mandeb';
  label: string;
  period: string;
  millionBarrelsPerDay: number;
  previousPeriod: string | null;
  previousMillionBarrelsPerDay: number | null;
  changeMillionBarrelsPerDay: number | null;
  changePct: number | null;
};

export type EiaChokepointSnapshot = {
  source: 'U.S. Energy Information Administration';
  sourceUrl: string;
  unit: 'million barrels per day';
  releaseDate: string | null;
  hormuz: EiaChokepointFlow;
  babElMandeb: EiaChokepointFlow;
  aisReliabilityCaveat: boolean;
  caveat: string | null;
  fetchedAt: string;
};

function round(value: number, digits = 2) {
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

function stripHtml(value: string) {
  return decodeHtml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCells(rowHtml: string) {
  return [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
    .map(match => stripHtml(match[1]))
    .filter(Boolean);
}

function rowsFromTable(tableHtml: string) {
  return [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(match => parseCells(match[1]))
    .filter(row => row.length > 0);
}

function numeric(value: string) {
  const cleaned = value.replace(/,/g, '').trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function period(value: string) {
  const match = value.toUpperCase().match(/\b([1-4]Q\d{2})\b/);
  return match?.[1] ?? null;
}

function monthDateToIso(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function releaseDateNearSecurityHeading(html: string) {
  const plain = stripHtml(html);
  const headingIndex = plain.toLowerCase().indexOf('global energy security data');
  const scope = headingIndex >= 0 ? plain.slice(Math.max(0, headingIndex - 900), headingIndex + 120) : plain.slice(0, 2000);
  const dates = [...scope.matchAll(/Release Date:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/gi)];
  return dates.length ? monthDateToIso(dates.at(-1)![1]) : null;
}

function findFlow(
  rows: string[][],
  periods: string[],
  id: EiaChokepointFlow['id'],
  label: string,
  rowPattern: RegExp,
): EiaChokepointFlow | null {
  const row = rows.find(cells => rowPattern.test(cells[0] ?? ''));
  if (!row) return null;

  const values = row.slice(1).map(numeric).filter((value): value is number => value !== null);
  if (values.length < periods.length || periods.length === 0) return null;
  const aligned = values.slice(-periods.length);
  const latestValue = aligned.at(-1);
  const previousValue = aligned.at(-2) ?? null;
  if (latestValue === undefined) return null;

  const change = previousValue === null ? null : latestValue - previousValue;
  return {
    id,
    label,
    period: periods.at(-1)!,
    millionBarrelsPerDay: latestValue,
    previousPeriod: periods.at(-2) ?? null,
    previousMillionBarrelsPerDay: previousValue,
    changeMillionBarrelsPerDay: change === null ? null : round(change),
    changePct: previousValue && change !== null ? round((change / previousValue) * 100, 1) : null,
  };
}

export function parseEiaChokepointsHtml(html: string, fetchedAt = new Date().toISOString()): EiaChokepointSnapshot | null {
  const tables = [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(match => match[0]);
  const table = tables.find(candidate => /Strait of Hormuz/i.test(candidate) && /Bab el-Mandeb/i.test(candidate));
  if (!table) return null;

  const rows = rowsFromTable(table);
  const header = rows.find(cells => cells.filter(cell => period(cell)).length >= 2);
  if (!header) return null;
  const periods = header.map(period).filter((value): value is string => Boolean(value));
  if (periods.length < 2) return null;

  const hormuz = findFlow(rows, periods, 'hormuz', 'Strait of Hormuz', /^(?:Total oil flows through the )?Strait of Hormuz$/i);
  const babElMandeb = findFlow(rows, periods, 'bab_el_mandeb', 'Bab el-Mandeb', /^(?:Total oil flows through the )?Bab el-Mandeb(?: Strait)?$/i);
  if (!hormuz || !babElMandeb) return null;

  const plain = stripHtml(html);
  const aisReliabilityCaveat = /AIS signal data[\s\S]{0,180}Strait of Hormuz[\s\S]{0,180}(?:especially unreliable|revised frequently)/i.test(plain)
    || /Strait of Hormuz[\s\S]{0,180}(?:especially unreliable|revised frequently)/i.test(plain);
  const caveat = aisReliabilityCaveat
    ? 'EIA states that AIS signal data for ships transiting the Strait of Hormuz have been especially unreliable since the end of February 2026, and 2026 tanker-tracking volumes are revised frequently using additional route analysis.'
    : null;

  return {
    source: 'U.S. Energy Information Administration',
    sourceUrl: EIA_GLOBAL_ENERGY_SECURITY_URL,
    unit: 'million barrels per day',
    releaseDate: releaseDateNearSecurityHeading(html),
    hormuz,
    babElMandeb,
    aisReliabilityCaveat,
    caveat,
    fetchedAt,
  };
}

export async function fetchEiaChokepoints(): Promise<EiaChokepointSnapshot | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  timer.unref?.();
  try {
    const response = await fetch(EIA_GLOBAL_ENERGY_SECURITY_URL, {
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
    if (html.length > 3_000_000) return null;
    return parseEiaChokepointsHtml(html);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export { EIA_GLOBAL_ENERGY_SECURITY_URL };
