import { createHash } from 'node:crypto';
import type { EconomicCalendarEvent, EconomicCalendarProviderName } from './types';

export const OFFICIAL_CALENDAR_SOURCES = [
  { provider: 'bea', name: 'U.S. Bureau of Economic Analysis', country: 'US', currency: 'USD', timezone: 'America/New_York', url: 'https://www.bea.gov/news/schedule', format: 'bea' },
  { provider: 'boc', name: 'Bank of Canada', country: 'CA', currency: 'CAD', timezone: 'America/Toronto', url: 'https://www.bankofcanada.ca/press/upcoming-events/', format: 'boc' },
  { provider: 'bls', name: 'U.S. Bureau of Labor Statistics', country: 'US', currency: 'USD', timezone: 'America/New_York', url: 'https://www.bls.gov/schedule/news_release/bls.ics', format: 'ics' },
  { provider: 'ons', name: 'Office for National Statistics', country: 'GB', currency: 'GBP', timezone: 'Europe/London', url: 'https://www.ons.gov.uk/calendar/releasecalendar?release-type=type-upcoming&limit=100', format: 'ics' },
] as const;
export type OfficialCalendarSource = typeof OFFICIAL_CALENDAR_SOURCES[number];

/** Convert the publisher's wall clock to UTC, checking DST rather than using a fixed offset. */
export function officialCalendarTime(value: string, zone: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!match) return null; // Do not invent a release time for an all-day or undated event.
  const [, year, month, day, hour, minute, second, utc] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  const wall = Date.parse(`${iso}Z`);
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 19) !== iso) return null;
  if (utc) return new Date(wall).toISOString();
  const aliases: Record<string, string> = { 'US-Eastern': 'America/New_York', 'US/Eastern': 'America/New_York', 'Eastern Standard Time': 'America/New_York' };
  try {
    const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: aliases[zone] ?? zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    const local = (at: number) => {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(at)).map(part => [part.type, part.value]));
      return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
    };
    let candidate = wall;
    for (let i = 0; i < 3; i += 1) candidate += wall - Date.parse(`${local(candidate)}Z`);
    return local(candidate) === iso ? new Date(candidate).toISOString() : null;
  } catch { return null; }
}

function plain(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;|&#160;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();
}

function makeEvent(title: string, at: string, source: OfficialCalendarSource, url: string = source.url): EconomicCalendarEvent {
  const id = createHash('sha256').update(`${source.provider}|${at}|${title}`).digest('hex').slice(0, 24);
  // Impact is our documented classification, not a value claimed by the publisher.
  const impact = /consumer price|inflation|employment situation|\bgdp\b|gross domestic product|personal income and outlays|interest rate|policy rate|monetary policy report/i.test(title) ? 'high'
    : /producer price|retail sales|labour market|labor market|trade|job openings|business outlook/i.test(title) ? 'medium' : 'unknown';
  return { id: `sfm-${id}`, title: title.slice(0, 500), country: source.country, currency: source.currency, dateTimeUtc: at,
    impact, impactMethod: 'sfm-title-rule-v1', actual: null, forecast: null, previous: null, unit: null,
    source: source.name, provider: source.provider, sourceUrl: url };
}

export function parseOfficialIcs(text: string, source: OfficialCalendarSource): EconomicCalendarEvent[] {
  if (!text.includes('BEGIN:VCALENDAR') || !text.includes('END:VCALENDAR')) throw new Error('invalid_calendar');
  const events: EconomicCalendarEvent[] = [];
  for (const block of text.replace(/\r?\n[ \t]/g, '').split('BEGIN:VEVENT').slice(1)) {
    const section = block.split('END:VEVENT')[0];
    if (/^STATUS:CANCELLED\s*$/m.test(section) || /^RRULE:/m.test(section)) continue;
    const date = section.match(/^DTSTART((?:;[^:\r\n]+)*):([^\r\n]+)/m);
    const title = section.match(/^SUMMARY(?:;[^:\r\n]+)?:([^\r\n]+)/m)?.[1].replace(/\\[nN]/g, ' ').replace(/\\([,;\\])/g, '$1').trim();
    const zone = date?.[1].match(/TZID=([^;]+)/)?.[1].replace(/^"|"$/g, '') ?? source.timezone;
    const at = date ? officialCalendarTime(date[2].trim(), zone) : null;
    if (!title || !at) continue;
    const rawUrl = section.match(/^URL(?:;[^:\r\n]+)?:([^\r\n]+)/m)?.[1].trim();
    let url: string = source.url;
    try { if (rawUrl && new URL(rawUrl).protocol === 'https:') url = rawUrl; } catch { /* Publisher URL remains available. */ }
    events.push(makeEvent(title, at, source, url));
  }
  return events;
}

export function parseBeaSchedule(text: string, source: OfficialCalendarSource): EconomicCalendarEvent[] {
  const tables = [...text.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(match => match[0]).filter(table => table.includes('release-schedule-table'));
  if (!tables.length) throw new Error('invalid_bea_schedule');
  const events: EconomicCalendarEvent[] = [];
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  for (const table of tables) {
    const year = table.match(/Year\s+(\d{4})/)?.[1];
    if (!year) continue;
    for (const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => plain(cell[1]));
      const date = cells[0]?.match(/^(\w+)\s+(\d{1,2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!date || !cells[2]) continue;
      const month = months.indexOf(date[1].toLowerCase()) + 1;
      const hour = Number(date[3]) % 12 + (date[5].toUpperCase() === 'PM' ? 12 : 0);
      const at = officialCalendarTime(`${year}${String(month).padStart(2, '0')}${date[2].padStart(2, '0')}T${String(hour).padStart(2, '0')}${date[4]}00`, source.timezone);
      if (at) events.push(makeEvent(cells[2], at, source));
    }
  }
  if (!events.length) throw new Error('invalid_bea_schedule');
  return events;
}

export function parseBocSchedule(text: string, source: OfficialCalendarSource): EconomicCalendarEvent[] {
  if (!text.includes('eventscalendar-')) throw new Error('invalid_boc_schedule');
  const events: EconomicCalendarEvent[] = [];
  for (const match of text.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)) {
    const block = match[1];
    const date = plain(block.match(/<span[^>]*class=['"][^'"]*media-date[^'"]*['"][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? '');
    const link = block.match(/<a href="(https:\/\/www\.bankofcanada\.ca\/[^" ]+)"[^>]*data-content-type="Upcoming events"[^>]*>([\s\S]*?)<\/a>/i);
    const time = plain(block).match(/\b(\d{1,2}):(\d{2})\s*\(ET\)/);
    // Exclude untimed speeches/holidays instead of assigning midnight as a release time.
    if (!link || !time || !date) continue;
    const day = new Date(`${date} 00:00:00 GMT`);
    if (!Number.isFinite(day.getTime())) continue;
    const at = officialCalendarTime(`${day.toISOString().slice(0, 10).replace(/-/g, '')}T${time[1].padStart(2, '0')}${time[2]}00`, source.timezone);
    if (at) events.push(makeEvent(plain(link[2]), at, source, link[1]));
  }
  if (!events.length) throw new Error('invalid_boc_schedule');
  return events;
}

export async function fetchOfficialCalendar(source: OfficialCalendarSource, force = false): Promise<EconomicCalendarEvent[]> {
  const response = await fetch(source.url, { ...(force ? { cache: 'no-store' as const } : { next: { revalidate: 1800 } }), signal: AbortSignal.timeout(4000), headers: { accept: 'text/calendar,text/html;q=0.9' } });
  if (!response.ok) throw new Error(`http_${response.status}`);
  const text = await response.text();
  if (text.length > 2_000_000) throw new Error('calendar_too_large');
  return source.format === 'bea' ? parseBeaSchedule(text, source) : source.format === 'boc' ? parseBocSchedule(text, source) : parseOfficialIcs(text, source);
}

export function officialSourceUrl(provider: EconomicCalendarProviderName) {
  return OFFICIAL_CALENDAR_SOURCES.find(source => source.provider === provider)?.url ?? null;
}
