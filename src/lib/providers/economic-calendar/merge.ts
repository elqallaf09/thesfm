import type { EconomicCalendarEvent, EconomicCalendarQuery } from './types';

function normalized(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** Keep distinct releases/units separate; only exact normalized title + time + jurisdiction merge. */
export function mergeCalendarEvents(events: EconomicCalendarEvent[]) {
  const merged = new Map<string, EconomicCalendarEvent>();
  for (const event of [...events].sort((a, b) => Number(Boolean(a.stale)) - Number(Boolean(b.stale)))) {
    if (!event.title.trim() || !Number.isFinite(Date.parse(event.dateTimeUtc))) continue;
    const key = [normalized(event.title), event.dateTimeUtc, event.country, event.currency, event.unit].join('|');
    const source = { provider: event.provider, url: event.sourceUrl ?? null, retrievedAt: event.retrievedAt ?? null };
    const previous = merged.get(key);
    if (!previous) merged.set(key, { ...event, sources: [source] });
    else {
      if (!previous.sources!.some(item => item.provider === source.provider)) previous.sources!.push(source);
      if (!event.stale && !previous.stale) {
        previous.actual ??= event.actual;
        previous.forecast ??= event.forecast;
        previous.previous ??= event.previous;
      }
    }
  }
  return [...merged.values()].sort((a, b) => a.dateTimeUtc.localeCompare(b.dateTimeUtc));
}

export function selectCalendarEvents(events: EconomicCalendarEvent[], query: EconomicCalendarQuery) {
  const from = Date.parse(`${query.from}T00:00:00Z`);
  const to = Date.parse(`${query.to}T00:00:00Z`) + 86_400_000;
  const aliases: Record<string, string> = { 'united states': 'us', 'united kingdom': 'gb', 'uk': 'gb', 'canada': 'ca' };
  const country = (value: string) => aliases[normalized(value)] ?? normalized(value);
  return events.filter(event => Date.parse(event.dateTimeUtc) >= from && Date.parse(event.dateTimeUtc) < to
    && (!query.currency || event.currency === query.currency.toUpperCase())
    && (!query.country || country(event.country ?? '') === country(query.country))
    && (!query.impact || event.impact === query.impact));
}
