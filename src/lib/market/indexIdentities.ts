/** Verified EODHD codes for the cash indices shown on THE SFM TV.
 * EODHD lists cash indices on its virtual INDX exchange. An index that is not
 * listed here is never guessed, so an ETF or a futures alias cannot slip in.
 */
const EODHD_INDEX_CODES: Record<string, string> = {
  '^GSPC': 'GSPC.INDX', '^DJI': 'DJI.INDX', '^NDX': 'NDX.INDX',
  '^FTSE': 'FTSE.INDX', '^GDAXI': 'GDAXI.INDX', '^N225': 'N225.INDX',
};

export function eodhdIndexCode(symbol: string): string | null {
  return EODHD_INDEX_CODES[symbol.trim().toUpperCase()] ?? null;
}
