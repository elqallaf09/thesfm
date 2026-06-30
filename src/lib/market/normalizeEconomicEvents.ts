export type EconomicImpact = 'high' | 'medium' | 'low' | 'unknown';

export type NormalizedEconomicEvent = {
  id: string;
  eventName: string;
  currency: string | null;
  country: string | null;
  impact: EconomicImpact;
  dateTime: string | null;
  previous: string | number | null;
  forecast: string | number | null;
  actual: string | number | null;
  source: string | null;
  status: 'upcoming' | 'released' | 'unknown';
};

const FIELD_CANDIDATES = {
  id: ['id', 'event_id', 'eventId'],
  eventName: ['eventName', 'event', 'name', 'title', 'headline'],
  currency: ['currency', 'symbol', 'ccy'],
  country: ['country', 'region'],
  impact: ['impact', 'importance', 'level'],
  dateTime: ['dateTime', 'time', 'datetime', 'date', 'eventTime', 'event_time', 'timestamp'],
  previous: ['previous', 'prev'],
  forecast: ['forecast', 'estimate', 'consensus'],
  actual: ['actual', 'value'],
  source: ['source', 'provider'],
} as const;

function readField(record: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    return value;
  }
  return null;
}

function safeText(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value === 'string') return value.trim() || null;
  return null;
}

function safeValue(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return value.trim() || null;
  return null;
}

function normalizeImpact(value: unknown): EconomicImpact {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 'unknown';
  if (raw === '3' || raw.includes('high') || raw.includes('عالي') || raw.includes('fort')) return 'high';
  if (raw === '2' || raw.includes('medium') || raw.includes('moderate') || raw.includes('متوسط') || raw.includes('moyen')) return 'medium';
  if (raw === '1' || raw.includes('low') || raw.includes('منخفض') || raw.includes('faible')) return 'low';
  return 'unknown';
}

function normalizeDateTime(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    const date = new Date(value < 10000000000 ? value * 1000 : value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const raw = String(value).trim();
  if (!raw) return null;
  const assumedUtc = /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)
    ? `${raw.replace(' ', 'T')}Z`
    : raw;
  const parsed = new Date(assumedUtc);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeStatus(dateTime: string | null, actual: string | number | null): NormalizedEconomicEvent['status'] {
  if (actual !== null && actual !== undefined && String(actual).trim()) return 'released';
  if (!dateTime) return 'unknown';
  return new Date(dateTime).getTime() >= Date.now() ? 'upcoming' : 'released';
}

function safeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function normalizeEconomicEvent(record: Record<string, unknown>, index = 0): NormalizedEconomicEvent | null {
  const eventName = safeText(readField(record, FIELD_CANDIDATES.eventName));
  if (!eventName) return null;

  const dateTime = normalizeDateTime(readField(record, FIELD_CANDIDATES.dateTime));
  if (!dateTime) return null;
  const previous = safeValue(readField(record, FIELD_CANDIDATES.previous));
  const forecast = safeValue(readField(record, FIELD_CANDIDATES.forecast));
  const actual = safeValue(readField(record, FIELD_CANDIDATES.actual));
  const id = safeText(readField(record, FIELD_CANDIDATES.id))
    ?? safeId([eventName, dateTime ?? '', String(index)].join('-'))
    ?? `economic-event-${index}`;

  return {
    id,
    eventName,
    currency: safeText(readField(record, FIELD_CANDIDATES.currency))?.toUpperCase() ?? null,
    country: safeText(readField(record, FIELD_CANDIDATES.country)) ?? null,
    impact: normalizeImpact(readField(record, FIELD_CANDIDATES.impact)),
    dateTime,
    previous,
    forecast,
    actual,
    source: safeText(readField(record, FIELD_CANDIDATES.source)),
    status: normalizeStatus(dateTime, actual),
  };
}

export function normalizeEconomicEvents(items: Record<string, unknown>[]) {
  return items
    .map((item, index) => normalizeEconomicEvent(item, index))
    .filter((item): item is NormalizedEconomicEvent => Boolean(item));
}
