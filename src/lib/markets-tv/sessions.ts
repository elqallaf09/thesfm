// Regular cash-equity sessions, verified against the linked exchange pages.
// These are deliberately not used to claim a market is open: a holiday feed is
// needed to establish actual session status and exceptional closures.
export const TV_SESSIONS = [
  { id: 'XKUW', names: ['بورصة الكويت', 'Boursa Kuwait', 'Bourse du Koweït'], zone: 'Asia/Kuwait', hours: '09:00–13:00', days: 'sundayThursday', source: 'Boursa Kuwait', url: 'https://www.boursakuwait.com.kw/TS-Extension-EN/' },
  { id: 'XSAU', names: ['تداول السعودية', 'Saudi Exchange', 'Bourse saoudienne'], zone: 'Asia/Riyadh', hours: '10:00–15:00', days: 'sundayThursday', source: 'Saudi Exchange', url: 'https://www.saudiexchange.sa/wps/portal/saudiexchange/rules-guidance/capital-market-overview' },
  { id: 'XNYS', names: ['بورصة نيويورك', 'New York Stock Exchange', 'Bourse de New York'], zone: 'America/New_York', hours: '09:30–16:00', days: 'mondayFriday', source: 'NYSE', url: 'https://www.nyse.com/trade/hours-calendars' },
  { id: 'XTKS', names: ['بورصة طوكيو', 'Tokyo Stock Exchange', 'Bourse de Tokyo'], zone: 'Asia/Tokyo', hours: '09:00–11:30 · 12:30–15:30', days: 'mondayFriday', source: 'Japan Exchange Group', url: 'https://www.jpx.co.jp/english/equities/trading/domestic/01.html' },
] as const;
export const TV_HOURS_VERIFIED = '2026-09-19';
