import { TV_SESSIONS } from './sessions';
export type TvSession = typeof TV_SESSIONS[number];
const dayMs = 86_400_000;
const wallFormats = new Map<string, Intl.DateTimeFormat>();
const scheduleCache = new Map<string, {start:number;end:number}[]>();
/** Converts an exchange wall clock to UTC, including seasonal DST offsets. */
export function zonedInstant(date: string, minutes: number, zone: string): number {
  const target = Date.parse(`${date}T00:00:00Z`) + minutes * 60_000;
  let guess = target;
  let format = wallFormats.get(zone);
  if (!format) { format = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); wallFormats.set(zone,format); }
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(format.formatToParts(guess).map(part => [part.type, part.value]));
    const wall = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);
    guess += target - wall;
  }
  return guess;
}
function dateInZone(instant: number, zone: string) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(instant);
  const get = (type: string) => p.find(part => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
// Published exchange exceptions for the release's calendar window. Remaining
// dates remain explicitly scheduled, never a claimed live market-status feed.
// https://www.londonstockexchange.com/equities-trading/business-days
// https://www.nyse.com/markets/hours-calendars
// https://www.jpx.co.jp/english/corporate/about-jpx/calendar/index.html
const closed: Record<string, string[]> = {
  XLON: ['2026-12-25','2026-12-28','2027-01-01','2027-03-26','2027-03-29','2027-05-03','2027-05-31','2027-08-30','2027-12-27','2027-12-28'],
  XNYS: ['2026-01-01','2026-01-19','2026-02-16','2026-04-03','2026-05-25','2026-06-19','2026-07-03','2026-09-07','2026-11-26','2026-12-25','2027-01-01','2027-01-18','2027-02-15','2027-03-26','2027-05-31','2027-06-18','2027-07-05','2027-09-06','2027-11-25','2027-12-24'],
  XTKS: ['2026-11-03','2026-11-23','2026-12-31','2027-01-01','2027-01-02','2027-01-03','2027-01-11','2027-02-11','2027-02-23','2027-03-21','2027-03-22','2027-04-29','2027-05-03','2027-05-04','2027-05-05','2027-07-19','2027-08-11','2027-09-20','2027-09-23','2027-10-11','2027-11-03','2027-11-23','2027-12-31'],
};
const early: Record<string, Record<string, number>> = { XLON: {'2026-12-24':750,'2026-12-31':750,'2027-12-24':750,'2027-12-31':750}, XNYS: {'2026-11-27':780,'2026-12-24':780,'2027-11-26':780} };
function periods(session: TvSession, date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (closed[session.id]?.includes(date) || (session.days === 'sundayThursday' ? weekday === 5 || weekday === 6 : weekday === 0 || weekday === 6)) return [];
  const minute = (time: string) => { const [h,m] = time.split(':').map(Number); return h*60+m; };
  return session.hours.split(' · ').flatMap(period => {
    const [start,end] = period.split('–').map(minute), close = Math.min(end, early[session.id]?.[date] ?? end);
    return close > start ? [{ start: zonedInstant(date,start,session.zone), end:zonedInstant(date,close,session.zone) }] : [];
  });
}
export function sessionTimeline(session: TvSession, instant: number) {
  // Server markup and the first client render share an unknown clock.
  if (!Number.isFinite(instant) || instant <= 0) return { open:false, remaining:null, nowPercent:0, bars:[] };
  const now = instant, kuwaitDate = dateInZone(now,'Asia/Kuwait');
  const start = zonedInstant(kuwaitDate,0,'Asia/Kuwait'), end = start + dayMs;
  const localDate = dateInZone(now,session.zone), localMidday = Date.parse(`${localDate}T12:00:00Z`);
  const cacheKey=`${session.id}:${localDate}`;
  let windows=scheduleCache.get(cacheKey);
  if (!windows) {
    windows=Array.from({length:12},(_,i) => periods(session,new Date(localMidday + (i-1)*dayMs).toISOString().slice(0,10))).flat();
    if(scheduleCache.size>=60)scheduleCache.delete(scheduleCache.keys().next().value!);
    scheduleCache.set(cacheKey,windows);
  }
  const active = windows.find(w => now >= w.start && now < w.end);
  const next = windows.find(w => w.start > now);
  return { open: Boolean(active), remaining: active ? active.end-now : next ? next.start-now : null,
    nowPercent: (now-start)/dayMs*100,
    bars: windows.filter(w => w.end>start && w.start<end).map(w => ({ left:Math.max(0,(w.start-start)/dayMs*100), width:(Math.min(end,w.end)-Math.max(start,w.start))/dayMs*100, start:w.start, end:w.end })),
  };
}
export function durationClock(ms: number | null) {
  if (ms === null) return '—';
  const total = Math.max(0,Math.ceil(ms/60_000));
  return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;
}
