/** Bounded, reviewed identity subset of src/data/us-symbols.json.
 * Keep exact venue and issuer names; a ticker alone is not a security identity.
 * The complete US directory stays out of the shared screening client bundle. */
export const SHARIAH_UNIVERSE_IDENTITIES = [
  {
    "symbol": "AAPL",
    "providerSymbol": "AAPL",
    "name": "Apple Inc.",
    "assetType": "stock",
    "exchange": "NASDAQ",
    "country": "US"
  },
  {
    "symbol": "ABBV",
    "providerSymbol": "ABBV",
    "name": "AbbVie Inc. Common Stock",
    "assetType": "stock",
    "exchange": "NYSE",
    "country": "US"
  },
  {
    "symbol": "AMD",
    "providerSymbol": "AMD",
    "name": "Advanced Micro Devices, Inc.",
    "assetType": "stock",
    "exchange": "NASDAQ",
    "country": "US"
  },
  {
    "symbol": "ASML",
    "providerSymbol": "ASML",
    "name": "ASML Holding N.V. - New York Registry Shares",
    "assetType": "stock",
    "exchange": "NASDAQ",
    "country": "US"
  },
  {
    "symbol": "AVGO",
    "providerSymbol": "AVGO",
    "name": "Broadcom Inc.",
    "assetType": "stock",
    "exchange": "NASDAQ",
    "country": "US"
  },
  {
    "symbol": "COST",
    "providerSymbol": "COST",
    "name": "Costco Wholesale Corporation",
    "assetType": "stock",
    "exchange": "NASDAQ",
    "country": "US"
  },
  {
    "symbol": "GOOGL",
    "providerSymbol": "GOOGL",
    "name": "Alphabet Inc.",
    "assetType": "stock",
    "exchange": "NASDAQ",
    "country": "US"
  },
  {
    "symbol": "HLAL",
    "providerSymbol": "HLAL",
    "name": "Wahed FTSE USA Shariah ETF",
    "assetType": "etf",
    "exchange": "NASDAQ",
    "country": "US"
  },
  {
    "symbol": "JNJ",
    "providerSymbol": "JNJ",
    "name": "Johnson & Johnson Common Stock",
    "assetType": "stock",
    "exchange": "NYSE",
    "country": "US"
  },
  {
    "symbol": "KO",
    "providerSymbol": "KO",
    "name": "Coca-Cola Company (The) Common Stock",
    "assetType": "stock",
    "exchange": "NYSE",
    "country": "US"
  },
  {
    "symbol": "META",
    "providerSymbol": "META",
    "name": "Meta Platforms, Inc.",
    "assetType": "stock",
    "exchange": "NASDAQ",
    "country": "US"
  },
  {
    "symbol": "MRK",
    "providerSymbol": "MRK",
    "name": "Merck & Company, Inc. Common Stock (new)",
    "assetType": "stock",
    "exchange": "NYSE",
    "country": "US"
  },
  {
    "symbol": "MSFT",
    "providerSymbol": "MSFT",
    "name": "Microsoft Corporation",
    "assetType": "stock",
    "exchange": "NASDAQ",
    "country": "US"
  },
  {
    "symbol": "NVDA",
    "providerSymbol": "NVDA",
    "name": "NVIDIA Corporation",
    "assetType": "stock",
    "exchange": "NASDAQ",
    "country": "US"
  },
  {
    "symbol": "PEP",
    "providerSymbol": "PEP",
    "name": "PepsiCo, Inc.",
    "assetType": "stock",
    "exchange": "NASDAQ",
    "country": "US"
  },
  {
    "symbol": "PG",
    "providerSymbol": "PG",
    "name": "Procter & Gamble Company (The) Common Stock",
    "assetType": "stock",
    "exchange": "NYSE",
    "country": "US"
  },
  {
    "symbol": "SPRE",
    "providerSymbol": "SPRE",
    "name": "SP Funds S&P Global REIT Sharia ETF",
    "assetType": "etf",
    "exchange": "NYSE Arca",
    "country": "US"
  },
  {
    "symbol": "SPSK",
    "providerSymbol": "SPSK",
    "name": "SP Funds Dow Jones Global Sukuk ETF",
    "assetType": "etf",
    "exchange": "NYSE Arca",
    "country": "US"
  },
  {
    "symbol": "SPUS",
    "providerSymbol": "SPUS",
    "name": "SP Funds S&P 500 Sharia Industry Exclusions ETF",
    "assetType": "etf",
    "exchange": "NYSE Arca",
    "country": "US"
  },
  {
    "symbol": "TSLA",
    "providerSymbol": "TSLA",
    "name": "Tesla, Inc.",
    "assetType": "stock",
    "exchange": "NASDAQ",
    "country": "US"
  },
  {
    "symbol": "TSM",
    "providerSymbol": "TSM",
    "name": "Taiwan Semiconductor Manufacturing Company Ltd.",
    "assetType": "stock",
    "exchange": "NYSE",
    "country": "US"
  },
  {
    "symbol": "UMMA",
    "providerSymbol": "UMMA",
    "name": "Wahed Dow Jones Islamic World ETF",
    "assetType": "etf",
    "exchange": "NASDAQ",
    "country": "US"
  },
  {
    "symbol": "UNH",
    "providerSymbol": "UNH",
    "name": "UnitedHealth Group Incorporated Common Stock (DE)",
    "assetType": "stock",
    "exchange": "NYSE",
    "country": "US"
  },
  {
    "symbol": "WMT",
    "providerSymbol": "WMT",
    "name": "Walmart Inc.",
    "assetType": "stock",
    "exchange": "NASDAQ",
    "country": "US"
  }
] as const;

const identities = new Map<string, typeof SHARIAH_UNIVERSE_IDENTITIES[number]>(
  SHARIAH_UNIVERSE_IDENTITIES.map(item => [item.symbol, item]),
);

export function shariahUniverseIdentity(symbol: string | null | undefined) {
  return identities.get(String(symbol ?? '').trim().toUpperCase()) ?? null;
}
