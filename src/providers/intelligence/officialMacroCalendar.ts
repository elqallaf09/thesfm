import type { IntelligenceContextEvidence, IntelligenceContextMacroEvent } from './contextEvidence';

export const BLS_CALENDAR_URL = 'https://www.bls.gov/schedule/news_release/bls.ics';
const DAY = 86_400_000;
let cached: { expires: number; value: IntelligenceContextEvidence['macro'] } | null = null;
let pending: Promise<IntelligenceContextEvidence['macro'] | null> | null = null;

/** BLS publishes Eastern local times; derive the offset for that date, including DST. */
export function calendarTimestamp(value: string, timezone: string | null): string | null {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, utc] = match;
  const raw = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  const stamp = Date.parse(raw);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 19) !== raw.slice(0, 19)) return null;
  if (utc) return new Date(stamp).toISOString();
  if (!timezone || !['US-Eastern', 'US/Eastern', 'America/New_York', 'Eastern Standard Time'].includes(timezone)) return null;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' }).formatToParts(new Date(stamp));
  const offset = parts.find(part => part.type === 'timeZoneName')?.value.match(/^GMT([+-]\d{1,2})$/);
  return offset ? new Date(stamp - Number(offset[1]) * 3600_000).toISOString() : null;
}

/** Calendar entries carry scheduling evidence only, never invented actuals or forecasts. */
export function parseBlsCalendar(text: string, now = Date.now()): IntelligenceContextMacroEvent[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const events: IntelligenceContextMacroEvent[] = [];
  const seen = new Set<string>();
  for (const block of unfolded.split('BEGIN:VEVENT').slice(1)) {
    const section = block.split('END:VEVENT')[0];
    if (/^STATUS:CANCELLED\s*$/m.test(section)) continue;
    const date = section.match(/^DTSTART(?:;TZID=([^:\r\n]+))?:(\d{8}T\d{6}Z?)\s*$/m);
    const title = section.match(/^SUMMARY:(.+)$/m)?.[1].trim().replace(/\\[nN]/g, ' ').replace(/\\([,;\\])/g, '$1');
    const at = date ? calendarTimestamp(date[2], date[1]?.replace(/^"|"$/g, '') ?? null) : null;
    if (!title || !at || Date.parse(at) < now - 3 * DAY || Date.parse(at) > now + 7 * DAY) continue;
    const key = `${at}|${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({ title: title.slice(0, 240), country: 'US', currency: 'USD', dateTimeUtc: at,
      impact: 'unknown', actual: null, forecast: null, previous: null, provider: 'bls' });
  }
  return events.sort((a, b) => Date.parse(a.dateTimeUtc) - Date.parse(b.dateTimeUtc)).slice(0, 24);
}

export async function loadOfficialMacroCalendar(): Promise<IntelligenceContextEvidence['macro'] | null> {
  if (cached && cached.expires > Date.now()) return cached.value;
  if (pending) return pending;
  pending = (async () => {
    try {
      const response = await fetch(BLS_CALENDAR_URL, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000) });
      if (!response.ok) return null;
      const text = await response.text();
      if (text.length > 2_000_000 || !text.includes('BEGIN:VCALENDAR')) return null;
      const events = parseBlsCalendar(text);
      if (!events.length) return null;
      const value = { provider: 'bls', observedAt: new Date().toISOString(), stale: false, events, failureCode: null };
      cached = { expires: Date.now() + 3600_000, value };
      return value;
    } catch { return null; }
    finally { pending = null; }
  })();
  return pending;
}
