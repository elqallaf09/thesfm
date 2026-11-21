/** Exchange-qualified cash indices, quoted in points. */
export const TV_GULF_CASH_INDICES = [
  { symbol: 'KSE:BKA', displaySymbol: 'BKA', country: 'KW', exchange: 'KSE', name: 'Boursa Kuwait All Share', nameAr: 'بورصة الكويت · السوق العام' },
  { symbol: 'DFM:DFMGI', displaySymbol: 'DFMGI', country: 'AE', exchange: 'DFM', name: 'Dubai Financial Market General', nameAr: 'سوق دبي المالي · المؤشر العام' },
  { symbol: 'QSE:GNRI', displaySymbol: 'GNRI', country: 'QA', exchange: 'QSE', name: 'Qatar Exchange Index', nameAr: 'مؤشر بورصة قطر' },
] as const;
export type TvGulfCashIndex = (typeof TV_GULF_CASH_INDICES)[number];
export function tvGulfCashIndex(symbol: string) {
  return TV_GULF_CASH_INDICES.find(index => index.symbol === symbol);
}
