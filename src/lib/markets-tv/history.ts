import { zonedInstant } from './sessionTimeline';
export type TvSessionHistory = { symbol: '^GSPC'; points: { at: string; price: number }[]; sessionDate: string | null; source: string; fetchedAt: string; issue?: string };
/** FMP intraday timestamps are exchange-local (America/New_York), not UTC. */
export function normalizeSessionHistory(payload: unknown, now: number): TvSessionHistory['points'] {
  if (!Array.isArray(payload)) return [];
  const points = new Map<string, { at:string; price:number; day:string }>();
  for (const value of payload.slice(0,3000)) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Record<string,unknown>;
    if (row.symbol !== undefined && row.symbol !== '^GSPC') continue;
    if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(row.date)) continue;
    const day = row.date.slice(0,10), hour = Number(row.date.slice(11,13)), minute=Number(row.date.slice(14,16));
    if (hour*60+minute < 570 || hour*60+minute > 960 || minute>59 || typeof row.close !== 'number' || !Number.isFinite(row.close) || row.close<=0) continue;
    const dayInstant=Date.parse(`${day}T00:00:00Z`);
    if (!Number.isFinite(dayInstant) || new Date(dayInstant).toISOString().slice(0,10) !== day) continue;
    const at = zonedInstant(day,hour*60+minute,'America/New_York');
    if (!Number.isFinite(at) || at>now || now-at>10*86_400_000) continue;
    const iso=new Date(at).toISOString(); points.set(iso,{at:iso,price:row.close,day});
  }
  const sorted=[...points.values()].sort((a,b)=>a.at.localeCompare(b.at)), latest=sorted.at(-1)?.day;
  return sorted.filter(p=>p.day===latest).map(({at,price})=>({at,price}));
}
