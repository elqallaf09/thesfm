import { describe, expect, it } from 'vitest';
import { TV_WORLD_SESSIONS } from '@/lib/markets-tv/worldSessions';
import { TV_SESSION_IDS, DEFAULT_TV_SESSION_IDS, normalizeTvSessionIds } from '@/lib/markets-tv/sessionSelection';
import { normalizeTvSettings } from '@/lib/markets-tv/types';
import { normalizeTvChannels } from '@/lib/markets-tv/channels';
import { countdownParts, sessionHoursAt, sessionTimeline } from '@/lib/markets-tv/sessionTimeline';
const market=(id:string)=>TV_WORLD_SESSIONS.find(s=>s.id===id)!;
const at=(date:string)=>Date.parse(date);
describe('worldwide cash-equity schedule directory',()=>{
 it('covers every region with unique selectable IDs, trilingual names and valid zones; excludes the requested market',()=>{
  expect(TV_WORLD_SESSIONS.length).toBe(81);
  expect(TV_WORLD_SESSIONS.map(s=>s.id)).toEqual(TV_SESSION_IDS);
  expect(new Set(TV_SESSION_IDS).size).toBe(TV_SESSION_IDS.length);
  expect(new Set(TV_WORLD_SESSIONS.map(s=>s.area)).size).toBe(7);
  for(const s of TV_WORLD_SESSIONS){
   expect(s.region).not.toBe('IL');expect(s.id).not.toBe('XTAE');expect(s.zone).not.toBe('Asia/Jerusalem');
   expect(s.names).toHaveLength(3);expect(s.names.every(n=>n.length>0)).toBe(true);
   expect(()=>new Intl.DateTimeFormat('en',{timeZone:s.zone})).not.toThrow();
   expect(s.url).toMatch(/^https:\/\//);
   const t=sessionTimeline(s,at('2026-11-07T14:00:00Z'));
   expect(t.nextOpen).not.toBeNull();expect(t.remaining).toBeGreaterThan(0);
   expect(countdownParts(t.remaining)).not.toBeNull();
  }
 });
 it('preserves any subset, select all and intentional empty selections through settings and saved channels',()=>{
  expect(normalizeTvSessionIds(undefined)).toBeUndefined();
  expect(normalizeTvSessionIds(['XTAE','__proto__','XKUW','XKUW',null])).toEqual(['XKUW']);
  for(const ids of [[],DEFAULT_TV_SESSION_IDS,[...TV_SESSION_IDS],['XHKG','DSMD']]){
   const settings=normalizeTvSettings(JSON.parse(JSON.stringify({sessionIds:ids})));
   expect(settings.sessionIds).toEqual(ids);
   const channels=normalizeTvChannels([{id:'sessions',name:'Markets',settings,selections:{}}]);
   expect(channels[0].settings.sessionIds).toEqual(ids);
  }
 });
 it('observes Asian lunch breaks and the different Friday sessions in Indonesia and Pakistan',()=>{
  expect(sessionTimeline(market('XSES'),at('2026-11-10T04:30:00Z'))).toMatchObject({open:false,nextOpen:at('2026-11-10T05:00:00Z'),remaining:1800000});
  expect(sessionTimeline(market('XIDX'),at('2026-11-13T06:30:00Z'))).toMatchObject({open:false,nextOpen:at('2026-11-13T07:00:00Z')});
  expect(sessionTimeline(market('XKAR'),at('2026-11-13T07:30:00Z'))).toMatchObject({open:false,nextOpen:at('2026-11-13T09:32:00Z')});
  expect(sessionHoursAt(market('XKAR'),at('2026-11-13T09:32:00Z'))).toBe('09:17–12:00 · 14:32–16:30');
 });
 it('skips known holidays, including at calendar boundaries, and shortens published half days',()=>{
  expect(sessionTimeline(market('XKAR'),at('2026-11-08T09:00:00Z')).nextOpen).toBe(at('2026-11-10T04:32:00Z'));
  expect(sessionTimeline(market('XNAS'),at('2027-01-01T15:00:00Z')).open).toBe(false);
  expect(sessionTimeline(market('XNAS'),at('2026-11-27T17:30:00Z'))).toMatchObject({open:true,remaining:1800000});
  expect(sessionHoursAt(market('XNYS'),at('2026-11-27T17:30:00Z'))).toBe('09:30–13:00');
 });
 it('keeps the Colombia exchange clock distinct from its New York reference and adjusts seasonal offsets',()=>{
  const s=market('XBOG');
  expect(s.zone).toBe('America/Bogota');
  expect(sessionHoursAt(s,at('2026-07-01T14:00:00Z'))).toBe('08:30–15:00');
  expect(sessionHoursAt(s,at('2026-11-10T15:00:00Z'))).toBe('09:30–16:00');
 });
 it('keeps updated GCC schedules and regional Sunday openings',()=>{
  expect(market('XMUS').hours).toBe('10:00–15:00');
  expect(sessionTimeline(market('XDFM'),at('2026-11-08T07:00:00Z')).open).toBe(false);
  expect(sessionTimeline(market('DSMD'),at('2026-11-08T07:00:00Z')).open).toBe(true);
  expect(sessionTimeline(market('XPAE'),at('2026-11-08T08:00:00Z')).open).toBe(true);
 });
});
