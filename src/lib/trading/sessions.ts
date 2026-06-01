export type TradingSessionId = 'sydney' | 'tokyo' | 'london' | 'newyork';

export type TradingSession = {
  id: TradingSessionId;
  name: string;
  openHourUtc: number;
  closeHourUtc: number;
};

export type TradingSessionState = TradingSession & {
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
  nextChangeAt: string;
  minutesToNextChange: number;
};

export const TRADING_SESSIONS: TradingSession[] = [
  { id: 'sydney', name: 'Sydney', openHourUtc: 21, closeHourUtc: 6 },
  { id: 'tokyo', name: 'Tokyo', openHourUtc: 0, closeHourUtc: 9 },
  { id: 'london', name: 'London', openHourUtc: 7, closeHourUtc: 16 },
  { id: 'newyork', name: 'New York', openHourUtc: 12, closeHourUtc: 21 },
];

export const TRADING_OVERLAPS = [
  { id: 'sydney-tokyo', sessions: ['sydney', 'tokyo'] as TradingSessionId[], startHourUtc: 0, endHourUtc: 6 },
  { id: 'tokyo-london', sessions: ['tokyo', 'london'] as TradingSessionId[], startHourUtc: 7, endHourUtc: 9 },
  { id: 'london-newyork', sessions: ['london', 'newyork'] as TradingSessionId[], startHourUtc: 12, endHourUtc: 16 },
];

function minutesSinceUtcMidnight(date: Date) {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function sessionContainsMinute(session: TradingSession, minute: number) {
  const open = session.openHourUtc * 60;
  const close = session.closeHourUtc * 60;
  if (open < close) return minute >= open && minute < close;
  return minute >= open || minute < close;
}

function nextSessionDate(date: Date, hourUtc: number, preferFuture = true) {
  const next = new Date(date);
  next.setUTCSeconds(0, 0);
  next.setUTCHours(hourUtc, 0, 0, 0);
  if (preferFuture && next <= date) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export function getTradingSessionsState(now = new Date()): TradingSessionState[] {
  const currentMinute = minutesSinceUtcMidnight(now);

  return TRADING_SESSIONS.map(session => {
    const isOpen = sessionContainsMinute(session, currentMinute);
    const opensAt = nextSessionDate(now, session.openHourUtc, !isOpen);
    const closesAt = nextSessionDate(now, session.closeHourUtc, true);
    const nextChangeAt = isOpen ? closesAt : opensAt;

    return {
      ...session,
      isOpen,
      opensAt: opensAt.toISOString(),
      closesAt: closesAt.toISOString(),
      nextChangeAt: nextChangeAt.toISOString(),
      minutesToNextChange: Math.max(0, Math.round((nextChangeAt.getTime() - now.getTime()) / 60000)),
    };
  });
}

export function getActiveOverlapIds(now = new Date()) {
  const currentMinute = minutesSinceUtcMidnight(now);
  return TRADING_OVERLAPS
    .filter(overlap => currentMinute >= overlap.startHourUtc * 60 && currentMinute < overlap.endHourUtc * 60)
    .map(overlap => overlap.id);
}

export function isHighLiquidityPeriod(now = new Date()) {
  return getActiveOverlapIds(now).includes('london-newyork');
}
