// Cash indices whose primary feeds (FMP, Twelve Data) can pause for a whole
// quota window. Currency must match exactly, so an ETF or a differently
// denominated listing is rejected instead of shown.
export const INDEX_CURRENCIES = {
  '^GSPC': 'USD', '^GDAXI': 'EUR', '^NDX': 'USD', '^DJI': 'USD', '^FTSE': 'GBP', '^N225': 'JPY',
  // Checked on Yahoo (symbol, INDEX type, currency) on 20 Nov 2026.
  '^FCHI': 'EUR', '^STOXX50E': 'EUR', '^IBEX': 'EUR', 'FTSEMIB.MI': 'EUR', '^AEX': 'EUR', '^SSMI': 'CHF', '^RUT': 'USD', '^GSPTSE': 'CAD', '^HSI': 'HKD', '000001.SS': 'CNY', '^KS11': 'KRW', '^TWII': 'TWD', '^BSESN': 'INR', '^NSEI': 'INR', '^AXJO': 'AUD', '^STI': 'SGD', '^TASI.SR': 'SAR',
} as const;

export type TvExternalIndex = keyof typeof INDEX_CURRENCIES;
export function isTvExternalIndex(symbol: string): symbol is TvExternalIndex {
  return Object.hasOwn(INDEX_CURRENCIES, symbol);
}
