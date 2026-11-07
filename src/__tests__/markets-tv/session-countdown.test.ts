import { describe, expect, it } from 'vitest';
import { countdownParts, durationClock, sessionTimeline } from '@/lib/markets-tv/sessionTimeline';
import { TV_SESSIONS } from '@/lib/markets-tv/sessions';

describe('TV opening countdown', () => {
  it('keeps days explicit and counts seconds without rounding minutes upward', () => {
    expect(countdownParts((2*86400+3*3600+4*60+5)*1000)).toEqual({days:2,hours:3,minutes:4,seconds:5});
    expect(durationClock(59_000)).toBe('00:00:59');
    expect(countdownParts(1)).toEqual({days:0,hours:0,minutes:0,seconds:1});
    expect(countdownParts(-1000)).toEqual({days:0,hours:0,minutes:0,seconds:0});
    for(const value of [null,NaN,Infinity]) expect(countdownParts(value)).toBeNull();
  });
  it('opens Kuwait on Sunday while the US waits for Monday, with exact target instants', () => {
    const now=Date.parse('2026-11-07T10:24:05Z');
    const kw=sessionTimeline(TV_SESSIONS[0],now),ny=sessionTimeline(TV_SESSIONS[3],now);
    expect(kw).toMatchObject({open:false,nextOpen:Date.parse('2026-11-08T06:00:00Z'),bars:[]});
    expect(countdownParts(kw.remaining)).toEqual({days:0,hours:19,minutes:35,seconds:55});
    expect(ny.nextOpen).toBe(Date.parse('2026-11-09T14:30:00Z'));
    expect(countdownParts(ny.remaining)).toEqual({days:2,hours:4,minutes:5,seconds:55});
  });
  it('switches to closing at the opening second and resumes after Tokyo lunch', () => {
    const open=Date.parse('2026-11-08T06:00:00Z');
    expect(sessionTimeline(TV_SESSIONS[0],open-1000)).toMatchObject({open:false,remaining:1000,nextOpen:open});
    expect(sessionTimeline(TV_SESSIONS[0],open)).toMatchObject({open:true,remaining:4*3600000,closesAt:Date.parse('2026-11-08T10:00:00Z')});
    expect(sessionTimeline(TV_SESSIONS[4],Date.parse('2026-11-09T02:30:00Z'))).toMatchObject({open:false,remaining:3600000,nextOpen:Date.parse('2026-11-09T03:30:00Z')});
  });
});
