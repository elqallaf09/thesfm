/* the-sfm trader â€” AI Trading Terminal (vanilla SPA controller)
   Architecture: single IIFE, client-side routing (instant page switches),
   pure render-component functions, defensive data layer, no synthetic market data. */
(() => {
  "use strict";

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const API = "/" + "api";
  const ROOT = "/thesfm-trader-own";
  const VER = "20260705-funds-universe-1";
  const keys = { watch: "sfmTraderWatchlist:v3", alerts: "sfmTraderAlerts:v3", holdings: "sfmTraderHoldings:v1", settings: "sfmTraderSettings:v1", followed: "sfmTraderFollowedTrades:v1" };
  const defaults = ["AAPL", "MSFT", "NVDA", "BTCUSD", "XAUUSD", "KFH.KW"];
  const leadershipCore = ["NAS100", "US30", "XAUUSD", "BTCUSD"];
  const INITIAL_LOADING_MAX_MS = 4500;
  const REQUEST_TIMEOUTS = { providerStatus: 8000, quotes: 30000, signals: 8000, news: 12000, calendar: 15000, default: 10000 };
  const MARKET_UNIVERSE_PAGE_SIZE = 50;
  const UNAVAILABLE_MESSAGE = "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ù‡Ø°Ù‡ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø­Ø§Ù„ÙŠØ§Ù‹";
  const ROUTE_UNAVAILABLE_MESSAGE = "Ø§Ù„Ù…Ø³Ø§Ø± ØºÙŠØ± Ù…ØªØ§Ø­ Ø­Ø§Ù„ÙŠØ§Ù‹";
  const COVERAGE_NOTICE_AR = "Ù‚Ø¯ Ù„Ø§ ØªØªÙˆÙØ± Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø±Ù…ÙˆØ² Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ø­Ø§Ù„ÙŠ";
  const COVERAGE_NOTICE_EN = "Some symbols may not be available from the current provider";
  const PRICE_UNAVAILABLE_AR = "Ø§Ù„Ø³Ø¹Ø± ØºÙŠØ± Ù…ØªØ§Ø­";
  const PRICE_UNAVAILABLE_EN = "Price unavailable";
  const DEV_DIAGNOSTICS = ["localhost", "127.0.0.1", "::1"].includes(location.hostname) || location.hostname.endsWith(".local");
  const PROVIDER_STATUS_LABELS = {
    provider_status_failed: {
      ar: "ØªØ¹Ø°Ø± Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø­Ø§Ù„ÙŠØ§Ù‹",
      en: "Unable to connect to the data provider right now"
    },
    provider_status_loading: {
      ar: "Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø²ÙˆØ¯",
      en: "Loading provider data"
    },
    provider_status_available: {
      ar: "Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…ØªØµÙ„",
      en: "Data provider connected"
    },
    provider_status_partial: {
      ar: "Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø²ÙˆØ¯ Ù…ØªØ§Ø­Ø© Ø¬Ø²Ø¦ÙŠØ§Ù‹",
      en: "Provider data is partially available"
    },
    provider_status_unknown: {
      ar: "Ø­Ø§Ù„Ø© Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙØ©",
      en: "Unknown provider status"
    }
  };
  const PROVIDER_STATUS_EXPLANATION = {
    ar: "Ø³ÙŠØªÙ… Ø¹Ø±Ø¶ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ØªØ§Ø­Ø© ÙÙ‚Ø·ØŒ ÙˆÙ‚Ø¯ ØªÙƒÙˆÙ† Ø¨Ø¹Ø¶ Ø§Ù„Ø£Ø³Ø¹Ø§Ø± Ø£Ùˆ Ø§Ù„ØªØ­Ù„ÙŠÙ„Ø§Øª ØºÙŠØ± Ù…ÙƒØªÙ…Ù„Ø©.",
    en: "Only available data will be shown. Some prices or analysis may be incomplete."
  };
  const PROVIDER_RETRY_LABEL = { ar: "Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©", en: "Retry" };

  const routes = {
    dashboard: "ØºØ±ÙØ© Ù‚ÙŠØ§Ø¯Ø© Ø§Ù„Ø³ÙˆÙ‚", markets: "Ø®Ø±ÙŠØ·Ø© Ø§Ù„Ø£Ø³ÙˆØ§Ù‚", "ai-scanner": "Ù…Ø§Ø³Ø­ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ",
    watchlist: "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø°ÙƒÙŠØ©", portfolio: "Ø§Ù„Ù…Ø­ÙØ¸Ø©", alerts: "Ù…Ø±ÙƒØ² Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª",
    recommendations: "Ø§Ù„ØªÙˆØµÙŠØ§Øª ÙˆØ§Ù„ØªØ­Ù„ÙŠÙ„", "trade-performance": "Ø£Ø¯Ø§Ø¡ Ø§Ù„ØµÙÙ‚Ø§Øª", news: "Ø£Ø®Ø¨Ø§Ø± Ø§Ù„Ø³ÙˆÙ‚",
    calendar: "ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ø³ÙˆÙ‚", education: "Ù…Ø±ÙƒØ² Ø§Ù„ØªØ¹Ù„ÙŠÙ…", settings: "Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù†Ø¸Ø§Ù…", "symbol-details": "ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø±Ù…Ø²"
  };

  const MARKET_SYMBOLS = {
    usStocks: ["AAPL", "MSFT", "NVDA", "AMZN", "META", "TSLA", "GOOGL", "NFLX", "AMD", "INTC", "JPM", "BAC", "V", "MA", "DIS", "KO", "PEP", "MCD", "WMT", "COST"],
    forex: ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD", "EURJPY", "GBPJPY"],
    crypto: ["BTCUSD", "ETHUSD", "SOLUSD", "BNBUSD", "XRPUSD", "ADAUSD", "DOGEUSD"],
    commodities: ["XAUUSD", "XAGUSD", "WTI", "BRENT", "GC=F", "SI=F", "CL=F", "BZ=F"],
    indices: ["US30", "NAS100", "SPX500", "DAX", "FTSE", "CAC40", "NIKKEI", "HSI", "DXY"],
    etfs: ["SPY", "QQQ", "VOO", "DIA", "IWM", "GLD", "SLV", "VTI", "VEA", "VWO", "AGG", "BND", "TLT", "HYG"],
    saudi: ["2222.SR", "1120.SR", "1180.SR", "2010.SR", "7010.SR", "1211.SR", "1010.SR", "1020.SR", "1050.SR", "1060.SR", "1080.SR", "2020.SR", "2380.SR", "2280.SR", "4002.SR", "4004.SR", "4013.SR", "4164.SR", "4190.SR", "4300.SR", "8010.SR", "8210.SR", "7203.SR", "7020.SR"],
    kuwait: ["KFH.KW", "NBK.KW", "ZAIN.KW", "BOUBYAN.KW", "GBK.KW", "BURG.KW", "CBK.KW", "AGLTY.KW", "KIB.KW", "WARBA.KW", "MABANEE.KW", "HUMANSOFT.KW", "STC.KW", "ALIMTIAZ.KW", "GULFBANK.KW", "NIND.KW", "KAMCO.KW", "MEZZAN.KW", "JAZEERA.KW", "ALAFCO.KW"],
    uae: ["EMAAR.AE", "DIB.AE", "DEWA.AE", "SALIK.AE", "DU.AE", "DFM.AE", "EMIRATESNBD.AE", "AIRARABIA.AE", "EMAARDEV.AE", "TALABAT.AE", "FAB.AE", "ETISALAT.AE"],
    qatar: ["QNBK.QA", "QIBK.QA", "IQCD.QA", "MARK.QA", "CBQK.QA", "DHBK.QA", "ABQK.QA", "QIIK.QA", "QISI.QA", "ORDS.QA", "VFQS.QA", "QEWS.QA", "MPHC.QA", "QGTS.QA", "QAMC.QA", "BRES.QA", "ERES.QA", "UDCD.QA", "GWCS.QA", "MERS.QA"],
    bahrain: ["AUB.BH", "GFH.BH", "BATELCO.BH", "NBB.BH", "BBK.BH", "ABC.BH", "BISB.BH", "SALAM.BH", "ZAINBH.BH", "ALBH.BH", "SEEF.BH", "ESTERAD.BH", "TRAFCO.BH", "KHCB.BH"],
    oman: ["BKMB.OM", "OMINV.OM", "NBOB.OM", "OMAB.OM", "ORED.OM", "MSMI.OM", "RAYS.OM", "SMNP.OM", "ALMI.OM", "DHOF.OM", "OQGN.OM", "NAPI.OM", "DBIH.OM", "HBMO.OM", "MAZOON.OM"],
    europe: ["ASML.AS", "SAP.DE", "NESN.SW", "MC.PA", "SHEL.L", "NOVO-B.CO", "AZN.L", "HSBA.L", "ULVR.L", "SIE.DE", "OR.PA", "TTE.PA", "AIR.PA", "SU.PA", "AI.PA", "IBE.MC", "SAN.MC", "ITX.MC", "ENEL.MI", "UCG.MI", "ROG.SW", "NOVN.SW"],
    asia: ["7203.T", "9988.HK", "TSM", "005930.KS", "6758.T", "9984.T", "0700.HK", "1299.HK", "2330.TW", "2317.TW", "BABA", "SONY", "TM", "NIO", "JD", "BIDU"],
    technology: ["AAPL", "MSFT", "GOOGL", "GOOG", "ORCL", "CRM", "ADBE", "NOW", "SNOW", "PANW", "CRWD", "SHOP", "INTU", "ADP", "IBM", "CSCO", "NET", "UBER", "PLTR", "DELL"],
    ai: ["NVDA", "MSFT", "GOOGL", "GOOG", "AMD", "PLTR", "META", "AMZN", "AVGO", "TSM", "ASML", "CRM", "NOW", "SNOW", "AI", "PATH", "SOUN", "ARM", "SMCI", "MU"],
    semiconductors: ["NVDA", "AMD", "INTC", "AVGO", "TSM", "ASML", "QCOM", "TXN", "MU", "AMAT", "LRCX", "KLAC", "MRVL", "MCHP", "ON", "NXPI", "ADI", "MPWR", "ARM", "SMCI", "TER", "SWKS", "QRVO", "LSCC", "COHR", "UMC", "GFS", "WOLF"],
    energy: ["XOM", "CVX", "2222.SR", "OXY", "COP", "SLB", "EOG", "MPC", "PSX", "VLO", "HAL", "BKR", "SHEL.L", "TTE.PA", "ADNOCDIST.AE", "ADNOCGAS.AD"],
    banking: ["JPM", "BAC", "WFC", "C", "GS", "MS", "USB", "PNC", "TD", "RY", "HSBA.L", "SAN.MC", "UCG.MI", "NBK.KW", "KFH.KW", "QNBK.QA", "QIBK.QA", "1120.SR", "1180.SR", "AUB.BH", "BKMB.OM"],
    food: ["KO", "PEP", "MCD", "COST", "WMT", "PG", "MDLZ", "SBUX", "YUM", "KHC", "GIS", "K", "HSY", "TSN", "ULVR.L", "NESN.SW"],
    healthcare: ["LLY", "PFE", "JNJ", "MRK", "UNH", "ABBV", "ABT", "TMO", "DHR", "BMY", "AMGN", "GILD", "ISRG", "VRTX", "AZN.L", "NOVN.SW", "ROG.SW"]
  };

  // [id, ar, en, family, currency, monitoredSymbols, tone, apiMarket]
  const MARKETS = [
    ["us-stocks", "Ø§Ù„Ø£Ø³Ù‡Ù… Ø§Ù„Ø£Ù…Ø±ÙŠÙƒÙŠØ©", "US Stocks", "Equities", "USD", MARKET_SYMBOLS.usStocks, "featured", "us-stocks"],
    ["forex", "Ø§Ù„Ø¹Ù…Ù„Ø§Øª", "Forex", "FX", "Pair", MARKET_SYMBOLS.forex, "", "forex"],
    ["crypto", "Ø§Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ø±Ù‚Ù…ÙŠØ©", "Crypto", "Digital", "USD", MARKET_SYMBOLS.crypto, "featured", "crypto"],
    ["commodities", "Ø§Ù„Ø³Ù„Ø¹", "Commodities", "Macro", "USD", MARKET_SYMBOLS.commodities, "", "commodities"],
    ["indices", "Ø§Ù„Ù…Ø¤Ø´Ø±Ø§Øª", "Indices", "Benchmarks", "Local", MARKET_SYMBOLS.indices, "", "indices"],
    ["etfs", "Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ø§Ø³ØªØ«Ù…Ø§Ø±ÙŠØ©", "Funds & ETFs", "Funds", "Mixed", MARKET_SYMBOLS.etfs, "", "etfs"],
    ["saudi", "Ø§Ù„Ø³ÙˆÙ‚ Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠ", "Saudi Market", "Tadawul", "SAR", MARKET_SYMBOLS.saudi, "", "saudi"],
    ["kuwait", "Ø¨ÙˆØ±ØµØ© Ø§Ù„ÙƒÙˆÙŠØª", "Kuwait Market", "Boursa", "KWD", MARKET_SYMBOLS.kuwait, "", "kuwait"],
    ["uae", "Ø³ÙˆÙ‚ Ø§Ù„Ø¥Ù…Ø§Ø±Ø§Øª", "UAE Market", "ADX/DFM", "AED", MARKET_SYMBOLS.uae, "", "uae"],
    ["qatar", "Ø³ÙˆÙ‚ Ù‚Ø·Ø±", "Qatar Market", "QSE", "QAR", MARKET_SYMBOLS.qatar, "", "qatar"],
    ["bahrain", "Ø³ÙˆÙ‚ Ø§Ù„Ø¨Ø­Ø±ÙŠÙ†", "Bahrain Market", "BHB", "BHD", MARKET_SYMBOLS.bahrain, "", "bahrain"],
    ["oman", "Ø³ÙˆÙ‚ Ø¹Ù…Ø§Ù†", "Oman Market", "MSX", "OMR", MARKET_SYMBOLS.oman, "", "oman"],
    ["europe", "Ø§Ù„Ø£Ø³Ù‡Ù… Ø§Ù„Ø£ÙˆØ±ÙˆØ¨ÙŠØ©", "European Stocks", "Global", "EUR", MARKET_SYMBOLS.europe, "", "europe"],
    ["asia", "Ø§Ù„Ø£Ø³Ù‡Ù… Ø§Ù„Ø¢Ø³ÙŠÙˆÙŠØ©", "Asian Stocks", "Global", "Mixed", MARKET_SYMBOLS.asia, "", "asia"],
    ["technology", "Ø£Ø³Ù‡Ù… Ø§Ù„ØªÙ‚Ù†ÙŠØ©", "Technology", "Sector", "USD", MARKET_SYMBOLS.technology, "", "technology"],
    ["ai", "Ø£Ø³Ù‡Ù… Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ", "AI Stocks", "Sector", "USD", MARKET_SYMBOLS.ai, "featured", "ai"],
    ["semiconductors", "Ø£Ø´Ø¨Ø§Ù‡ Ø§Ù„Ù…ÙˆØµÙ„Ø§Øª", "Semiconductors", "Sector", "USD", MARKET_SYMBOLS.semiconductors, "", "semiconductors"],
    ["energy", "Ø§Ù„Ø·Ø§Ù‚Ø©", "Energy Stocks", "Sector", "Mixed", MARKET_SYMBOLS.energy, "", "energy"],
    ["banking", "Ø§Ù„Ø¨Ù†ÙˆÙƒ", "Banking Stocks", "Sector", "Mixed", MARKET_SYMBOLS.banking, "", "banking"],
    ["food", "Ø§Ù„Ø£ØºØ°ÙŠØ© ÙˆØ§Ù„Ø§Ø³ØªÙ‡Ù„Ø§Ùƒ", "Food / Consumer", "Sector", "USD", MARKET_SYMBOLS.food, "", "food"],
    ["healthcare", "Ø§Ù„ØµØ­Ø© ÙˆØ§Ù„Ø¯ÙˆØ§Ø¡", "Pharma / Healthcare", "Sector", "USD", MARKET_SYMBOLS.healthcare, "", "healthcare"]
  ].map(([id, ar, en, family, currency, symbols, tone, apiMarket]) => ({ id, ar, en, family, currency, symbols, tone, apiMarket }));

  const EXPLORE = ["forex", "us-stocks", "kuwait", "saudi", "uae", "qatar", "bahrain", "europe", "asia", "crypto", "commodities", "indices", "etfs", "technology", "ai", "semiconductors", "energy", "banking", "healthcare", "food"];
  const FUND_FILTERS = [
    ["all", "Ø§Ù„ÙƒÙ„", "All"],
    ["etf", "Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø© ETF", "ETFs"],
    ["mutual_fund", "Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ø§Ø³ØªØ«Ù…Ø§Ø±ÙŠØ© Ø§Ù„Ù…Ø´ØªØ±ÙƒØ©", "Mutual Funds"],
    ["index_fund", "ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù…Ø¤Ø´Ø±Ø§Øª", "Index Funds"],
    ["money_market_fund", "ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø³ÙˆÙ‚ Ø§Ù„Ù†Ù‚Ø¯", "Money Market Funds"],
    ["bond_sukuk_fund", "ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ø³Ù†Ø¯Ø§Øª ÙˆØ§Ù„ØµÙƒÙˆÙƒ", "Bond/Sukuk Funds"],
    ["reit", "ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ø§Ø³ØªØ«Ù…Ø§Ø± Ø§Ù„Ø¹Ù‚Ø§Ø±ÙŠ REITs", "REITs"],
    ["commodity_fund", "ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ø³Ù„Ø¹", "Commodity Funds"],
    ["sector_fund", "Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù‚Ø·Ø§Ø¹ÙŠØ©", "Sector Funds"],
    ["thematic_fund", "Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ÙŠØ©", "Thematic Funds"],
    ["shariah_fund", "Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù…ØªÙˆØ§ÙÙ‚Ø© Ù…Ø¹ Ø§Ù„Ø´Ø±ÙŠØ¹Ø©", "Shariah Funds"],
    ["leveraged_etf", "Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø°Ø§Øª Ø§Ù„Ø±Ø§ÙØ¹Ø©", "Leveraged ETFs"],
    ["inverse_etf", "Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ø¹ÙƒØ³ÙŠØ©", "Inverse ETFs"],
    ["income_fund", "ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ø¯Ø®Ù„", "Income Funds"],
    ["growth_fund", "ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù†Ù…Ùˆ", "Growth Funds"],
    ["balanced_fund", "Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù…ØªÙˆØ§Ø²Ù†Ø©", "Balanced Funds"]
  ];
  const FUND_TYPE_LABELS = {
    fund: ["ØµÙ†Ø¯ÙˆÙ‚ Ø§Ø³ØªØ«Ù…Ø§Ø±ÙŠ", "Fund"],
    etf: ["Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø©", "Exchange Traded Funds"],
    mutual_fund: ["Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ø§Ø³ØªØ«Ù…Ø§Ø±ÙŠØ© Ø§Ù„Ù…Ø´ØªØ±ÙƒØ©", "Mutual Funds"],
    index_fund: ["ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù…Ø¤Ø´Ø±Ø§Øª", "Index Funds"],
    money_market_fund: ["ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø³ÙˆÙ‚ Ø§Ù„Ù†Ù‚Ø¯", "Money Market Funds"],
    bond_fund: ["ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ø³Ù†Ø¯Ø§Øª ÙˆØ§Ù„ØµÙƒÙˆÙƒ", "Bond Funds"],
    sukuk_fund: ["ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„ØµÙƒÙˆÙƒ", "Sukuk Funds"],
    reit: ["ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ø§Ø³ØªØ«Ù…Ø§Ø± Ø§Ù„Ø¹Ù‚Ø§Ø±ÙŠ", "Real Estate Investment Trusts"],
    commodity_fund: ["ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ø³Ù„Ø¹", "Commodity Funds"],
    sector_fund: ["Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù‚Ø·Ø§Ø¹ÙŠØ©", "Sector Funds"],
    thematic_fund: ["Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ÙŠØ©", "Thematic Funds"],
    shariah_compliant_fund: ["Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù…ØªÙˆØ§ÙÙ‚Ø© Ù…Ø¹ Ø§Ù„Ø´Ø±ÙŠØ¹Ø©", "Shariah-Compliant Funds"],
    leveraged_etf: ["Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø© Ø°Ø§Øª Ø§Ù„Ø±Ø§ÙØ¹Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ©", "Leveraged ETFs"],
    inverse_etf: ["Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ø¹ÙƒØ³ÙŠØ© Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø©", "Inverse ETFs"],
    income_fund: ["ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ø¯Ø®Ù„", "Income Funds"],
    growth_fund: ["ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù†Ù…Ùˆ", "Growth Funds"],
    balanced_fund: ["Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù…ØªÙˆØ§Ø²Ù†Ø©", "Balanced Funds"],
    hedge_fund: ["ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„ØªØ­ÙˆØ·", "Hedge Funds"]
  };
  const SELECTION_EMPTY_STATE_AR = "\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u0635\u0648\u0644 \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0633\u0648\u0642 \u0623\u0648 \u0627\u0644\u062a\u0635\u0646\u064a\u0641 \u062d\u0627\u0644\u064a\u0627\u064b";
  const SELECTION_EMPTY_STATE_EN = "No matching assets for this market or category right now";
  const FUND_EMPTY_STATE_AR = "Ù„Ø§ ØªÙˆØ¬Ø¯ ØµÙ†Ø§Ø¯ÙŠÙ‚ Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„Ù‡Ø°Ø§ Ø§Ù„Ø³ÙˆÙ‚ Ø£Ùˆ Ø§Ù„ØªØµÙ†ÙŠÙ Ø­Ø§Ù„ÙŠØ§Ù‹";
  const FUND_EMPTY_STATE_EN = "No matching funds for this market or category right now";
  const FUND_PROVIDER_NOTE_AR = "Ù‚Ø¯ Ù„Ø§ ÙŠØ¯Ø¹Ù… Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ø­Ø§Ù„ÙŠ Ø¬Ù…ÙŠØ¹ Ø£Ù†ÙˆØ§Ø¹ Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚";
  const FUND_PROVIDER_NOTE_EN = "The current provider may not support all fund types";
  const STRICT_LOCAL_MARKETS = {
    qatar: { country: "Qatar", countries: ["QA", "QATAR"], currency: "QAR", exchange: /QATAR|QSE|DSMD|DSM/i, market: /QATAR|QSE/i, suffix: /\.QA$/i },
    kuwait: { country: "Kuwait", countries: ["KW", "KUWAIT"], currency: "KWD", exchange: /KUWAIT|BOURSA|KSE|XKUW/i, market: /KUWAIT|BOURSA/i, suffix: /\.KW$/i },
    bahrain: { country: "Bahrain", countries: ["BH", "BAHRAIN"], currency: "BHD", exchange: /BAHRAIN|BHB|XBAH/i, market: /BAHRAIN|BHB/i, suffix: /\.BH$/i },
    saudi: { country: "Saudi Arabia", countries: ["SA", "SAUDI", "SAUDI ARABIA"], currency: "SAR", exchange: /SAUDI|TADAWUL|XSAU/i, market: /SAUDI|TADAWUL/i, suffix: /\.(SR|SA)$/i },
    uae: { country: "UAE", countries: ["AE", "UAE", "UNITED ARAB EMIRATES"], currency: "AED", exchange: /ADX|DFM|ABU DHABI|DUBAI|XADS|XDFM/i, market: /UAE|ADX|DFM|ABU DHABI|DUBAI|UNITED ARAB/i, suffix: /\.(AE|DU|AD)$/i }
  };
  const CATEGORY_MARKET_IDS = new Set(["technology", "semiconductors", "crypto", "forex", "commodities", "etfs", "indices"]);
  const US_EXCHANGE_RE = /\b(NASDAQ|NYSE|AMEX|CBOE|ARCX|NYSE ARCA)\b/i;
  const TECHNOLOGY_SYMBOLS = new Set([...MARKET_SYMBOLS.technology, ...MARKET_SYMBOLS.ai, ...MARKET_SYMBOLS.semiconductors].map(s => String(s).toUpperCase()));
  const SEMICONDUCTOR_SYMBOLS = new Set(MARKET_SYMBOLS.semiconductors.map(s => String(s).toUpperCase()));

  const SESSIONS = [
    ["New York", 11, 88, "west", 13.5, 20],
    ["London", 27, 31, "west", 8, 16.5],
    ["Frankfurt", 34, 35, "west", 7, 15.5],
    ["Riyadh", 47, 62, "gulf", 7, 12],
    ["Kuwait", 51, 60, "gulf", 6.5, 9.5],
    ["Dubai", 54, 63, "gulf", 6, 11],
    ["Tokyo", 45, 87, "west", 0, 6],
    ["Hong Kong", 55, 82, "west", 1.5, 8],
    ["Sydney", 62, 89, "west", 0, 6],
  ];
  function sessionState(kind, openH, closeH) {
    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun..6=Sat
    const weekend = kind === "gulf" ? (day === 5 || day === 6) : (day === 0 || day === 6);
    const t = now.getUTCHours() + now.getUTCMinutes() / 60;
    const open = !weekend && t >= openH && t < closeH;
    const fmt = (v) => { const hh = Math.floor(v), mm = Math.round((v - hh) * 60); return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`; };
    return { open, label: open ? `ÙŠØºÙ„Ù‚ ${fmt(closeH)} UTC` : `ÙŠÙØªØ­ ${fmt(openH)} UTC` };
  }

  const LESSONS = {
    "Ø£Ø³Ø§Ø³ÙŠØ§Øª": [
      ["ÙƒÙŠÙ ØªÙ‚Ø±Ø£ ØªÙˆØµÙŠØ© AIØŸ", "Ø§Ù„ØªÙˆØµÙŠØ© Ù„Ø§ ØªØ¸Ù‡Ø± Ø¥Ù„Ø§ Ø¹Ù†Ø¯ ÙˆØ¬ÙˆØ¯ Ù…Ø²ÙˆØ¯ Ø¨ÙŠØ§Ù†Ø§Øª ÙˆØªØ­Ù„ÙŠÙ„ Ù…ÙƒØªÙ…Ù„. Ø¹Ù†Ø¯ ØºÙŠØ§Ø¨ Ø§Ù„Ù…Ø²ÙˆØ¯ Ø³ØªØ±Ù‰ Ø­Ø§Ù„Ø© ÙØ§Ø±ØºØ© Ø¨Ø¯Ù„ Ø£Ø±Ù‚Ø§Ù… Ù…ØµØ·Ù†Ø¹Ø©."],
      ["Ø§Ù„Ø¹Ù…Ù„Ø© Ø­Ø³Ø¨ Ø§Ù„Ø£ØµÙ„", "ÙƒÙ„ Ø£ØµÙ„ ÙŠØ³ØªØ®Ø¯Ù… Ø¹Ù…Ù„ØªÙ‡ Ø§Ù„Ø®Ø§ØµØ© Ù…Ù† Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø±Ù…Ø² Ø£Ùˆ Ø§Ù„Ø³ÙˆÙ‚ØŒ ÙˆÙ„ÙŠØ³ Ù…Ù† Ø§Ù„Ø³ÙˆÙ‚ Ø§Ù„Ù…Ø®ØªØ§Ø± ÙÙŠ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø©."],
      ["Ø§Ù„Ø³ÙˆÙ‚ Ù…Ù‚Ø§Ø¨Ù„ Ø§Ù„Ø±Ù…Ø²", "Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø³ÙˆÙ‚ ÙŠØµÙÙ‘ÙŠ Ø§Ù„Ø±Ù…ÙˆØ² ÙÙ‚Ø·Ø› Ø§Ù„Ø³Ø¹Ø± ÙˆØ§Ù„Ø¹Ù…Ù„Ø© ÙŠØ£ØªÙŠØ§Ù† Ù…Ù† Ø§Ù„Ø±Ù…Ø² Ù†ÙØ³Ù‡."]
    ],
    "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø®Ø§Ø·Ø±": [
      ["Ø­Ø¬Ù… Ø§Ù„ØµÙÙ‚Ø©", "Ø­Ø¯Ø¯ Ø­Ø¬Ù… Ø§Ù„Ù…Ø±ÙƒØ² ÙˆÙ†Ø³Ø¨Ø© Ø§Ù„Ù…Ø®Ø§Ø·Ø±Ø© Ù…Ù† Ø±Ø£Ø³ Ø§Ù„Ù…Ø§Ù„ Ù‚Ø¨Ù„ Ø§Ù„Ø¯Ø®ÙˆÙ„ ÙÙŠ Ø£ÙŠ ØµÙÙ‚Ø©."],
      ["ÙˆÙ‚Ù Ø§Ù„Ø®Ø³Ø§Ø±Ø©", "Ø¶Ø¹ Ù†Ù‚Ø·Ø© Ø¥Ù„ØºØ§Ø¡ ÙˆØ§Ø¶Ø­Ø© Ù‚Ø¨Ù„ Ø§Ù„Ø¯Ø®ÙˆÙ„ØŒ ÙˆØ§Ù„ØªØ²Ù… Ø¨Ù‡Ø§ Ø¯ÙˆÙ† ØªØ­Ø±ÙŠÙƒÙ‡Ø§ Ø¹Ø§Ø·ÙÙŠØ§Ù‹."],
      ["Ø§Ù„Ø¹Ø§Ø¦Ø¯ Ø¥Ù„Ù‰ Ø§Ù„Ù…Ø®Ø§Ø·Ø±Ø©", "Ø§Ø¨Ø­Ø« Ø¹Ù† ØµÙÙ‚Ø§Øª Ø¨Ù†Ø³Ø¨Ø© Ø¹Ø§Ø¦Ø¯/Ù…Ø®Ø§Ø·Ø±Ø© 2:1 Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„."]
    ],
    "Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„ÙÙ†ÙŠ": [
      ["Ø§Ù„Ø¯Ø¹Ù… ÙˆØ§Ù„Ù…Ù‚Ø§ÙˆÙ…Ø©", "Ù…Ù†Ø§Ø·Ù‚ ÙŠØªÙƒØ±Ø± Ø¹Ù†Ø¯Ù‡Ø§ Ø§Ø±ØªØ¯Ø§Ø¯ Ø§Ù„Ø³Ø¹Ø±Ø› ØªÙØ³ØªØ®Ø¯Ù… Ù„ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø¯Ø®ÙˆÙ„ ÙˆØ§Ù„Ø£Ù‡Ø¯Ø§Ù."],
      ["Ø§Ù„Ø§ØªØ¬Ø§Ù‡", "ØªØ¯Ø§ÙˆÙ„ Ù…Ø¹ Ø§Ù„Ø§ØªØ¬Ø§Ù‡ Ø§Ù„Ø¹Ø§Ù… Ø£Ø¹Ù„Ù‰ Ø§Ø­ØªÙ…Ø§Ù„Ø§Ù‹ Ù…Ù† Ù…Ø¹Ø§ÙƒØ³ØªÙ‡."],
      ["Ø§Ù„Ø­Ø¬Ù…", "ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø±ÙƒØ© Ø§Ù„Ø³Ø¹Ø±ÙŠØ© Ø¨Ø­Ø¬Ù… ØªØ¯Ø§ÙˆÙ„ Ù…Ø±ØªÙØ¹ ÙŠØ²ÙŠØ¯ Ù…ÙˆØ«ÙˆÙ‚ÙŠØªÙ‡Ø§."]
    ],
    "Ø§Ù„Ù…Ø­ÙØ¸Ø©": [
      ["Ø§Ù„ØªÙ†ÙˆÙŠØ¹", "ÙˆØ²Ù‘Ø¹ Ø§Ù„Ù…Ø®Ø§Ø·Ø± Ø¹Ø¨Ø± Ø£Ø³ÙˆØ§Ù‚ ÙˆÙ‚Ø·Ø§Ø¹Ø§Øª Ù…Ø®ØªÙ„ÙØ© Ù„ØªÙ‚Ù„ÙŠÙ„ Ø£Ø«Ø± Ø£ØµÙ„ ÙˆØ§Ø­Ø¯."],
      ["Ø§Ù„ØªÙˆØ²ÙŠØ¹", "Ø­Ø¯Ø¯ Ù†Ø³Ø¨Ø© ÙƒÙ„ ÙØ¦Ø© Ø£ØµÙˆÙ„ ÙˆØ£Ø¹Ø¯ Ø§Ù„ØªÙˆØ§Ø²Ù† Ø¯ÙˆØ±ÙŠØ§Ù‹."]
    ]
  };

  // Brand color map for recognizable tickers (badge fallback, no external network).
  const BRAND = {
    AAPL: ["A", "#e6e9ee", "#0b0b0d"], MSFT: ["âŠž", "#ffffff", "#00a4ef"], GOOGL: ["G", "#ffffff", "#4285f4"], GOOG: ["G", "#ffffff", "#4285f4"],
    NVDA: ["N", "#0b1f0b", "#76b900"], AMZN: ["a", "#0b0b0d", "#ff9900"], META: ["M", "#ffffff", "#0866ff"], TSLA: ["T", "#ffffff", "#e82127"],
    AMD: ["A", "#ffffff", "#ed1c24"], INTC: ["i", "#ffffff", "#0071c5"], NFLX: ["N", "#ffffff", "#e50914"], CRM: ["S", "#ffffff", "#00a1e0"],
    ORCL: ["O", "#ffffff", "#f80000"], JPM: ["J", "#0b0b0d", "#a6804f"], BAC: ["B", "#ffffff", "#012169"], LLY: ["L", "#ffffff", "#d52b1e"],
    PFE: ["P", "#ffffff", "#0093d0"], JNJ: ["J", "#0b0b0d", "#d51900"], MRK: ["M", "#ffffff", "#00857c"], KO: ["C", "#ffffff", "#f40009"],
    PEP: ["P", "#ffffff", "#004b93"], MCD: ["M", "#27251f", "#ffc72c"], COST: ["C", "#ffffff", "#e31837"], PLTR: ["P", "#ffffff", "#101113"],
    AVGO: ["B", "#ffffff", "#cc0000"], TSM: ["T", "#ffffff", "#d4002a"], XOM: ["E", "#ffffff", "#ee1c25"], CVX: ["C", "#ffffff", "#0066b2"], OXY: ["O", "#ffffff", "#d6112b"]
  };
  const CRYPTO = { BTC: ["â‚¿", "#f7931a"], ETH: ["Îž", "#627eea"], BNB: ["â—†", "#f3ba2f"], SOL: ["â—Ž", "#14f195"], XRP: ["âœ•", "#23292f"], ADA: ["â‚³", "#0033ad"], DOGE: ["Ã", "#c2a633"], USDT: ["â‚®", "#26a17b"] };
  const GULF_FLAG = { KW: "ðŸ‡°ðŸ‡¼", SR: "ðŸ‡¸ðŸ‡¦", SA: "ðŸ‡¸ðŸ‡¦", AE: "ðŸ‡¦ðŸ‡ª", QA: "ðŸ‡¶ðŸ‡¦", BH: "ðŸ‡§ðŸ‡­", OM: "ðŸ‡´ðŸ‡²" };
  // ticker -> company domain for favicon fallback; failed images remove themselves and leave the badge.
  const DOMAINS = {
    AAPL: "apple.com", MSFT: "microsoft.com", GOOGL: "google.com", GOOG: "google.com", NVDA: "nvidia.com",
    AMZN: "amazon.com", META: "meta.com", TSLA: "tesla.com", AMD: "amd.com", INTC: "intel.com",
    NFLX: "netflix.com", CRM: "salesforce.com", ORCL: "oracle.com", JPM: "jpmorganchase.com", BAC: "bankofamerica.com",
    LLY: "lilly.com", PFE: "pfizer.com", JNJ: "jnj.com", MRK: "merck.com", KO: "coca-cola.com", PEP: "pepsi.com",
    MCD: "mcdonalds.com", COST: "costco.com", PLTR: "palantir.com", AVGO: "broadcom.com", TSM: "tsmc.com",
    XOM: "exxonmobil.com", CVX: "chevron.com", OXY: "oxy.com", ADBE: "adobe.com", QCOM: "qualcomm.com",
    CSCO: "cisco.com", IBM: "ibm.com", PYPL: "paypal.com", DIS: "disney.com", V: "visa.com", MA: "mastercard.com",
    WMT: "walmart.com", PG: "pg.com", UNH: "unitedhealthgroup.com", HD: "homedepot.com", BA: "boeing.com",
    SPY: "ssga.com", QQQ: "invesco.com", GLD: "spdrgoldshares.com"
  };

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const state = {
    route: { id: "dashboard" }, loading: true, timeframe: "1D",
    rec: {}, signals: {}, signalAlerts: {}, markets: {}, news: {}, newsContextKey: "", followed: {}, provider: {}, providerStatus: {}, commandCards: {},
    calendarRange: "30", calendarLoading: false, calendarLoaded: false,
    calendarOpen: { earnings: false, dividends: false, ipos: false, economic: false },
    earningsView: { search: "", tab: "complete", sortKey: "reportDate", sortDir: "asc", source: "all", timing: "all", page: 1, pageSize: 10 },
    marketUniverseView: { page: 1, pageSize: MARKET_UNIVERSE_PAGE_SIZE, q: "", exchange: "all", currency: "all", sector: "all", industry: "all", assetType: "all", fundType: "all", availability: "all", sort: "symbol", dir: "asc" },
    marketUniverseActiveMarket: null,
    calendar: { earnings: {}, dividends: {}, ipos: {}, economic: {} },
    watch: read(keys.watch, []), alerts: read(keys.alerts, []), holdings: read(keys.holdings, []), localTrades: read(keys.followed, []),
    settings: read(keys.settings, { lang: "ar", defaultMarket: "us-stocks", risk: "balanced", quickTickerVisible: true }),
    errors: {},
    cache: new Map(), marketCache: new Map()
  };

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Boot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
  async function boot() {
    state.route = readRoute();
    bind();
    render();
    let released = false;
    const releaseLoading = () => {
      if (released) return;
      released = true;
      state.loading = false;
      render();
      afterRoute();
    };
    const loadingTimer = window.setTimeout(releaseLoading, INITIAL_LOADING_MAX_MS);
    try {
      await hydrate();
    } catch (error) {
      devLog("boot", "failed", { message: errorMessage(error) });
    } finally {
      window.clearTimeout(loadingTimer);
      releaseLoading();
      renderAfterData();
    }
  }

  async function hydrate() {
    const commandSymbols = dashboardSymbols();
    const newsPath = marketNewsPath(12);
    const settled = await Promise.allSettled([
      get(`/recommendations?market=${marketApi(state.settings.defaultMarket)}`),
      get(`/recommendations?symbols=${encodeURIComponent(commandSymbols.join(","))}`),
      get("/market/signals?limit=60"),
      get("/market/signal-alerts?limit=50"),
      get("/markets"), get(newsPath), get("/followed-trades"),
      get("/trader/provider-status", { label: "providerStatus" })
    ]);
    const [rec, commandCards, signals, signalAlerts, mk, news, followed, providerStatus] = settled.map((result, index) => settledValue(result, ["quotes", "quotes", "signals", "signals", "quotes", "news", "quotes", "providerStatus"][index]));
    state.rec = rec; state.commandCards = commandCards; state.signals = signals; state.signalAlerts = signalAlerts; state.markets = mk; state.news = news; state.followed = followed;
    state.newsContextKey = newsPath;
    state.providerStatus = providerStatus || {};
    state.provider = providerStatus.dataProvider || commandCards.dataProvider || rec.dataProvider || mk.dataProvider || news.dataProvider || commandCards.provider || rec.provider || mk.provider || news.provider || { configured: false, status: "not_configured" };
    renderAfterData();
  }

  async function get(path, options = {}) {
    return requestJson(path, { method: "GET", ...options });
  }
  function marketForSymbol(symbol) {
    const s = sym(symbol);
    return MARKETS.find(m => arr(m.symbols).map(sym).includes(s)) || null;
  }
  function marketNewsContext(symbolOverride = "") {
    const targetSymbol = sym(symbolOverride);
    const inferredMarket = targetSymbol ? marketForSymbol(targetSymbol) : null;
    const market = inferredMarket || currentMarket();
    const symbolCategory = targetSymbol ? assetType(targetSymbol) : "";
    const category = symbolCategory && symbolCategory !== "stock" ? symbolCategory : (state.settings.selectedCategory || categoryFromSelection(market.id));
    const symbols = targetSymbol ? [targetSymbol] : unique(arr(market.symbols));
    return { market, category, symbols, symbol: targetSymbol };
  }
  function marketNewsPath(limit = 12, options = {}) {
    const context = marketNewsContext(options.symbol || "");
    const params = new URLSearchParams({
      limit: String(limit),
      scope: context.symbol ? "asset" : "general",
      market: context.market.id,
      category: context.category,
    });
    if (context.symbol) params.set("symbol", context.symbol);
    if (context.symbols.length) params.set("symbols", context.symbols.join(","));
    if (options.refresh) params.set("refresh", "1");
    return `/market-news?${params.toString()}`;
  }
  async function loadNews(force = false) {
    const cacheKey = marketNewsPath(12);
    if (!force && state.newsContextKey === cacheKey) return;
    state.newsContextKey = cacheKey;
    state.news = await get(marketNewsPath(12, { refresh: force }), { label: "news" });
    if (state.route.id === "news" || state.route.id === "dashboard") render();
  }
  async function post(path, body, options = {}) {
    return requestJson(path, { method: "POST", body, ...options });
  }
  async function requestJson(path, options = {}) {
    const label = options.label || requestLabel(path);
    const timeoutMs = options.timeoutMs || timeoutFor(path, label);
    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const res = await fetch(`${API}${path}`, {
        method: options.method || "GET",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        credentials: "same-origin",
        signal: controller.signal,
        body: options.method === "POST" ? JSON.stringify(options.body || {}) : undefined
      });
      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const body = isJson ? await res.json().catch(() => ({})) : {};
      const routeUnavailable = res.status === 404 || (!isJson && /html|text\/plain/i.test(contentType));
      const payload = res.ok && isJson
        ? { ok: true, ...body }
        : {
            ...body,
            ok: false,
            status: res.status,
            message: routeUnavailable ? ROUTE_UNAVAILABLE_MESSAGE : (body.message || body.error || res.statusText || UNAVAILABLE_MESSAGE),
            routeUnavailable,
            dataProvider: body.dataProvider || null
          };
      logRequestResult(label, path, timeoutMs, payload);
      return payload;
    } catch (error) {
      const timeoutError = timedOut || errorName(error) === "AbortError" || errorName(error) === "TimeoutError";
      const payload = {
        ok: false,
        timeout: timeoutError,
        message: timeoutError ? UNAVAILABLE_MESSAGE : errorMessage(error),
        dataProvider: null
      };
      logRequestResult(label, path, timeoutMs, payload);
      return payload;
    } finally {
      window.clearTimeout(timeout);
    }
  }
  async function saveSignalPreferences(prefs) {
    const result = await post("/market/signal-preferences", prefs, { label: "signals", timeoutMs: REQUEST_TIMEOUTS.signals });
    return result.ok === true;
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function bind() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-route-link]");
      if (link) { event.preventDefault(); navigate(link.getAttribute("href")); return; }
      const tab = event.target.closest("[data-tab]");
      if (tab) { event.preventDefault(); onTab(tab); return; }
      const tf = event.target.closest("[data-timeframe]");
      if (tf) { event.preventDefault(); state.timeframe = tf.dataset.timeframe; render(); return; }
      const cr = event.target.closest("[data-calendar-range]");
      if (cr) {
        event.preventDefault();
        state.calendarRange = cr.dataset.calendarRange || "30";
        state.earningsView.page = 1;
        state.calendarLoading = true;
        render();
        loadCalendars(true).catch((error) => {
          devLog("calendar", "failed", { message: errorMessage(error) });
        }).finally(() => {
          state.calendarLoading = false;
          render();
          afterRoute();
        });
        return;
      }
      const calendarToggle = event.target.closest("[data-calendar-section-toggle]");
      if (calendarToggle) {
        event.preventDefault();
        const kind = calendarToggle.dataset.calendarSectionToggle;
        if (state.calendarOpen && Object.prototype.hasOwnProperty.call(state.calendarOpen, kind)) {
          state.calendarOpen[kind] = !state.calendarOpen[kind];
          render();
        }
        return;
      }
      const earningsTab = event.target.closest("[data-earnings-tab]");
      if (earningsTab) {
        event.preventDefault();
        state.earningsView.tab = earningsTab.dataset.earningsTab || "complete";
        state.earningsView.page = 1;
        render();
        return;
      }
      const earningsSort = event.target.closest("[data-earnings-sort]");
      if (earningsSort) {
        event.preventDefault();
        const key = earningsSort.dataset.earningsSort || "reportDate";
        state.earningsView.sortDir = state.earningsView.sortKey === key && state.earningsView.sortDir === "asc" ? "desc" : "asc";
        state.earningsView.sortKey = key;
        state.earningsView.page = 1;
        render();
        return;
      }
      const earningsPage = event.target.closest("[data-earnings-page]");
      if (earningsPage) {
        event.preventDefault();
        state.earningsView.page = Math.max(1, Number(earningsPage.dataset.earningsPage) || 1);
        render();
        return;
      }
      const earningsPageSize = event.target.closest("[data-earnings-page-size]");
      if (earningsPageSize) {
        event.preventDefault();
        state.earningsView.pageSize = Math.max(10, Number(earningsPageSize.dataset.earningsPageSize) || 10);
        state.earningsView.page = 1;
        render();
        return;
      }
      const detail = event.target.closest("[data-symbol-details]");
      if (detail) { event.preventDefault(); const s = sym(detail.dataset.symbolDetails); if (s) navigate(`${ROOT}/symbol/${encodeURIComponent(s)}`); return; }
      const add = event.target.closest("[data-quick-add]");
      if (add) { event.preventDefault(); addWatch(add.dataset.quickAdd); return; }
      const remove = event.target.closest("[data-remove-watch]");
      if (remove) { event.preventDefault(); removeWatch(remove.dataset.removeWatch); return; }
      const alertBtn = event.target.closest("[data-create-alert]");
      if (alertBtn) { event.preventDefault(); createAlert(alertBtn.dataset.createAlert); return; }
      const followTrade = event.target.closest("[data-follow-trade]");
      if (followTrade) { event.preventDefault(); followRecommendationTrade(followTrade.dataset.followTrade); return; }
      const refreshTrades = event.target.closest("[data-refresh-trades]");
      if (refreshTrades) { event.preventDefault(); refreshFollowedTrades(true); return; }
      const runSignals = event.target.closest("[data-run-signals]");
      if (runSignals) { event.preventDefault(); runSignalRefresh(); return; }
      const tickerToggle = event.target.closest("[data-toggle-ticker]");
      if (tickerToggle) { event.preventDefault(); state.settings.quickTickerVisible = !isQuickTickerVisible(); write(keys.settings, state.settings); render(); return; }
      const universePage = event.target.closest("[data-market-universe-page]");
      if (universePage) {
        event.preventDefault();
        state.marketUniverseView.page = Math.max(1, Number(universePage.dataset.marketUniversePage) || 1);
        loadMarket(state.route.market, true);
        render();
        return;
      }
      const universeSort = event.target.closest("[data-market-universe-sort]");
      if (universeSort) {
        event.preventDefault();
        const key = universeSort.dataset.marketUniverseSort || "symbol";
        state.marketUniverseView.dir = state.marketUniverseView.sort === key && state.marketUniverseView.dir === "asc" ? "desc" : "asc";
        state.marketUniverseView.sort = key;
        state.marketUniverseView.page = 1;
        loadMarket(state.route.market, true);
        render();
        return;
      }
      const fundFilter = event.target.closest("[data-fund-filter]");
      if (fundFilter) {
        event.preventDefault();
        state.marketUniverseView.fundType = fundFilter.dataset.fundFilter || "all";
        state.marketUniverseView.assetType = "fund";
        state.marketUniverseView.page = 1;
        loadMarket(state.route.market, true);
        render();
        return;
      }
      const delAlert = event.target.closest("[data-del-alert]");
      if (delAlert) { event.preventDefault(); deleteAlert(delAlert.dataset.delAlert); return; }
      const retry = event.target.closest("[data-retry]");
      if (retry) { event.preventDefault(); retryRoute(); return; }
      const collapse = event.target.closest("#sidebar-collapse");
      if (collapse) { event.preventDefault(); document.getElementById("app-shell").classList.toggle("is-collapsed"); return; }
    });
    document.getElementById("symbol-search")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const symbol = sym(document.getElementById("symbol-input")?.value || "");
      if (!symbol) return toast("Ø§ÙƒØªØ¨ Ø±Ù…Ø²Ø§Ù‹ Ø£ÙˆÙ„Ø§Ù‹ØŒ Ù…Ø«Ù„ AAPL Ø£Ùˆ BTCUSD.");
      navigate(`${ROOT}/symbol/${encodeURIComponent(symbol)}`);
    });
    document.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-earnings-search-form]");
      if (!form) return;
      event.preventDefault();
      state.earningsView.search = String(new FormData(form).get("earningsSearch") || "").trim();
      state.earningsView.page = 1;
      render();
    });
    document.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-market-universe-search]");
      if (!form) return;
      event.preventDefault();
      state.marketUniverseView.q = String(new FormData(form).get("marketUniverseSearch") || "").trim();
      state.marketUniverseView.page = 1;
      loadMarket(state.route.market, true);
      render();
    });
    document.addEventListener("change", (event) => {
      const filter = event.target.closest("[data-earnings-filter]");
      if (!filter) return;
      const key = filter.dataset.earningsFilter;
      if (key === "source" || key === "timing") {
        state.earningsView[key] = filter.value || "all";
        state.earningsView.page = 1;
        render();
      }
    });
    document.addEventListener("change", (event) => {
      const filter = event.target.closest("[data-market-universe-filter]");
      if (!filter) return;
      const key = filter.dataset.marketUniverseFilter;
      if (key === "market") {
        const target = filter.value || state.route.market;
        if (target && target !== state.route.market) {
          state.marketUniverseView.page = 1;
          if (target !== "etfs") {
            state.marketUniverseView.fundType = "all";
            state.marketUniverseView.assetType = "all";
          }
          navigate(`${ROOT}/markets/${encodeURIComponent(target)}`);
        }
        return;
      }
      if (Object.prototype.hasOwnProperty.call(state.marketUniverseView, key)) {
        state.marketUniverseView[key] = filter.value || "all";
        state.marketUniverseView.page = 1;
        loadMarket(state.route.market, true);
        render();
      }
    });
    window.addEventListener("popstate", () => { state.route = readRoute(); render(); afterRoute(); });
  }

  function navigate(href) {
    if (!href) return;
    try { history.pushState({}, "", href); } catch (_e) { location.href = href; return; }
    state.route = readRoute();
    document.getElementById("terminal-content")?.scrollIntoView({ block: "start" });
    render();
    afterRoute();
  }
  async function retryRoute() {
    state.errors = {};
    if (state.route.id === "calendar") state.calendarLoading = true;
    render();
    try {
      if (state.route.id === "markets" && state.route.market) {
        state.marketCache.delete(marketUniverseCacheKey(state.route.market));
        await loadMarket(state.route.market, true);
      } else if (state.route.id === "symbol-details" && state.route.symbol) {
        state.cache.delete(sym(state.route.symbol));
        await loadSymbol(state.route.symbol, true);
      } else if (state.route.id === "calendar") {
        await loadCalendars(true);
      } else if (state.route.id === "news") {
        await loadNews(true);
      } else if (state.route.id === "ai-scanner" || state.route.id === "recommendations") {
        state.rec = {};
        state.signals = {};
        await ensureScanData(true);
      } else {
        state.marketCache.clear();
        await hydrate();
      }
      toast("ØªÙ…Øª Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©.");
    } catch (error) {
      devLog("retry", "failed", { route: state.route.id, message: errorMessage(error) });
      toast(UNAVAILABLE_MESSAGE);
    } finally {
      state.calendarLoading = false;
      render();
      afterRoute();
    }
  }

  function readRoute() {
    const q = new URLSearchParams(location.search).get("route");
    const raw = q || location.pathname.replace(ROOT, "").replace(/^\/+|\/+$/g, "") || "dashboard";
    const clean = decodeURIComponent(raw).replace(/^\/+|\/+$/g, "");
    if (!clean || clean === "home" || clean === "app") return { id: "dashboard" };
    const [id, ...rest] = clean.split("/");
    if (id === "market-analysis") return { id: "recommendations" };
    if (id === "symbol" || id === "symbol-details") return { id: "symbol-details", symbol: sym(rest.join("/")) };
    if (id === "markets" && rest.length) return { id: "markets", market: rest[0] };
    return routes[id] ? { id, market: rest[0] } : { id: "dashboard" };
  }

  function onTab(el) {
    const group = el.dataset.tab, value = el.dataset.value;
    el.parentElement.querySelectorAll("[data-tab]").forEach(n => n.classList.toggle("is-active", n === el));
    const panel = document.querySelector(`[data-tabpanel="${group}"]`);
    if (panel && panel.dataset.render) {
      panel.innerHTML = (window.__tabRenderers && window.__tabRenderers[panel.dataset.render]) ? window.__tabRenderers[panel.dataset.render](value) : panel.innerHTML;
    }
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function render() {
    const title = document.getElementById("page-title");
    if (title) title.textContent = routes[state.route.id] || routes.dashboard;
    document.querySelectorAll("[data-route]").forEach((node) => node.classList.toggle("is-active", node.dataset.route === state.route.id || (state.route.id === "symbol-details" && node.dataset.route === "symbol-details")));
    status(); ticker(); statusBar();
    const content = document.getElementById("terminal-content");
    if (!content) return;
    content.innerHTML = state.loading ? loading() : page();
  }

  function afterRoute() {
    const id = state.route.id;
    if (id === "symbol-details" && state.route.symbol) loadSymbol(state.route.symbol);
    if (id === "markets" && state.route.market) {
      if (state.marketUniverseActiveMarket !== state.route.market) {
        state.marketUniverseActiveMarket = state.route.market;
        state.marketUniverseView = { page: 1, pageSize: MARKET_UNIVERSE_PAGE_SIZE, q: "", exchange: "all", currency: "all", sector: "all", industry: "all", assetType: "all", fundType: "all", availability: "all", sort: "symbol", dir: "asc" };
      }
      loadMarket(state.route.market);
    }
    if (id === "ai-scanner" || id === "recommendations") ensureScanData();
    if (id === "news") loadNews(false).catch((error) => devLog("news", "failed", { message: errorMessage(error) }));
    if (id === "calendar" && !state.calendarLoaded && !state.calendarLoading) {
      state.calendarLoading = true;
      render();
      loadCalendars(false).catch((error) => {
        devLog("calendar", "failed", { message: errorMessage(error) });
      }).finally(() => {
        state.calendarLoading = false;
        render();
      });
    }
  }

  function page() {
    const id = state.route.id;
    if (id === "markets") return state.route.market ? marketDetailPage(state.route.market) : marketsPage();
    if (id === "ai-scanner") return scannerPage();
    if (id === "watchlist") return watchPage();
    if (id === "portfolio") return portfolioPage();
    if (id === "alerts") return alertsPage();
    if (id === "recommendations") return recPage();
    if (id === "trade-performance") return performancePage();
    if (id === "news") return newsPage();
    if (id === "calendar") return calendarPage();
    if (id === "education") return educationPage();
    if (id === "settings") return settingsPage();
    if (id === "symbol-details") return symbolPage(state.route.symbol);
    return dashboardPage();
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function dashboardPage() {
    const rec = recs(), news = newsItems(), alerts = smartAlerts();
    const movers = sortMovers(rec);
    return `<div class="page-stack">
      ${commandCenter(rec)}
      ${marketOverview(rec)}
      ${marketLeadership(rec)}
      ${opportunityHeatmap(rec)}
      <section class="market-movers-grid">
        ${moverPanel("TOP GAINERS", "Ø§Ù„Ø£ÙƒØ«Ø± Ø§Ø±ØªÙØ§Ø¹Ø§Ù‹", movers.gainers.slice(0, 3), "up")}
        ${moverPanel("TOP LOSERS", "Ø§Ù„Ø£ÙƒØ«Ø± Ø§Ù†Ø®ÙØ§Ø¶Ø§Ù‹", movers.losers.slice(0, 3), "down")}
      </section>
      <section class="panel recommendations-panel"><div class="panel-head"><div><span class="eyebrow">SYMBOLS & RECOMMENDATIONS</span><h2>Ø§Ù„Ø±Ù…ÙˆØ² ÙˆØ§Ù„ØªÙˆØµÙŠØ§Øª</h2></div><a class="rdp-view-all" href="${ROOT}/recommendations" data-route-link>Ø¹Ø±Ø¶ Ø§Ù„ÙƒÙ„</a></div>${rec.length ? watchlistTable(rec.slice(0, 14)) : unavailableSection(state.rec, "Ù„Ù… ÙŠØ±Ø¬Ø¹ Ù…Ø²ÙˆØ¯ Ø§Ù„Ø£Ø³Ø¹Ø§Ø± Ø£Ùˆ Ø§Ù„ØªÙˆØµÙŠØ§Øª Ø¨ÙŠØ§Ù†Ø§Øª Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„Ø¹Ø±Ø¶.", "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª", `${ROOT}/settings`)}</section>
      <section class="dashboard-lower-grid">
        <article class="panel"><span class="eyebrow">MARKET NEWS</span><h2>Ø¢Ø®Ø± Ø§Ù„Ø£Ø®Ø¨Ø§Ø±</h2>${news.length ? newsList(news.slice(0, 3)) : unavailableSection(state.news, "Ù…Ø²ÙˆØ¯ Ø§Ù„Ø£Ø®Ø¨Ø§Ø± Ù„Ù… ÙŠØ±Ø¬Ø¹ Ø¹Ù†Ø§ØµØ± Ø­Ø§Ù„ÙŠØ©.", "ØµÙØ­Ø© Ø§Ù„Ø£Ø®Ø¨Ø§Ø±", `${ROOT}/news`)}</article>
        <article class="panel"><span class="eyebrow">AI ANALYSIS</span><h2>Ø­Ø§Ù„Ø© Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø°ÙƒÙŠ</h2>${alerts.length ? alertList(alerts) : unavailableSection(state.signals, "Ø³ÙŠØ¸Ù‡Ø± Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø¹Ù†Ø¯ ØªÙˆÙØ± Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø³ÙˆÙ‚ ÙˆØ§Ù„ØªÙˆØµÙŠØ§Øª.", "Ø§ÙØªØ­ Ø§Ù„Ù…Ø§Ø³Ø­", `${ROOT}/ai-scanner`)}</article>
        <article class="panel"><span class="eyebrow">SYSTEM STATUS</span><h2>Ø­Ø§Ù„Ø© Ø§Ù„Ù†Ø¸Ø§Ù…</h2>${diagnostics()}</article>
      </section>
      ${disclaimer()}
    </div>`;
  }

  function marketsPage() {
    return `<div class="page-stack">${hero("Ø®Ø±ÙŠØ·Ø© Ø£Ø³ÙˆØ§Ù‚ ÙƒØ§Ù…Ù„Ø©", "Ø§Ù„Ø£Ø³Ù‡Ù…ØŒ Ø§Ù„Ø®Ù„ÙŠØ¬ØŒ Ø§Ù„Ø¹Ù…Ù„Ø§ØªØŒ Ø§Ù„ÙƒØ±ÙŠØ¨ØªÙˆØŒ Ø§Ù„Ø³Ù„Ø¹ØŒ Ø§Ù„Ù…Ø¤Ø´Ø±Ø§ØªØŒ Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ ÙˆØ§Ù„Ù‚Ø·Ø§Ø¹Ø§Øª. ÙƒÙ„ Ø¨Ø·Ø§Ù‚Ø© ØªØ¹Ø±Ø¶ Ø§Ù„Ø¹Ù…Ù„Ø© Ø§Ù„Ø®Ø§ØµØ© Ø¨Ø§Ù„Ø£ØµÙ„ ÙˆÙ„Ø§ ØªØ±Ø« Ø¹Ù…Ù„Ø© Ø§Ù„Ø³ÙˆÙ‚ Ø§Ù„Ù…Ø®ØªØ§Ø±.", "MARKETS")}
      <section class="market-grid">${MARKETS.map(marketCard).join("")}</section>
      <section class="panel"><span class="eyebrow">PROVIDER MARKETS</span><h2>Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£Ø³ÙˆØ§Ù‚ Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯</h2>${providerMarkets()}</section>
    </div>`;
  }

  function marketDetailPage(id) {
    const m = MARKETS.find(x => x.id === id);
    if (!m) return marketsPage();
    const cached = state.marketCache.get(marketUniverseCacheKey(id));
    const total = marketUniverseTotal(m, cached);
    const body = cached
      ? marketUniversePanel(m, cached)
      : `<div class="panel"><div class="loading-panel compact"><span class="pulse-orb"></span><h2>Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ${h(m.ar)}</h2><p>${h(COVERAGE_NOTICE_EN)}</p></div></div>`;
    return `<div class="page-stack">
      <a class="back-link" href="${ROOT}/markets" data-route-link>â€¹ ÙƒÙ„ Ø§Ù„Ø£Ø³ÙˆØ§Ù‚</a>
      ${hero(`${m.ar} <span class="ltr">Â· ${h(m.en)}</span>`, `${m.family} Â· Ø§Ù„Ø¹Ù…Ù„Ø© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©: ${m.currency}. Ø§Ù„ØµÙØ­Ø© ØªØ¹Ø±Ø¶ Ø§Ù„ÙƒÙˆÙ† Ø§Ù„ÙƒØ§Ù…Ù„ Ø§Ù„Ù…ØªØ§Ø­ Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯ Ù…Ø¹ ØªØ±Ù‚ÙŠÙ… ØµÙØ­Ø§Øª Ø¨Ø­Ø¬Ù… ${latinNumber(MARKET_UNIVERSE_PAGE_SIZE)} Ø±Ù…Ø²Ø§Ù‹.`, "MARKET")}
      ${marketPreviewStrip(m, total)}
      ${body}
      ${disclaimer()}
    </div>`;
  }

  function marketPreviewSymbols(m) {
    return unique(arr(m.previewSymbols || m.symbols).slice(0, 10));
  }
  function marketActionLabel(m) {
    if (m && m.id === "etfs") return `Ø¹Ø±Ø¶ ÙƒÙ„ Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ <span class="ltr">View all funds</span>`;
    return `Ø¹Ø±Ø¶ ÙƒÙ„ Ø§Ù„Ø£Ø³Ù‡Ù… <span class="ltr">View all symbols</span>`;
  }
  function marketUniverseTotal(m, payload) {
    const fromPayload = num(payload && payload.marketUniverse && (payload.marketUniverse.total ?? payload.marketUniverse.universeTotal), payload && payload.symbolDiscovery && payload.symbolDiscovery.totalFilteredSymbols);
    if (fromPayload !== null) return fromPayload;
    const group = arr(state.markets.groups).find(x => x.id === m.id);
    return num(group && (group.totalSymbols || group.symbols?.length), m.totalSymbols, m.symbols.length) || m.symbols.length;
  }
  function marketPreviewStrip(m, total) {
    const preview = marketPreviewSymbols(m);
    return `<section class="market-preview-strip" data-market-preview="${h(m.id)}">
      <div class="market-preview-copy"><strong>Ø±Ù…ÙˆØ² Ù…Ø¹Ø§ÙŠÙ†Ø©</strong><span>${h(`ÙŠØ¹Ø±Ø¶ ${latinNumber(preview.length)} Ù…Ù† ${latinNumber(total)} Ø±Ù…Ø²`)} Â· <span class="ltr">${h(`Showing ${preview.length} of ${total} symbols`)}</span></span></div>
      <div class="chip-row compact">${preview.map(s => `<button class="badge" data-symbol-details="${h(s)}">${logo({ symbol: s })}<span class="ltr">${h(s)}</span></button>`).join("")}</div>
      <a class="ghost-btn compact-btn" href="${ROOT}/markets/${h(m.id)}" data-route-link>${marketActionLabel(m)}</a>
    </section>`;
  }
  function marketUniverseRows(payload) {
    return arr(payload && (payload.recommendations || payload.data || payload.items || payload.results)).map(norm).filter(x => x.symbol);
  }
  function marketUniversePagination(payload) {
    const mu = (payload && payload.marketUniverse) || {};
    const discovery = (payload && payload.symbolDiscovery) || {};
    return {
      page: Number(mu.page || discovery.page || state.marketUniverseView.page || 1),
      pageSize: Number(mu.pageSize || discovery.pageSize || state.marketUniverseView.pageSize || MARKET_UNIVERSE_PAGE_SIZE),
      total: Number(mu.total || discovery.totalFilteredSymbols || marketUniverseRows(payload).length || 0),
      returned: Number(mu.returned || marketUniverseRows(payload).length || 0),
      hasMore: Boolean(mu.hasMore || discovery.hasMore),
    };
  }
  function marketUniversePanel(m, payload) {
    const rows = marketUniverseRows(payload);
    const pagination = marketUniversePagination(payload);
    const pageCount = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
    return `<section class="panel market-universe-panel" data-selected-market="${h(m.id)}">
      <div class="panel-head"><div><span class="eyebrow">FULL SYMBOL UNIVERSE</span><h2>ÙƒÙ„ Ø§Ù„Ø±Ù…ÙˆØ² Ø§Ù„Ù…ØªØ§Ø­Ø©</h2></div><button class="ghost-btn compact-btn" data-retry type="button">ØªØ­Ø¯ÙŠØ«</button></div>
      ${coverageNotice(payload, rows, m)}
      ${marketUniverseControls(m, payload)}
      <div class="provider-market-result-meta market-universe-result-meta">
        <span>${h(`ÙŠØ¹Ø±Ø¶ ${latinNumber(rows.length)} Ù…Ù† ${latinNumber(pagination.total)} Ø±Ù…Ø²`)} Â· <span class="ltr">${h(`Showing ${rows.length} of ${pagination.total} symbols`)}</span></span>
        <span>ØµÙØ­Ø© <b class="ltr">${latinNumber(pagination.page)}</b> / <b class="ltr">${latinNumber(pageCount)}</b></span>
      </div>
      ${rows.length ? marketUniverseTable(rows) : emptyState(m.id === "etfs" ? FUND_EMPTY_STATE_AR : "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø±Ù…ÙˆØ² Ù…Ø·Ø§Ø¨Ù‚Ø©", m.id === "etfs" ? FUND_EMPTY_STATE_EN : "ØºÙŠÙ‘Ø± Ø§Ù„Ø¨Ø­Ø« Ø£Ùˆ Ø§Ù„ÙÙ„Ø§ØªØ±. Ù„Ù† Ù†Ø¶ÙŠÙ Ø±Ù…ÙˆØ²Ø§Ù‹ ØªØ¬Ø±ÙŠØ¨ÙŠØ© Ø¨Ø¯Ù„Ø§Ù‹ Ù…Ù† Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø²ÙˆØ¯.", "", "")}
      <div class="provider-market-pagination market-universe-pagination">
        <button class="ghost-btn compact-btn" data-market-universe-page="${pagination.page - 1}" ${pagination.page <= 1 ? "disabled" : ""}>Ø§Ù„Ø³Ø§Ø¨Ù‚ <span class="ltr">Previous</span></button>
        <button class="ghost-btn compact-btn" data-market-universe-page="${pagination.page + 1}" ${pagination.page >= pageCount ? "disabled" : ""}>Ø§Ù„ØªØ§Ù„ÙŠ <span class="ltr">Next</span></button>
      </div>
    </section>`;
  }
  function marketUniverseControls(m, payload) {
    const view = state.marketUniverseView, options = marketUniverseFilterOptions(payload);
    return `<div class="market-universe-controls">
      ${fundSubfilters(m)}
      <form data-market-universe-search>
        <input name="marketUniverseSearch" value="${h(view.q)}" placeholder="Search symbol or company name" />
        <button class="ghost-btn compact-btn" type="submit">Ø¨Ø­Ø« <span class="ltr">Search</span></button>
      </form>
      <label>Ø§Ù„Ø³ÙˆÙ‚<select data-market-universe-filter="market">${MARKETS.map(item => `<option value="${h(item.id)}" ${item.id === m.id ? "selected" : ""}>${h(item.en)}</option>`).join("")}</select></label>
      <label>Ø§Ù„Ø¨ÙˆØ±ØµØ©<select data-market-universe-filter="exchange">${filterOptions(options.exchanges, view.exchange, "All exchanges")}</select></label>
      <label>Ø§Ù„Ø¹Ù…Ù„Ø©<select data-market-universe-filter="currency">${filterOptions(options.currencies, view.currency, "All currencies")}</select></label>
      <label>Ø§Ù„Ù‚Ø·Ø§Ø¹<select data-market-universe-filter="sector">${filterOptions(options.sectors, view.sector, "All sectors")}</select></label>
      <label>Ø§Ù„ØµÙ†Ø§Ø¹Ø©<select data-market-universe-filter="industry">${filterOptions(options.industries, view.industry, "All industries")}</select></label>
      <label>Ø§Ù„Ù†ÙˆØ¹<select data-market-universe-filter="assetType">${filterOptions(options.assetTypes, view.assetType, "All asset types")}</select></label>
      ${m.id === "etfs" ? `<label>Ù†ÙˆØ¹ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚<select data-market-universe-filter="fundType">${filterOptions(options.fundFilters || FUND_FILTERS, view.fundType, null)}</select></label>` : ""}
      <label>ØªÙˆÙØ± Ø§Ù„Ø³Ø¹Ø±<select data-market-universe-filter="availability">${filterOptions([["all", "All data"], ["with-price", "With price"], ["price-unavailable", "Price unavailable"], ["failed", "Failed"]], view.availability, null)}</select></label>
      <label>Ø§Ù„ØªØ±ØªÙŠØ¨<select data-market-universe-filter="sort">${filterOptions([["symbol", "Symbol"], ["name", "Name"], ["priceAvailability", "Price availability"], ["marketCap", "Market cap"], ["volume", "Volume"]], view.sort, null)}</select></label>
      <label>Ø§Ù„Ø§ØªØ¬Ø§Ù‡<select data-market-universe-filter="dir">${filterOptions([["asc", "Ascending"], ["desc", "Descending"]], view.dir, null)}</select></label>
    </div>`;
  }
  function fundSubfilters(m) {
    if (m.id !== "etfs") return "";
    const active = state.marketUniverseView.fundType || "all";
    return `<div class="chip-row compact fund-filter-row" role="list" aria-label="Funds filters">${FUND_FILTERS.map(([id, ar, en]) => `<button type="button" class="chip ${active === id ? "is-active" : ""}" data-fund-filter="${h(id)}" title="${h(en)}"><span>${h(ar)}</span></button>`).join("")}</div>`;
  }
  function marketUniverseFilterOptions(payload) {
    const fromPayload = (payload && (payload.filterOptions || (payload.marketUniverse && payload.marketUniverse.filterOptions))) || {};
    const rows = marketUniverseRows(payload);
    return {
      exchanges: arr(fromPayload.exchanges).length ? fromPayload.exchanges : unique(rows.map(x => x.exchange || x.exchangeCode).filter(Boolean)),
      currencies: arr(fromPayload.currencies).length ? fromPayload.currencies : unique(rows.map(currency)),
      sectors: arr(fromPayload.sectors).length ? fromPayload.sectors : unique(rows.map(x => x.sector).filter(Boolean)),
      industries: arr(fromPayload.industries).length ? fromPayload.industries : unique(rows.map(x => x.industry).filter(Boolean)),
      assetTypes: arr(fromPayload.assetTypes).length ? fromPayload.assetTypes : unique(rows.map(x => x.assetType || assetType(x.symbol)).filter(Boolean)),
      fundFilters: arr(fromPayload.fundFilters).length ? fromPayload.fundFilters.map(item => Array.isArray(item) ? item : [item.id || item.value || item, item.ar ? `${item.ar} Â· ${item.en || ""}` : item.label || item.en || item.id || item]) : FUND_FILTERS,
    };
  }
  function filterOptions(items, selected, allLabel) {
    const normalized = arr(items).map(item => Array.isArray(item) ? item : [item, item]).filter(([value]) => String(value || "").trim());
    const leading = allLabel ? [[ "all", allLabel ]] : [];
    return leading.concat(normalized).map(([value, label]) => `<option value="${h(value)}" ${String(selected) === String(value) ? "selected" : ""}>${h(label)}</option>`).join("");
  }
  function coverageNotice(payload, rows, market) {
    const coverage = (payload && payload.coverage) || {};
    const discovery = (payload && payload.symbolDiscovery) || {};
    const failed = num(coverage.failed, discovery.failedCount, arr(payload && payload.failed).length) || 0;
    const unavailable = num(coverage.unavailablePrice, discovery.unavailablePriceCount, discovery.unavailableCount, arr(payload && payload.unavailable).length) || 0;
    const available = num(coverage.availableWithPrice, discovery.availablePriceCount) || rows.filter(x => num(x.price, x.currentPrice) !== null).length;
    const loaded = num(coverage.loaded, discovery.loadedPageSymbols, rows.length) || rows.length;
    const total = num(coverage.totalFilteredSymbols, discovery.totalFilteredSymbols, payload && payload.marketUniverse && payload.marketUniverse.total, rows.length) || rows.length;
    const lastUpdated = latinDateTime((payload && (payload.lastUpdated || payload.generatedAt || payload.updatedAt)) || discovery.lastUpdated || new Date().toISOString());
    if (market && market.id === "etfs") {
      return `<div class="coverage-stack">
        <div class="provider-market-state warn coverage-notice"><strong>${h(FUND_PROVIDER_NOTE_AR)}</strong><p class="ltr">${h(FUND_PROVIDER_NOTE_EN)}</p></div>
        <div class="detail-grid compact-detail-grid">
          ${detailCard("Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚", latinNumber(total), "Total funds")}
          ${detailCard("Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù…ØªØ§Ø­Ø©", latinNumber(available), "Available funds")}
          ${detailCard("Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø¨Ø¯ÙˆÙ† Ø³Ø¹Ø±", latinNumber(unavailable), "Funds without price")}
          ${detailCard("Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«", lastUpdated, "Last updated")}
        </div>
      </div>`;
    }
    const showNotice = failed > 0 || unavailable > 0 || Boolean(payload && payload.reason);
    return `<div class="coverage-stack">
      ${showNotice ? `<div class="provider-market-state warn coverage-notice"><strong>${h(COVERAGE_NOTICE_AR)}</strong><p class="ltr">${h(COVERAGE_NOTICE_EN)}</p></div>` : ""}
      <div class="detail-grid compact-detail-grid">
        ${detailCard("Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ù…ÙƒØªØ´Ù", latinNumber(total), "Total discovered")}
        ${detailCard("ØªÙ… ØªØ­Ù…ÙŠÙ„Ù‡", latinNumber(loaded), "Loaded")}
        ${detailCard("Ø¨Ø³Ø¹Ø± Ù…ØªØ§Ø­", latinNumber(available), "Available with price")}
        ${detailCard("Ø§Ù„Ø³Ø¹Ø± ØºÙŠØ± Ù…ØªØ§Ø­", latinNumber(unavailable), "Unavailable price")}
        ${detailCard("ÙØ´Ù„", latinNumber(failed), "Failed")}
      </div>
    </div>`;
  }
  function marketUniverseTable(rows) {
    const headers = [["symbol", "Ø§Ù„Ø±Ù…Ø²"], ["name", "Ø§Ù„Ø´Ø±ÙƒØ©"], ["priceAvailability", "Ø§Ù„Ø³Ø¹Ø±"], ["marketCap", "Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ø³ÙˆÙ‚ÙŠØ©"], ["volume", "Ø§Ù„Ø­Ø¬Ù…"]];
    return `<div class="table-shell market-universe-table" data-market-universe-table><table>
      <thead><tr>${headers.map(([key, label]) => `<th><button type="button" data-market-universe-sort="${h(key)}">${h(label)}${sortMark(key)}</button></th>`).join("")}<th>Ø§Ù„Ø¨ÙˆØ±ØµØ©</th><th>Ø§Ù„Ø¹Ù…Ù„Ø©</th><th>Ø§Ù„Ù‚Ø·Ø§Ø¹</th><th>Ø§Ù„ØµÙ†Ø§Ø¹Ø©</th><th>Ø§Ù„Ù†ÙˆØ¹</th><th>Ø¥Ø¬Ø±Ø§Ø¡</th></tr></thead>
      <tbody>${rows.map(marketUniverseRow).join("")}</tbody>
    </table><div class="market-universe-card-list">${rows.map(marketUniverseCard).join("")}</div></div>`;
  }
  function sortMark(key) {
    return state.marketUniverseView.sort === key ? `<span aria-hidden="true">${state.marketUniverseView.dir === "asc" ? " â†‘" : " â†“"}</span>` : "";
  }
  function marketUniverseRow(row) {
    const a = norm(row), p = num(a.price, a.currentPrice, a.lastPrice), priceText = p === null ? `${PRICE_UNAVAILABLE_AR} Â· ${PRICE_UNAVAILABLE_EN}` : price(p, currency(a));
    const typeText = assetType(a.symbol, a.assetType) === "fund" ? fundTypeText(a) : (a.assetType || assetType(a.symbol));
    return `<tr data-universe-symbol="${h(a.symbol)}" class="${p === null ? "is-muted" : ""}">
      <td class="wt-asset" data-label="Ø§Ù„Ø±Ù…Ø²"><button data-symbol-details="${h(a.symbol)}">${logo(a)}<span><strong class="ltr">${h(a.displaySymbol || a.symbol)}</strong><small class="ltr">${h(a.providerSymbol || a.providerSymbolUsed || "--")}</small></span></button></td>
      <td data-label="Ø§Ù„Ø´Ø±ÙƒØ©">${h(a.companyName || a.name || "--")}</td>
      <td class="ltr" data-label="Ø§Ù„Ø³Ø¹Ø±">${h(priceText)}</td>
      <td class="ltr" data-label="Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ø³ÙˆÙ‚ÙŠØ©">${h(bigNumber(a.marketCap))}</td>
      <td class="ltr" data-label="Ø§Ù„Ø­Ø¬Ù…">${h(bigNumber(a.volume))}</td>
      <td class="ltr" data-label="Ø§Ù„Ø¨ÙˆØ±ØµØ©">${h(a.exchange || a.exchangeCode || "--")}</td>
      <td class="ltr" data-label="Ø§Ù„Ø¹Ù…Ù„Ø©">${h(currency(a))}</td>
      <td data-label="Ø§Ù„Ù‚Ø·Ø§Ø¹">${h(a.sector || "--")}</td>
      <td data-label="Ø§Ù„ØµÙ†Ø§Ø¹Ø©">${h(a.industry || "--")}</td>
      <td data-label="Ø§Ù„Ù†ÙˆØ¹">${h(typeText)}</td>
      <td class="row-actions" data-label="Ø¥Ø¬Ø±Ø§Ø¡"><button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}">ØªØ­Ù„ÙŠÙ„</button></td>
    </tr>`;
  }
  function marketUniverseCard(row) {
    const a = norm(row), p = num(a.price, a.currentPrice, a.lastPrice), priceText = p === null ? PRICE_UNAVAILABLE_EN : price(p, currency(a));
    if (assetType(a.symbol, a.assetType) === "fund") return fundUniverseCard(a, p, priceText);
    return `<article class="provider-market-card market-universe-card ${p === null ? "is-muted" : ""}" data-universe-symbol="${h(a.symbol)}">
      <div class="provider-market-card-head"><strong class="ltr">${h(a.displaySymbol || a.symbol)}</strong><span class="ltr">${h(currency(a))}</span></div>
      <p>${h(a.companyName || a.name || "--")}</p>
      <dl><div><dt>Price</dt><dd class="ltr">${h(priceText)}</dd></div><div><dt>Exchange</dt><dd class="ltr">${h(a.exchange || "--")}</dd></div><div><dt>Sector</dt><dd>${h(a.sector || "--")}</dd></div><div><dt>Type</dt><dd>${h(a.assetType || assetType(a.symbol))}</dd></div></dl>
      <button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}">Open</button>
    </article>`;
  }
  function fundUniverseCard(a, p, priceText) {
    const fundType = fundTypeText(a);
    const market = [a.exchange || a.exchangeCode || a.market, currency(a)].filter(Boolean).join(" Â· ") || "--";
    const nav = num(a.nav);
    const displayPrice = p !== null ? priceText : nav !== null ? `NAV ${price(nav, currency(a))}` : PRICE_UNAVAILABLE_EN;
    const quality = dataQualityLabel(a.dataAvailability || a.dataQuality || (p === null && nav === null ? "unavailable" : "available"));
    const shariah = shariahStatusLabel(a.shariahStatus || a.shariaStatus);
    return `<article class="provider-market-card market-universe-card fund-universe-card ${p === null && nav === null ? "is-muted" : ""}" data-universe-symbol="${h(a.symbol)}">
      <div class="provider-market-card-head"><strong>${h(a.fundName || a.companyName || a.name || a.symbol)}</strong><span class="ltr">${h(a.displaySymbol || a.symbol)}</span></div>
      <p><span>${h(fundType)}</span></p>
      <dl>
        <div><dt>Symbol</dt><dd class="ltr">${h(a.displaySymbol || a.symbol)}</dd></div>
        <div><dt>Currency</dt><dd class="ltr">${h(currency(a))}</dd></div>
        <div><dt>Exchange / Market</dt><dd class="ltr">${h(market)}</dd></div>
        <div><dt>Issuer</dt><dd>${h(a.issuer || "--")}</dd></div>
        <div><dt>Price / NAV</dt><dd class="ltr">${h(displayPrice)}</dd></div>
        <div><dt>Yield</dt><dd class="ltr">${h(percentMetric(a.distributionYield))}</dd></div>
        <div><dt>Expense ratio</dt><dd class="ltr">${h(percentMetric(a.expenseRatio))}</dd></div>
        <div><dt>Data quality</dt><dd>${h(quality)}</dd></div>
        <div><dt>Shariah status</dt><dd>${h(shariah)}</dd></div>
      </dl>
      <button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}">Open</button>
    </article>`;
  }
  function fundTypeText(a) {
    const key = String(a.fundType || "").toLowerCase();
    const label = FUND_TYPE_LABELS[key];
    if (a.fundTypeLabelAr || a.fundTypeLabelEn) return [a.fundTypeLabelAr, a.fundTypeLabelEn].filter(Boolean).join(" Â· ");
    return label ? `${label[0]} Â· ${label[1]}` : "ØµÙ†Ø¯ÙˆÙ‚ Ø§Ø³ØªØ«Ù…Ø§Ø±ÙŠ Â· Fund";
  }
  function percentMetric(value) {
    const n = num(value);
    if (n === null) return "--";
    return `${n.toLocaleString("en-US", { maximumFractionDigits: 3 })}%`;
  }
  function shariahStatusLabel(value) {
    const v = String(value || "").toLowerCase();
    if (v === "compliant") return "Ù…ØªÙˆØ§ÙÙ‚ Ù…Ø¹ Ø§Ù„Ø´Ø±ÙŠØ¹Ø© Â· Compliant";
    if (v === "non_compliant") return "ØºÙŠØ± Ù…ØªÙˆØ§ÙÙ‚ Â· Non-compliant";
    if (v === "needs_review") return "Ø¨Ø­Ø§Ø¬Ø© Ø¥Ù„Ù‰ Ù…Ø±Ø§Ø¬Ø¹Ø© Â· Needs review";
    if (v === "possible" || v === "partial") return "Ù‚Ø¯ ÙŠÙƒÙˆÙ† Ù…ØªÙˆØ§ÙÙ‚Ø§Ù‹ Â· Possibly compliant";
    return "--";
  }
  function bigNumber(value) {
    const n = num(value);
    if (n === null) return "--";
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function scannerPage() {
    const r = recs(), u = arr(state.rec.unavailable), buy = r.filter(x => signal(x) === "buy"), sell = r.filter(x => signal(x) === "sell"), wait = r.filter(x => !["buy", "sell"].includes(signal(x)));
    const conf = confBuckets(r);
    return `<div class="page-stack">${hero("Ù…Ø§Ø³Ø­ AI Ø¨Ø¯ÙˆÙ† Ù†ØªØ§Ø¦Ø¬ Ù…ØµØ·Ù†Ø¹Ø©", "ÙŠÙØ±Ø² Ø§Ù„Ù…Ø§Ø³Ø­ Ø§Ù„ØªÙˆØµÙŠØ§Øª ÙˆØ§Ù„Ø¥Ø´Ø§Ø±Ø§Øª Ø§Ù„Ù‚Ø§Ø¯Ù…Ø© Ù…Ù† Ø§Ù„Ù€ API ÙÙ‚Ø·. Ø¹Ù†Ø¯ ØºÙŠØ§Ø¨ Ø§Ù„Ù…Ø²ÙˆØ¯ ØªØ¸Ù‡Ø± Ø£Ø³Ø¨Ø§Ø¨ Ø§Ù„ØºÙŠØ§Ø¨ Ø¨ÙˆØ¶ÙˆØ­.", "AI SCANNER")}
      <section class="metric-grid">${stat("ÙØ±Øµ Ø´Ø±Ø§Ø¡", buy.length, "Buy signals")}${stat("ÙØ±Øµ Ø¨ÙŠØ¹", sell.length, "Sell signals")}${stat("Ø§Ù†ØªØ¸Ø§Ø±", wait.length, "Wait")}${stat("ØºÙŠØ± Ù…ØªØ§Ø­", u.length, "Unavailable")}</section>
      <section class="dash-split">
        <article class="panel"><span class="eyebrow">SCANNER RESULTS</span><h2>Ù†ØªØ§Ø¦Ø¬ Ø§Ù„ÙØ­Øµ</h2>
          <div class="seg-tabs" role="tablist"><button class="is-active" data-tab="scan" data-value="all">Ø§Ù„ÙƒÙ„</button><button data-tab="scan" data-value="buy">Ø´Ø±Ø§Ø¡</button><button data-tab="scan" data-value="sell">Ø¨ÙŠØ¹</button><button data-tab="scan" data-value="wait">Ø§Ù†ØªØ¸Ø§Ø±</button></div>
          <div data-tabpanel="scan" data-render="scan">${r.length ? assetList(r) : selectionEmptyState()}</div>
        </article>
        <aside class="dash-rail">
          <article class="panel"><span class="eyebrow">CONFIDENCE</span><h2>ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø«Ù‚Ø©</h2>${confBars(conf)}</article>
          <article class="panel"><span class="eyebrow">RISK RADAR</span><h2>Ø±Ø§Ø¯Ø§Ø± Ø§Ù„Ù…Ø®Ø§Ø·Ø±</h2>${riskRadar(r)}</article>
          <article class="panel"><span class="eyebrow">STRONGEST</span><h2>Ø£Ù‚ÙˆÙ‰ Ø§Ù„Ø¥Ø´Ø§Ø±Ø§Øª</h2>${r.length ? assetList(topPicks(r, 3)) : miniEmpty()}</article>
        </aside>
      </section>${disclaimer()}</div>`;
  }
  window.__tabRenderers = window.__tabRenderers || {};
  window.__tabRenderers.scan = (v) => { const r = recs(); const f = v === "all" ? r : r.filter(x => v === "wait" ? !["buy", "sell"].includes(signal(x)) : signal(x) === v); return f.length ? assetList(f) : selectionEmptyState(); };
  window.__tabRenderers.rec = (v) => { const r = recs(); const f = v === "all" ? r : v === "high" ? r.filter(x => (num(x.confidence, x.score, x.aiConfidence) || 0) >= 70) : r.filter(x => v === "wait" ? !["buy", "sell"].includes(signal(x)) : signal(x) === v); return f.length ? assetList(f) : selectionEmptyState(); };

  function watchPage() {
    const quick = unique(defaults.concat(["EURUSD", "SPY", "2222.SR", "ETHUSD"]));
    return `<div class="page-stack">${hero("Ù‚Ø§Ø¦Ù…Ø© Ù…ØªØ§Ø¨Ø¹Ø© Ø°ÙƒÙŠØ© ÙˆÙ†Ø¸ÙŠÙØ©", "Ø£Ø¶Ù Ø§Ù„Ø±Ù…ÙˆØ² Ø§Ù„ØªÙŠ ØªØ±ÙŠØ¯ Ù…Ø±Ø§Ù‚Ø¨ØªÙ‡Ø§. Ø§Ù„Ø£Ø³Ø¹Ø§Ø± ÙˆØ§Ù„ØªØ­Ù„ÙŠÙ„Ø§Øª ØªØ¸Ù‡Ø± ÙÙ‚Ø· Ø¹Ù†Ø¯ ØªÙˆÙØ±Ù‡Ø§ Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯ØŒ ÙˆØ§Ù„Ø¹Ù…Ù„Ø© ØªØªØ¨Ø¹ ÙƒÙ„ Ø±Ù…Ø².", "WATCHLIST")}
      <section class="panel"><span class="eyebrow">QUICK ADD</span><h2>Ø¥Ø¶Ø§ÙØ© Ø³Ø±ÙŠØ¹Ø©</h2><div class="quick-actions">${quick.map(s => `<button class="ghost-btn" data-quick-add="${h(s)}">${logo({ symbol: s })}<span class="ltr">${h(s)}</span></button>`).join("")}</div></section>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">MY WATCHLIST</span><h2>Ù‚Ø§Ø¦Ù…ØªÙŠ (${state.watch.length})</h2></div></div>
        ${state.watch.length ? watchlistTable(state.watch.map(s => matchRec(s) || { symbol: s, name: s }), { removable: true }) : emptyState("Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© ÙØ§Ø±ØºØ©", "Ø£Ø¶Ù Ø±Ù…ÙˆØ²Ø§Ù‹ Ù…Ù† Ø§Ù„Ø£Ø¹Ù„Ù‰. Ù„Ù† Ù†Ù…Ù„Ø£Ù‡Ø§ Ø¨Ø¨ÙŠØ§Ù†Ø§Øª ÙˆÙ‡Ù…ÙŠØ©.", "Ø§ÙØªØ­ Ø§Ù„Ø£Ø³ÙˆØ§Ù‚", `${ROOT}/markets`)}
      </section></div>`;
  }

  function portfolioPage() {
    const t = trades(), h2 = state.holdings;
    const enriched = h2.map(p => ({ ...p, rec: matchRec(p.symbol) }));
    const totalCost = h2.reduce((s, p) => s + (num(p.qty) || 0) * (num(p.entry) || 0), 0);
    return `<div class="page-stack">${hero("Ø§Ù„Ù…Ø­ÙØ¸Ø© ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø©", "ØªØ§Ø¨Ø¹ Ù…Ø±Ø§ÙƒØ²Ùƒ Ø§Ù„Ù…Ø­Ù„ÙŠØ© ÙˆØµÙÙ‚Ø§Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©. Ù‚ÙŠÙ…Ø© Ø§Ù„Ø³ÙˆÙ‚ Ø§Ù„Ø­ÙŠØ© ØªØ¸Ù‡Ø± Ø¹Ù†Ø¯ ØªÙˆÙØ± Ø£Ø³Ø¹Ø§Ø± Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯.", "PORTFOLIO")}
      <section class="metric-grid">${stat("Ù…Ø±Ø§ÙƒØ²", h2.length, "Holdings")}${stat("Ø§Ù„ØªÙƒÙ„ÙØ©", totalCost ? totalCost.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "--", "Cost basis")}${stat("ØµÙÙ‚Ø§Øª Ù…ØªØ§Ø¨Ø¹Ø©", t.length, "Followed")}${stat("Ù…Ù„Ù Ø§Ù„Ù…Ø®Ø§Ø·Ø±", riskLabel(state.settings.risk), "Risk profile")}</section>
      <section class="dash-split">
        <article class="panel"><div class="panel-head"><div><span class="eyebrow">HOLDINGS</span><h2>Ø§Ù„Ù…Ø±Ø§ÙƒØ² Ø§Ù„Ø­Ø§Ù„ÙŠØ©</h2></div></div>
          ${h2.length ? holdingsTable(enriched) : emptyState("Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø±Ø§ÙƒØ²", "Ø£Ø¶Ù Ù…Ø±ÙƒØ²Ø§Ù‹ Ù…Ù† ØµÙØ­Ø© ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø±Ù…Ø² Ø£Ùˆ ØªØ§Ø¨Ø¹ ØªÙˆØµÙŠØ© Ø­Ù‚ÙŠÙ‚ÙŠØ©.", "ØªÙØ§ØµÙŠÙ„ Ø±Ù…Ø²", `${ROOT}/symbol-details`)}
          ${holdingForm()}
        </article>
        <aside class="dash-rail">
          <article class="panel"><span class="eyebrow">ALLOCATION</span><h2>ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø£ØµÙˆÙ„</h2>${allocation(enriched)}</article>
          <article class="panel"><span class="eyebrow">FOLLOWED</span><h2>ØµÙÙ‚Ø§Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©</h2>${t.length ? tradeList(t.slice(0, 4)) : miniEmpty()}</article>
        </aside>
      </section>${disclaimer()}</div>`;
  }

  function alertsPage() {
    const smart = smartAlerts(), local = state.alerts;
    return `<div class="page-stack">${hero("Ù…Ø±ÙƒØ² Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª", "Ø£Ù†Ø´Ø¦ ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø³Ø¹Ø±ÙŠØ© ÙˆÙ†Ø³Ø¨ÙŠØ© ÙˆØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø¥Ø´Ø§Ø±Ø©. Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ø°ÙƒÙŠØ© Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯ØŒ ÙˆØ§Ù„Ù…Ø­Ù„ÙŠØ© ØªÙØ­ÙØ¸ Ø¹Ù„Ù‰ Ø¬Ù‡Ø§Ø²Ùƒ.", "ALERTS")}
      <section class="panel"><span class="eyebrow">CREATE ALERT</span><h2>Ø¥Ù†Ø´Ø§Ø¡ ØªÙ†Ø¨ÙŠÙ‡</h2>
        <form id="alert-form" class="inline-form"><input name="symbol" dir="ltr" placeholder="Ø§Ù„Ø±Ù…Ø² Ù…Ø«Ù„ AAPL" /><select name="type"><option value="price">Ø³Ø¹Ø± ÙŠØµÙ„ Ø¥Ù„Ù‰</option><option value="percent">ØªØºÙŠØ± Ù†Ø³Ø¨Ø© %</option><option value="signal">Ø¥Ø´Ø§Ø±Ø© AI</option><option value="news">Ø®Ø¨Ø± Ù…Ø¤Ø«Ø±</option></select><input name="value" inputmode="decimal" placeholder="Ø§Ù„Ù‚ÙŠÙ…Ø©" /><button class="action-btn" type="submit">Ø¥Ø¶Ø§ÙØ©</button></form>
      </section>
      <section class="alert-grid">
        <article class="panel"><span class="eyebrow">SMART ALERTS</span><h2>ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ù…Ø²ÙˆØ¯</h2>${smart.length ? alertList(smart) : emptyState("Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø°ÙƒÙŠØ©", "Ù„Ù… ÙŠØ±Ø¬Ø¹ Ø§Ù„Ù…Ø²ÙˆØ¯ ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø­Ø§Ù„ÙŠØ©.", "Ø§Ù„ØªÙˆØµÙŠØ§Øª", `${ROOT}/recommendations`)}</article>
        <article class="panel"><span class="eyebrow">LOCAL ALERTS (${local.length})</span><h2>ØªÙ†Ø¨ÙŠÙ‡Ø§ØªÙŠ Ø§Ù„Ù…Ø­ÙÙˆØ¸Ø©</h2>${local.length ? local.map(localAlertRow).join("") : emptyState("Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ù…Ø­Ù„ÙŠØ©", "Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ Ø¨Ø§Ù„Ø£Ø¹Ù„Ù‰ Ù„Ø¥Ù†Ø´Ø§Ø¡ ØªÙ†Ø¨ÙŠÙ‡ Ù…ØªØ§Ø¨Ø¹Ø©.", "", "")}</article>
      </section></div>`;
  }

  function recPage() {
    const r = recs(), buy = r.filter(x => signal(x) === "buy"), sell = r.filter(x => signal(x) === "sell"), wait = r.filter(x => !["buy", "sell"].includes(signal(x)));
    return `<div class="page-stack">${hero("Ø§Ù„ØªÙˆØµÙŠØ§Øª ÙˆØ§Ù„ØªØ­Ù„ÙŠÙ„", "ØªÙˆØµÙŠØ§Øª Ø§Ù„Ø°ÙƒØ§Ø¡ Ù…Ø¹ Ø­Ø§Ù„Ø© ÙƒÙ„ ØµÙÙ‚Ø©: Ù…ÙØªÙˆØ­Ø©ØŒ ØªØ­Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©ØŒ Ù…ÙƒØªÙ…Ù„Ø©ØŒ ÙØ§Ø´Ù„Ø© Ø£Ùˆ Ù…Ù†ØªÙ‡ÙŠØ©. ÙƒÙ„ Ø¨Ø·Ø§Ù‚Ø© Ù„Ù‡Ø§ Ø²Ø± ØªØ­Ù„ÙŠÙ„.", "RECOMMENDATIONS")}
      <section class="metric-grid">${stat("Ø§Ù„ÙƒÙ„", r.length, "All")}${stat("Ø´Ø±Ø§Ø¡", buy.length, "Buy")}${stat("Ø¨ÙŠØ¹", sell.length, "Sell")}${stat("Ø§Ù†ØªØ¸Ø§Ø±", wait.length, "Wait")}</section>
      <section class="panel"><span class="eyebrow">SIGNALS</span><h2>Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ØªÙˆØµÙŠØ§Øª</h2><div class="rec-market-chips">${MARKETS.map(m => `<button class="chip ${state.settings.defaultMarket === m.id ? "is-active" : ""}" data-rec-market="${m.id}">${h(m.ar)}</button>`).join("")}</div>
        <div class="seg-tabs"><button class="is-active" data-tab="rec" data-value="all">Ø§Ù„ÙƒÙ„</button><button data-tab="rec" data-value="buy">Ø´Ø±Ø§Ø¡</button><button data-tab="rec" data-value="sell">Ø¨ÙŠØ¹</button><button data-tab="rec" data-value="wait">Ø§Ù†ØªØ¸Ø§Ø±</button><button data-tab="rec" data-value="high">Ø«Ù‚Ø© Ø¹Ø§Ù„ÙŠØ©</button></div>
        <div data-tabpanel="rec" data-render="rec">${r.length ? recCards(r) : selectionEmptyState()}</div>
      </section>${disclaimer()}</div>`;
  }

  function precisionLivePanel() {
    const pl = state.followed && state.followed.precisionLive;
    if (!pl || !num(pl.total)) return "";
    const resolved = (pl.won || 0) + (pl.lost || 0);
    const liveRate = pl.successRate === null || pl.successRate === undefined ? "--" : `${pl.successRate}%`;
    return `<section class="panel precision-live-panel">
      <div class="panel-head"><div><span class="eyebrow">PRECISION Â· FORWARD TEST</span><h2>Ø§Ù„Ø¯Ù‚Ø© Ø§Ù„Ø­ÙŠØ© â€” Ø¥Ø´Ø§Ø±Ø§Øª Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„Ù€90%</h2></div><span class="precision-badge ${resolved && pl.successRate >= 90 ? "pass" : "info"}">${h(resolved ? `Ù†Ø¬Ø§Ø­ Ø­ÙŠ ${liveRate}` : "Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø£ÙˆÙ„ Ù†ØªÙŠØ¬Ø©")}</span></div>
      <div class="metric-grid">${stat("Ø¥Ø´Ø§Ø±Ø§Øª Ù…ØªØªØ¨Ø¹Ø©", pl.total, "Tracked")}${stat("Ø£ØµØ§Ø¨Øª Ø§Ù„Ù‡Ø¯Ù", pl.won || 0, "Won")}${stat("Ù„Ù…Ø³Øª Ø§Ù„ÙˆÙ‚Ù", pl.lost || 0, "Lost")}${stat("Ù…ÙØªÙˆØ­Ø©", pl.open || 0, "Open")}${stat("Ø§Ù„Ù†Ø¬Ø§Ø­ Ø§Ù„Ø­ÙŠ", liveRate, "Live rate")}</div>
      <p class="muted-note">ÙƒÙ„ Ø¥Ø´Ø§Ø±Ø© Ø§Ø¬ØªØ§Ø²Øª Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„Ø¯Ù‚Ø© ØªÙØ³Ø¬ÙŽÙ‘Ù„ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¨Ù‡Ø¯ÙÙ‡Ø§ ÙˆÙˆÙ‚ÙÙ‡Ø§ Ø§Ù„Ù…Ù†Ø´ÙˆØ±ÙŽÙŠÙ†ØŒ ÙˆØªÙØ­Ø³Ù… ÙÙˆØ²/Ø®Ø³Ø§Ø±Ø© Ø­Ø³Ø¨ Ø£ÙˆÙ„ Ù…Ù„Ø§Ù…Ø³Ø© ÙØ¹Ù„ÙŠØ© â€” Ù‡Ø°Ø§ Ù‡Ùˆ Ø§Ù„Ø¥Ø«Ø¨Ø§Øª Ø§Ù„Ø­ÙŠ Ù„Ù†Ø³Ø¨Ø© Ø§Ù„Ù†Ø¬Ø§Ø­ØŒ ÙˆÙ„ÙŠØ³ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„ØªØ§Ø±ÙŠØ®ÙŠ ÙˆØ­Ø¯Ù‡.</p>
    </section>`;
  }
  function performancePage() {
    const all = trades(), g = groupTrades(all), summary = tradeSummary(all);
    return `<div class="page-stack trade-performance-page">${hero("Ø£Ø¯Ø§Ø¡ Ø§Ù„ØµÙÙ‚Ø§Øª", "Ù†ØªØ§Ø¦Ø¬ Ø¥Ø´Ø§Ø±Ø§Øª Ø§Ù„Ø´Ø±Ø§Ø¡ ÙˆØ§Ù„Ø¨ÙŠØ¹ Ø§Ù„Ù…Ø­ÙÙˆØ¸Ø©ØŒ ØµÙÙ‚Ø§Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„ÙŠØ¯ÙˆÙŠØ©ØŒ ÙˆØ³Ø¬Ù„Ø§Øª Ø§Ù„ØªÙˆØµÙŠØ§Øª. Ù„Ø§ ØªÙØ¹Ø±Ø¶ Ù†ØªØ§Ø¦Ø¬ ÙˆÙ‡Ù…ÙŠØ© Ø¹Ù†Ø¯ ØºÙŠØ§Ø¨ Ø§Ù„Ø³Ø¬Ù„Ø§Øª.", "TRADE PERFORMANCE")}
      ${tradeProviderStatus(all)}
      ${precisionLivePanel()}
      <section class="metric-grid trade-summary-grid">${stat("Ø§Ù„ØµÙÙ‚Ø§Øª Ø§Ù„Ø±Ø§Ø¨Ø­Ø©", g.win.length, "Winning")}${stat("Ø§Ù„ØµÙÙ‚Ø§Øª Ø§Ù„Ø®Ø§Ø³Ø±Ø©", g.loss.length, "Losing")}${stat("Ø§Ù„ØµÙÙ‚Ø§Øª Ø§Ù„Ù…ÙØªÙˆØ­Ø©", g.open.length, "Open")}${stat("ØªØ­Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©", g.follow.length, "Watching")}${stat("Ù†Ø³Ø¨Ø© Ø§Ù„Ù†Ø¬Ø§Ø­", summary.successRate === null ? "--" : summary.successRate + "%", "Win rate")}</section>
      ${all.length ? `<section class="trade-board">${tradeCol("Ø§Ù„ØµÙÙ‚Ø§Øª Ø§Ù„Ø±Ø§Ø¨Ø­Ø©", g.win, "win")}${tradeCol("Ø§Ù„ØµÙÙ‚Ø§Øª Ø§Ù„Ø®Ø§Ø³Ø±Ø©", g.loss, "loss")}${tradeCol("Ø§Ù„ØµÙÙ‚Ø§Øª Ø§Ù„Ù…ÙØªÙˆØ­Ø©", g.open, "open")}${tradeCol("ØµÙÙ‚Ø§Øª Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±", g.wait, "wait")}${tradeCol("Ø§Ù„ØµÙÙ‚Ø§Øª ØªØ­Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©", g.follow, "follow")}</section>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">JOURNAL</span><h2>Ø³Ø¬Ù„ ØªÙØµÙŠÙ„ÙŠ</h2></div><button class="ghost-btn" data-refresh-trades>ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø£Ø³Ø¹Ø§Ø±</button></div>${tradeJournalTable(all)}</section>` : performanceEmptyState()}
      ${followedTradeForm()}
      ${disclaimer()}</div>`;
  }

  function newsPage() {
    const n = newsItems();
    return `<div class="page-stack">${hero("Ø£Ø®Ø¨Ø§Ø± Ø§Ù„Ø³ÙˆÙ‚", "ØªÙÙ‚Ø±Ø£ Ø§Ù„Ø£Ø®Ø¨Ø§Ø± Ù…Ù† Ù…Ø²ÙˆØ¯ Ø­Ù‚ÙŠÙ‚ÙŠ. Ø¹Ù†Ø¯ ØºÙŠØ§Ø¨Ù‡ Ù†Ø¹Ø±Ø¶ Ø±Ø³Ø§Ù„Ø© ÙˆØ§Ø¶Ø­Ø© Ø¨Ø¯Ù„ Ø¹Ù†Ø§ÙˆÙŠÙ† Ù…ØµØ·Ù†Ø¹Ø©.", "NEWS")}
      <section class="news-grid">${n.length ? n.map(newsCard).join("") : unavailableSection(state.news, "Ù…Ø²ÙˆØ¯ Ø§Ù„Ø£Ø®Ø¨Ø§Ø± Ù„Ù… ÙŠØ±Ø¬Ø¹ Ø¹Ù†Ø§ØµØ± Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„Ø¹Ø±Ø¶.", "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª", `${ROOT}/settings`)}</section></div>`;
  }

  function calendarPage() {
    const c = state.calendar || {};
    return `<div class="page-stack trader-calendar-page">${hero("ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ø³ÙˆÙ‚", "ØªÙ‚ÙˆÙŠÙ… Ø­ÙŠ Ù„Ø£Ø±Ø¨Ø§Ø­ Ø§Ù„Ø´Ø±ÙƒØ§Øª ÙˆØ§Ù„ØªÙˆØ²ÙŠØ¹Ø§Øª ÙˆØ§Ù„Ø§ÙƒØªØªØ§Ø¨Ø§Øª ÙˆØ§Ù„Ø£Ø­Ø¯Ø§Ø« Ø§Ù„Ø§Ù‚ØªØµØ§Ø¯ÙŠØ© Ù…Ù† Ù…Ø²ÙˆØ¯ÙŠÙ† Ø­Ù‚ÙŠÙ‚ÙŠÙŠÙ†. Ø¹Ù†Ø¯ ØªØ¹Ø°Ø± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù†Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¨Ø¨ Ø¨ÙˆØ¶ÙˆØ­ Ø¨Ø¯ÙˆÙ† Ø¨ÙŠØ§Ù†Ø§Øª ÙˆÙ‡Ù…ÙŠØ©.", "CALENDAR")}
      <section class="panel trader-calendar-toolbar">
        <div><span class="eyebrow">DATE RANGE</span><h2>ÙØªØ±Ø© Ø§Ù„Ø¹Ø±Ø¶</h2></div>
        <div class="calendar-ranges">${calendarRangeButtons()}</div>
      </section>
      ${calendarProviderOverview()}
      <section class="calendar-grid">
        ${calendarPanel("earnings", "EARNINGS", "Ø£Ø±Ø¨Ø§Ø­ Ø§Ù„Ø´Ø±ÙƒØ§Øª", c.earnings, earningsRows)}
        ${calendarPanel("dividends", "DIVIDENDS", "Ø§Ù„ØªÙˆØ²ÙŠØ¹Ø§Øª", c.dividends, dividendRows)}
        ${calendarPanel("ipos", "IPO", "Ø§Ù„Ø§ÙƒØªØªØ§Ø¨Ø§Øª", c.ipos, ipoRows)}
        ${calendarPanel("economic", "ECONOMIC", "Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ø§Ù‚ØªØµØ§Ø¯ÙŠ", c.economic, economicRows)}
      </section></div>`;
  }

  function calendarRangeButtons() {
    const ranges = [["today", "Ø§Ù„ÙŠÙˆÙ…"], ["7", "7 Ø£ÙŠØ§Ù…"], ["30", "30 ÙŠÙˆÙ…"], ["90", "90 ÙŠÙˆÙ…"], ["all", "Ø§Ù„ÙƒÙ„"]];
    return ranges.map(([value, label]) => `<button class="${state.calendarRange === value ? "is-active" : ""}" data-calendar-range="${h(value)}">${h(label)}</button>`).join("");
  }

  function calendarProviderOverview() {
    const ps = state.providerStatus || {}, features = ps.features || {};
    const rows = [
      ["Ø£Ø±Ø¨Ø§Ø­ Ø§Ù„Ø´Ø±ÙƒØ§Øª", features.earnings],
      ["Ø§Ù„ØªÙˆØ²ÙŠØ¹Ø§Øª", features.dividends],
      ["Ø§Ù„Ø§ÙƒØªØªØ§Ø¨Ø§Øª", features.ipos],
      ["Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ø§Ù‚ØªØµØ§Ø¯ÙŠ", features.economic]
    ];
    return `<section class="provider-state-panel trader-provider-panel">
      <div class="panel-head"><div><span class="eyebrow">PROVIDER STATUS</span><h2>Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</h2></div><button class="ghost-btn" data-retry>Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©</button></div>
      <div class="provider-state-grid">${rows.map(([label, feature]) => providerFeatureCard(label, feature)).join("")}</div>
    </section>`;
  }

  function providerFeatureCard(label, feature) {
    feature = feature || {};
    const tone = featureStatusTone(feature.status);
    return `<article class="provider-state-card">
      <span>${h(label)}</span>
      <strong>${h(providerName(feature.provider))}</strong>
      <p>${h(featureStatusLabel(feature.status))}</p>
      <em class="state-badge ${tone}">${h(resultCountText(feature.resultCount))}</em>
    </article>`;
  }

  function calendarPanel(kind, eyebrow, title, response, rowRenderer) {
    response = response || {};
    const rows = arr(response.data);
    const isOpen = state.calendarOpen && state.calendarOpen[kind] === true;
    const count = response.resultCount ?? rows.length;
    return `<article class="panel trader-calendar-panel calendar-${h(kind)} ${isOpen ? "is-open" : "is-collapsed"}">
      <div class="panel-head calendar-panel-head">
        <div><span class="eyebrow">${h(eyebrow)}</span><h2>${h(title)}</h2></div>
        <div class="calendar-head-actions">
          ${providerBadge(response)}
          <span class="state-badge muted">${h(latinNumber(count))} rows</span>
          <button class="ghost-btn compact-btn" data-calendar-section-toggle="${h(kind)}" aria-expanded="${isOpen ? "true" : "false"}">${isOpen ? "Collapse" : "Open"}</button>
          <button class="ghost-btn compact-btn" data-retry>Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©</button>
        </div>
      </div>
      ${isOpen ? `<div class="calendar-section-body">
      <div class="calendar-meta">
        <span>Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«: <b>${h(latinDateTime(response.lastUpdated || response.lastSuccessfulUpdate))}</b></span>
        <span>Ø§Ù„ÙØªØ±Ø©: <b class="ltr">${h(rangeText(response.range))}</b></span>
        <span>Ø§Ù„Ù†ØªØ§Ø¦Ø¬: <b class="ltr">${h(latinNumber(count))}</b></span>
      </div>
      ${state.calendarLoading ? calendarLoadingState() : rows.length ? rowRenderer(rows) : calendarEmptyState(response)}
      </div>` : ""}
    </article>`;
  }

  function providerBadge(response) {
    const status = response && response.status;
    const tone = featureStatusTone(status);
    return `<span class="state-badge ${tone}">${h(providerName(response && response.provider))} Â· ${h(featureStatusLabel(status))}</span>`;
  }

  function calendarLoadingState() {
    return `<div class="empty-state compact"><span class="empty-glyph">â—Œ</span><h3>Ø¬Ø§Ø±ÙŠ ØªØ­Ø¯ÙŠØ« Ø§Ù„ØªÙ‚ÙˆÙŠÙ…</h3><p>Ù†Ø±Ø§Ø¬Ø¹ Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ù…ØªØµÙ„ ÙˆÙ†Ø­Ø¯Ù‘Ø« Ø§Ù„Ù†ØªØ§Ø¦Ø¬ Ù„Ù„ÙØªØ±Ø© Ø§Ù„Ù…Ø®ØªØ§Ø±Ø©.</p></div>`;
  }

  function calendarEmptyState(response) {
    const status = String((response && response.status) || "not_configured");
    let title = UNAVAILABLE_MESSAGE;
    let body = formatProviderError(response && response.message, { empty: "Ø§Ø±Ø¨Ø· Ù…Ø²ÙˆØ¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ø¹Ø±Ø¶ Ø§Ù„Ø£Ø­Ø¯Ø§Ø« ÙˆØ§Ù„ØªÙˆØ²ÙŠØ¹Ø§Øª ÙˆØ§Ù„Ø§ÙƒØªØªØ§Ø¨Ø§Øª." });
    let settings = true;
    if (response && response.routeUnavailable) {
      title = ROUTE_UNAVAILABLE_MESSAGE;
      body = "ØªØ¹Ø°Ø± Ø§Ù„ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ Ù…Ø³Ø§Ø± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø·Ù„ÙˆØ¨.";
      settings = false;
    } else if (response && response.timeout) {
      title = UNAVAILABLE_MESSAGE;
      body = "Ø§Ù†ØªÙ‡Øª Ù…Ù‡Ù„Ø© Ø§Ù„Ø·Ù„Ø¨. ÙŠÙ…ÙƒÙ†Ùƒ Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ø¨Ø¯ÙˆÙ† Ø¥Ø¹Ø§Ø¯Ø© ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØµÙØ­Ø©.";
      settings = false;
    } else if (status === "success") {
      title = "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ø­Ø¯Ø§Ø« Ø¶Ù…Ù† Ø§Ù„ÙØªØ±Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©";
      body = "Ø¬Ø±Ù‘Ø¨ ØªØºÙŠÙŠØ± Ø§Ù„ÙØªØ±Ø© Ø£Ùˆ Ø§Ù„Ø³ÙˆÙ‚ Ø£Ùˆ Ù†ÙˆØ¹ Ø§Ù„Ø­Ø¯Ø«.";
      settings = false;
    } else if (status === "not_configured" || status === "missing_provider") {
      title = "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø²ÙˆØ¯ Ù…ØªØµÙ„";
      body = "Ø§Ø±Ø¨Ø· Ù…Ø²ÙˆØ¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ø¹Ø±Ø¶ Ø§Ù„Ø£Ø­Ø¯Ø§Ø« ÙˆØ§Ù„ØªÙˆØ²ÙŠØ¹Ø§Øª ÙˆØ§Ù„Ø§ÙƒØªØªØ§Ø¨Ø§Øª.";
    } else if (["not_entitled", "forbidden", "unauthorized"].includes(status)) {
      title = "Ø§Ù„Ù…ÙŠØ²Ø© ØºÙŠØ± Ù…ØªØ§Ø­Ø© Ø¶Ù…Ù† ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ø­Ø§Ù„ÙŠ";
      body = "ØªØ­ØªØ§Ø¬ Ù‡Ø°Ù‡ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ù„Ù‰ Ø®Ø·Ø© ØªØ¯Ø¹Ù… Ù‡Ø°Ø§ Ø§Ù„Ù†ÙˆØ¹ Ù…Ù† Ø§Ù„ØªÙ‚ÙˆÙŠÙ….";
    } else if (status === "rate_limited") {
      title = "ØªÙ… Ø§Ù„ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ Ø­Ø¯ Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø¤Ù‚ØªØ§Ù‹";
      body = response && (response.cached || response.stale) ? "Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø®Ø²Ù†Ø© Ù…Ø¤Ù‚ØªØ§Ù‹ Ù…Ø¹Ø±ÙˆØ¶Ø© Ø¥Ù„Ù‰ Ø£Ù† ÙŠØ³Ù…Ø­ Ø§Ù„Ù…Ø²ÙˆØ¯ Ø¨ØªØ­Ø¯ÙŠØ« Ø¬Ø¯ÙŠØ¯." : "Ø¬Ø±Ù‘Ø¨ Ù„Ø§Ø­Ù‚Ø§Ù‹ Ø£Ùˆ Ø§Ø³ØªØ®Ø¯Ù… Ø²Ø± Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ø¨Ø¹Ø¯ Ø¯Ù‚ÙŠÙ‚Ø©.";
      settings = false;
    } else if (status === "provider_error" || status === "invalid_request") {
      title = UNAVAILABLE_MESSAGE;
      body = "ØªØ¹Ø°Ø± Ø¬Ù„Ø¨ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ø­Ø§Ù„ÙŠ. Ù„Ù… ÙŠØªÙ… Ø¹Ø±Ø¶ Ø£ÙŠ Ø¨ÙŠØ§Ù†Ø§Øª Ø¨Ø¯ÙŠÙ„Ø©.";
      settings = false;
    }
    return `<div class="empty-state compact calendar-empty"><span class="empty-glyph">â—Œ</span><h3>${h(title)}</h3><p>${h(body)}</p><div class="row-actions">${settings ? `<a class="ghost-btn" href="${ROOT}/settings" data-route-link>Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª</a>` : ""}<button class="ghost-btn" data-retry>Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©</button></div></div>`;
  }

  const EARNINGS_COLUMNS = [
    { key: "symbol", label: "Symbol", sort: "symbol", pinned: true, value: r => r.symbol || "--", raw: r => r.symbol, cls: "ltr" },
    { key: "companyName", label: "Company", sort: "companyName", pinned: true, value: r => r.companyName || "--", raw: r => r.companyName },
    { key: "reportDate", label: "Report date", sort: "reportDate", pinned: true, value: r => latinDateOnly(r.reportDate), raw: r => r.reportDate, cls: "ltr" },
    { key: "status", label: "Status", sort: "status", pinned: true, value: r => earningsStatusLabel(r), raw: r => earningsStatusLabel(r) },
    { key: "fiscalDateEnding", label: "Fiscal period", sort: "fiscalDateEnding", value: r => r.fiscalDateEnding || "--", raw: r => r.fiscalDateEnding, cls: "ltr" },
    { key: "epsEstimate", label: "EPS est.", sort: "epsEstimate", value: r => latinNumber(r.epsEstimate), raw: r => r.epsEstimate, cls: "ltr" },
    { key: "epsActual", label: "EPS actual", sort: "epsActual", value: r => latinNumber(r.epsActual), raw: r => r.epsActual, cls: "ltr" },
    { key: "revenueEstimate", label: "Revenue est.", sort: "revenueEstimate", value: r => latinNumber(r.revenueEstimate), raw: r => r.revenueEstimate, cls: "ltr" },
    { key: "revenueActual", label: "Revenue actual", sort: "revenueActual", value: r => latinNumber(r.revenueActual), raw: r => r.revenueActual, cls: "ltr" },
    { key: "time", label: "Time", sort: "time", value: r => earningsTimeLabel(r.time), raw: r => r.time, cls: "ltr" },
    { key: "completeness", label: "Completeness", sort: "completeness", pinned: true, value: r => `${earningsCompletenessScore(r)}%`, raw: r => earningsCompletenessScore(r), cls: "ltr" }
  ];

  function earningsRows(rows) {
    const deduped = dedupeEarningsRows(rows).map(r => ({ ...r, completenessScore: earningsCompletenessScore(r) }));
    const completeRows = deduped.filter(r => !isPartialEarningsRow(r));
    const partialRows = deduped.filter(isPartialEarningsRow);
    const view = state.earningsView || {};
    const activeTab = view.tab === "partial" ? "partial" : "complete";
    const tabRows = activeTab === "partial" ? partialRows : completeRows;
    const searchedRows = filterEarningsRows(tabRows);
    const sortedRows = sortEarningsRows(searchedRows);
    const pageSize = Math.max(10, Number(view.pageSize) || 10);
    const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
    const page = Math.max(1, Math.min(Number(view.page) || 1, pageCount));
    state.earningsView.page = page;
    const pageRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
    const columns = visibleEarningsColumns(tabRows.length ? tabRows : deduped);
    const sources = earningsSources(deduped);
    const nextPageSize = pageSize > 10 ? 10 : 25;
    return `<div class="earnings-calendar-view">
      <div class="calendar-source-strip">${sources.length ? sources.map(source => `<span>${h(source)}</span>`).join("") : `<span>No source</span>`}</div>
      <div class="earnings-controls">
        <form class="earnings-search" data-earnings-search-form>
          <input name="earningsSearch" value="${h(view.search || "")}" placeholder="Search symbol or company" />
          <button class="ghost-btn compact-btn" type="submit">Search</button>
        </form>
        <label>Source<select data-earnings-filter="source">${earningsFilterOptions(["all", ...sources], view.source || "all")}</select></label>
        <label>Timing<select data-earnings-filter="timing">${earningsFilterOptions(["all", "expected", "reported"], view.timing || "all")}</select></label>
      </div>
      <div class="seg-tabs calendar-data-tabs" role="tablist">
        <button class="${activeTab === "complete" ? "is-active" : ""}" data-earnings-tab="complete">Complete data <span>${latinNumber(completeRows.length)}</span></button>
        <button class="${activeTab === "partial" ? "is-active" : ""}" data-earnings-tab="partial">Partial data <span>${latinNumber(partialRows.length)}</span></button>
      </div>
      <div class="earnings-table-summary">
        <span>Showing <b class="ltr">${h(latinNumber(pageRows.length))}</b> of <b class="ltr">${h(latinNumber(sortedRows.length))}</b></span>
        <span>Deduped <b class="ltr">${h(latinNumber(Math.max(0, rows.length - deduped.length)))}</b> duplicate rows</span>
      </div>
      ${pageRows.length ? `${earningsTable(pageRows, columns)}${earningsCards(pageRows, columns)}` : earningsNoRows(activeTab)}
      <div class="calendar-pagination">
        <button class="ghost-btn compact-btn" data-earnings-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>Previous</button>
        <span class="ltr">Page ${latinNumber(page)} / ${latinNumber(pageCount)}</span>
        <button class="ghost-btn compact-btn" data-earnings-page="${page + 1}" ${page >= pageCount ? "disabled" : ""}>Next</button>
        ${sortedRows.length > 10 ? `<button class="ghost-btn compact-btn" data-earnings-page-size="${nextPageSize}">${pageSize > 10 ? "Show less" : "Show more"}</button>` : ""}
      </div>
    </div>`;
  }

  function dedupeEarningsRows(rows) {
    const seen = new Set();
    return arr(rows).filter(row => {
      const key = [sym(row.symbol), row.reportDate || "", row.fiscalDateEnding || "", String(row.source || row.provider || "").trim().toLowerCase()].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function earningsCompletenessScore(row) {
    const fields = ["symbol", "companyName", "reportDate", "fiscalDateEnding", "epsEstimate", "revenueEstimate", "time"];
    if (!isFutureEarnings(row)) fields.push("epsActual", "revenueActual");
    const complete = fields.filter(key => hasCalendarValue(row[key])).length;
    return Math.round((complete / fields.length) * 100);
  }

  function isPartialEarningsRow(row) {
    return earningsCompletenessScore(row) < 50;
  }

  function isFutureEarnings(row) {
    if (!row || !row.reportDate) return false;
    const report = new Date(`${String(row.reportDate).slice(0, 10)}T00:00:00Z`);
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return Number.isFinite(report.getTime()) && report > today;
  }

  function earningsStatusLabel(row) {
    return isFutureEarnings(row) ? "Expected" : "Reported";
  }

  function earningsTimeLabel(value) {
    const raw = String(value || "").trim();
    if (!raw) return "--";
    const key = raw.toLowerCase();
    if (key === "bmo") return "Before open";
    if (key === "amc") return "After close";
    if (key === "dmh") return "During market";
    return raw;
  }

  function hasCalendarValue(value) {
    return value !== null && value !== undefined && String(value).trim() !== "" && String(value).trim() !== "--";
  }

  function visibleEarningsColumns(rows) {
    return EARNINGS_COLUMNS.filter(column => column.pinned || rows.some(row => hasCalendarValue(column.raw(row))));
  }

  function earningsSources(rows) {
    return Array.from(new Set(rows.map(row => providerName(row.provider || row.source)).filter(Boolean))).sort();
  }

  function earningsFilterOptions(values, selected) {
    return values.map(value => `<option value="${h(value)}" ${String(selected) === String(value) ? "selected" : ""}>${h(earningsFilterLabel(value))}</option>`).join("");
  }

  function earningsFilterLabel(value) {
    if (value === "all") return "All";
    if (value === "expected") return "Expected";
    if (value === "reported") return "Reported";
    return value;
  }

  function filterEarningsRows(rows) {
    const view = state.earningsView || {};
    const query = String(view.search || "").trim().toLowerCase();
    const source = String(view.source || "all");
    const timing = String(view.timing || "all");
    return rows.filter(row => {
      const sourceLabel = providerName(row.provider || row.source);
      const haystack = [row.symbol, row.companyName, row.fiscalDateEnding, row.reportDate, sourceLabel].map(value => String(value || "").toLowerCase()).join(" ");
      if (query && !haystack.includes(query)) return false;
      if (source !== "all" && sourceLabel !== source) return false;
      if (timing === "expected" && !isFutureEarnings(row)) return false;
      if (timing === "reported" && isFutureEarnings(row)) return false;
      return true;
    });
  }

  function sortEarningsRows(rows) {
    const view = state.earningsView || {};
    const key = view.sortKey || "reportDate";
    const dir = view.sortDir === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => compareEarningsValue(earningsSortValue(a, key), earningsSortValue(b, key)) * dir);
  }

  function earningsSortValue(row, key) {
    if (key === "status") return earningsStatusLabel(row);
    if (key === "completeness") return earningsCompletenessScore(row);
    return row[key];
  }

  function compareEarningsValue(a, b) {
    const an = Number(a), bn = Number(b);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    return String(a || "").localeCompare(String(b || ""), "en", { numeric: true, sensitivity: "base" });
  }

  function earningsTable(rows, columns) {
    return `<div class="table-shell calendar-table earnings-table-wrap"><table><thead><tr>${columns.map(column => `<th><button class="calendar-sort" data-earnings-sort="${h(column.sort)}">${h(column.label)}${sortMarker(column.sort)}</button></th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(column => `<td class="${h(column.cls || "")}" data-label="${h(column.label)}">${h(column.value(row))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function earningsCards(rows, columns) {
    const detailColumns = columns.filter(column => !["symbol", "companyName", "status", "completeness"].includes(column.key));
    return `<div class="calendar-card-list earnings-card-list">${rows.map(row => `<article class="calendar-mobile-card">
      <div class="calendar-card-head"><div><strong class="ltr">${h(row.symbol || "--")}</strong><span>${h(row.companyName || "--")}</span></div><em>${h(earningsStatusLabel(row))}</em></div>
      <dl>${detailColumns.map(column => `<div><dt>${h(column.label)}</dt><dd class="${h(column.cls || "")}">${h(column.value(row))}</dd></div>`).join("")}</dl>
      <div class="calendar-card-score"><span>Completeness</span><b class="ltr">${h(earningsCompletenessScore(row))}%</b></div>
    </article>`).join("")}</div>`;
  }

  function sortMarker(key) {
    const view = state.earningsView || {};
    if (view.sortKey !== key) return "";
    return view.sortDir === "desc" ? " v" : " ^";
  }

  function earningsNoRows(activeTab) {
    return `<div class="empty-state compact calendar-empty"><span class="empty-glyph">â—Œ</span><h3>No matching earnings rows</h3><p>${activeTab === "partial" ? "Partial rows appear here when the provider sends mostly incomplete records." : "Try search, source, timing, or the Partial data tab."}</p></div>`;
  }

  function calendarRows(rows, columns) {
    const visible = columns.filter(column => column.pinned || rows.some(row => hasCalendarValue(column.raw ? column.raw(row) : column.value(row))));
    return `<div class="table-shell calendar-table"><table><thead><tr>${visible.map(column => `<th>${h(column.label)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${visible.map(column => `<td class="${h(column.cls || "")}" data-label="${h(column.label)}">${h(column.value(row))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <div class="calendar-card-list">${rows.map(row => `<article class="calendar-mobile-card"><dl>${visible.map(column => `<div><dt>${h(column.label)}</dt><dd class="${h(column.cls || "")}">${h(column.value(row))}</dd></div>`).join("")}</dl></article>`).join("")}</div>`;
  }

  function dividendRows(rows) {
    return calendarRows(rows, [
      { label: "Symbol", value: r => r.symbol || "--", raw: r => r.symbol, pinned: true, cls: "ltr" },
      { label: "Company", value: r => r.companyName || "--", raw: r => r.companyName, pinned: true },
      { label: "Declaration", value: r => latinDateOnly(r.declarationDate), raw: r => r.declarationDate, cls: "ltr" },
      { label: "Ex-date", value: r => latinDateOnly(r.exDividendDate), raw: r => r.exDividendDate, cls: "ltr" },
      { label: "Record", value: r => latinDateOnly(r.recordDate), raw: r => r.recordDate, cls: "ltr" },
      { label: "Payment", value: r => latinDateOnly(r.paymentDate), raw: r => r.paymentDate, cls: "ltr" },
      { label: "Dividend", value: r => latinNumber(r.dividendAmount), raw: r => r.dividendAmount, cls: "ltr" },
      { label: "Yield", value: r => percentText(r.dividendYield), raw: r => r.dividendYield, cls: "ltr" },
      { label: "Currency", value: r => r.currency || "--", raw: r => r.currency, cls: "ltr" },
      { label: "Source", value: r => providerName(r.provider), raw: r => r.provider }
    ]);
  }

  function ipoRows(rows) {
    return calendarRows(rows, [
      { label: "Company", value: r => r.companyName || "--", raw: r => r.companyName, pinned: true },
      { label: "Symbol", value: r => r.symbol || "--", raw: r => r.symbol, pinned: true, cls: "ltr" },
      { label: "Exchange", value: r => r.exchange || "--", raw: r => r.exchange, cls: "ltr" },
      { label: "IPO date", value: r => latinDateOnly(r.ipoDate), raw: r => r.ipoDate, cls: "ltr" },
      { label: "Price range", value: r => r.priceRange || "--", raw: r => r.priceRange, cls: "ltr" },
      { label: "Shares", value: r => latinNumber(r.shares), raw: r => r.shares, cls: "ltr" },
      { label: "Market cap", value: r => latinNumber(r.marketCap), raw: r => r.marketCap, cls: "ltr" },
      { label: "Status", value: r => r.status || "--", raw: r => r.status },
      { label: "Source", value: r => providerName(r.provider), raw: r => r.provider }
    ]);
  }

  function economicRows(rows) {
    return calendarRows(rows, [
      { label: "Time", value: r => latinDateTime(r.dateTimeUtc), raw: r => r.dateTimeUtc, pinned: true, cls: "ltr" },
      { label: "Country", value: r => r.country || "--", raw: r => r.country },
      { label: "Currency", value: r => r.currency || "--", raw: r => r.currency, cls: "ltr" },
      { label: "Event", value: r => r.event || "--", raw: r => r.event, pinned: true },
      { label: "Impact", value: r => impactLabel(r.impact), raw: r => r.impact },
      { label: "Previous", value: r => valueText(r.previous), raw: r => r.previous, cls: "ltr" },
      { label: "Forecast", value: r => valueText(r.forecast), raw: r => r.forecast, cls: "ltr" },
      { label: "Actual", value: r => valueText(r.actual), raw: r => r.actual, cls: "ltr" },
      { label: "Source", value: r => providerName(r.provider), raw: r => r.provider }
    ]);
  }

  function featureStatusTone(status) {
    status = String(status || "");
    if (status === "success" || status === "available" || status === "configured") return "ok";
    if (["not_entitled", "forbidden", "unauthorized", "rate_limited"].includes(status)) return "warn";
    return "";
  }

  function featureStatusLabel(status) {
    status = String(status || "not_configured");
    const labels = {
      success: "Ù…ØªØµÙ„",
      available: "Ù…ØªØ§Ø­",
      configured: "Ù…ØªØ§Ø­",
      connected: "Ù…ØªØµÙ„",
      healthy: "Ù…ØªØµÙ„",
      partial: "Ù…ØªØ§Ø­ Ø¬Ø²Ø¦ÙŠØ§Ù‹",
      degraded: "Ù…ØªØ§Ø­ Ø¬Ø²Ø¦ÙŠØ§Ù‹",
      missing: "ØºÙŠØ± Ù…Ù‡ÙŠØ£",
      error: "ÙØ´Ù„ Ø§Ù„Ø§ØªØµØ§Ù„",
      not_configured: "ØºÙŠØ± Ù…Ù‡ÙŠØ£",
      not_entitled: "ØºÙŠØ± Ù…ØªØ§Ø­ Ø¶Ù…Ù† Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©",
      forbidden: "ØºÙŠØ± Ù…ØªØ§Ø­ Ø¶Ù…Ù† Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©",
      unauthorized: "ÙØ´Ù„ Ø§Ù„ØªØµØ±ÙŠØ­",
      rate_limited: "ØªÙ… Ø§Ù„ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ Ø­Ø¯ Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø¤Ù‚ØªØ§Ù‹",
      provider_error: "ÙØ´Ù„ Ø§Ù„Ø§ØªØµØ§Ù„",
      invalid_request: "Ø·Ù„Ø¨ ØºÙŠØ± ØµØ§Ù„Ø­"
    };
    if (labels[status]) return labels[status];
    const providerStatusKey = canonicalProviderStatusKey(status);
    if (/^provider_status_/i.test(status) || providerStatusKey !== "provider_status_unknown" || status === "unknown") return getProviderStatusMessage(providerStatusKey);
    return formatProviderError(status, { empty: getProviderStatusMessage("provider_status_unknown") });
  }

  function providerName(provider) {
    const names = { fmp: "FMP", finnhub: "Finnhub", tradingeconomics: "Trading Economics", yahoo: "", "yahoo finance": "", manual: "Ø¥Ø¯Ø®Ø§Ù„ ÙŠØ¯ÙˆÙŠ" };
    const raw = String(provider || "").trim();
    return names[raw.toLowerCase()] || raw || "ØºÙŠØ± Ù…ØªØµÙ„";
  }

  function resultCountText(value) { return value === null || value === undefined ? "--" : `${latinNumber(value)} Ù†ØªÙŠØ¬Ø©`; }
  function valueText(value) { return value === null || value === undefined || value === "" ? "--" : String(value); }
  function percentText(value) { return value === null || value === undefined || value === "" ? "--" : `${latinNumber(value)}%`; }
  function impactLabel(value) { const v = String(value || "unknown"); return v === "high" ? "Ù…Ø±ØªÙØ¹" : v === "medium" ? "Ù…ØªÙˆØ³Ø·" : v === "low" ? "Ù…Ù†Ø®ÙØ¶" : "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"; }
  function rangeText(range) { return range && range.from && range.to ? `${range.from} â†’ ${range.to}` : "--"; }
  function latinNumber(value) {
    if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) return "--";
    return Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  function latinDateOnly(value) {
    if (!value) return "--";
    const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
  }
  function latinDateTime(value) {
    if (!value) return "--";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString("en-US", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function educationPage() {
    const cats = Object.keys(LESSONS);
    return `<div class="page-stack">${hero("Ù…Ø±ÙƒØ² Ø§Ù„ØªØ¹Ù„ÙŠÙ…", "ØªØ¹Ù„ÙŠÙ… Ù…Ø®ØªØµØ± ÙŠÙˆØ¶Ø­ Ù‚ÙŠÙˆØ¯ Ø§Ù„Ù…Ù†ØµØ©: Ù„Ø§ ØªÙˆØµÙŠØ§Øª Ø¨Ø¯ÙˆÙ† Ø¨ÙŠØ§Ù†Ø§ØªØŒ Ù„Ø§ Ø£Ø³Ø¹Ø§Ø± ÙˆÙ‡Ù…ÙŠØ©ØŒ ÙˆÙƒÙ„ Ø±Ù…Ø² Ù„Ù‡ Ø¹Ù…Ù„ØªÙ‡.", "EDUCATION")}
      ${cats.map((c, i) => `<section class="panel accordion ${i === 0 ? "is-open" : ""}"><button class="acc-head" data-acc>${h(c)}<span class="acc-icon">+</span></button><div class="acc-body"><div class="education-grid">${LESSONS[c].map(([t, b]) => `<article class="lesson-card"><span class="eyebrow">LESSON</span><strong>${h(t)}</strong><p>${h(b)}</p></article>`).join("")}</div></div></section>`).join("")}
    </div>`;
  }

  function settingsPage() {
    const s = state.settings;
    const prefs = signalPrefs();
    const marketOptions = ["US", "Kuwait", "Saudi", "UAE", "Qatar", "Bahrain", "Oman", "Forex", "Crypto", "Commodities"];
    return `<div class="page-stack">${hero("Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù†Ø¸Ø§Ù…", "Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø²ÙˆØ¯ ÙˆØªÙØ¶ÙŠÙ„Ø§Øª Ø§Ù„Ø¹Ø±Ø¶ ÙˆØ³Ù„ÙˆÙƒ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª. ØªÙˆØ¶Ø­ Ù„Ù…Ø§Ø°Ø§ Ù‚Ø¯ ØªÙƒÙˆÙ† Ø§Ù„ØªÙˆØµÙŠØ§Øª Ø£Ùˆ Ø§Ù„Ø£Ø®Ø¨Ø§Ø± ÙØ§Ø±ØºØ©.", "SETTINGS")}
      <section class="settings-grid">
        <article class="panel"><span class="eyebrow">PROVIDER</span><h2>Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</h2>${diagnostics()}<div class="row-actions"><button class="ghost-btn" data-retry>${h(getProviderRetryLabel())}</button></div></article>
        <article class="panel"><span class="eyebrow">SIGNAL PREFERENCES</span><h2>ØªÙØ¶ÙŠÙ„Ø§Øª Ø§Ù„Ø¥Ø´Ø§Ø±Ø§Øª</h2>
          <form id="settings-form" class="stack-form">
            <label>Ø§Ù„Ø³ÙˆÙ‚ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠ<select name="defaultMarket">${MARKETS.map(m => `<option value="${m.id}" ${s.defaultMarket === m.id ? "selected" : ""}>${h(m.ar)}</option>`).join("")}</select></label>
            <label>Ù…Ù„Ù Ø§Ù„Ù…Ø®Ø§Ø·Ø±<select name="risk">${["conservative", "balanced", "aggressive"].map(r => `<option value="${r}" ${s.risk === r ? "selected" : ""}>${riskLabel(r)}</option>`).join("")}</select></label>
            <label>Ø­Ø¯ Ø§Ù„Ø«Ù‚Ø© Ø§Ù„Ø£Ø¯Ù†Ù‰<input name="signalMinConfidence" inputmode="numeric" value="${h(prefs.minConfidence)}" /></label>
            <label><input type="checkbox" name="quickTickerVisible" ${isQuickTickerVisible() ? "checked" : ""} /> Ø¹Ø±Ø¶ Ø´Ø±ÙŠØ· Ø§Ù„Ø£Ø³Ø¹Ø§Ø± Ø§Ù„Ø³Ø±ÙŠØ¹</label>
            <label>Ø§Ù„Ø£Ø³ÙˆØ§Ù‚ Ø§Ù„Ù…ÙØ¹Ù„Ø©<select name="enabledMarkets" multiple>${marketOptions.map(m => `<option value="${h(m)}" ${prefs.enabledMarkets.includes(m) ? "selected" : ""}>${h(m)}</option>`).join("")}</select></label>
            <label><input type="checkbox" name="buyAlertsEnabled" ${prefs.buyAlertsEnabled ? "checked" : ""} /> ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ø´Ø±Ø§Ø¡</label>
            <label><input type="checkbox" name="sellAlertsEnabled" ${prefs.sellAlertsEnabled ? "checked" : ""} /> ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ø¨ÙŠØ¹</label>
            <label><input type="checkbox" name="waitAlertsEnabled" ${prefs.waitAlertsEnabled ? "checked" : ""} /> ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø± ÙˆØ§Ù„Ù…Ø±Ø§Ù‚Ø¨Ø©</label>
            <label><input type="checkbox" name="inAppAlertsEnabled" ${prefs.inAppAlertsEnabled ? "checked" : ""} /> ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø¯Ø§Ø®Ù„ Ø§Ù„Ù…Ù†ØµØ©</label>
            <label><input type="checkbox" name="emailAlertsEnabled" ${prefs.emailAlertsEnabled ? "checked" : ""} /> Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø¹Ù†Ø¯ ØªÙˆÙØ± Ø§Ù„Ø®Ø¯Ù…Ø©</label>
            <button class="action-btn" type="submit">Ø­ÙØ¸</button>
          </form>
        </article>
        <article class="panel"><span class="eyebrow">DATA POLICY</span><h2>Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</h2>
          <div class="status-card"><strong>Ø§Ù„Ù„ØºØ© ÙˆØ§Ù„Ø§ØªØ¬Ø§Ù‡</strong><p>Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø¹Ø±Ø¨ÙŠØ© RTLØŒ ÙˆØ§Ù„Ø±Ù…ÙˆØ² ÙˆØ§Ù„Ù…Ø¤Ø´Ø±Ø§Øª LTR Ø¨Ø¹Ø²Ù„ ÙƒØ§Ù…Ù„ Ù„Ù…Ù†Ø¹ ØªØ¯Ø§Ø®Ù„ Ø§Ù„Ù†Øµ.</p><span class="state-badge ok">RTL/LTR clean</span></div>
          <div class="status-card"><strong>Ù„Ø§ Ø¨ÙŠØ§Ù†Ø§Øª ÙˆÙ‡Ù…ÙŠØ©</strong><p>Ù„Ø§ Ù†ÙˆÙ„Ù‘Ø¯ Ø£Ø³Ø¹Ø§Ø±Ø§Ù‹ Ø£Ùˆ ØªÙˆØµÙŠØ§Øª Ø¨Ø¯ÙŠÙ„Ø© Ø¹Ù†Ø¯ ØºÙŠØ§Ø¨ Ø§Ù„Ù…Ø²ÙˆØ¯.</p><span class="state-badge warn">No fake market data</span></div>
        </article>
        <article class="panel"><span class="eyebrow">ABOUT</span><h2>Ø­ÙˆÙ„ Ø§Ù„Ù…Ù†ØµØ©</h2><div class="status-card"><strong>the-sfm trader</strong><p>Ù…Ù†ØµØ© ØªØ¯Ø§ÙˆÙ„ ÙˆØªØ­Ù„ÙŠÙ„ Ø°ÙƒÙŠØ©. Ø¥ØµØ¯Ø§Ø± ${VER}.</p><span class="state-badge">Powered by M.ALQ</span></div></article>
      </section>${disclaimer()}</div>`;
  }

  function symbolPage(symbol) {
    if (!symbol) return `<div class="page-stack">${hero("ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø±Ù…Ø²", "Ø§ÙƒØªØ¨ Ø±Ù…Ø²Ø§Ù‹ ÙÙŠ Ø§Ù„Ø¨Ø­Ø« Ø§Ù„Ø¹Ù„ÙˆÙŠ Ù„ÙØªØ­ ØµÙØ­Ø© ØªØ­Ù„ÙŠÙ„ Ù…Ø®ØµØµØ©. Ø£Ù…Ø«Ù„Ø©: AAPL, BTCUSD, XAUUSD, KFH.KW", "SYMBOL DETAILS")}<section class="panel">${emptyState("Ù„Ù… ÙŠØªÙ… Ø§Ø®ØªÙŠØ§Ø± Ø±Ù…Ø²", "Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¨Ø­Ø« Ø§Ù„Ø¹Ù„ÙˆÙŠ Ø£Ùˆ Ø£Ø²Ø±Ø§Ø± Ø§Ù„ØªÙØ§ØµÙŠÙ„ Ù…Ù† Ø§Ù„Ø£Ø³ÙˆØ§Ù‚ ÙˆØ§Ù„ØªÙˆØµÙŠØ§Øª.", "Ø§Ù„Ø£Ø³ÙˆØ§Ù‚", `${ROOT}/markets`)}</section></div>`;
    return `<div class="page-stack"><a class="back-link" href="${ROOT}/markets" data-route-link>â€¹ Ø§Ù„Ø£Ø³ÙˆØ§Ù‚</a>
      ${hero(`ØªØ­Ù„ÙŠÙ„ <span class="ltr">${h(symbol)}</span>`, "ØµÙØ­Ø© ØªÙØ§ØµÙŠÙ„ Ø­Ù‚ÙŠÙ‚ÙŠØ© Ù„ÙƒÙ„ Ø±Ù…Ø² ØªØ¹Ø±Ø¶ Ø§Ù„Ù…Ù„Ù ÙˆØ§Ù„Ø¹Ù…Ù„Ø© ÙˆØ§Ù„Ù…ØµØ¯Ø± ÙˆØ§Ù„ØªØ­Ù„ÙŠÙ„ Ø¹Ù†Ø¯ ØªÙˆÙØ±Ù‡Ø§ Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯.", "SYMBOL DETAILS")}
      <section id="symbol-details-body"><div class="panel"><div class="loading-panel compact"><span class="pulse-orb"></span><h2>Ø¬Ø§Ø±ÙŠ ÙØ­Øµ <span class="ltr">${h(symbol)}</span></h2></div></div></section>${disclaimer()}</div>`;
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Async loaders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function calendarQuery(force) {
    const params = new URLSearchParams({ range: state.calendarRange || "30" });
    if (force) params.set("refresh", "1");
    const symbols = unique([...(state.watch || []), ...defaults]);
    if (symbols.length) params.set("symbols", symbols.join(","));
    return params.toString();
  }
  async function loadCalendars(force) {
    const qs = calendarQuery(force);
    const settled = await Promise.allSettled([
      get("/trader/provider-status", { label: "providerStatus" }),
      get(`/trader/calendar/earnings?${qs}`, { label: "calendar" }),
      get(`/trader/calendar/dividends?${qs}`, { label: "calendar" }),
      get(`/trader/calendar/ipos?${qs}`, { label: "calendar" }),
      get(`/trader/calendar/economic?${qs}`, { label: "calendar" })
    ]);
    const [providerStatus, earnings, dividends, ipos, economic] = settled.map((result, index) => settledValue(result, index === 0 ? "providerStatus" : "calendar"));
    state.providerStatus = providerStatus || {};
    state.calendar = { earnings, dividends, ipos, economic };
    state.calendarLoaded = true;
    if (providerStatus && providerStatus.dataProvider) state.provider = providerStatus.dataProvider;
    renderAfterData();
  }
  function marketUniverseCacheKey(id) {
    const view = state.marketUniverseView;
    return ["universe", id, view.page, view.pageSize, view.q, view.exchange, view.currency, view.sector, view.industry, view.assetType, view.fundType, view.availability, view.sort, view.dir].join("|");
  }
  async function getFullSymbolUniverse({ market, sector, category, exchange, currency, industry, assetType, fundType, availability, page, pageSize, q, sort, dir, force } = {}) {
    const params = new URLSearchParams({
      market: marketApi(market),
      page: String(page || 1),
      limit: String(pageSize || MARKET_UNIVERSE_PAGE_SIZE),
      sort: sort || "symbol",
      dir: dir || "asc",
      discover: "1",
    });
    if (sector && sector !== "all") params.set("sectorName", sector);
    if (category && category !== "all") params.set("category", category);
    if (exchange && exchange !== "all") params.set("exchange", exchange);
    if (currency && currency !== "all") params.set("currency", currency);
    if (industry && industry !== "all") params.set("industry", industry);
    if (assetType && assetType !== "all") params.set("assetType", assetType);
    if (fundType && fundType !== "all") params.set("fundType", fundType);
    if (availability && availability !== "all") params.set("availability", availability);
    if (q) params.set("q", q);
    if (force) params.set("refresh", "1");
    return get(`/recommendations?${params.toString()}`, { label: "quotes" });
  }
  async function loadMarket(id, force = false) {
    const m = MARKETS.find(x => x.id === id); if (!m) return;
    const cacheKey = marketUniverseCacheKey(id);
    if (!force && state.marketCache.has(cacheKey)) { render(); return; }
    state.marketUniverseLoading = true;
    const view = state.marketUniverseView;
    const data = await getFullSymbolUniverse({
      market: m.apiMarket || m.id,
      sector: view.sector,
      exchange: view.exchange,
      currency: view.currency,
      industry: view.industry,
      assetType: view.assetType,
      fundType: view.fundType,
      availability: view.availability,
      page: view.page,
      pageSize: view.pageSize,
      q: view.q,
      sort: view.sort,
      dir: view.dir,
      force,
    });
    state.marketCache.set(cacheKey, data);
    state.marketUniverseLoading = false;
    if (data.dataProvider) state.provider = data.dataProvider;
    if (state.route.id === "markets" && state.route.market === id) render();
  }
  async function ensureScanData(force = false) {
    if (!force && (recs().length || state.rec.message)) return;
    const settled = await Promise.allSettled([
      get(`/recommendations?market=${marketApi(state.settings.defaultMarket)}`, { label: "quotes" }),
      get("/market/signals?limit=60", { label: "signals" })
    ]);
    const [data, signals] = settled.map((result, index) => settledValue(result, index === 0 ? "quotes" : "signals"));
    state.rec = data; state.signals = signals;
    if (data.dataProvider) state.provider = data.dataProvider;
    if (["ai-scanner", "recommendations"].includes(state.route.id)) render();
  }
  async function loadSymbol(symbol, force = false) {
    const target = document.getElementById("symbol-details-body"); if (!target) return;
    const key = sym(symbol);
    if (!force && state.cache.has(key)) { target.innerHTML = symbolContent(state.cache.get(key)); return; }
    try {
      const settled = await Promise.allSettled([
        get(`/market/asset-profile?symbol=${encodeURIComponent(key)}`, { label: "quotes" }),
        get(`/market/search?q=${encodeURIComponent(key)}&limit=5`, { label: "quotes" }),
        get(`/market/technical-analysis?symbol=${encodeURIComponent(key)}`, { label: "signals" }),
        get(`/market/signals/${encodeURIComponent(key)}`, { label: "signals" }),
        get(`/market/history?symbol=${encodeURIComponent(key)}&range=1Y`, { label: "quotes" }),
        get(marketNewsPath(6, { symbol: key }), { label: "news" })
      ]);
      const [profile, search, tech, sig, hist, news] = settled.map((result, index) => settledValue(result, index === 2 || index === 3 ? "signals" : index === 5 ? "news" : "quotes"));
      const found = (search.resolved || arr(search.results || search.data || search.items)[0] || {});
      const rawProfile = profile.profile || profile.asset || profile.data || profile.result || {};
      const rawTech = tech.ok ? (tech.analysis || tech.data || tech) : (tech.available || null);
      const historyPoints = arr(hist.points || hist.history);
      const techAsset = rawTech && typeof rawTech === "object" ? {
        price: rawTech.currentPrice || rawTech.price,
        currentPrice: rawTech.currentPrice || rawTech.price,
        currency: rawTech.currency,
        source: rawTech.source,
        exchange: rawTech.exchange || rawTech.market,
        history: historyPoints
      } : historyPoints.length ? { history: historyPoints } : {};
      const providerStatus = rawTech?.providerStatus || hist.providerStatus || profile.providerStatus || {};
      const asset = norm({ symbol: key, ...found, ...rawProfile, ...techAsset });
      const detail = {
        asset, tech: rawTech, providerStatus,
        available: Boolean((profile.ok && (rawProfile.symbol || found.symbol || found.name)) || rawTech || historyPoints.length),
        source: profile.source || search.source || asset.source || (rawTech && rawTech.source) || "--",
        message: profile.message || search.message || UNAVAILABLE_MESSAGE,
        rec: sig && (sig.signal || sig.item) ? signalToRec(sig.signal || sig.item) : matchRec(key),
        news
      };
      state.cache.set(key, detail);
      const currentTarget = document.getElementById("symbol-details-body");
      if (state.route.id === "symbol-details" && state.route.symbol === key && currentTarget) currentTarget.innerHTML = symbolContent(detail);
    } catch (error) {
      devLog("quotes", "failed", { route: "symbol-details", symbol: key, message: errorMessage(error) });
      target.innerHTML = `<div class="panel">${emptyState(UNAVAILABLE_MESSAGE, errorMessage(error), "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª", `${ROOT}/settings`)}</div>`;
    }
  }

  function symbolContent(detail) {
    const a = detail.asset, c = currency(a), rec = detail.rec || null;
    const finalModel = finalRecommendationModel(a, detail, rec);
    const p = num(a.price, a.lastPrice, a.regularMarketPrice, a.close, detail.rec && detail.rec.currentPrice);
    const chg = num(a.changePercent, a.percentChange);
    const ps = detail.providerStatus || {};
    const providerSymbolUsed = ps.providerSymbolUsed || a.providerSymbol || (detail.rec && detail.rec.providerSymbol) || "ØºÙŠØ± Ù…ØªØ§Ø­";
    const fallbackUsed = ps.fallbackUsed === true ? "Ù†Ø¹Ù…" : ps.fallbackUsed === false ? "Ù„Ø§" : "ØºÙŠØ± Ù…ØªØ§Ø­";
    const lastUpdated = latinDateTime(ps.lastUpdated || a.updatedAt || (detail.rec && detail.rec.lastUpdated));
    const quality = ps.dataQuality ? dataQualityLabel(ps.dataQuality) : "ØºÙŠØ± Ù…ØªØ§Ø­";
    return `<div class="detail-layout">
      <article class="panel detail-main">
        <div class="asset-head big">${logo(a, "lg")}<div class="asset-title"><strong class="symbol-code">${h(a.symbol)}</strong><small>${h(a.name || "Ø§Ø³Ù… Ø§Ù„Ø£ØµÙ„ ØºÙŠØ± Ù…ØªÙˆÙØ± Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯")}</small></div>
          ${rec ? `<span class="state-badge ${signalCardClass(finalModel.action)} big">${h(sigLabel(finalModel.action))}</span>` : ""}</div>
        <div class="detail-grid">${detailCard("Ø§Ù„Ø³Ø¹Ø±", price(p, c), "Price")}${detailCard("Ø§Ù„ØªØºÙŠØ±", change(chg), "Change")}${detailCard("Ø§Ù„Ø¹Ù…Ù„Ø©", c, "Currency")}${detailCard("Ø§Ù„Ù†ÙˆØ¹", a.assetType || assetType(a.symbol), "Type")}${detailCard("Ø§Ù„Ø³ÙˆÙ‚", a.exchange || a.market || "--", "Exchange")}${detailCard("Ø§Ù„Ù…ØµØ¯Ø±", detail.source || "--", "Source")}</div>
        <div class="detail-grid">${detailCard("Ø±Ù…Ø² Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…", providerSymbolUsed, "Provider symbol")}${detailCard("Ø§Ø³ØªØ®Ø¯Ù… fallbackØŸ", fallbackUsed, "Fallback")}${detailCard("Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«", lastUpdated === "--" ? "ØºÙŠØ± Ù…ØªØ§Ø­" : lastUpdated, "Last updated")}${detailCard("Ø¬ÙˆØ¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª", quality, "Data quality")}</div>
        <div class="card-actions"><button class="action-btn" data-quick-add="${h(a.symbol)}">Ø£Ø¶Ù Ù„Ù„Ù…ØªØ§Ø¨Ø¹Ø©</button><button class="ghost-btn" data-create-alert="${h(a.symbol)}">Ø£Ù†Ø´Ø¦ ØªÙ†Ø¨ÙŠÙ‡</button></div>
        ${miniChart(a)}
      </article>
      <aside class="detail-side">
        ${finalRecommendationCard(a, detail, rec)}
        <article class="panel consensus-panel"><span class="eyebrow">STRATEGY AGREEMENT</span><h2>Ø§ØªÙØ§Ù‚ Ø§Ù„Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ§Øª</h2>${strategyConsensus(a, detail.tech, rec)}</article>
        <article class="panel"><span class="eyebrow">TECHNICAL</span><h2>Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„ÙÙ†ÙŠ</h2>${technical({ ...a, ...(rec || {}) }, detail.tech, c, detail)}</article>
        <article class="panel"><span class="eyebrow">AI CONFIDENCE</span><h2>Ù‚Ø±Ø§Ø¡Ø© AI Ø§Ù„Ø®Ø§Ù…</h2>${rec ? signalAnalysis(rec, c) : emptyState("Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥Ø´Ø§Ø±Ø© ÙƒØ§ÙÙŠØ©", "Ù„Ù… ÙŠØ±Ø¬Ø¹ Ø§Ù„Ù…Ø²ÙˆØ¯ Ø¨ÙŠØ§Ù†Ø§Øª ÙƒØ§ÙÙŠØ© Ù„Ù‡Ø°Ø§ Ø§Ù„Ø±Ù…Ø².", "", "")}</article>
        <article class="panel"><span class="eyebrow">RELATED NEWS</span><h2>Ø£Ø®Ø¨Ø§Ø± Ù…Ø±ØªØ¨Ø·Ø©</h2>${relatedNews(a.symbol, detail)}</article>
      </aside></div>`;
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function isBuySignalName(value) { return value === "buy" || value === "cautious_buy" || value === "weak_buy"; }
  function isSellSignalName(value) { return value === "sell" || value === "sell_or_avoid"; }
  function signalCardClass(value) {
    if (value === "buy") return "ok";
    if (value === "weak_buy" || value === "cautious_buy") return "warn";
    if (isSellSignalName(value)) return "warn";
    if (value === "insufficient_data") return "muted";
    return "";
  }
  function finalRecommendationAction(value) {
    const raw = String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ");
    if (!raw) return "";
    if (raw.includes("insufficient") || raw.includes("unavailable") || raw.includes("ØºÙŠØ± ÙƒØ§Ù") || raw.includes("ØºÙŠØ± Ù…ØªØ§Ø­")) return "insufficient_data";
    if (raw.includes("sell") || raw.includes("Ø¨ÙŠØ¹") || raw.includes("short")) return "sell";
    if (raw.includes("weak buy") || raw.includes("cautious buy") || raw.includes("Ø´Ø±Ø§Ø¡ Ø¶Ø¹ÙŠÙ") || raw.includes("Ø´Ø±Ø§Ø¡ Ø­Ø°Ø±")) return "weak_buy";
    if (raw.includes("buy") || raw.includes("Ø´Ø±Ø§Ø¡") || raw.includes("long")) return "buy";
    if (raw.includes("wait") || raw.includes("hold") || raw.includes("Ø§Ù†ØªØ¸Ø§Ø±")) return "wait";
    if (raw.includes("watch") || raw.includes("Ù…Ø±Ø§Ù‚Ø¨Ø©")) return "watch";
    return "";
  }
  function agreementObject(...records) {
    for (const record of records) {
      if (!record) continue;
      const agreement = record.strategyAgreement || record.strategyConsensus || record.consensus;
      if (agreement && typeof agreement === "object") return agreement;
    }
    return null;
  }
  function backendStrategyCount(...records) {
    for (const record of records) {
      const count = num(record && (record.strategyCount ?? record.strategy_count ?? record.strategiesAvailable));
      if (count !== null) return Math.max(0, Math.round(count));
    }
    const agreement = agreementObject(...records);
    const count = num(agreement && (agreement.strategyCount ?? agreement.strategy_count ?? agreement.count));
    return count === null ? 0 : Math.max(0, Math.round(count));
  }
  function strategyAgreementMetric(...records) {
    const agreement = agreementObject(...records);
    const count = backendStrategyCount(...records);
    const rawPct = num(agreement && (agreement.agreementPct ?? agreement.agreement ?? agreement.percent));
    const limited = count < 3;
    const pct = rawPct === null ? null : Math.max(0, Math.min(limited ? 66 : 100, Math.round(rawPct)));
    return {
      value: limited ? "ØªÙˆØ§ÙÙ‚ Ù…Ø­Ø¯ÙˆØ¯" : pct === null ? "ØºÙŠØ± Ù…ØªØ§Ø­" : `${pct}%`,
      helper: limited ? `${count} Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ© ÙÙ‚Ø·` : `${count} Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ©`,
      count,
      agreementPct: pct,
      limited,
      label: (agreement && (agreement.labelAr || agreement.label)) || (limited ? "Limited consensus" : "Strategy agreement"),
    };
  }
  function backendConsensusFromRecords(...records) {
    const agreement = agreementObject(...records);
    const metric = strategyAgreementMetric(...records);
    const buy = Math.round(num(agreement && (agreement.buyPct ?? agreement.buy ?? agreement.buyPercent)) ?? 0);
    const sell = Math.round(num(agreement && (agreement.sellPct ?? agreement.sell ?? agreement.sellPercent)) ?? 0);
    const watch = Math.round(num(agreement && (agreement.watchPct ?? agreement.neutralPct ?? agreement.watch ?? agreement.neutral)) ?? Math.max(0, 100 - buy - sell));
    const rec = records.find(Boolean) || {};
    return {
      signal: signal(rec),
      agreement: metric.agreementPct ?? 0,
      agreementPct: metric.agreementPct,
      buy,
      sell,
      neutral: watch,
      count: metric.count,
      limited: metric.limited,
      label: metric.label,
    };
  }
  function strategyRowsFromBackend(...records) {
    for (const record of records) {
      const strategies = arr(record && record.strategies);
      if (strategies.length) return strategies;
    }
    return [];
  }
  function marketBias(rec) {
    const buy = rec.filter(x => isBuySignalName(signal(x))).length, sell = rec.filter(x => isSellSignalName(signal(x))).length, total = rec.length;
    if (!total) return { label: "Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª", en: "AWAITING", bull: 0, bear: 0, neutral: 0, conf: 0, tone: "", note: "" };
    const cf = rec.map(x => num(x.confidence, x.score, x.aiConfidence)).filter(v => v !== null);
    const conf = cf.length ? Math.round(cf.reduce((a, b) => a + b, 0) / cf.length) : 0;
    const actionable = buy + sell;
    // Ø¨Ø¯ÙˆÙ† Ø¥Ø´Ø§Ø±Ø§Øª Ù…Ù†Ø´ÙˆØ±Ø©ØŒ Ø§Ù„Ø³ÙˆÙ‚ Ù„ÙŠØ³ "Ù‡Ø§Ø¨Ø·Ø§Ù‹" â€” Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„Ø¯Ù‚Ø© Ø­Ø§Ø¬Ø¨Ø© ÙÙ‚Ø·
    if (!actionable) return { label: "Ù…Ø­Ø§ÙŠØ¯ Â· ÙˆØ¶Ø¹ Ø§Ù„Ø¯Ù‚Ø© Ù†Ø´Ø·", en: "NEUTRAL â€” PRECISION GATE", bull: 0, bear: 0, neutral: 100, conf, tone: "", note: `Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥Ø´Ø§Ø±Ø§Øª ØªØªØ¬Ø§ÙˆØ² Ø­Ø¯ Ø§Ù„Ù†Ø´Ø± Ø­Ø§Ù„ÙŠØ§Ù‹ (${total} Ø£ØµÙ„ Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ù‚Ø¨Ø©)` };
    const bull = Math.round((buy / actionable) * 100), bear = 100 - bull, neutral = Math.round(((total - actionable) / total) * 100);
    return { label: bull >= 55 ? "ØµØ§Ø¹Ø¯" : bull <= 40 ? "Ù‡Ø§Ø¨Ø·" : "Ù…Ø­Ø§ÙŠØ¯", en: bull >= 55 ? "BULLISH" : bull <= 40 ? "BEARISH" : "NEUTRAL", bull, bear, neutral, conf, tone: bull >= 55 ? "ok" : bull <= 40 ? "warn" : "", note: `${buy} Ø´Ø±Ø§Ø¡ Â· ${sell} Ø¨ÙŠØ¹ Ù…Ù† Ø£ØµÙ„ ${total}` };
  }
  function marketOverview(rec) {
    const b = marketBias(rec);
    const verdict = b.en === "AWAITING" ? "--" : b.en.replace("NEUTRAL â€” PRECISION GATE", "NEUTRAL");
    return `<section class="panel market-overview">
      <div class="panel-head"><div><span class="eyebrow">MARKET OVERVIEW</span><h2>Ù†Ø¸Ø±Ø© Ø¹Ø§Ù…Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ø³ÙˆØ§Ù‚</h2></div><div class="mo-timeframes">${["1D", "1W", "1M", "1Y", "ALL"].map(t => `<button data-timeframe="${t}" class="${state.timeframe === t ? "is-active" : ""}">${t}</button>`).join("")}</div></div>
      ${marketMap()}
    </section>
    <section class="panel ai-market-analysis">
      <div class="panel-head"><div><span class="eyebrow">AI MARKET ANALYSIS</span><h2>ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø³ÙˆÙ‚ Ø§Ù„Ø°ÙƒÙŠ</h2></div></div>
      <div class="ai-analysis-body">
        <div>
          <span class="card-kicker">OVERALL MARKET BIAS</span>
          <div class="ai-analysis-verdict ${b.tone}">${h(verdict)}</div>
          <small class="muted-note">${h(b.label)}${b.note ? " Â· " + h(b.note) : ""} Â· Ø¥Ø·Ø§Ø± ${h(state.timeframe)} Â· Ø§Ù„Ø«Ù‚Ø© ${b.conf ? b.conf + "%" : "--"}</small>
          <div class="ai-bias-rows" style="margin-top:14px">
            <div class="ai-bias-row bull"><span>ØµØ§Ø¹Ø¯</span><span class="bar"><i style="width:${b.bull}%"></i></span><b class="ltr">${b.bull}%</b></div>
            <div class="ai-bias-row bear"><span>Ù‡Ø§Ø¨Ø·</span><span class="bar"><i style="width:${b.bear}%"></i></span><b class="ltr">${b.bear}%</b></div>
            <div class="ai-bias-row neut"><span>Ù…Ø­Ø§ÙŠØ¯</span><span class="bar"><i style="width:${b.neutral}%"></i></span><b class="ltr">${b.neutral}%</b></div>
          </div>
        </div>
        <div class="ai-analysis-bull ${b.tone === "warn" ? "bearish" : ""}" aria-hidden="true"></div>
      </div>
    </section>`;
  }
  function commandCenter(rec) {
    const p = providerCopy(), b = marketBias(rec), market = currentMarket();
    const buy = rec.filter(x => isBuySignalName(signal(x))).length, sell = rec.filter(x => isSellSignalName(signal(x))).length;
    const configured = p.className === "online";
    return `<section class="terminal-command-center" aria-label="Market summary">
      ${commandMetric("PROVIDER", configured ? "Ù…ØªØµÙ„" : "ØºÙŠØ± Ù…Ù‡ÙŠØ£", p.label || p.title, configured ? "ok" : "warn")}
      ${commandMetric("AI CONFIDENCE", b.conf ? `${b.conf}%` : "ØºÙŠØ± Ù…ØªØ§Ø­", b.conf ? b.label : "Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª", b.tone || "neutral")}
      ${commandMetric("BUY SIGNALS", buy, "ÙØ±Øµ Ø´Ø±Ø§Ø¡", "ok")}
      ${commandMetric("SELL SIGNALS", sell, "ÙØ±Øµ Ø¨ÙŠØ¹", "bad")}
      ${commandMetric("ANALYZED ASSETS", rec.length || "ØºÙŠØ± Ù…ØªØ§Ø­", "Ø£ØµÙˆÙ„ Ù…Ø­Ù„Ù„Ø©", rec.length ? "ok" : "neutral")}
      ${commandMetric("ACTIVE MARKET", market.ar, `${market.en} Â· ${market.currency}`, "blue")}
    </section>`;
  }
  function commandMetric(kicker, value, label, tone) {
    return `<article class="command-metric ${tone || ""}"><span class="card-kicker">${h(kicker)}</span><strong>${h(String(value))}</strong><small>${h(label || "ØºÙŠØ± Ù…ØªØ§Ø­")}</small></article>`;
  }
  function marketLeadership(rec) {
    const commandRec = mergeRecLists(legacyRecsFrom(state.commandCards), rec);
    return `<section class="panel market-leadership">
      <div class="panel-head"><div><span class="eyebrow">MARKET COMMAND</span><h2>ØºØ±ÙØ© Ù‚ÙŠØ§Ø¯Ø© Ø§Ù„Ø³ÙˆÙ‚</h2></div><span class="state-badge">${h(currentMarket().ar)}</span></div>
      <div class="leadership-grid">${dashboardSymbols().map(s => leadershipCard(s, findAssetForSymbol(s, commandRec))).join("")}</div>
    </section>`;
  }
  function precisionBadge(a) {
    const pm = a.precisionMode || a.precision || null;
    const bt = a.backtest || null;
    const rate = num(pm && pm.measuredWinRate, bt && bt.winRate);
    if (rate === null) return "";
    const req = pm && num(pm.required) !== null ? Math.round(num(pm.required)) : 90;
    const passed = pm ? pm.passed === true : false;
    const text = passed ? `âœ“ Ø¯Ù‚Ø© ØªØ§Ø±ÙŠØ®ÙŠØ© ${rate}%` : `Ø¯Ù‚Ø© ØªØ§Ø±ÙŠØ®ÙŠØ© ${rate}% Â· Ø­Ø¯ Ø§Ù„Ù†Ø´Ø± ${req}%`;
    return `<span class="precision-badge ${passed ? "pass" : "info"}" title="Ù†Ø³Ø¨Ø© Ø¥ØµØ§Ø¨Ø© Ø§Ù„Ù‡Ø¯Ù Ø§Ù„Ø£ÙˆÙ„ ÙÙŠ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„Ø®Ù„ÙÙŠ Ø¹Ù„Ù‰ Ù†ÙØ³ Ø§Ù„Ø±Ù…Ø²">${h(text)}</span>`;
  }
  function leadershipCard(symbol, asset) {
    const a = asset ? norm(asset) : { symbol, name: "ØºÙŠØ± Ù…ØªØ§Ø­" };
    const display = a.displaySymbol || displaySymbolFor(symbol);
    const detailSymbol = a.canonicalSymbol || symbol;
    const c = currency({ ...a, symbol: detailSymbol });
    const p = num(a.price, a.lastPrice, a.regularMarketPrice, a.close, a.currentPrice);
    const chg = num(a.changePercent, a.percentChange);
    const conf = num(a.confidence, a.score, a.aiConfidence);
    const source = providerName(a.provider || a.source || (state.provider && (state.provider.active || state.provider.provider)) || "");
    const sig = (a.signalAvailable === false || (!a.signal && !a.recommendation && !a.action)) ? null : signal(a);
    const quality = a.dataQuality || (p === null ? "unavailable" : a.chartAvailable === false ? "partial" : "delayed");
    const stateClass = chg === null ? "neutral" : chg >= 0 ? "positive" : "negative";
    return `<button class="leadership-card ${stateClass}" data-symbol-details="${h(detailSymbol)}" type="button">
      <div class="asset-head">${logo({ ...a, symbol: display })}<div class="asset-title"><strong class="ltr">${h(display)}</strong><small>${h(a.name || display)}</small></div></div>
      <div class="leadership-price"><strong class="ltr">${h(p === null ? "Ø§Ù„Ø³Ø¹Ø± ØºÙŠØ± Ù…ØªØ§Ø­" : price(p, c))}</strong><span class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(chg === null ? "Ø§Ù„ØªØºÙŠØ± ØºÙŠØ± Ù…ØªØ§Ø­" : change(chg))}</span></div>
      ${sparkline(a, chg)}
      <div class="leadership-foot">
        <span class="signal-badge ${sig || "unavailable"}">${h(sig ? sigLabel(sig) : "Ø¥Ø´Ø§Ø±Ø© ØºÙŠØ± Ù…ØªØ§Ø­Ø©")}</span>
        <span class="quality-badge">${h(conf === null ? "Ø§Ù„Ø«Ù‚Ø© ØºÙŠØ± Ù…ØªØ§Ø­Ø©" : `Ø§Ù„Ø«Ù‚Ø© ${Math.round(conf)}%`)} Â· ${h(dataQualityLabel(quality))}</span>
        ${precisionBadge(a)}
      </div>
      <div class="leadership-provider-row">
        <b>${h(source)}</b>
        <span class="ltr">${h(a.providerSymbolUsed || a.providerSymbol || "--")}</span>
        <span>${a.fallbackUsed === true ? "" : ""}</span>
        <span>${h(providerFlag("fmp"))}</span>
        <span>${h(providerFlag("finnhub"))}</span>
        <time class="ltr">${h(latinDateTime(a.lastUpdated || a.updatedAt))}</time>
      </div>
    </button>`;
  }
  function providerFlag(key) {
    const providers = state.providerStatus && state.providerStatus.providers;
    const provider = providers && providers[key];
    const label = key === "fmp" ? "FMP" : key === "finnhub" ? "Finnhub" : key;
    return `${label}: ${provider && provider.configured ? "on" : "off"}`;
  }
  function opportunityHeatmap(rec) {
    const symbols = unique([...dashboardSymbols(), ...rec.map(x => x.symbol)]).slice(0, 24);
    return `<section class="panel opportunity-heatmap">
      <div class="panel-head"><div><span class="eyebrow">OPPORTUNITY HEATMAP</span><h2>Ø®Ø±ÙŠØ·Ø© Ø­Ø±Ø§Ø±Ø© Ø§Ù„ÙØ±Øµ</h2></div><span class="state-badge">${rec.length ? `${rec.length} Ø£ØµÙ„` : "Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± Ù…ØªØ§Ø­Ø© Ø­Ø§Ù„ÙŠØ§Ù‹"}</span></div>
      <div class="opportunity-heat-grid">${symbols.map(s => heatmapCard(s, findAssetForSymbol(s, rec))).join("")}</div>
    </section>`;
  }
  function heatmapCard(symbol, asset) {
    const a = asset ? norm(asset) : { symbol, name: "ØºÙŠØ± Ù…ØªØ§Ø­" };
    const chg = num(a.changePercent, a.percentChange);
    const hasSignal = Boolean(asset && (a.signal || a.recommendation || a.action || a.side || a.type));
    const stateClass = chg === null ? "unavailable" : chg > 0 ? "positive" : chg < 0 ? "negative" : "neutral";
    const conf = num(a.confidence, a.score, a.aiConfidence);
    return `<button class="opportunity-cell ${stateClass}" data-symbol-details="${h(symbol)}" type="button">
      ${logo({ ...a, symbol }, "sm")}
      <strong class="ltr">${h(symbol === "BTCUSD" ? "BTC/USD" : symbol)}</strong>
      <span class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(chg === null ? "ØºÙŠØ± Ù…ØªØ§Ø­" : change(chg))}</span>
      <em>${hasSignal ? h(sigLabel(signal(a))) : "ØºÙŠØ± Ù…ØªØ§Ø­"}${conf === null ? "" : ` Â· ${Math.round(conf)}%`}</em>
    </button>`;
  }
  function moverPanel(kicker, title, items, tone) {
    return `<article class="panel market-movers-panel ${tone}"><div class="panel-head"><div><span class="eyebrow">${h(kicker)}</span><h2>${h(title)}</h2></div></div>${items.length ? assetList(items) : emptyState("Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± Ù…ØªØ§Ø­Ø© Ø­Ø§Ù„ÙŠØ§Ù‹", "Ù„Ù… ÙŠØ±Ø¬Ø¹ Ø§Ù„Ù…Ø²ÙˆØ¯ ØªØºÙŠÙ‘Ø± Ø§Ù„Ø£Ø³Ø¹Ø§Ø± Ø§Ù„ÙƒØ§ÙÙŠ Ù„Ø¹Ø±Ø¶ Ù‡Ø°Ù‡ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©.", "Ø§ÙØªØ­ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª", `${ROOT}/settings`)}</article>`;
  }
  function dashboardSymbols() {
    const market = currentMarket();
    return unique([...leadershipCore, ...(market.symbols || [])]);
  }
  function findAssetForSymbol(symbol, list) {
    const aliases = symbolAliases(symbol);
    return list.find(x => [x.symbol, x.displaySymbol, x.canonicalSymbol, x.providerSymbolUsed, x.providerSymbol, x.ticker, x.code].some(v => aliases.includes(sym(v)))) || null;
  }
  function symbolAliases(symbol) {
    const s = sym(symbol);
    const map = {
      NAS100: ["NAS100", "NDX", "^NDX", "NQ=F", "IXIC"],
      "^NDX": ["NAS100", "NDX", "^NDX", "NQ=F", "IXIC"],
      US30: ["US30", "DJI", "^DJI", "YM=F"],
      "^DJI": ["US30", "DJI", "^DJI", "YM=F"],
      SPX500: ["SPX500", "SPX", "^GSPC", "ES=F"],
      "^GSPC": ["SPX500", "SPX", "^GSPC", "ES=F"],
      DAX: ["DAX", "^GDAXI", "GER40"],
      FTSE: ["FTSE", "^FTSE", "UK100"],
      CAC40: ["CAC40", "^FCHI", "FRA40"],
      NIKKEI: ["NIKKEI", "^N225", "JP225"],
      HSI: ["HSI", "^HSI", "HK50"],
      BTCUSD: ["BTCUSD", "BTC-USD", "BTC/USD"],
      "BTC-USD": ["BTCUSD", "BTC-USD", "BTC/USD"],
      "BTC/USD": ["BTCUSD", "BTC-USD", "BTC/USD"],
      XAUUSD: ["XAUUSD", "GC=F", "XAUUSD=X", "GOLD"],
      "GC=F": ["XAUUSD", "GC=F", "XAUUSD=X", "GOLD"],
      "XAUUSD=X": ["XAUUSD", "GC=F", "XAUUSD=X", "GOLD"],
      ETHUSD: ["ETHUSD", "ETH-USD", "ETH/USD"],
      "ETH-USD": ["ETHUSD", "ETH-USD", "ETH/USD"],
      "ETH/USD": ["ETHUSD", "ETH-USD", "ETH/USD"],
      XAGUSD: ["XAGUSD", "SI=F", "XAGUSD=X", "SILVER"],
      "SI=F": ["XAGUSD", "SI=F", "XAGUSD=X", "SILVER"],
      "XAGUSD=X": ["XAGUSD", "SI=F", "XAGUSD=X", "SILVER"],
      OIL: ["OIL", "WTI", "USOIL", "CL=F"],
      WTI: ["OIL", "WTI", "USOIL", "CL=F"],
      USOIL: ["OIL", "WTI", "USOIL", "CL=F"],
      "CL=F": ["OIL", "WTI", "USOIL", "CL=F"],
      BRENT: ["BRENT", "UKOIL", "BZ=F"],
      "BZ=F": ["BRENT", "UKOIL", "BZ=F"]
    };
    return map[s] || [s];
  }
  function displaySymbolFor(symbol) {
    const s = sym(symbol);
    if (["BTCUSD", "BTC-USD", "BTC/USD"].includes(s)) return "BTC/USD";
    if (["ETHUSD", "ETH-USD", "ETH/USD"].includes(s)) return "ETH/USD";
    if (["NAS100", "^NDX", "NQ=F"].includes(s)) return "NAS100";
    if (["US30", "^DJI", "YM=F"].includes(s)) return "US30";
    if (["SPX", "^GSPC", "ES=F"].includes(s)) return "SPX500";
    if (["^GDAXI", "GER40"].includes(s)) return "DAX";
    if (["^FTSE", "UK100"].includes(s)) return "FTSE";
    if (["^FCHI", "FRA40"].includes(s)) return "CAC40";
    if (["^N225", "JP225"].includes(s)) return "NIKKEI";
    if (["^HSI", "HK50"].includes(s)) return "HSI";
    if (["GC=F", "XAUUSD=X"].includes(s)) return "XAUUSD";
    if (["SI=F", "XAGUSD=X"].includes(s)) return "XAGUSD";
    if (["OIL", "USOIL", "CL=F"].includes(s)) return "Oil";
    if (["UKOIL", "BZ=F"].includes(s)) return "BRENT";
    return symbol;
  }
  function sparkline(asset, chg) {
    const series = arr(asset.history || asset.sparkline || asset.candles).map(p => num(p.close, p.c, p.price, p)).filter(v => v !== null);
    if (series.length < 2) return `<div class="leadership-sparkline empty">Ø§Ù„Ø´Ø§Ø±Øª ØºÙŠØ± Ù…ØªØ§Ø­</div>`;
    const min = Math.min(...series), max = Math.max(...series), rng = max - min || 1;
    const points = series.map((v, i) => `${(i / (series.length - 1) * 100).toFixed(2)},${(34 - (v - min) / rng * 30).toFixed(2)}`).join(" ");
    const tone = chg === null ? (series[series.length - 1] >= series[0] ? "up" : "down") : chg >= 0 ? "up" : "down";
    return `<svg class="leadership-sparkline" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true"><polyline class="${tone}" points="${points}"></polyline></svg>`;
  }
  function marketMap() {
    return `<div class="world-map" aria-hidden="true"><img class="world-map-img" src="/thesfm-trader-own/app/assets/world-dotted-map.png" alt="" aria-hidden="true" loading="lazy" />${SESSIONS.map(([c, top, left, kind, oH, cH], i) => { const st = sessionState(kind, oH, cH); return `<span class="map-node node-${i} ${st.open ? "is-open" : "is-closed"}" style="top:${top}%;left:${left}%"><i></i><b>${h(c)}</b><small>${st.open ? "Ù…ÙØªÙˆØ­" : "Ù…ØºÙ„Ù‚"} Â· ${h(st.label)}</small></span>`; }).join("")}
      <svg viewBox="0 0 900 360" preserveAspectRatio="none"><path d="M95 170 C220 80 325 210 458 132 S690 45 810 155"></path><path d="M120 235 C250 250 345 188 468 220 S650 300 800 230"></path><path d="M432 160 C470 195 520 215 590 202 S690 185 762 244"></path><path d="M150 120 C300 150 500 120 720 150"></path></svg></div>`;
  }
  function biasPanel(rec) {
    const b = marketBias(rec);
    return `<span class="eyebrow">AI MARKET ANALYSIS</span><h2>Ø§Ù„ØªØ­ÙŠÙ‘Ø² Ø§Ù„Ø¹Ø§Ù…</h2><strong class="bias-head state-${b.tone}">${h(b.en)}</strong>
      <div class="bias-rows">
        <div class="bias-row"><span>ØµØ§Ø¹Ø¯</span><div class="mo-bar"><i style="width:${b.bull}%"></i></div><b>${b.bull}%</b></div>
        <div class="bias-row"><span>Ù‡Ø§Ø¨Ø·</span><div class="mo-bar"><i class="bear" style="width:${b.bear}%"></i></div><b>${b.bear}%</b></div>
        <div class="bias-row"><span>Ù…Ø­Ø§ÙŠØ¯</span><div class="mo-bar"><i class="neut" style="width:${b.neutral}%"></i></div><b>${b.neutral}%</b></div>
      </div>`;
  }
  function exploreCarousel() {
    return `<section class="explore"><div class="explore-head"><span class="eyebrow">EXPLORE MARKETS</span></div><div class="explore-row">${EXPLORE.map(id => { const m = MARKETS.find(x => x.id === id); if (!m) return ""; return `<a class="explore-card" href="${ROOT}/markets/${m.id}" data-route-link><span class="ex-icon">${marketGlyph(m)}</span><strong>${h(m.en)}</strong><small>${h(m.ar)}</small></a>`; }).join("")}</div></section>`;
  }
  function watchlistTable(items, opts = {}) {
    const rows = items.map(x => {
      const a = norm(x), c = currency(a), hasSignal = Boolean(a.signal || a.recommendation || a.action || a.side || a.type), sig = hasSignal ? signal(a) : "";
      const conf = num(a.confidence, a.score, a.aiConfidence), p = num(a.price, a.lastPrice, a.regularMarketPrice, a.close, a.currentPrice);
      const chg = num(a.changePercent, a.percentChange), tgt = num(a.target, a.targetPrice, a.priceTarget), score = num(a.aiScore, a.score, a.rating);
      const risk = a.risk || a.riskLevel;
      const rm = opts.removable ? `<button class="icon-btn danger" data-remove-watch="${h(a.symbol)}" title="Ø¥Ø²Ø§Ù„Ø©">âœ•</button>` : "";
      return `<tr>
        <td class="wt-asset" data-label="Ø§Ù„Ø£ØµÙ„"><button data-symbol-details="${h(a.symbol)}">${logo(a)}<span><strong class="ltr">${h(a.symbol)}</strong><small>${h(a.name || "ØºÙŠØ± Ù…ØªØ§Ø­")}</small></span></button></td>
        <td class="ltr" data-label="Ø§Ù„Ø³Ø¹Ø±">${h(p === null ? "ØºÙŠØ± Ù…ØªØ§Ø­" : price(p, c))}</td>
        <td class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}" data-label="Ø§Ù„ØªØºÙŠØ±">${h(chg === null ? "ØºÙŠØ± Ù…ØªØ§Ø­" : change(chg))}</td>
        <td data-label="Ø§Ù„ØªÙˆØµÙŠØ©"><span class="state-badge ${sig === "buy" ? "ok" : sig === "sell" ? "warn" : ""}">${h(hasSignal ? sigLabel(sig) : "ØºÙŠØ± Ù…ØªØ§Ø­")}</span></td>
        <td class="ltr" data-label="Ø§Ù„Ø«Ù‚Ø©">${conf === null ? "ØºÙŠØ± Ù…ØªØ§Ø­" : Math.round(conf) + "%"}</td>
        <td class="ltr" data-label="Ø§Ù„Ù‡Ø¯Ù">${tgt === null ? "ØºÙŠØ± Ù…ØªØ§Ø­" : price(tgt, c)}</td>
        <td data-label="Ø§Ù„Ù…Ø¯Ø©">${h(a.timeframe || a.horizon || a.duration || "ØºÙŠØ± Ù…ØªØ§Ø­")}</td>
        <td data-label="Ø§Ù„Ù…Ø®Ø§Ø·Ø±Ø©">${risk ? `<span class="risk-pill ${riskTone(risk)}">${h(riskShort(risk))}</span>` : "ØºÙŠØ± Ù…ØªØ§Ø­"}</td>
        <td class="ltr" data-label="Ø³ÙƒÙˆØ± AI">${score === null ? "ØºÙŠØ± Ù…ØªØ§Ø­" : (score > 10 ? Math.round(score) + "%" : score.toFixed(1))}</td>
        <td class="row-actions" data-label="Ø¥Ø¬Ø±Ø§Ø¡"><button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}">ØªØ­Ù„ÙŠÙ„</button>${rm}</td>
      </tr>`;
    }).join("");
    return `<div class="table-shell watchlist-table"><table><thead><tr><th>Ø§Ù„Ø£ØµÙ„</th><th>Ø§Ù„Ø³Ø¹Ø±</th><th>Ø§Ù„ØªØºÙŠØ±</th><th>Ø§Ù„ØªÙˆØµÙŠØ©</th><th>Ø§Ù„Ø«Ù‚Ø©</th><th>Ø§Ù„Ù‡Ø¯Ù</th><th>Ø§Ù„Ù…Ø¯Ø©</th><th>Ø§Ù„Ù…Ø®Ø§Ø·Ø±Ø©</th><th>Ø³ÙƒÙˆØ± AI</th><th>Ø¥Ø¬Ø±Ø§Ø¡</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function recCards(items) { return `<div class="rec-grid">${items.map(recCard).join("")}</div>`; }
  function recCard(x) {
    const a = norm(x), c = currency(a), sig = signal(a), conf = num(a.confidence, a.score, a.aiConfidence);
    const p = num(a.price, a.lastPrice, a.currentPrice), tgt = num(a.target, a.targetPrice), sl = num(a.stopLoss, a.stop);
    return `<article class="rec-card ${sig}"><div class="asset-head">${logo(a)}<div class="asset-title"><strong class="ltr">${h(a.symbol)}</strong><small>${h(a.name || "--")}</small></div><span class="state-badge ${sig === "buy" ? "ok" : sig === "sell" ? "warn" : ""}">${h(sigLabel(sig))}</span></div>
      <div class="rec-metrics"><span>Ø§Ù„Ø³Ø¹Ø±<b class="ltr">${h(price(p, c))}</b></span><span>Ø§Ù„Ù‡Ø¯Ù<b class="ltr">${h(tgt === null ? "--" : price(tgt, c))}</b></span><span>ÙˆÙ‚Ù<b class="ltr">${h(sl === null ? "--" : price(sl, c))}</b></span><span>Ø«Ù‚Ø©<b>${conf === null ? "--" : Math.round(conf) + "%"}</b></span></div>
      <div class="rec-foot"><span class="status-tag ${recStatusTone(a)}">${h(recStatus(a))}</span><div class="row-actions compact-actions"><button class="action-btn sm" data-follow-trade="${h(a.symbol)}" type="button">Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„ØµÙÙ‚Ø©</button><button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}" type="button">ÙØªØ­ Ø§Ù„ØªØ­Ù„ÙŠÙ„</button></div></div></article>`;
  }
  function assetList(items) { return `<div class="watchlist-grid">${items.map(x => assetCard(norm(x))).join("")}</div>`; }
  function assetCard(asset, opts = {}) {
    const a = norm(asset), c = currency(a), hasSignal = Boolean(a.signal || a.recommendation || a.action || a.side || a.type), sig = hasSignal ? signal(a) : "", conf = num(a.confidence, a.score, a.aiConfidence), p = num(a.price, a.lastPrice, a.regularMarketPrice, a.close, a.currentPrice);
    const chg = num(a.changePercent, a.percentChange);
    const remove = opts.removable ? `<button class="danger-btn" data-remove-watch="${h(a.symbol)}">Ø¥Ø²Ø§Ù„Ø©</button>` : "";
    return `<article class="asset-card"><div class="asset-head">${logo(a)}<div class="asset-title"><strong class="symbol-code">${h(a.symbol || "--")}</strong><small>${h(a.name || a.companyName || "Ø§Ø³Ù… Ø§Ù„Ø£ØµÙ„ ØºÙŠØ± Ù…ØªÙˆÙØ±")}</small></div></div>
      <div class="badge-row"><span class="currency-badge">${h(c)}</span><span class="state-badge ${sig === "buy" ? "ok" : sig === "sell" ? "warn" : ""}">${h(hasSignal ? sigLabel(sig) : "ØºÙŠØ± Ù…ØªØ§Ø­")}</span><span class="status-tag">${h(recStatus(a))}</span></div>
      <div class="asset-metrics"><span>Ø§Ù„Ø³Ø¹Ø±<b class="ltr">${h(p === null ? "ØºÙŠØ± Ù…ØªØ§Ø­" : price(p, c))}</b></span><span>Ø§Ù„ØªØºÙŠÙŠØ±<b class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(chg === null ? "ØºÙŠØ± Ù…ØªØ§Ø­" : change(chg))}</b></span><span>Ø«Ù‚Ø© AI<b>${conf === null ? "ØºÙŠØ± Ù…ØªØ§Ø­" : `${Math.round(conf)}%`}</b></span></div>
      <div class="card-actions"><button class="action-btn" data-symbol-details="${h(a.symbol)}">ÙØªØ­ Ø§Ù„ØªØ­Ù„ÙŠÙ„</button><button class="ghost-btn" data-follow-trade="${h(a.symbol)}">Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„ØµÙÙ‚Ø©</button><button class="ghost-btn" data-quick-add="${h(a.symbol)}">Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©</button>${remove}</div></article>`;
  }
  function marketCard(m) {
    const visible = marketPreviewSymbols(m).slice(0, 8);
    const total = marketUniverseTotal(m);
    const hidden = Math.max(0, total - visible.length);
    const more = hidden ? `<span class="badge sm muted market-more"><span class="ltr">+${latinNumber(hidden)}</span></span>` : "";
    return `<a class="market-tile ${m.tone === "featured" ? "featured" : ""}" href="${ROOT}/markets/${m.id}" data-route-link data-market-card="${h(m.id)}"><div class="mt-top"><span class="ex-icon">${marketGlyph(m)}</span><span class="eyebrow">${h(m.en)}</span></div><strong>${h(m.ar)}</strong><p>${h(m.family)} Â· Ø§Ù„Ø¹Ù…Ù„Ø© <span class="ltr">${h(m.currency)}</span></p><div class="tile-tags">${visible.map(s => `<span class="badge sm"><span class="ltr">${h(s)}</span></span>`).join("")}${more}</div><span class="market-preview-count">${h(`ÙŠØ¹Ø±Ø¶ ${latinNumber(visible.length)} Ù…Ù† ${latinNumber(total)} Ø±Ù…Ø²`)} Â· <span class="ltr">${h(`Showing ${visible.length} of ${total} symbols`)}</span></span><span class="market-card-action">${marketActionLabel(m)}</span></a>`;
  }
  function heatmap(items) {
    return `<div class="heatmap">${items.slice(0, 24).map(x => { const a = norm(x), sig = signal(a), chg = num(a.changePercent, a.percentChange); return `<button class="heat-cell ${chg === null ? "unavailable" : sig}" data-symbol-details="${h(a.symbol)}">${logo(a, "sm")}<strong class="ltr">${h(a.symbol)}</strong><small class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(chg === null ? "ØºÙŠØ± Ù…ØªØ§Ø­" : change(chg))}</small><em>${h(sigLabel(sig))}</em></button>`; }).join("")}</div>`;
  }
  function holdingsTable(items) {
    const rows = items.map((p, i) => { const a = norm(p.rec || { symbol: p.symbol }), c = currency({ symbol: p.symbol }), cur = num(a.price, a.currentPrice), qty = num(p.qty) || 0, entry = num(p.entry) || 0, val = cur !== null ? cur * qty : null, pl = cur !== null ? (cur - entry) * qty : null;
      return `<tr><td class="wt-asset"><button data-symbol-details="${h(p.symbol)}">${logo({ symbol: p.symbol })}<span><strong class="ltr">${h(p.symbol)}</strong></span></button></td><td class="ltr">${qty}</td><td class="ltr">${price(entry, c)}</td><td class="ltr">${cur === null ? "--" : price(cur, c)}</td><td class="ltr">${val === null ? "--" : price(val, c)}</td><td class="ltr ${pl === null ? "" : pl >= 0 ? "up" : "down"}">${pl === null ? "--" : price(pl, c)}</td><td><button class="icon-btn danger" data-remove-holding="${i}">âœ•</button></td></tr>`; }).join("");
    return `<div class="table-shell"><table><thead><tr><th>Ø§Ù„Ø£ØµÙ„</th><th>Ø§Ù„ÙƒÙ…ÙŠØ©</th><th>Ø§Ù„Ø¯Ø®ÙˆÙ„</th><th>Ø§Ù„Ø­Ø§Ù„ÙŠ</th><th>Ø§Ù„Ù‚ÙŠÙ…Ø©</th><th>Ø±/Ø®</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function holdingForm() { return `<form id="holding-form" class="inline-form"><input name="symbol" dir="ltr" placeholder="Ø§Ù„Ø±Ù…Ø²" /><input name="qty" inputmode="decimal" placeholder="Ø§Ù„ÙƒÙ…ÙŠØ©" /><input name="entry" inputmode="decimal" placeholder="Ø³Ø¹Ø± Ø§Ù„Ø¯Ø®ÙˆÙ„" /><button class="action-btn" type="submit">Ø¥Ø¶Ø§ÙØ© Ù…Ø±ÙƒØ²</button></form>`; }
  function tradeProviderStatus(items) {
    const status = state.followed.dataStatus || {};
    const p = state.followed.dataProvider || state.provider || {};
    const provider = status.provider || providerName(p.active || p.provider) || "";
    const rows = [
      ["Ù…Ø²ÙˆØ¯ Ø§Ù„Ø£Ø³Ø¹Ø§Ø±", provider],
      ["Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«", latinDateTime(status.lastUpdated || new Date().toISOString())],
      ["Ø¹Ø¯Ø¯ Ø§Ù„ØµÙÙ‚Ø§Øª Ø§Ù„Ù…Ø­ÙÙˆØ¸Ø©", latinNumber(status.savedTrades ?? items.length)],
      ["ØªÙ… ØªØ­Ø¯ÙŠØ« Ø³Ø¹Ø±Ù‡Ø§", latinNumber(status.updatedPrices ?? items.filter(x => x.priceUpdated || num(x.currentPrice, x.current) !== null).length)],
      ["Ø¨Ø¯ÙˆÙ† Ø¨ÙŠØ§Ù†Ø§Øª Ø³Ø¹Ø±", latinNumber(status.missingPrices ?? items.filter(x => x.priceMessage || num(x.currentPrice, x.current) === null).length)]
    ];
    const message = formatProviderError(status.message, { empty: "" });
    return `<section class="panel trade-data-status"><div class="panel-head"><div><span class="eyebrow">DATA SOURCE</span><h2>Ø­Ø§Ù„Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£Ø¯Ø§Ø¡</h2></div><button class="ghost-btn" data-refresh-trades>ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø£Ø³Ø¹Ø§Ø±</button></div><div class="trade-status-grid">${rows.map(([label, value]) => `<span><small>${h(label)}</small><b class="ltr">${h(String(value || "--"))}</b></span>`).join("")}</div>${message ? `<p class="muted-note">${h(message)}</p>` : ""}</section>`;
  }
  function performanceEmptyState() {
    return `<section class="empty-state trade-empty-state">
      <span class="empty-glyph">â—Ž</span>
      <h3>Ù„Ø§ ØªÙˆØ¬Ø¯ ØµÙÙ‚Ø§Øª Ù…ØªØ§Ø¨Ø¹Ø© Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†</h3>
      <p>Ø³ØªØ¸Ù‡Ø± Ù‡Ù†Ø§ Ù†ØªØ§Ø¦Ø¬ Ø¥Ø´Ø§Ø±Ø§Øª Ø§Ù„Ø´Ø±Ø§Ø¡ ÙˆØ§Ù„Ø¨ÙŠØ¹ Ø¨Ø¹Ø¯ Ø­ÙØ¸Ù‡Ø§ Ø£Ùˆ Ù…ØªØ§Ø¨Ø¹ØªÙ‡Ø§ Ù…Ù† ØµÙØ­Ø© Ø§Ù„ØªÙˆØµÙŠØ§Øª Ø£Ùˆ Ø§Ù„ØªØ­Ù„ÙŠÙ„.</p>
      <div class="row-actions">
        <a class="action-btn" href="${ROOT}/recommendations" data-route-link>ÙØªØ­ Ø§Ù„ØªÙˆØµÙŠØ§Øª</a>
        <button class="ghost-btn" data-run-signals type="button">ØªØ´ØºÙŠÙ„ ÙØ­Øµ Ø§Ù„Ø¥Ø´Ø§Ø±Ø§Øª</button>
        <a class="ghost-btn" href="#followed-trade-form">Ø¥Ø¶Ø§ÙØ© ØµÙÙ‚Ø© Ù…ØªØ§Ø¨Ø¹Ø©</a>
      </div>
    </section>`;
  }
  function followedTradeForm() {
    return `<section class="panel trade-manual-panel"><div class="panel-head"><div><span class="eyebrow">MANUAL TRACK</span><h2>Ø¥Ø¶Ø§ÙØ© ØµÙÙ‚Ø© Ù…ØªØ§Ø¨Ø¹Ø©</h2></div></div>
      <form id="followed-trade-form" class="trade-form-grid">
        <label>Ø§Ù„Ø±Ù…Ø²<input name="symbol" dir="ltr" placeholder="AAPL" required /></label>
        <label>Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡<select name="action"><option value="buy">buy</option><option value="sell">sell</option><option value="wait">wait</option><option value="watch">watch</option></select></label>
        <label>Ø³Ø¹Ø± Ø§Ù„Ø¯Ø®ÙˆÙ„<input name="entryPrice" inputmode="decimal" placeholder="0.00" required /></label>
        <label>Ø§Ù„Ù‡Ø¯Ù<input name="targetPrice" inputmode="decimal" placeholder="0.00" /></label>
        <label>ÙˆÙ‚Ù Ø§Ù„Ø®Ø³Ø§Ø±Ø©<input name="stopLoss" inputmode="decimal" placeholder="0.00" /></label>
        <label>Ø§Ù„Ø«Ù‚Ø©<input name="confidence" inputmode="numeric" placeholder="Ø§Ø®ØªÙŠØ§Ø±ÙŠ" /></label>
        <label class="wide">Ù…Ù„Ø§Ø­Ø¸Ø§Øª<input name="notes" placeholder="Ø§Ø®ØªÙŠØ§Ø±ÙŠ" /></label>
        <button class="action-btn" type="submit">Ø¥Ø¶Ø§ÙØ© ØµÙÙ‚Ø© Ù…ØªØ§Ø¨Ø¹Ø©</button>
      </form>
    </section>`;
  }
  function allocation(items) {
    if (!items.length) return miniEmpty();
    const groups = {};
    items.forEach(p => { const t = assetType(p.symbol); const cost = (num(p.qty) || 0) * (num(p.entry) || 0); groups[t] = (groups[t] || 0) + cost; });
    const total = Object.values(groups).reduce((a, b) => a + b, 0) || 1;
    const TYPE_AR = { stock: "Ø£Ø³Ù‡Ù…", crypto: "ÙƒØ±ÙŠØ¨ØªÙˆ", commodity: "Ø³Ù„Ø¹", forex: "Ø¹Ù…Ù„Ø§Øª", fund: "ØµÙ†Ø§Ø¯ÙŠÙ‚", index: "Ù…Ø¤Ø´Ø±Ø§Øª" };
    return `<div class="alloc">${Object.entries(groups).map(([t, v]) => `<div class="alloc-row"><span>${h(TYPE_AR[t] || t)}</span><div class="mo-bar"><i style="width:${Math.round(v / total * 100)}%"></i></div><b>${Math.round(v / total * 100)}%</b></div>`).join("")}</div>`;
  }
  function tradeCol(title, items, tone) { return `<article class="trade-column ${tone}"><h3>${h(title)} <span class="col-count">${items.length}</span></h3>${items.length ? items.map(tradeCard).join("") : `<div class="trade-mini-empty">Ù„Ø§ ØªÙˆØ¬Ø¯ ØµÙÙ‚Ø§Øª ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„ØªØµÙ†ÙŠÙ.</div>`}</article>`; }
  function tradeCard(t) {
    const s = sym(t.symbol || t.ticker || t.asset || "--"), a = norm({ ...t, symbol: s }), c = currency(a), pnl = num(t.profitLossPercent, t.pnl, t.profitLoss, t.returnPercent), sig = tradeAction(t);
    const status = tradeStatus(t), current = num(t.currentPrice, t.current), entry = num(t.entryPrice, t.entry), target = num(t.targetPrice, t.target), stop = num(t.stopLoss, t.stop);
    return `<article class="trade-item"><div class="asset-head">${logo({ symbol: s })}<div class="asset-title"><strong class="ltr">${h(s)}</strong><small>${h(a.name || t.status || "Ù…ØªØ§Ø¨Ø¹Ø©")}</small></div></div>
      <div class="badge-row"><span class="state-badge ${sig === "buy" ? "ok" : sig === "sell" ? "warn" : ""}">${h(sigLabel(sig))}</span><span class="status-tag ${tradeStatusTone(status)}">${h(tradeStatusLabel(status))}</span></div>
      <div class="trade-row"><span>Ø§Ù„Ø¯Ø®ÙˆÙ„<b class="ltr">${h(price(entry, c))}</b></span><span>Ø§Ù„Ø­Ø§Ù„ÙŠ<b class="ltr">${h(current === null ? "--" : price(current, c))}</b></span><span>P/L<b class="${pnl === null ? "" : pnl >= 0 ? "up" : "down"}">${pnl === null ? "--" : pnl + "%"}</b></span></div>
      <div class="trade-row"><span>Ø§Ù„Ù‡Ø¯Ù<b class="ltr">${h(price(target, c))}</b></span><span>ÙˆÙ‚Ù Ø§Ù„Ø®Ø³Ø§Ø±Ø©<b class="ltr">${h(price(stop, c))}</b></span><span>Ø§Ù„Ø«Ù‚Ø©<b class="ltr">${h(t.confidence == null ? "--" : Math.round(Number(t.confidence)) + "%")}</b></span></div>
      ${t.priceMessage ? `<p class="trade-warning">${h(t.priceMessage)}</p>` : ""}
      <div class="rec-foot"><small>${h(providerName(t.provider) || t.sourceType || "--")}</small><button class="ghost-btn sm" data-symbol-details="${h(s)}">ÙØªØ­ Ø§Ù„ØªØ­Ù„ÙŠÙ„</button></div></article>`;
  }
  function tradeList(items) { return `<div class="trade-list">${items.map(tradeCard).join("")}</div>`; }
  function tradeJournalTable(items) {
    const rows = items.map(t => { const s = sym(t.symbol || t.asset || "--"), c = currency({ symbol: s, currency: t.currency }), pnl = num(t.profitLossPercent, t.pnl, t.profitLoss, t.returnPercent), status = tradeStatus(t);
      return `<tr><td class="wt-asset" data-label="Ø§Ù„Ø±Ù…Ø²"><button data-symbol-details="${h(s)}">${logo({ symbol: s })}<span><strong class="ltr">${h(s)}</strong><small>${h(t.assetName || t.name || "--")}</small></span></button></td><td data-label="Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡">${h(sigLabel(tradeAction(t)))}</td><td class="ltr" data-label="Ø§Ù„Ø¯Ø®ÙˆÙ„">${h(price(num(t.entryPrice, t.entry), c))}</td><td class="ltr" data-label="Ø§Ù„Ø­Ø§Ù„ÙŠ">${h(price(num(t.currentPrice, t.current), c))}</td><td class="ltr" data-label="Ø§Ù„Ù‡Ø¯Ù">${h(price(num(t.targetPrice, t.target), c))}</td><td class="ltr" data-label="ÙˆÙ‚Ù Ø§Ù„Ø®Ø³Ø§Ø±Ø©">${h(price(num(t.stopLoss, t.stop), c))}</td><td class="ltr ${pnl === null ? "" : pnl >= 0 ? "up" : "down"}" data-label="P/L">${pnl === null ? "--" : pnl + "%"}</td><td data-label="Ø§Ù„Ø­Ø§Ù„Ø©"><span class="status-tag ${tradeStatusTone(status)}">${h(tradeStatusLabel(status))}</span></td><td data-label="Ø§Ù„Ù…ØµØ¯Ø±">${h(providerName(t.provider) || t.sourceType || "--")}</td></tr>`; }).join("");
    return `<div class="table-shell trade-journal-table"><table><thead><tr><th>Ø§Ù„Ø±Ù…Ø²</th><th>Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡</th><th>Ø§Ù„Ø¯Ø®ÙˆÙ„</th><th>Ø§Ù„Ø­Ø§Ù„ÙŠ</th><th>Ø§Ù„Ù‡Ø¯Ù</th><th>ÙˆÙ‚Ù Ø§Ù„Ø®Ø³Ø§Ø±Ø©</th><th>P/L</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th><th>Ø§Ù„Ù…ØµØ¯Ø±</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function newsList(items) { return `<div class="news-list">${items.map(newsCard).join("")}</div>`; }
  function newsCard(n) {
    const title = n.title || n.headline || n.name || "Ø®Ø¨Ø± Ø¨Ø¯ÙˆÙ† Ø¹Ù†ÙˆØ§Ù†", src = n.source || n.publisher || n.provider || "Market news", when = date(n.publishedAt || n.datetime || n.date || n.createdAt), url = n.url || n.link || "", text = n.summary || n.description || n.text || "", impact = (n.impact || n.sentiment || "").toString().toLowerCase();
    const syms = arr(n.symbols || n.relatedSymbols).slice(0, 3);
    return `<article class="news-card"><div class="news-meta"><span>${h(src)} Â· ${h(when)}</span>${impact ? `<span class="impact ${impact.includes("high") || impact.includes("bull") ? "ok" : impact.includes("low") ? "" : "warn"}">${h(impact)}</span>` : ""}</div><strong>${h(title)}</strong>${text ? `<p>${h(text)}</p>` : ""}${syms.length ? `<div class="news-syms">${syms.map(s => `<button class="badge sm" data-symbol-details="${h(s)}"><span class="ltr">${h(sym(s))}</span></button>`).join("")}</div>` : ""}${url ? `<a class="ghost-btn sm" href="${h(url)}" target="_blank" rel="noopener">Ø§Ù„Ù…ØµØ¯Ø±</a>` : ""}</article>`;
  }
  function relatedNews(symbol, detail = {}) {
    const detailNews = arr(detail.news && (detail.news.items || detail.news.articles || detail.news.news || detail.news.data || detail.news.results));
    const sourceItems = detailNews.length ? detailNews : newsItems();
    const items = sourceItems.filter(n => {
      const symbols = arr(n.symbols || n.relatedSymbols).map(sym);
      return symbols.includes(sym(symbol)) || (detailNews.length && n.relevanceScore);
    }).slice(0, 3);
    return items.length ? newsList(items) : `<p class="muted-note">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ø®Ø¨Ø§Ø± Ù…Ø±ØªØ¨Ø·Ø© Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯ Ù„Ù‡Ø°Ø§ Ø§Ù„Ø±Ù…Ø².</p>`;
  }
  function alertList(items) { return `<div class="trade-list">${items.map(i => `<article class="trade-item"><strong>${h(i.title || i.symbol || i.name || "ØªÙ†Ø¨ÙŠÙ‡")}</strong><p>${h(formatProviderError(i.message || i.reason || i.description || "ØªÙ†Ø¨ÙŠÙ‡ Ø¨Ø¯ÙˆÙ† ØªÙØ§ØµÙŠÙ„ Ø¥Ø¶Ø§ÙÙŠØ©."))}</p>${i.symbol ? `<button class="ghost-btn sm" data-symbol-details="${h(i.symbol)}">ÙØªØ­ Ø§Ù„Ø±Ù…Ø²</button>` : ""}</article>`).join("")}</div>`; }
  function localAlertRow(a, i) { const T = { price: "Ø³Ø¹Ø±", percent: "Ù†Ø³Ø¨Ø© %", signal: "Ø¥Ø´Ø§Ø±Ø© AI", news: "Ø®Ø¨Ø±" }; return `<article class="trade-item alert-row"><div><strong class="ltr">${h(a.symbol)}</strong><p>${h(T[a.type] || a.type)}${a.value ? " Â· " + h(a.value) : ""} Â· ${h(date(a.createdAt))}</p></div><button class="icon-btn danger" data-del-alert="${i}">âœ•</button></article>`; }

  function systemCard() {
    const s = providerCopy();
    const retry = s.showRetry ? `<button class="ghost-btn compact-btn" data-retry>${h(s.retryLabel)}</button>` : "";
    return `<article class="status-card provider-status-card is-${s.className}"><span class="eyebrow">SYSTEM</span><strong>${h(s.title)}</strong><p>${h(s.copy)}</p><span class="state-badge ${s.tone}">${h(s.label)}</span>${retry}</article>`;
  }
  function diagnostics() {
    const normalized = normalizedProviderStatus();
    const providerStatus = providerCopy();
    const tone = normalizedStatusTone(normalized.status);
    const cards = [
      ["Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø²ÙˆØ¯", providerStatus.label, "Status", tone],
      ["Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ù†Ø´Ø·", normalized.provider, "Provider", ""],
      ["Ø­Ø§Ù„Ø© Ø§Ù„Ø§ØªØµØ§Ù„", normalized.configured ? "Ù…Ù‡ÙŠØ£" : "ØºÙŠØ± Ù…Ù‡ÙŠØ£", "Connection", normalized.configured ? "ok" : "warn"],
      ["Ø¹Ø¯Ø¯ Ø§Ù„Ø±Ù…ÙˆØ² Ø§Ù„Ù…ÙƒØªØ´ÙØ©", countText(normalized.discoveredCount), "Discovered", ""],
      ["Ø¹Ø¯Ø¯ Ø§Ù„Ø±Ù…ÙˆØ² Ø§Ù„Ù…Ø­Ù…Ù„Ø©", countText(normalized.loadedCount), "Loaded", "ok"],
      ["Ø¹Ø¯Ø¯ Ø§Ù„Ø±Ù…ÙˆØ² Ù…Ù† Ø§Ù„ÙƒØ§Ø´", countText(normalized.cachedCount), "Cached", normalized.cachedCount > 0 ? "ok" : ""],
      ["Ø¹Ø¯Ø¯ Ø§Ù„Ø±Ù…ÙˆØ² Ø§Ù„Ù…ØªØ¹Ø«Ø±Ø©", countText(normalized.failedCount), "Failed", normalized.failedCount > 0 ? "warn" : ""],
      ["Ø¹Ø¯Ø¯ Ø§Ù„Ø±Ù…ÙˆØ² Ø§Ù„Ù…ØªØ®Ø·Ø§Ø©", countText(normalized.skippedCount), "Skipped", normalized.skippedCount > 0 ? "warn" : ""],
      ["Ø­Ø§Ù„Ø© Ø§Ù„ÙƒØ§Ø´", cacheStatusLabel(normalized.cacheStatus), "Cache", ""],
      ["Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«", latinDateTime(normalized.lastUpdated), "Updated", ""]
    ];
    const featureList = normalized.supportedFeatures.length ? normalized.supportedFeatures.map(featureLabel).join(" Â· ") : "--";
    const errorText = formatProviderError(normalized.errorSummary, { empty: "" }) || providerStatus.explanation;
    const errorSummary = errorText ? `<p class="provider-warning">${h(errorText)}</p>` : "";
    const retryAction = providerStatus.showRetry ? `<button class="ghost-btn compact-btn provider-status-retry" data-retry>${h(providerStatus.retryLabel)}</button>` : "";
    return `<div class="provider-diagnostics-ui">
      <div class="provider-status-banner ${tone}">
        <div><span class="eyebrow">PROVIDER</span><strong>${h(normalized.provider)}</strong><p>${h(providerStatus.title)}</p></div>
        <div class="provider-status-actions"><span class="state-badge ${tone}">${h(normalized.configured ? "Ù…Ù‡ÙŠØ£" : "ØºÙŠØ± Ù…Ù‡ÙŠØ£")}</span>${retryAction}</div>
      </div>
      ${errorSummary}
      <div class="provider-status-cards">${cards.map(([label, value, helper, cardTone]) => providerMetricCard(label, value, helper, cardTone)).join("")}</div>
      <div class="provider-feature-strip"><span>Ø§Ù„Ù…ÙŠØ²Ø§Øª Ø§Ù„Ù…Ø¯Ø¹ÙˆÙ…Ø©</span><b>${h(featureList)}</b></div>
      ${diagnosticDetails(normalized)}
    </div>`;
  }
  function normalizedProviderStatus() {
    const ps = state.providerStatus || {}, raw = ps.normalizedStatus || {};
    const p = ps.dataProvider || state.provider || {};
    const diag = ps.diagnostics || state.markets.diagnostics || (state.rec && state.rec.symbolDiscovery) || {};
    const summary = ps.summary || diag.summary || state.rec.summary || {};
    const failedRows = arr(ps.failed).concat(arr(state.rec.failed), arr(state.markets.failed));
    const skippedRows = arr(ps.skipped).concat(arr(state.rec.skipped), arr(state.markets.skipped));
    const status = normalizeStatusKey(raw.status || p.status || providerCopy().statusKey);
    const loadedCount = numberValue(raw.loadedCount, summary.loadedSymbols, diag.totalSymbolsLoaded, ps.resultCount, state.markets.resultCount);
    const failedCount = numberValue(raw.failedCount, summary.failedSymbols, failedRows.length);
    const cachedCount = numberValue(raw.cachedCount, summary.cachedSymbols);
    const skippedCount = numberValue(raw.skippedCount, summary.skippedDueToRateLimit, skippedRows.length);
    const discoveredCount = numberValue(diag.totalSymbolsDiscovered, loadedCount);
    const errorSummary = raw.errorSummary || formatProviderError(p.failureReason || ps.providers?.fmp?.error || state.rec.message || state.markets.message || null, { empty: "" });
    return {
      provider: providerName(raw.provider || p.active || p.requested || p.provider || "FMP"),
      configured: raw.configured !== undefined ? Boolean(raw.configured) : p.configured === true || Boolean(p.active || p.provider),
      status,
      supportedFeatures: arr(raw.supportedFeatures || p.supportedFeatures),
      loadedCount,
      failedCount,
      cachedCount,
      skippedCount,
      discoveredCount,
      lastUpdated: raw.lastUpdated || p.lastUpdated || ps.generatedAt || diag.generatedAt || null,
      cacheStatus: diag.cacheStatus || state.rec.cacheStatus || state.markets.cacheStatus || (cachedCount > 0 ? "hit" : "disabled"),
      errorSummary,
      diagnosticGroups: arr(ps.diagnosticGroups)
    };
  }
  function providerMetricCard(label, value, helper, tone) {
    return `<article class="provider-metric-card ${tone || ""}">
      <span>${h(helper)}</span>
      <strong class="${isLatinMetric(value) ? "ltr" : ""}">${h(formatProviderValue(value))}</strong>
      <small>${h(label)}</small>
    </article>`;
  }
  function diagnosticDetails(normalized) {
    const groups = normalized.diagnosticGroups.length ? normalized.diagnosticGroups : groupedProviderDiagnostics();
    if (!groups.length) {
      return `<details class="provider-diagnostics-panel"><summary>ØªÙØ§ØµÙŠÙ„ Ø§Ù„ØªØ´Ø®ÙŠØµ</summary><p class="provider-clean-note">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ø®Ø·Ø§Ø¡ Ù…Ø²ÙˆØ¯ Ù†Ø´Ø·Ø© Ù„Ù„Ø¹Ø±Ø¶.</p></details>`;
    }
    return `<details class="provider-diagnostics-panel">
      <summary>ØªÙØ§ØµÙŠÙ„ Ø§Ù„ØªØ´Ø®ÙŠØµ</summary>
      <div class="provider-diagnostic-groups">${groups.map(group => {
        const details = arr(group.details).slice(0, 12);
        return `<section class="provider-diagnostic-group">
          <strong>${h(formatProviderError(group.summary || group.reason || group.status))}</strong>
          ${details.length ? `<ul>${details.map(detail => `<li><code class="ltr">${h(detail.route || detail.symbol || "route")}</code><span>${h(formatProviderError(detail.reason || group.status))}</span></li>`).join("")}</ul>` : ""}
        </section>`;
      }).join("")}</div>
    </details>`;
  }
  function groupedProviderDiagnostics() {
    const ps = state.providerStatus || {};
    const rows = arr(ps.failed).concat(arr(state.rec.failed), arr(state.markets.failed), arr(ps.skipped), arr(state.rec.skipped), arr(state.markets.skipped));
    const groups = [];
    const seenRoutes = new Set();
    const rateLimited = rows.filter(row => isRateLimitText(row && (row.reason || row.error || row.message || row.status)));
    if (rateLimited.length) {
      const details = rateLimited.map(row => ({ route: providerRouteLabel(row.symbol || row.route || row.endpoint || row.reason), reason: "provider_rate_limited" }))
        .filter(item => {
          const key = item.route.toLowerCase();
          if (seenRoutes.has(key)) return false;
          seenRoutes.add(key);
          return true;
        });
      groups.push({
        provider: "FMP",
        status: "rate_limited",
        summary: `FMP: ØªÙ… Ø§Ù„ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ Ø­Ø¯ Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… ÙÙŠ ${details.length || rateLimited.length} Ù…Ø³Ø§Ø±Ø§Øª`,
        details
      });
    }
    return groups;
  }
  function formatProviderError(error, options = {}) {
    const empty = options.empty === undefined ? "--" : options.empty;
    if (error === null || error === undefined || error === "") return empty;
    let value = "";
    if (typeof error === "object") {
      if (Array.isArray(error)) value = error.map(item => formatProviderError(item, { empty: "" })).filter(Boolean).join(" Â· ");
      else value = error.message || error.errorSummary || error.reason || error.code || error.status || error.name || "";
    } else {
      value = String(error);
    }
    value = String(value).replace(/\s+/g, " ").trim();
    if (!value || value === "[object Object]") return empty;
    if (isRateLimitText(value)) return "ØªÙ… Ø§Ù„ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ Ø­Ø¯ Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø¤Ù‚ØªØ§Ù‹";
    const lower = value.toLowerCase();
    if (/^provider_status_/i.test(lower)) return getProviderStatusMessage(lower);
    if (lower.includes("fmp_not_configured")) return "FMP ØºÙŠØ± Ù…Ù‡ÙŠØ£";
    if (lower.includes("provider_not_configured") || lower.includes("missing_provider")) return "Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± Ù…Ù‡ÙŠØ£";
    if (/^[a-z0-9_-]+_not_configured$/i.test(value)) return "Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± Ù…Ù‡ÙŠØ£";
    if (lower.includes("provider_temporarily_unavailable")) return "Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± Ù…ØªØ§Ø­ Ù…Ø¤Ù‚ØªØ§Ù‹";
    if (lower.includes("provider_access_denied") || lower.includes("unauthorized") || lower.includes("forbidden")) return "ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„Ù…Ø²ÙˆØ¯ Ù„Ø§ ØªØ³Ù…Ø­ Ø¨Ø¹Ø±Ø¶ Ù‡Ø°Ù‡ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª";
    if (/^[a-z0-9_-]+_[a-z0-9_-]+$/i.test(value)) return "ØªØ¹Ø°Ø± ØªØ­Ø¯ÙŠØ« Ø£Ø­Ø¯ Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø²ÙˆØ¯";
    return value.length > 140 ? `${value.slice(0, 137).trim()}...` : value;
  }
  function formatProviderValue(value) {
    if (typeof value === "object" && value !== null) return formatProviderError(value);
    return value === null || value === undefined || value === "" ? "--" : String(value);
  }
  function normalizeStatusKey(status) {
    const value = String(status || "").toLowerCase();
    if (value === "provider_status_available") return "available";
    if (value === "provider_status_partial") return "partial";
    if (value === "provider_status_failed") return "error";
    if (value === "provider_status_loading") return "missing";
    if (value === "provider_status_unknown") return "missing";
    if (value === "rate_limited" || isRateLimitText(value)) return "rate_limited";
    if (["healthy", "success", "available", "configured", "connected"].includes(value)) return "available";
    if (["partial", "degraded"].includes(value)) return "partial";
    if (["missing", "not_configured", "missing_provider"].includes(value)) return "missing";
    if (["provider_error", "error", "invalid_request", "unauthorized", "forbidden", "not_entitled"].includes(value)) return "error";
    return value || "missing";
  }
  function normalizedStatusTone(status) {
    if (status === "available") return "ok";
    if (status === "rate_limited" || status === "partial") return "warn";
    return "";
  }
  function numberValue(...values) {
    for (const value of values) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  }
  function countText(value) { return `${latinNumber(numberValue(value))} Ø±Ù…Ø²`; }
  function cacheStatusLabel(value) {
    const status = String(value || "").toLowerCase();
    if (status === "hit") return "Ø§Ù„ÙƒØ§Ø´ Ù…ØªØ§Ø­";
    if (status === "stale") return "ÙƒØ§Ø´ Ù‚Ø¯ÙŠÙ… Ù…Ø³ØªØ®Ø¯Ù…";
    if (status === "miss") return "ØªØ­Ø¯ÙŠØ« Ù…Ø¨Ø§Ø´Ø±";
    if (status === "provider-cache") return "ÙƒØ§Ø´ Ø§Ù„Ù…Ø²ÙˆØ¯";
    if (status === "live") return "Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø¨Ø§Ø´Ø±Ø©";
    if (status === "disabled") return "ØºÙŠØ± Ù…Ø³ØªØ®Ø¯Ù…";
    return formatProviderValue(value);
  }
  function featureLabel(value) {
    const labels = { prices: "Ø£Ø³Ø¹Ø§Ø±", quotes: "Ø£Ø³Ø¹Ø§Ø±", symbols: "Ø±Ù…ÙˆØ²", earnings: "Ø£Ø±Ø¨Ø§Ø­", dividends: "ØªÙˆØ²ÙŠØ¹Ø§Øª", ipos: "Ø§ÙƒØªØªØ§Ø¨Ø§Øª", economic: "ØªÙ‚ÙˆÙŠÙ… Ø§Ù‚ØªØµØ§Ø¯ÙŠ", economicCalendar: "ØªÙ‚ÙˆÙŠÙ… Ø§Ù‚ØªØµØ§Ø¯ÙŠ", news: "Ø£Ø®Ø¨Ø§Ø±", technicalAnalysis: "ØªØ­Ù„ÙŠÙ„ ÙÙ†ÙŠ" };
    return labels[value] || value;
  }
  function providerRouteLabel(value) {
    const key = String(value || "").trim();
    const labels = { "stock-list": "stock list", "etf-list": "ETF list", "indexes-list": "indexes list", "batch-forex-quotes": "forex quotes", "batch-crypto-quotes": "crypto quotes", "batch-commodity-quotes": "commodity quotes", "batch-index-quotes": "index quotes", "batch-quote": "stock quotes" };
    return labels[key] || key.replace(/^fmp_/, "").replace(/_http_429$/i, "").replace(/_/g, " ") || "provider route";
  }
  function isRateLimitText(value) { return /429|rate_limited|rate limit|too many|provider_rate_limited|http_429/i.test(String(value || "")); }
  function isLatinMetric(value) { return /^[\d\s.,:%A-Za-z/_-]+$/.test(String(value || "")); }
  function featureTitle(key) { return key === "earnings" ? "Ø§Ù„Ø£Ø±Ø¨Ø§Ø­" : key === "dividends" ? "Ø§Ù„ØªÙˆØ²ÙŠØ¹Ø§Øª" : key === "ipos" ? "Ø§Ù„Ø§ÙƒØªØªØ§Ø¨Ø§Øª" : key === "economic" ? "Ø§Ù„Ø§Ù‚ØªØµØ§Ø¯ÙŠ" : key; }
  function providerMarkets() {
    const rows = arr(state.markets.markets || state.markets.data || state.markets.results);
    const diagnostics = state.markets.providerMarketsDiagnostics || {};
    const pagination = state.markets.pagination || {};
    const fmt = value => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed.toLocaleString("en-US") : "--";
    };
    const stats = [
      ["Visible", fmt(pagination.total ?? diagnostics.visibleRows ?? rows.length), "After filters"],
      ["Loaded", fmt(diagnostics.totalRows ?? rows.length), "Deduped catalog"],
      ["Hidden", fmt(diagnostics.hiddenIncompleteRows), "Incomplete rows"],
      ["Duplicates", fmt(diagnostics.duplicateRows), "Merged rows"],
    ];
    return `<div class="provider-market-diagnostics-compact">
      <div class="panel-head">
        <div><span class="eyebrow">ADMIN DIAGNOSTICS</span><h2>Provider markets summary</h2></div>
        <a class="ghost-btn compact-btn" href="${ROOT}/settings" data-route-link>Settings</a>
      </div>
      <p class="provider-market-note">${h(state.markets.message || "Detailed provider market rows are available under Settings / Admin diagnostics.")}</p>
      <div class="provider-market-summary-grid">${stats.map(([label, value, helper]) => `
        <article class="provider-market-summary-card">
          <span>${h(helper)}</span>
          <strong class="ltr">${h(value)}</strong>
          <small>${h(label)}</small>
        </article>`).join("")}</div>
    </div>`;
  }
  function confBuckets(r) { const b = { high: 0, mid: 0, low: 0 }; r.forEach(x => { const c = num(x.confidence, x.score, x.aiConfidence); if (c === null) return; if (c >= 70) b.high++; else if (c >= 45) b.mid++; else b.low++; }); return b; }
  function confBars(b) { const max = Math.max(1, b.high, b.mid, b.low); return `<div class="conf-bars"><div class="bias-row"><span>Ø¹Ø§Ù„ÙŠØ©</span><div class="mo-bar"><i style="width:${b.high / max * 100}%"></i></div><b>${b.high}</b></div><div class="bias-row"><span>Ù…ØªÙˆØ³Ø·Ø©</span><div class="mo-bar"><i class="conf" style="width:${b.mid / max * 100}%"></i></div><b>${b.mid}</b></div><div class="bias-row"><span>Ù…Ù†Ø®ÙØ¶Ø©</span><div class="mo-bar"><i class="bear" style="width:${b.low / max * 100}%"></i></div><b>${b.low}</b></div></div>`; }
  function riskRadar(r) { if (!r.length) return miniEmpty(); const levels = { low: 0, medium: 0, high: 0 }; r.forEach(x => { const k = riskKey(x.risk || x.riskLevel); levels[k]++; }); const max = Math.max(1, ...Object.values(levels)); const L = { low: ["Ù…Ù†Ø®ÙØ¶Ø©", "ok"], medium: ["Ù…ØªÙˆØ³Ø·Ø©", "warn"], high: ["Ù…Ø±ØªÙØ¹Ø©", "bear"] }; return `<div class="conf-bars">${Object.entries(levels).map(([k, v]) => `<div class="bias-row"><span>${L[k][0]}</span><div class="mo-bar"><i class="${L[k][1] === "ok" ? "" : L[k][1]}" style="width:${v / max * 100}%"></i></div><b>${v}</b></div>`).join("")}</div>`; }
  function miniChart(a) { const series = arr(a.history || a.sparkline || a.candles).map(p => num(p.close, p.c, p.price, p)).filter(v => v !== null); if (series.length < 2) return `<div class="chart-empty">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø±Ø³Ù… Ø¨ÙŠØ§Ù†ÙŠ Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯.</div>`; const min = Math.min(...series), max = Math.max(...series), rng = max - min || 1; const pts = series.map((v, i) => `${(i / (series.length - 1) * 100).toFixed(2)},${(40 - (v - min) / rng * 38).toFixed(2)}`).join(" "); const up = series[series.length - 1] >= series[0]; return `<svg class="detail-chart" viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points="${pts}" class="${up ? "up" : "down"}"></polyline></svg>`; }
  function firstNum(...values) {
    for (const value of values) {
      const n = Array.isArray(value) ? num(...value) : num(value);
      if (n !== null) return n;
    }
    return null;
  }
  function hasChartHistory(asset, tech) {
    return arr(asset.history || asset.sparkline || asset.candles).length >= 2
      || arr((tech || {}).history || (tech || {}).ohlc || (tech || {}).candles).length >= 2;
  }
  function validTechnicalLevel(value, currentPrice, side, hasHistory) {
    if (!hasHistory || value === null || currentPrice === null || value <= 0 || currentPrice <= 0) return null;
    const distance = Math.abs(value - currentPrice) / currentPrice;
    if (distance > 0.75) return null;
    if (side === "support" && value > currentPrice * 1.1) return null;
    if (side === "resistance" && value < currentPrice * 0.9) return null;
    return value;
  }
  function trendText(value) {
    const raw = String(value || "");
    const s = raw.toLowerCase();
    if (!s) return "";
    if (s.includes("bull") || s.includes("up") || s.includes("ØµØ§Ø¹Ø¯")) return "ØµØ§Ø¹Ø¯";
    if (s.includes("bear") || s.includes("down") || s.includes("Ù‡Ø§Ø¨Ø·")) return "Ù‡Ø§Ø¨Ø·";
    if (s.includes("side") || s.includes("neutral") || s.includes("flat") || s.includes("Ø¬Ø§Ù†Ø¨ÙŠ") || s.includes("Ù…Ø­Ø§ÙŠØ¯")) return "Ø¬Ø§Ù†Ø¨ÙŠ";
    return raw;
  }
  function technicalSnapshot(a, tech) {
    const t = tech || {};
    const summary = a.technicalSummary || a.technical_summary || t.technicalSummary || t.technical_summary || {};
    const summaryIndicators = summary.indicators || {};
    const ind = { ...(t.indicators || {}), ...summaryIndicators };
    const ma = t.movingAverages || t.averages || {};
    const levels = t.levels || {};
    const piv = t.pivotPoints || t.pivots || {};
    const supports = Array.isArray(t.support) ? t.support : Array.isArray(levels.support) ? levels.support : [];
    const resistances = Array.isArray(t.resistance) ? t.resistance : Array.isArray(levels.resistance) ? levels.resistance : [];
    const current = firstNum(a.price, a.currentPrice, a.lastPrice, a.regularMarketPrice, a.close, t.currentPrice, t.price);
    const canShowLevels = hasChartHistory(a, t) || firstNum(ind.support, ind.resistance) !== null;
    const rsi = firstNum(t.rsi, t.rsi14, t.RSI, ind.rsi, ind.rsi14);
    const macd = firstNum(t.macd, t.macdValue, ind.macd, ind.macdValue), macdSig = firstNum(t.macdSignal, t.signalLine, ind.macdSignal, ind.signalLine);
    const ma20 = firstNum(t.ma20, t.sma20, t.ema20, ma.ma20, ma.sma20, ma.ema20, ind.sma20, ind.ema20);
    const ma50 = firstNum(t.ma50, t.sma50, t.ema50, ma.ma50, ma.sma50, ma.ema50, ind.sma50, ind.ema50);
    const ma200 = firstNum(t.ma200, t.sma200, t.ema200, ma.ma200, ma.sma200, ma.ema200, ind.sma200, ind.ema200);
    const vol = firstNum(t.volatility, t.atr, t.atr14, ind.atr, ind.atr14);
    const volumeRatio = firstNum(t.volumeRatio, t.volume_ratio, ind.volumeRatio, ind.volume_ratio);
    const s1raw = validTechnicalLevel(firstNum(t.s1, t.support1, supports[0], levels.s1, piv.s1, t.support, ind.support), current, "support", canShowLevels);
    const s2raw = validTechnicalLevel(firstNum(t.s2, t.support2, supports[1], levels.s2, piv.s2), current, "support", canShowLevels);
    const r1raw = validTechnicalLevel(firstNum(t.r1, t.resistance1, resistances[0], levels.r1, piv.r1, t.resistance, ind.resistance), current, "resistance", canShowLevels);
    const r2raw = validTechnicalLevel(firstNum(t.r2, t.resistance2, resistances[1], levels.r2, piv.r2), current, "resistance", canShowLevels);
    const sLevels = [s1raw, s2raw].filter(v => v !== null && (current === null || v <= current * 1.002)).sort((a, b) => b - a);
    const rLevels = [r1raw, r2raw].filter(v => v !== null && (current === null || v >= current * 0.998)).sort((a, b) => a - b);
    const s1 = sLevels[0] ?? null, s2 = sLevels[1] ?? null;
    const r1 = rLevels[0] ?? null, r2 = rLevels[1] ?? null;
    const trend = trendText(t.trend || t.direction || ind.trend || (ma50 !== null && ma200 !== null ? (ma50 >= ma200 ? "ØµØ§Ø¹Ø¯" : "Ù‡Ø§Ø¨Ø·") : ""));
    const rsiTag = rsi === null ? "" : rsi >= 70 ? " (ØªØ´Ø¨Ø¹ Ø´Ø±Ø§Ø¦ÙŠ)" : rsi <= 30 ? " (ØªØ´Ø¨Ø¹ Ø¨ÙŠØ¹ÙŠ)" : "";
    const macdTag = (macd !== null && macdSig !== null) ? (macd >= macdSig ? " Â· Ø¥ÙŠØ¬Ø§Ø¨ÙŠ" : " Â· Ø³Ù„Ø¨ÙŠ") : "";
    const rows = [
      ["Ø§Ù„Ø§ØªØ¬Ø§Ù‡ Ø§Ù„Ø¹Ø§Ù…", trend],
      ["RSI (14)", rsi === null ? "" : Math.round(rsi) + rsiTag],
      ["MACD", macd === null ? "" : (Math.round(macd * 1000) / 1000) + macdTag],
      ["EMA 20", ma20 === null ? "" : price(ma20, null)],
      ["EMA 50", ma50 === null ? "" : price(ma50, null)],
      ["EMA 200", ma200 === null ? "" : price(ma200, null)],
      ["Ø¯Ø¹Ù… 1", s1 === null ? "" : price(s1, null)],
      ["Ø¯Ø¹Ù… 2", s2 === null ? "" : price(s2, null)],
      ["Ù…Ù‚Ø§ÙˆÙ…Ø© 1", r1 === null ? "" : price(r1, null)],
      ["Ù…Ù‚Ø§ÙˆÙ…Ø© 2", r2 === null ? "" : price(r2, null)],
      ["Ø§Ù„ØªØ°Ø¨Ø°Ø¨", vol === null ? "" : (Math.round(vol * 100) / 100)],
      ["ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø¬Ù…", volumeRatio === null ? "" : `${Math.round(volumeRatio * 100) / 100}Ã—`]
    ].filter(([, v]) => hasDisplayValue(v));
    const recommendation = t.recommendation || t.action || t.signal || "";
    if (recommendation && rows.length) rows.push(["Ø§Ù„ØªÙˆØµÙŠØ© Ø§Ù„ÙÙ†ÙŠØ©", recommendation]);
    return { available: rows.length > 0, rows, raw: t, current };
  }
  function technicalUnavailableState(detail) {
    const message = detail && detail.message ? detail.message : "Ù„Ù… ÙŠØ±Ø¬Ø¹ Ø§Ù„Ù…Ø²ÙˆØ¯ Ù…Ø¤Ø´Ø±Ø§Øª ÙÙ†ÙŠØ© ÙƒØ§ÙÙŠØ© Ù…Ø«Ù„ RSI Ø£Ùˆ MACD Ø£Ùˆ Ø§Ù„Ù…ØªÙˆØ³Ø·Ø§Øª Ø£Ùˆ Ù…Ø³ØªÙˆÙŠØ§Øª Ø§Ù„Ø¯Ø¹Ù… ÙˆØ§Ù„Ù…Ù‚Ø§ÙˆÙ…Ø©.";
    return `<div class="technical-unavailable empty-state compact">
      <span class="empty-glyph">â—Ž</span>
      <h3>Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„ÙÙ†ÙŠ ØºÙŠØ± Ù…ØªØ§Ø­ Ø­Ø§Ù„ÙŠØ§Ù‹ Ù„Ù‡Ø°Ø§ Ø§Ù„Ø£ØµÙ„ Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ø­Ø§Ù„ÙŠ</h3>
      <p>${h(message)} Ù„Ù† Ù†Ø¹Ø±Ø¶ Ù‚ÙŠÙ…Ø§Ù‹ ØªÙ‚Ø¯ÙŠØ±ÙŠØ© Ø£Ùˆ Ø¨ÙŠØ§Ù†Ø§Øª ØªØ¬Ø±ÙŠØ¨ÙŠØ© Ø¹Ù†Ø¯ ØºÙŠØ§Ø¨ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø²ÙˆØ¯.</p>
    </div>`;
  }
  function technical(a, tech, c, detail) {
    if (a.technicalAvailable === false || a.technical_available === false || (tech && tech.available === false) || (detail && detail.rec && detail.rec.technicalAvailable === false)) return technicalUnavailableState(detail);
    const snapshot = technicalSnapshot(a, tech);
    if (!snapshot.available) return technicalUnavailableState(detail);
    const summary = a.technicalSummary || a.technical_summary || (tech && (tech.technicalSummary || tech.technical_summary)) || {};
    const summaryText = summary.summaryAr || summary.summary_ar || summary.summaryEn || summary.summary_en || "";
    return `${summaryText ? `<p class="muted-note">${h(summaryText)}</p>` : ""}<div class="table-shell technical-available"><table><tbody>${snapshot.rows.map(([k, v]) => `<tr><th>${h(k)}</th><td class="${valueTextClass(v)}">${h(v)}</td></tr>`).join("")}</tbody></table></div>
      <p class="muted-note">ØªØ¸Ù‡Ø± Ù‡Ù†Ø§ Ø§Ù„Ù…Ø¤Ø´Ø±Ø§Øª Ø§Ù„ØªÙŠ Ø£Ø±Ø¬Ø¹Ù‡Ø§ Ø§Ù„Ù…Ø²ÙˆØ¯ ÙÙ‚Ø·Ø› ØªÙ… Ø¥Ø®ÙØ§Ø¡ Ø§Ù„ØµÙÙˆÙ ØºÙŠØ± Ø§Ù„Ù…ØªØ§Ø­Ø© Ø¨Ø¯Ù„Ø§Ù‹ Ù…Ù† ØªÙ‚Ø¯ÙŠØ±Ù‡Ø§.</p>`;
  }
  function riskReward(rec, c) {
    if (!rec) return "";
    const entry = num(rec.entry, rec.entryPrice, rec.price, rec.currentPrice);
    const tps = arr(rec.takeProfit).map(Number).filter(Number.isFinite);
    const tgt1 = num(rec.target, rec.targetPrice, tps[0]);
    const tgt2 = num(rec.target2, tps[1]);
    const sl = num(rec.stopLoss, rec.stop);
    if (entry === null || tgt1 === null || sl === null) return "";
    const risk = Math.abs(entry - sl); if (!risk) return "";
    const rr1 = Math.round(Math.abs(tgt1 - entry) / risk * 100) / 100;
    const rr2 = tgt2 === null ? null : Math.round(Math.abs(tgt2 - entry) / risk * 100) / 100;
    return `<div class="detail-grid">${detailCard("Ø§Ù„Ø¯Ø®ÙˆÙ„", price(entry, c), "Entry")}${detailCard("Ø§Ù„Ù‡Ø¯Ù 1 Â· Ø§Ø­ØªÙ…Ø§Ù„ Ù…Ø±ØªÙØ¹", price(tgt1, c), "TP1")}${tgt2 !== null ? detailCard("Ø§Ù„Ù‡Ø¯Ù 2 Â· ØªÙ…Ø¯ÙŠØ¯", price(tgt2, c), "TP2") : ""}${detailCard("ÙˆÙ‚Ù Ø§Ù„Ø®Ø³Ø§Ø±Ø©", price(sl, c), "Stop")}${detailCard("Ø§Ù„Ø¹Ø§Ø¦Ø¯/Ø§Ù„Ù…Ø®Ø§Ø·Ø±Ø©", rr2 !== null ? `${rr2}:1 Â· TP2` : `${rr1}:1 Â· TP1`, "R/R")}</div>
    <p class="muted-note">Ø§Ù„Ù‡Ø¯Ù Ø§Ù„Ø£ÙˆÙ„ Ù‚Ø±ÙŠØ¨ Ø¹Ù…Ø¯Ø§Ù‹ (â‰ˆ0.9Ã—ATR) Ù„Ø±ÙØ¹ Ø§Ø­ØªÙ…Ø§Ù„ Ø§Ù„Ø¥ØµØ§Ø¨Ø© â€” ÙˆÙ‡Ùˆ Ø§Ù„Ù‡Ø¯Ù Ø§Ù„Ø°ÙŠ ØªÙÙ‚Ø§Ø³ Ø¹Ù„ÙŠÙ‡ Ù†Ø³Ø¨Ø© Ø§Ù„Ù†Ø¬Ø§Ø­ Ø§Ù„ØªØ§Ø±ÙŠØ®ÙŠØ©. Ø§Ù„ÙˆÙ‚Ù Ø£ÙˆØ³Ø¹ Ø®Ù„Ù Ø§Ù„Ù‡ÙŠÙƒÙ„ Ø§Ù„Ø³Ø¹Ø±ÙŠØŒ Ù„Ø°Ù„Ùƒ Ø§Ù„Ø¹Ø§Ø¦Ø¯/Ø§Ù„Ù…Ø®Ø§Ø·Ø±Ø© ÙŠÙÙ‚Ø±Ø£ Ù…Ø¹ Ø§Ù„Ù‡Ø¯Ù Ø§Ù„Ø«Ø§Ù†ÙŠ.</p>`;
  }
  function signalAnalysis(rec, c) {
    const sig = signal(rec), conf = confText(rec);
    const reasons = arr(rec.reasons).map(String).filter(Boolean).slice(0, 5);
    const warnings = arr(rec.warnings).map(String).filter(Boolean).slice(0, 5);
    const score = rec.scoreBreakdown || rec.score_breakdown || {};
    const quality = rec.dataQuality || rec.data_quality || "--";
    const provider = rec.provider || rec.source || "--";
    const summary = rec.reason || rec.summary || reasons[0] || "Ù‚Ø±Ø§Ø¡Ø© ØªØ­Ù„ÙŠÙ„ÙŠØ© Ù…Ø¨Ù†ÙŠØ© Ø¹Ù„Ù‰ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ØªØ§Ø­Ø©.";
    const scoreRows = [
      ["ÙÙ†ÙŠ", score.technicalScore, 40],
      ["Ø²Ø®Ù…", score.momentumScore, 20],
      ["Ø£Ø®Ø¨Ø§Ø±", score.newsScore, 15],
      ["Ø£Ø³Ø§Ø³ÙŠØ§Øª", score.fundamentalsScore, 15]
    ].filter(([, value]) => value !== undefined && value !== null);
    const pm = rec.precisionMode || rec.precision || null;
    const bt = rec.backtest || null;
    const precisionRate = num(pm && pm.measuredWinRate, bt && bt.winRate);
    return `<div class="signal-analysis">
      <p>${h(summary)}</p>
      <div class="detail-grid">
        ${detailCard("Ø§Ù„Ø¥Ø´Ø§Ø±Ø©", sigLabel(sig), "Action")}
        ${detailCard("Ø§Ù„Ø«Ù‚Ø©", conf, "Confidence")}
        ${precisionRate !== null ? detailCard("Ø§Ù„Ø¯Ù‚Ø© Ø§Ù„ØªØ§Ø±ÙŠØ®ÙŠØ©", `${precisionRate}%${pm && pm.passed ? " âœ“" : ""}`, "Backtest") : ""}
        ${bt && num(bt.samples) !== null ? detailCard("Ø¹ÙŠÙ†Ø§Øª Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±", latinNumber(bt.samples), "Samples") : ""}
        ${detailCard("Ø§Ù„Ù…Ø®Ø§Ø·Ø±Ø©", riskShort(rec.risk || rec.riskLevel), "Risk")}
        ${detailCard("Ø§Ù„Ù…Ø¯Ø©", rec.timeframe || rec.horizon || rec.duration || "--", "Horizon")}
        ${detailCard("Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª", provider, "Provider")}
        ${detailCard("Ø¬ÙˆØ¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª", dataQualityLabel(quality), "Quality")}
      </div>
      ${riskReward(rec, c)}
      ${scoreRows.length ? `<div class="table-shell"><table><tbody>${scoreRows.map(([label, value, max]) => `<tr><th>${h(label)}</th><td class="ltr">${h(latinNumber(value))} / ${h(max)}</td></tr>`).join("")}</tbody></table></div>` : ""}
      ${reasons.length ? `<div class="trade-list">${reasons.map(r => `<article class="trade-item"><strong>Ø³Ø¨Ø¨</strong><p>${h(r)}</p></article>`).join("")}</div>` : ""}
      ${warnings.length ? `<div class="trade-list">${warnings.map(w => `<article class="trade-item"><strong>ØªÙ†Ø¨ÙŠÙ‡ Ù…Ø®Ø§Ø·Ø±Ø©</strong><p>${h(w)}</p></article>`).join("")}</div>` : ""}
      <p class="muted-note">Ù‡Ø°Ù‡ Ø¥Ø´Ø§Ø±Ø§Øª ØªØ­Ù„ÙŠÙ„ÙŠØ© ØªØ¹Ù„ÙŠÙ…ÙŠØ© Ù…Ø¨Ù†ÙŠØ© Ø¹Ù„Ù‰ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ØªØ§Ø­Ø©ØŒ ÙˆÙ„Ø§ ØªÙØ¹Ø¯ Ù†ØµÙŠØ­Ø© Ù…Ø§Ù„ÙŠØ© Ø£Ùˆ ØªÙˆØµÙŠØ© Ù…Ù„Ø²Ù…Ø© Ø¨Ø§Ù„Ø´Ø±Ø§Ø¡ Ø£Ùˆ Ø§Ù„Ø¨ÙŠØ¹. Ø§Ù„Ù‚Ø±Ø§Ø± Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ Ù…Ø³Ø¤ÙˆÙ„ÙŠØ© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù….</p>
      <p class="muted-note ltr">These are educational analytical signals based on available data and are not financial advice.</p>
    </div>`;
  }
  function hasArabicText(value) { return /[\u0600-\u06FF]/.test(String(value ?? "")); }
  function valueTextClass(value) { return hasArabicText(value) ? "rtl-value" : "ltr"; }
  function displayValue(value) {
    if (/^provider_status_/i.test(String(value || ""))) return getProviderStatusMessage(value);
    return value === null || value === undefined || value === "" || value === "--" ? "ØºÙŠØ± Ù…ØªØ§Ø­" : String(value);
  }
  function hasDisplayValue(value) {
    const shown = displayValue(value).trim();
    return shown && shown !== "ØºÙŠØ± Ù…ØªØ§Ø­" && shown !== "â€”";
  }
  function sampleCountFromRec(rec) {
    const pm = rec && (rec.precisionMode || rec.precision) || {};
    const bt = rec && rec.backtest || {};
    return num(rec && rec.samples, rec && rec.sampleCount, rec && rec.sample_count, bt.samples, bt.sampleCount, pm.samples, pm.sampleCount);
  }
  function normalizedDataQuality(value) {
    const raw = String(value || "").toLowerCase();
    if (raw === "complete") return "complete";
    if (raw === "live") return "live";
    if (raw === "cached") return "cached";
    if (raw === "delayed") return "delayed";
    if (raw === "partial") return "partial";
    if (raw === "unavailable") return "unavailable";
    return raw || "unavailable";
  }
  function detailCard(label, value, helper) {
    const shown = displayValue(value);
    return `<article class="detail-card"><span class="card-kicker">${h(helper)}</span><strong class="${valueTextClass(shown)}">${h(shown)}</strong><p>${h(label)}</p></article>`;
  }

  /* â”€â”€ Strategy agreement is informational; the final recommendation is weighted separately. â”€â”€ */
  function strategySignals(asset, tech, rec) {
    const t = tech || {}, sigs = [];
    const price = num(asset.price, asset.lastPrice, asset.regularMarketPrice, asset.close, rec && rec.currentPrice, t.price);
    const ma50 = num(t.ma50, t.sma50, t.ema50), ma200 = num(t.ma200, t.sma200, t.ema200);
    const rsi = num(t.rsi, t.rsi14, t.RSI), macd = num(t.macd, t.macdValue), macdSig = num(t.macdSignal, t.signalLine);
    const s1 = num(t.support, t.s1, t.support1), r1 = num(t.resistance, t.r1, t.resistance1);
    const chg = num(asset.changePercent, asset.percentChange, rec && rec.expectedMovePct);
    const push = (name, signal, weight, note) => sigs.push({ name, signal, weight, note });
    if (ma50 !== null && ma200 !== null) push("Ø§ØªØ¬Ø§Ù‡ â€” ØªÙ‚Ø§Ø·Ø¹ Ø§Ù„Ù…ØªÙˆØ³Ø·Ø§Øª", ma50 >= ma200 ? "buy" : "sell", 1.3, ma50 >= ma200 ? "Ø§Ù„Ù…ØªÙˆØ³Ø· 50 ÙÙˆÙ‚ 200 (ØªÙ‚Ø§Ø·Ø¹ Ø°Ù‡Ø¨ÙŠ)" : "Ø§Ù„Ù…ØªÙˆØ³Ø· 50 ØªØ­Øª 200 (ØªÙ‚Ø§Ø·Ø¹ Ù…ÙˆØª)");
    if (rsi !== null) push("RSI â€” ØªØ´Ø¨Ø¹/Ø§Ø±ØªØ¯Ø§Ø¯", rsi <= 30 ? "buy" : rsi >= 70 ? "sell" : "neutral", 1.0, rsi <= 30 ? `ØªØ´Ø¨Ø¹ Ø¨ÙŠØ¹ÙŠ (${Math.round(rsi)})` : rsi >= 70 ? `ØªØ´Ø¨Ø¹ Ø´Ø±Ø§Ø¦ÙŠ (${Math.round(rsi)})` : `Ù…Ø­Ø§ÙŠØ¯ (${Math.round(rsi)})`);
    if (macd !== null && macdSig !== null) push("MACD â€” Ø²Ø®Ù…", macd >= macdSig ? "buy" : "sell", 1.1, macd >= macdSig ? "ØªÙ‚Ø§Ø·Ø¹ Ø¥ÙŠØ¬Ø§Ø¨ÙŠ" : "ØªÙ‚Ø§Ø·Ø¹ Ø³Ù„Ø¨ÙŠ");
    if (price !== null && ma50 !== null) push("Ø§Ù„Ø³Ø¹Ø± Ù…Ù‚Ø§Ø¨Ù„ Ø§Ù„Ù…ØªÙˆØ³Ø· 50", price >= ma50 ? "buy" : "sell", 0.9, price >= ma50 ? "Ø§Ù„Ø³Ø¹Ø± ÙÙˆÙ‚ Ø§Ù„Ù…ØªÙˆØ³Ø·" : "Ø§Ù„Ø³Ø¹Ø± ØªØ­Øª Ø§Ù„Ù…ØªÙˆØ³Ø·");
    if (price !== null && s1 !== null && r1 !== null) { const mid = (s1 + r1) / 2; push("Ø§Ù„Ø¯Ø¹Ù…/Ø§Ù„Ù…Ù‚Ø§ÙˆÙ…Ø©", price <= s1 * 1.02 ? "buy" : price >= r1 * 0.98 ? "sell" : price >= mid ? "buy" : "neutral", 0.8, price <= s1 * 1.02 ? "Ù‚Ø±Ø¨ Ø§Ù„Ø¯Ø¹Ù…" : price >= r1 * 0.98 ? "Ù‚Ø±Ø¨ Ø§Ù„Ù…Ù‚Ø§ÙˆÙ…Ø©" : "Ø¯Ø§Ø®Ù„ Ø§Ù„Ù†Ø·Ø§Ù‚"); }
    if (chg !== null) push("Ø§Ù„Ø²Ø®Ù… Ø§Ù„Ù„Ø­Ø¸ÙŠ", chg > 0.3 ? "buy" : chg < -0.3 ? "sell" : "neutral", 0.7, `${chg > 0 ? "+" : ""}${Number(chg).toFixed(2)}%`);
    if (rec) push("ØªÙˆØµÙŠØ© Ø§Ù„Ù…Ø²ÙˆØ¯ (AI)", signal(rec), 1.2, sigLabel(signal(rec)) + (num(rec.confidence, rec.score) !== null ? ` Â· ${Math.round(num(rec.confidence, rec.score))}%` : ""));
    return sigs;
  }
  function consensus(sigs) {
    let buy = 0, sell = 0, neutral = 0, tw = 0;
    sigs.forEach(s => { if (isBuySignalName(s.signal)) buy += s.weight; else if (isSellSignalName(s.signal)) sell += s.weight; else neutral += s.weight; tw += s.weight; });
    if (!tw) return { signal: "watch", agreement: 0, agreementPct: null, score: 0, buy: 0, sell: 0, neutral: 0, count: 0, limited: true };
    const top = Math.max(buy, sell, neutral);
    const sigName = (top === buy && buy > 0) ? "buy" : (top === sell && sell > 0) ? "sell" : "watch";
    const rawAgreement = Math.round(top / tw * 100);
    const limited = sigs.length < 3;
    const agreement = limited ? Math.min(66, rawAgreement) : rawAgreement;
    const coverage = Math.min(1, sigs.length / 6);
    return {
      signal: sigName,
      agreement,
      agreementPct: agreement,
      score: Math.round(agreement * coverage),
      buy: Math.round(buy / tw * 100),
      sell: Math.round(sell / tw * 100),
      neutral: Math.round(neutral / tw * 100),
      count: sigs.length,
      limited
    };
  }
  function limitedConsensusText(count) {
    if (count <= 0) return "Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØºØ·ÙŠØ© Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ©";
    if (count === 1) return "Ø§ØªÙØ§Ù‚ Ù…Ø­Ø¯ÙˆØ¯: Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ© ÙˆØ§Ø­Ø¯Ø© ÙÙ‚Ø·";
    return `Ø§ØªÙØ§Ù‚ Ù…Ø­Ø¯ÙˆØ¯: ${latinNumber(count)} Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ§Øª ÙÙ‚Ø·`;
  }
  function consensusMetricText(c) {
    return c.count < 3 ? limitedConsensusText(c.count) : `${latinNumber(c.agreement)}% Ø§ØªÙØ§Ù‚`;
  }
  function strategyConsensus(asset, tech, rec) {
    const backendRows = strategyRowsFromBackend(rec, asset);
    const backendMetric = strategyAgreementMetric(rec, asset);
    let sigs = backendRows.length ? backendRows : strategySignals(asset, tech, rec);
    if (!backendRows.length && backendMetric.count > 0 && backendMetric.count < sigs.length) {
      const providerRows = sigs.filter(s => /AI|Ø§Ù„Ù…Ø²ÙˆØ¯/i.test(String(s.name || "")));
      sigs = (providerRows.length ? providerRows : sigs).slice(0, backendMetric.count);
    }
    const c = backendRows.length ? backendConsensusFromRecords(rec, asset) : consensus(sigs);
    if (backendMetric.count > 0) {
      c.count = backendMetric.count;
      c.limited = backendMetric.limited;
      if (backendMetric.agreementPct !== null) c.agreement = backendMetric.agreementPct;
    }
    if (!sigs.length) return emptyState("Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ÙƒØ§ÙÙŠØ© Ù„Ù„Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ§Øª", "ÙŠØ­ØªØ§Ø¬ Ù…Ø­Ø±Ùƒ Ø§Ù„Ø§ØªÙØ§Ù‚ Ù…Ø¤Ø´Ø±Ø§Øª ÙÙ†ÙŠØ© Ø£Ùˆ ØªÙˆØµÙŠØ© Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯ Ù„ØªØ´ØºÙŠÙ„ Ø§Ù„Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ§Øª. Ù„Ù† Ù†Ø¹Ø±Ø¶ Ø§ØªÙØ§Ù‚Ø§Ù‹ ØªÙ‚Ø¯ÙŠØ±ÙŠØ§Ù‹ Ø¹Ù†Ø¯ ØºÙŠØ§Ø¨ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª.", "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª", `${ROOT}/settings`);
    const tone = c.limited ? "muted" : signalCardClass(c.signal);
    const rows = sigs.map(s => {
      const unavailable = s.available === false;
      const rowSignal = unavailable ? "insufficient_data" : (finalRecommendationAction(s.signal) || s.signal || "watch");
      const name = s.nameAr || s.name_ar || s.name || s.nameEn || s.name_en || s.id || "Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ©";
      const note = s.noteAr || s.note_ar || s.note || s.noteEn || s.note_en || (unavailable ? "Ù„Ù… ØªØªÙˆÙØ± Ø¨ÙŠØ§Ù†Ø§Øª ÙƒØ§ÙÙŠØ© Ù„Ù‡Ø°Ù‡ Ø§Ù„Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ©." : "");
      return `<div class="strat-row ${unavailable ? "is-unavailable" : ""}"><span class="strat-name">${h(name)}</span><span class="strat-note">${h(note)}</span><span class="vote ${signalCardClass(rowSignal)}">${h(unavailable ? "ØºÙŠØ± Ù…ØªØ§Ø­" : sigLabel(rowSignal))}</span></div>`;
    }).join("");
    const scoreValue = c.limited ? `<b class="rtl-value">ØªÙˆØ§ÙÙ‚ Ù…Ø­Ø¯ÙˆØ¯</b>` : `<b>${h(latinNumber(c.agreement))}%</b>`;
    const biasRows = c.limited ? "" : `<div class="bias-rows">
        <div class="bias-row"><span>Ø´Ø±Ø§Ø¡</span><div class="mo-bar"><i style="width:${c.buy}%"></i></div><b>${c.buy}%</b></div>
        <div class="bias-row"><span>Ø¨ÙŠØ¹</span><div class="mo-bar"><i class="bear" style="width:${c.sell}%"></i></div><b>${c.sell}%</b></div>
        <div class="bias-row"><span>Ù…Ø­Ø§ÙŠØ¯</span><div class="mo-bar"><i class="neut" style="width:${c.neutral}%"></i></div><b>${c.neutral}%</b></div>
      </div>`;
    return `<div class="strategy-consensus">
      <div class="consensus-head"><div><span class="card-kicker">STRATEGY AGREEMENT Â· Ù„ÙŠØ³Øª Ø«Ù‚Ø© AI ÙˆÙ„Ø§ Ø§Ù„ØªÙˆØµÙŠØ© Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠØ©</span><strong class="state-${tone}">${h(c.limited ? "ØªÙˆØ§ÙÙ‚ Ù…Ø­Ø¯ÙˆØ¯" : sigLabel(c.signal))}</strong></div><div class="consensus-score">${scoreValue}<small>${h(consensusMetricText(c))} Â· ${latinNumber(c.count)} Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ©</small></div></div>
      ${biasRows}
      <div class="strat-list">${rows}</div>
      <p class="muted-note">${h(c.limited ? "Ø§Ù„Ø§ØªÙØ§Ù‚ Ù…Ø¨Ù†ÙŠ Ø¹Ù„Ù‰ ØªØºØ·ÙŠØ© Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ© Ù…Ø­Ø¯ÙˆØ¯Ø©ØŒ Ù„Ø°Ù„Ùƒ Ù„Ø§ ÙŠÙØ¹Ø§Ù…Ù„ ÙƒØ¥Ø´Ø§Ø±Ø© Ù‚ÙˆÙŠØ© Ø­ØªÙ‰ Ù„Ùˆ ÙƒØ§Ù†Øª Ø§Ù„Ù†Ø³Ø¨Ø© Ø§Ù„Ø®Ø§Ù… 100%." : "Ù‡Ø°Ù‡ Ù†Ø³Ø¨Ø© Ø§ØªÙØ§Ù‚ Ø¨ÙŠÙ† Ø§Ù„Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ§Øª ÙÙ‚Ø·Ø› Ø§Ù„Ù‚Ø±Ø§Ø± Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ ÙŠØ¯Ù…Ø¬ Ø«Ù‚Ø© AI ÙˆØ¬ÙˆØ¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ÙˆØ§Ù„Ø¹ÙŠÙ†Ø§Øª ÙˆØ§Ù„Ù…Ø®Ø§Ø·Ø± ÙˆØ§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„ÙÙ†ÙŠ.")}</p>
    </div>`;
  }
  function finalRecommendationModel(asset, detail, rec, c) {
    const a = asset || {};
    const tech = detail && detail.tech || {};
    const sigs = strategySignals(a, tech, rec);
    const consensusResult = consensus(sigs);
    const backendMetric = strategyAgreementMetric(rec, a);
    if (backendMetric.count > 0) {
      consensusResult.count = backendMetric.count;
      consensusResult.limited = backendMetric.limited;
      if (backendMetric.agreementPct !== null) consensusResult.agreement = backendMetric.agreementPct;
    }
    const confidence = num(rec && rec.aiConfidence, rec && rec.confidence, rec && rec.score);
    const samples = sampleCountFromRec(rec);
    const dataQuality = normalizedDataQuality((rec && rec.dataQualityStatus && rec.dataQualityStatus.status) || (rec && rec.dataQuality) || (detail && detail.providerStatus && detail.providerStatus.dataQuality) || a.dataQuality);
    const technicalState = technicalSnapshot({ ...a, ...(rec || {}) }, tech);
    const riskLevel = riskKey(rec && (rec.riskLevel || rec.risk));
    const consensusStrong = consensusResult.agreement >= 70 && consensusResult.count >= 3;
    const aiStrong = confidence !== null && confidence >= 70;
    const dataStrong = dataQuality === "complete" && samples !== null && samples > 0;
    const technicalStrong = technicalState.available && (!rec || rec.technicalAvailable !== false);
    const riskStrong = riskLevel !== "high";
    const finalStrongBuy = isBuySignalName(consensusResult.signal) && consensusStrong && aiStrong && dataStrong && technicalStrong && riskStrong;
    const finalStrongSell = isSellSignalName(consensusResult.signal) && consensusStrong && aiStrong && dataStrong && technicalStrong;
    let action = "watch";
    if (!rec && consensusResult.count === 0) action = "insufficient_data";
    else if (samples === 0 || !technicalStrong || dataQuality === "unavailable") action = "insufficient_data";
    else if (finalStrongBuy) action = "buy";
    else if (finalStrongSell) action = "sell";
    else if (isBuySignalName(consensusResult.signal) && confidence !== null && confidence >= 50 && technicalStrong && riskLevel !== "high" && dataQuality !== "unavailable") action = "weak_buy";

    const parts = [];
    if (consensusResult.count < 3) parts.push("Ø§ØªÙØ§Ù‚ Ø§Ù„Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ§Øª Ù…Ø¨Ù†ÙŠ Ø¹Ù„Ù‰ ØªØºØ·ÙŠØ© Ù…Ø­Ø¯ÙˆØ¯Ø©");
    else parts.push(`Ø§ØªÙØ§Ù‚ Ø§Ù„Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ§Øª ${latinNumber(consensusResult.agreement)}% Ø¹Ø¨Ø± ${latinNumber(consensusResult.count)} Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ§Øª`);
    parts.push(confidence === null ? "Ø«Ù‚Ø© AI ØºÙŠØ± Ù…ØªØ§Ø­Ø©" : `Ø«Ù‚Ø© AI ${latinNumber(Math.round(confidence))}%`);
    parts.push(`Ø§Ù„Ù…Ø®Ø§Ø·Ø± ${riskShort(riskLevel)}`);
    if (!technicalStrong) parts.push("Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙÙ†ÙŠØ© ØºÙŠØ± Ù…ÙƒØªÙ…Ù„Ø©");
    if (dataQuality !== "complete") parts.push(`Ø¬ÙˆØ¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ${dataQualityLabel(dataQuality)}`);
    parts.push(samples === null ? "Ø¹Ø¯Ø¯ Ø§Ù„Ø¹ÙŠÙ†Ø§Øª ØºÙŠØ± Ù…ØªØ§Ø­" : `${latinNumber(samples)} Ø¹ÙŠÙ†Ø©`);
    const strongText = action === "buy" || action === "sell" ? "Ù„Ø°Ù„Ùƒ ØªØªÙˆÙØ± Ø´Ø±ÙˆØ· Ø§Ù„Ø¥Ø´Ø§Ø±Ø© Ø§Ù„Ù‚ÙˆÙŠØ©." : "Ù„Ø°Ù„Ùƒ Ù‡Ø°Ù‡ Ù„ÙŠØ³Øª Ø¥Ø´Ø§Ø±Ø© Ø´Ø±Ø§Ø¡ Ø£Ùˆ Ø¨ÙŠØ¹ Ù‚ÙˆÙŠØ©.";
    return {
      action,
      consensusResult,
      confidence,
      samples,
      dataQuality,
      technicalAvailable: technicalStrong,
      riskLevel,
      consensusStrong,
      aiStrong,
      dataStrong,
      finalStrongBuy,
      explanation: `${parts.join("ØŒ ")}ØŒ ${strongText}`
    };
  }
  function finalRecommendationCard(asset, detail, rec, c) {
    const model = finalRecommendationModel(asset, detail, rec, c);
    const confidenceText = model.confidence === null ? "ØºÙŠØ± Ù…ØªØ§Ø­" : `${latinNumber(Math.round(model.confidence))}%`;
    const samplesText = model.samples === null ? "ØºÙŠØ± Ù…ØªØ§Ø­" : latinNumber(model.samples);
    const finalLabel = sigLabel(model.action);
    const metrics = [
      ["Ø§Ù„ØªÙˆØµÙŠØ© Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠØ©", finalLabel, "Final"],
      ["Ø§ØªÙØ§Ù‚ Ø§Ù„Ø§Ø³ØªØ±Ø§ØªÙŠØ¬ÙŠØ§Øª", consensusMetricText(model.consensusResult), "Consensus"],
      ["Ø«Ù‚Ø© AI", confidenceText, "AI confidence"],
      ["Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„ÙÙ†ÙŠ", model.technicalAvailable ? "Ù…ØªØ§Ø­ Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯" : "ØºÙŠØ± Ù…ØªØ§Ø­", "Technical"],
      ["Ø¬ÙˆØ¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª / Ø§Ù„Ø¹ÙŠÙ†Ø§Øª", `${dataQualityLabel(model.dataQuality)} Â· ${samplesText}`, "Data"],
      ["Ø§Ù„Ù…Ø®Ø§Ø·Ø±", riskShort(model.riskLevel), "Risk"]
    ];
    return `<article class="panel final-recommendation-card ${signalCardClass(model.action)}">
      <div class="final-recommendation-head">
        <div><span class="eyebrow">FINAL RECOMMENDATION</span><h2>${h(finalLabel)}</h2></div>
        <span class="state-badge ${signalCardClass(model.action)}">${h(finalLabel)}</span>
      </div>
      <div class="final-signal-grid">${metrics.map(([label, value, helper]) => detailCard(label, value, helper)).join("")}</div>
      <p class="recommendation-explanation">${h(model.explanation)}</p>
    </article>`;
  }
  function stat(label, value, helper) { return `<article class="stat-card"><span class="card-kicker">${h(helper)}</span><strong>${h(String(value))}</strong><small>${h(label)}</small></article>`; }
  function hero(title, body, kicker) { return `<section class="page-hero"><span class="eyebrow">${h(kicker)}</span><h2>${title}</h2><p>${h(body)}</p></section>`; }
  function unavailableSection(response, fallbackBody, label, href) {
    const unavailableTitle = response && response.routeUnavailable ? ROUTE_UNAVAILABLE_MESSAGE : UNAVAILABLE_MESSAGE;
    const body = formatProviderError((response && response.message) || fallbackBody || UNAVAILABLE_MESSAGE, { empty: fallbackBody || UNAVAILABLE_MESSAGE });
    return emptyState(unavailableTitle, body, label, href);
  }
  function selectionEmptyState() { return emptyState(SELECTION_EMPTY_STATE_AR, SELECTION_EMPTY_STATE_EN, "", ""); }
  function emptyState(title, body, label, href) {
    const cleanTitle = formatProviderError(title, { empty: UNAVAILABLE_MESSAGE });
    const cleanBody = formatProviderError(body, { empty: UNAVAILABLE_MESSAGE });
    return `<div class="empty-state compact"><span class="empty-glyph">â—Ž</span><h3>${h(cleanTitle)}</h3><p>${h(cleanBody)}</p><div class="row-actions">${label && href ? `<a class="ghost-btn" href="${h(href)}" data-route-link>${h(label)}</a>` : ""}<button class="ghost-btn" data-retry>Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©</button></div></div>`;
  }
  function miniEmpty() { return `<div class="empty-state compact"><p>Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø­Ø§Ù„ÙŠØ§Ù‹ Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯.</p></div>`; }
  function marketUnavailable(m, data) { const provider = providerCopy(); const message = formatProviderError(data && data.message, { empty: provider.copy }); return `<section class="panel unavailable-panel"><span class="empty-glyph">âš </span><h2>Ø¨ÙŠØ§Ù†Ø§Øª ${h(m.ar)} ØºÙŠØ± Ù…ØªØ§Ø­Ø©</h2><p>${h(message)}</p>
    <div class="detail-grid">${detailCard("Ø§Ù„Ø±Ù…ÙˆØ² Ø§Ù„Ù…Ø¯Ø¹ÙˆÙ…Ø©", String(m.symbols.length), "Symbols")}${detailCard("Ø§Ù„Ø¹Ù…Ù„Ø©", m.currency, "Currency")}${detailCard("Ø§Ù„Ø­Ø§Ù„Ø©", provider.label, "Status")}${detailCard("Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«", new Date().toLocaleTimeString("ar-KW", { hour: "2-digit", minute: "2-digit" }), "Updated")}</div>
    <div class="chip-row">${m.symbols.map(s => `<button class="badge" data-symbol-details="${h(s)}"><span class="ltr">${h(s)}</span></button>`).join("")}</div>
    <div class="row-actions"><button class="ghost-btn" data-retry>Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©</button></div></section>`; }
  function disclaimer() { return `<section class="disclaimer-note"><strong>ØªÙ†Ø¨ÙŠÙ‡:</strong> Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø­ØªÙˆÙŠØ§Øª Ù„Ø£ØºØ±Ø§Ø¶ ØªØ¹Ù„ÙŠÙ…ÙŠØ© ÙˆÙ…Ø¹Ù„ÙˆÙ…Ø§ØªÙŠØ© ÙÙ‚Ø· ÙˆÙ„Ø§ ØªÙØ¹Ø¯ Ù†ØµÙŠØ­Ø© Ø§Ø³ØªØ«Ù…Ø§Ø±ÙŠØ©. Ø§Ù„ØªØ¯Ø§ÙˆÙ„ ÙŠÙ†Ø·ÙˆÙŠ Ø¹Ù„Ù‰ Ù…Ø®Ø§Ø·Ø±Ø© Ù‚Ø¯ ØªØµÙ„ Ù„ÙƒØ§Ù…Ù„ Ø±Ø£Ø³ Ø§Ù„Ù…Ø§Ù„.</section>`; }
  function loading() { return `<section class="loading-panel"><span class="pulse-orb"></span><h2>ÙŠØªÙ… ØªØ¬Ù‡ÙŠØ² Ù…Ù†ØµØ© Ø§Ù„ØªØ¯Ø§ÙˆÙ„</h2><p>Ù†Ø­Ù…Ù‘Ù„ Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø²ÙˆØ¯ØŒ Ø§Ù„Ø£Ø®Ø¨Ø§Ø±ØŒ Ø§Ù„ØªÙˆØµÙŠØ§ØªØŒ ÙˆÙ‚ÙˆØ§Ø¦Ù… Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø¨Ø¯ÙˆÙ† Ø¥Ù†Ø´Ø§Ø¡ Ø¨ÙŠØ§Ù†Ø§Øª ÙˆÙ‡Ù…ÙŠØ©.</p></section>`; }

  /* asset icon system */
  function logoUrl(s, base, type) {
    if (type === "crypto") { const k = base.replace(/USDT?$/, "").replace(/USD$/, "").toLowerCase(); return k ? `https://assets.coincap.io/assets/icons/${k}@2x.png` : ""; }
    if (type === "stock" || type === "fund") {
      if (/^[A-Z]{1,5}$/.test(base) && !s.includes(".")) return `https://financialmodelingprep.com/image-stock/${base}.png`;
      const dom = DOMAINS[s] || DOMAINS[base];
      if (dom) return `https://www.google.com/s2/favicons?domain=${dom}&sz=128`;
    }
    return "";
  }
  function logo(a, size) {
    const s = sym(a.symbol || a.ticker || a.code || "SFM"), type = assetType(s, a.assetType || a.type), cls = `asset-logo ${type}${size ? " " + size : ""}`;
    const base = s.replace(/[.\-=].*$/, "");
    let style = "", inner = base.slice(0, 3) || "SFM";
    if (type === "crypto") { const k = base.replace(/USDT?$/, "").replace(/USD$/, ""); const cr = CRYPTO[k]; if (cr) { style = `background:${cr[1]};color:#fff`; inner = cr[0]; } }
    else if (type === "commodity") {
      if (/XAU|GOLD/i.test(s)) return `<span class="${cls}" style="background:linear-gradient(135deg,#ffd76a,#b8860b);color:#3a2a00" aria-hidden="true">Au</span>`;
      if (/XAG|SILVER/i.test(s)) return `<span class="${cls}" style="background:linear-gradient(135deg,#dfe6ee,#9aa6b2);color:#23303a" aria-hidden="true">Ag</span>`;
      if (/WTI|BRENT|OIL/i.test(s)) return `<span class="${cls}" style="background:#1a1a1a;color:#ffcf3f" aria-hidden="true">â›½</span>`;
      return `<span class="${cls}" aria-hidden="true">${h(base.slice(0, 2))}</span>`;
    }
    else if (type === "forex") { return `<span class="${cls}" aria-hidden="true"><b>${h(base.slice(0, 3))}</b><i>${h(base.slice(3, 6))}</i></span>`; }
    else {
      const suffix = s.includes(".") ? s.split(".").pop() : ""; if (GULF_FLAG[suffix]) return `<span class="${cls}" aria-hidden="true">${GULF_FLAG[suffix]}</span>`;
      const br = BRAND[s] || BRAND[base]; if (br) { style = `background:${br[2]};color:${br[1]}`; inner = br[0]; }
    }
    const url = logoUrl(s, base, type);
    const img = url ? `<img class="logo-img" src="${url}" alt="" loading="lazy" referrerpolicy="no-referrer" onload="this.classList.add('ok')" onerror="this.remove()" />` : "";
    return `<span class="${cls}" style="${style}" aria-hidden="true">${h(inner)}${img}</span>`;
  }
  function marketGlyph(m) { const G = { forex: "ðŸ’±", "us-stocks": "ðŸ‡ºðŸ‡¸", kuwait: "ðŸ‡°ðŸ‡¼", saudi: "ðŸ‡¸ðŸ‡¦", uae: "ðŸ‡¦ðŸ‡ª", qatar: "ðŸ‡¶ðŸ‡¦", bahrain: "ðŸ‡§ðŸ‡­", oman: "ðŸ‡´ðŸ‡²", europe: "ðŸ‡ªðŸ‡º", asia: "ðŸŒ", crypto: "â‚¿", commodities: "ðŸ›¢", indices: "ðŸ“Š", etfs: "ðŸ“¦", technology: "ðŸ’»", ai: "ðŸ¤–", semiconductors: "ðŸ”Œ", energy: "âš¡", banking: "ðŸ¦", healthcare: "ðŸ’Š", food: "ðŸ”" }; return G[m.id] || "ðŸ“ˆ"; }

  function status() {
    const s = providerCopy(), pill = document.getElementById("provider-status");
    if (pill) pill.innerHTML = `<span class="status-dot ${s.className}"></span><span>${h(s.title)}</span>`;
    const dot = document.getElementById("sidebar-status-dot"), title = document.getElementById("sidebar-status-title"), copy = document.getElementById("sidebar-status-copy");
    if (dot) dot.className = `status-dot ${s.className}`;
    if (title) title.textContent = s.title;
    if (copy) copy.textContent = s.copy;
    const session = document.getElementById("session-status"), market = currentMarket();
    if (session) session.textContent = `${market.ar} Â· ${market.currency}`;
  }
  function ticker() {
    const row = document.getElementById("ticker-row"); if (!row) return;
    const visible = isQuickTickerVisible();
    const items = visible ? tickerAssets() : [];
    const toggle = document.getElementById("ticker-toggle");
    if (toggle) {
      toggle.classList.toggle("is-off", !visible);
      toggle.setAttribute("aria-pressed", visible ? "true" : "false");
      toggle.textContent = visible ? "Hide ticker" : "Show ticker";
    }
    row.hidden = !visible || !items.length;
    row.classList.toggle("is-empty", !items.length);
    if (row.hidden) { row.innerHTML = ""; return; }
    row.innerHTML = items.map((a) => {
      const s = sym(a.symbol);
      const p = num(a.price, a.currentPrice, a.lastPrice);
      const chg = num(a.changePercent, a.percentChange);
      const label = displaySymbolFor(a.displaySymbol || s);
      const amount = p === null ? price(null) : price(p, currency({ ...a, symbol: s }));
      return `<button class="ticker-chip" data-symbol-details="${h(s)}" type="button">${logo({ ...a, symbol: s })}<span><strong>${h(label)}</strong><small class="ltr">${h(amount)} ${chg === null ? "" : `<i class="${chg >= 0 ? "up" : "down"}">${h(change(chg))}</i>`}</small></span></button>`;
    }).join("");
  }
  function isQuickTickerVisible() {
    return state.settings.quickTickerVisible !== false;
  }
  function tickerAssets() {
    const market = currentMarket();
    const selectedMarket = market.id;
    const selectedCategory = currentSelectedCategory();
    const source = allRecommendationSources();
    return unique(market.symbols || [])
      .map((symbol) => {
        const matched = findAssetForSymbol(symbol, source) || {};
        return norm({ ...matched, symbol });
      })
      .filter((asset) => isAssetAllowedForSelection(asset, selectedMarket, selectedCategory))
      .slice(0, 8);
  }
  function statusBar() {
    const bar = document.getElementById("terminal-statusbar"); if (!bar) return;
    const rec = recs(), mk = arr(state.markets.markets || state.markets.data || state.markets.results), p = providerCopy();
    const cells = [["Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù„Ø­Ø¸ÙŠØ©", p.className === "online" ? "Ù…ØªØµÙ„Ø©" : "ØºÙŠØ± Ù…ØªØµÙ„Ø©", "Real-time"], ["Ø§Ù„Ø£Ø³ÙˆØ§Ù‚", mk.length || MARKETS.length, "Markets"], ["Ø§Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ù…Ø­Ù„Ù„Ø©", rec.length || "--", "Analyzed"], ["Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©", state.watch.length, "Watchlist"], ["Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«", new Date().toLocaleTimeString("ar-KW", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), "Updated"]];
    bar.innerHTML = cells.map(([l, v, hp]) => `<div class="sb-cell"><span>${h(l)}</span><strong>${h(String(v))}</strong><em>${h(hp)}</em></div>`).join("") + `<div class="sb-cell sb-status"><span class="status-dot ${p.className}"></span><strong>${p.className === "online" ? "Ø§Ù„Ù†Ø¸Ø§Ù… ÙŠØ¹Ù…Ù„" : "Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ù…Ø²ÙˆØ¯"}</strong></div>`;
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function addWatch(raw) { const s = sym(raw); if (!s) return; state.watch = unique([s, ...state.watch]); write(keys.watch, state.watch); toast(`ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© ${s} Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©.`); render(); }
  function removeWatch(raw) { const s = sym(raw); state.watch = state.watch.filter(x => x !== s); write(keys.watch, state.watch); toast(`ØªÙ…Øª Ø¥Ø²Ø§Ù„Ø© ${s}.`); render(); }
  function createAlert(raw) { const s = sym(raw); if (!s) return; state.alerts = [{ symbol: s, type: "signal", title: `Ù…ØªØ§Ø¨Ø¹Ø© ${s}`, message: "ØªÙ†Ø¨ÙŠÙ‡ Ù…Ø­Ù„ÙŠ Ù…Ø­ÙÙˆØ¸. ÙŠØ­ØªØ§Ø¬ Ù…Ø²ÙˆØ¯ Ø£Ø³Ø¹Ø§Ø± Ù„ØªÙØ¹ÙŠÙ„Ù‡ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹.", createdAt: new Date().toISOString() }, ...state.alerts].slice(0, 30); write(keys.alerts, state.alerts); toast(`ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ØªÙ†Ø¨ÙŠÙ‡ Ù„Ù€ ${s}.`); render(); }
  function deleteAlert(i) { state.alerts.splice(Number(i), 1); write(keys.alerts, state.alerts); render(); }
  function tradeDraftFromAsset(asset, sourceType = "manual") {
    const a = norm(asset), action = signal(a), now = new Date().toISOString(), entry = num(a.entryPrice, a.entry, a.currentPrice, a.price, a.lastPrice);
    return {
      id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      symbol: a.symbol,
      assetName: a.name || a.assetName || a.symbol,
      assetLogo: a.assetLogo || a.logoUrl || null,
      market: a.market || "",
      action,
      entryPrice: entry,
      currentPrice: num(a.currentPrice, a.price, a.lastPrice, entry),
      targetPrice: num(a.targetPrice, a.target, a.target1),
      stopLoss: num(a.stopLoss, a.stop),
      confidence: num(a.confidence, a.score),
      riskLevel: riskKey(a.riskLevel || a.risk),
      timeframe: a.timeframe || a.duration || (action === "watch" ? "ØªØ­Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©" : "1-3 Ø£Ø³Ø§Ø¨ÙŠØ¹"),
      status: action === "wait" ? "waiting" : action === "watch" ? "watching" : "open",
      openedAt: now,
      updatedAt: now,
      provider: a.provider || a.source || "",
      sourceSignalId: a.sourceSignalId || a.source_signal_id || null,
      sourceType,
      notes: a.notes || a.reason || "",
      currency: a.currency || currency(a),
      payload: a
    };
  }
  async function persistFollowedTrade(draft) {
    const result = await post("/followed-trades", draft);
    if (result.ok) {
      toast("ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ø§Ù„ØµÙÙ‚Ø© Ø¥Ù„Ù‰ Ø£Ø¯Ø§Ø¡ Ø§Ù„ØµÙÙ‚Ø§Øª.");
    } else {
      state.localTrades = [draft, ...state.localTrades].slice(0, 80);
      write(keys.followed, state.localTrades);
      toast("ØªÙ… Ø­ÙØ¸ Ø§Ù„ØµÙÙ‚Ø© Ù…Ø­Ù„ÙŠØ§Ù‹Ø› Ø³Ø¬Ù‘Ù„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø£Ùˆ Ø·Ø¨Ù‘Ù‚ migrations Ù„Ù„Ø­ÙØ¸ ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª.");
    }
    await refreshFollowedTrades(false);
  }
  function followRecommendationTrade(raw) {
    const s = sym(raw), rec = matchRec(s);
    if (!rec) return toast("Ù„Ù… Ø£Ø¬Ø¯ ØªÙˆØµÙŠØ© Ù…Ø­ÙÙˆØ¸Ø© Ù„Ù‡Ø°Ø§ Ø§Ù„Ø±Ù…Ø² Ø­Ø§Ù„ÙŠØ§Ù‹.");
    persistFollowedTrade(tradeDraftFromAsset(rec, "recommendation_card"));
  }
  async function refreshFollowedTrades(force) {
    const data = await get(`/followed-trades${force ? "?refresh=1" : ""}`);
    if (data.ok) {
      state.followed = data;
      if (force) toast("ØªÙ… ØªØ­Ø¯ÙŠØ« Ø£Ø³Ø¹Ø§Ø± ØµÙÙ‚Ø§Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©.");
      render();
      afterRoute();
    } else {
      toast("ØªØ¹Ø°Ø± ØªØ­Ø¯ÙŠØ« ØµÙÙ‚Ø§Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø­Ø§Ù„ÙŠØ§Ù‹.");
    }
  }
  async function runSignalRefresh() {
    const result = await post("/market/signals/refresh", { symbols: defaults, force: true });
    if (!result.ok) {
      await get(`/market/signals?symbols=${encodeURIComponent(defaults.join(","))}&refresh=1&limit=${defaults.length}`);
      toast("ØªÙ… ØªØ´ØºÙŠÙ„ ÙØ­Øµ Ø¥Ø´Ø§Ø±Ø§Øª Ù…Ø­Ù„ÙŠØ› Ø§Ù„Ø­ÙØ¸ Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ ÙŠØ­ØªØ§Ø¬ ØµÙ„Ø§Ø­ÙŠØ© Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª.");
    } else {
      toast("ØªÙ… ØªØ´ØºÙŠÙ„ ÙØ­Øµ Ø§Ù„Ø¥Ø´Ø§Ø±Ø§Øª ÙˆØ­ÙØ¸ Ø§Ù„Ù…Ø±Ø´Ø­Ø§Øª Ø§Ù„Ù…ØªØ§Ø­Ø©.");
    }
    await refreshFollowedTrades(true);
  }
  function toast(message) { const root = document.getElementById("toast-root"); if (!root) return; const node = document.createElement("div"); node.className = "toast"; node.textContent = message; root.appendChild(node); setTimeout(() => node.remove(), 3200); }

  // form submits via delegation (forms re-render, so use document-level submit)
  document.addEventListener("submit", async (e) => {
    if (e.target.id === "alert-form") { e.preventDefault(); const f = new FormData(e.target); const s = sym(f.get("symbol")); if (!s) return toast("Ø§ÙƒØªØ¨ Ø±Ù…Ø²Ø§Ù‹."); state.alerts = [{ symbol: s, type: f.get("type"), value: f.get("value"), title: `ØªÙ†Ø¨ÙŠÙ‡ ${s}`, createdAt: new Date().toISOString() }, ...state.alerts].slice(0, 30); write(keys.alerts, state.alerts); toast(`ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ØªÙ†Ø¨ÙŠÙ‡ Ù„Ù€ ${s}.`); render(); }
    if (e.target.id === "holding-form") { e.preventDefault(); const f = new FormData(e.target); const s = sym(f.get("symbol")); if (!s) return toast("Ø§ÙƒØªØ¨ Ø±Ù…Ø²Ø§Ù‹."); state.holdings = [{ symbol: s, qty: f.get("qty"), entry: f.get("entry") }, ...state.holdings].slice(0, 50); write(keys.holdings, state.holdings); toast(`ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ù…Ø±ÙƒØ² ${s}.`); render(); }
    if (e.target.id === "followed-trade-form") {
      e.preventDefault();
      const f = new FormData(e.target);
      const s = sym(f.get("symbol"));
      if (!s) return toast("Ø§ÙƒØªØ¨ Ø±Ù…Ø²Ø§Ù‹.");
      const draft = tradeDraftFromAsset({
        symbol: s,
        action: f.get("action"),
        entryPrice: f.get("entryPrice"),
        currentPrice: f.get("entryPrice"),
        targetPrice: f.get("targetPrice"),
        stopLoss: f.get("stopLoss"),
        confidence: f.get("confidence"),
        notes: f.get("notes"),
        status: f.get("action") === "wait" ? "waiting" : f.get("action") === "watch" ? "watching" : "open",
        provider: "manual"
      }, "manual");
      await persistFollowedTrade(draft);
      e.target.reset();
    }
    if (e.target.id === "settings-form") {
      e.preventDefault();
      const f = new FormData(e.target);
      state.settings.defaultMarket = f.get("defaultMarket");
      state.settings.risk = f.get("risk");
      state.settings.signalMinConfidence = Math.max(0, Math.min(95, Number(f.get("signalMinConfidence")) || 70));
      state.settings.quickTickerVisible = f.get("quickTickerVisible") === "on";
      state.settings.enabledMarkets = f.getAll("enabledMarkets").map(String).filter(Boolean);
      state.settings.buyAlertsEnabled = f.get("buyAlertsEnabled") === "on";
      state.settings.sellAlertsEnabled = f.get("sellAlertsEnabled") === "on";
      state.settings.waitAlertsEnabled = f.get("waitAlertsEnabled") === "on";
      state.settings.inAppAlertsEnabled = f.get("inAppAlertsEnabled") === "on";
      state.settings.emailAlertsEnabled = f.get("emailAlertsEnabled") === "on";
      write(keys.settings, state.settings);
      saveSignalPreferences(signalPrefs()).then(ok => toast(ok ? "ØªÙ… Ø­ÙØ¸ ØªÙØ¶ÙŠÙ„Ø§Øª Ø§Ù„Ø¥Ø´Ø§Ø±Ø§Øª." : "ØªÙ… Ø­ÙØ¸Ù‡Ø§ Ù…Ø­Ù„ÙŠØ§Ù‹Ø› ÙŠÙ„Ø²Ù… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù„Ø­ÙØ¸Ù‡Ø§ ÙÙŠ Ø§Ù„Ø­Ø³Ø§Ø¨."));
      retryRoute();
    }
  });
  document.addEventListener("click", (e) => {
    const acc = e.target.closest("[data-acc]"); if (acc) { acc.closest(".accordion").classList.toggle("is-open"); }
    const delH = e.target.closest("[data-remove-holding]"); if (delH) { state.holdings.splice(Number(delH.dataset.removeHolding), 1); write(keys.holdings, state.holdings); render(); }
  });

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Selectors / utils â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function legacyRecsFrom(data) { return arr((data && (data.recommendations || data.items || data.data || data.results))).map(norm).filter(x => x.symbol); }
  function signalsFrom(data) { return arr(data && (data.signals || data.items || data.data || data.results)).map(signalToRec).filter(x => x.symbol); }
  function recsFrom(data) { return mergeRecLists(signalsFrom(data), legacyRecsFrom(data)); }
  function allRecommendationSources() { return mergeRecLists(signalsFrom(state.signals), legacyRecsFrom(state.rec)); }
  function recs() { return filterRecommendationsForSelection(allRecommendationSources(), state.settings.defaultMarket, currentSelectedCategory()); }
  function currentSelectedCategory() { return state.settings.selectedCategory || categoryFromSelection(state.settings.defaultMarket); }
  function filterRecommendationsForSelection(items, selectedMarket, selectedCategory) {
    return arr(items).map(norm).filter(asset => isAssetAllowedForSelection(asset, selectedMarket, selectedCategory));
  }
  function categoryFromSelection(selectedMarket) {
    const id = String(selectedMarket || "").trim().toLowerCase();
    if (id === "commodities") return "commodity";
    if (id === "etfs") return "fund";
    if (id === "indices") return "index";
    return CATEGORY_MARKET_IDS.has(id) ? id : "all";
  }
  function normalizedCategory(value) {
    const raw = String(value || "all").trim().toLowerCase().replace(/[_-]+/g, " ");
    if (!raw || raw === "all" || raw === "all assets") return "all";
    if (["stocks", "equities", "equity"].includes(raw)) return "stock";
    if (["tech", "tech stock", "tech stocks", "technology stocks"].includes(raw)) return "technology";
    if (["semiconductor", "semiconductor stocks"].includes(raw)) return "semiconductors";
    if (["commodities", "metals"].includes(raw)) return "commodity";
    if (["indices", "indexes", "benchmarks"].includes(raw)) return "index";
    if (["etf", "etfs", "funds"].includes(raw)) return "fund";
    if (raw === "fx" || raw === "currency pairs") return "forex";
    return raw;
  }
  function fieldText(asset, keys) {
    const providerStatus = asset && typeof asset.providerStatus === "object" ? asset.providerStatus : {};
    const metadataDiagnostics = asset && typeof asset.metadataDiagnostics === "object" ? asset.metadataDiagnostics : {};
    for (const source of [asset || {}, providerStatus || {}, metadataDiagnostics || {}]) {
      for (const key of keys) {
        const value = String(source[key] ?? "").trim();
        if (value) return value;
      }
    }
    return "";
  }
  function upperField(asset, keys) { return fieldText(asset, keys).toUpperCase(); }
  function countryForAsset(asset) {
    const explicit = upperField(asset, ["country", "countryCode", "country_code", "finalCountry"]);
    if (explicit) return explicit;
    const s = sym(asset.symbol || asset.displaySymbol || asset.canonicalSymbol || asset.providerSymbolUsed || asset.providerSymbol);
    if (/\.KW$/i.test(s)) return "KUWAIT";
    if (/\.(SR|SA)$/i.test(s)) return "SAUDI ARABIA";
    if (/\.(AE|DU|AD)$/i.test(s)) return "UAE";
    if (/\.QA$/i.test(s)) return "QATAR";
    if (/\.BH$/i.test(s)) return "BAHRAIN";
    if (/\.OM$/i.test(s)) return "OMAN";
    if (!/\.[A-Z]{1,3}$/i.test(s) && inferredAssetType(asset) === "stock") return "US";
    return "";
  }
  function inferredAssetType(asset) {
    const explicit = assetType(asset.symbol || asset.displaySymbol || asset.canonicalSymbol || asset.providerSymbolUsed || asset.providerSymbol, asset.assetType || asset.asset_type || asset.quoteType || asset.instrumentType || asset.category);
    return explicit || "stock";
  }
  function classificationForAsset(asset) {
    return [
      fieldText(asset, ["sector", "category"]),
      fieldText(asset, ["industry"]),
      fieldText(asset, ["market", "marketName", "market_name", "finalMarket"]),
      fieldText(asset, ["exchange", "exchangeName", "exchange_name"])
    ].filter(Boolean).join(" ").toUpperCase();
  }
  function localMarketDecision(asset, selectedMarket) {
    const id = String(selectedMarket || "").toLowerCase();
    const rule = STRICT_LOCAL_MARKETS[id];
    if (!rule) return { allowed: true, reason: "not_strict_local_market" };
    const s = sym(asset.symbol || asset.displaySymbol || asset.canonicalSymbol || asset.providerSymbolUsed || asset.providerSymbol);
    const exchange = upperField(asset, ["exchange", "exchangeName", "exchange_name", "exchangeCode", "exchange_code", "finalExchange", "finalExchangeCode"]);
    const market = upperField(asset, ["market", "marketName", "market_name", "finalMarket"]);
    const country = countryForAsset(asset);
    const currencyCode = currency(asset);
    const type = inferredAssetType(asset);
    const exchangeOk = rule.exchange.test(exchange) || rule.suffix.test(s);
    const marketOk = rule.market.test(market) || rule.suffix.test(s);
    const venueOk = exchangeOk || marketOk || rule.suffix.test(s);
    const countryOk = rule.countries.includes(country) || rule.suffix.test(s);
    const currencyOk = currencyCode === rule.currency;
    const typeOk = type === "stock";
    if (!venueOk) return { allowed: false, reason: "venue_mismatch", rule, exchange, market, country, currency: currencyCode, type };
    if (!countryOk) return { allowed: false, reason: "country_mismatch", rule, exchange, market, country, currency: currencyCode, type };
    if (!currencyOk) return { allowed: false, reason: "currency_mismatch", rule, exchange, market, country, currency: currencyCode, type };
    if (!typeOk) return { allowed: false, reason: "asset_type_mismatch", rule, exchange, market, country, currency: currencyCode, type };
    return { allowed: true, reason: "matched_strict_local_market", rule, exchange, market, country, currency: currencyCode, type };
  }
  function usMarketDecision(asset, selectedMarket) {
    if (!["us-stocks", "technology"].includes(String(selectedMarket || "").toLowerCase())) return { allowed: true, reason: "not_us_market" };
    const s = sym(asset.symbol || asset.displaySymbol || asset.canonicalSymbol || asset.providerSymbolUsed || asset.providerSymbol);
    const type = inferredAssetType(asset);
    const exchange = upperField(asset, ["exchange", "exchangeName", "exchange_name", "exchangeCode", "exchange_code"]);
    const country = countryForAsset(asset);
    const currencyCode = currency(asset);
    const hasNonUsSuffix = /\.[A-Z]{1,3}$/i.test(s) && !/\.US$/i.test(s);
    const countryOk = !country || ["US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"].includes(country);
    const exchangeOk = !exchange || US_EXCHANGE_RE.test(exchange);
    if (type !== "stock") return { allowed: false, reason: "us_market_asset_type_mismatch", type };
    if (currencyCode !== "USD") return { allowed: false, reason: "us_market_currency_mismatch", currency: currencyCode, type };
    if (!countryOk || !exchangeOk || hasNonUsSuffix) return { allowed: false, reason: "us_market_country_exchange_mismatch", exchange, country, currency: currencyCode, type };
    return { allowed: true, reason: "matched_us_market", exchange, country, currency: currencyCode, type };
  }
  function categoryDecision(asset, selectedMarket, selectedCategory) {
    const category = normalizedCategory(selectedCategory || categoryFromSelection(selectedMarket));
    if (category === "all") return { allowed: true, reason: "category_all", category };
    const type = inferredAssetType(asset);
    const s = sym(asset.symbol || asset.displaySymbol || asset.canonicalSymbol || asset.providerSymbolUsed || asset.providerSymbol).replace(/[-=].*$/, "").replace(/\..*$/, "");
    const classification = classificationForAsset(asset);
    if (category === "stock") return { allowed: type === "stock", reason: type === "stock" ? "matched_stock_category" : "category_asset_type_mismatch", category, type };
    if (["crypto", "forex", "commodity", "fund", "index"].includes(category)) return { allowed: type === category, reason: type === category ? `matched_${category}_category` : "category_asset_type_mismatch", category, type };
    if (category === "technology") {
      const technologyMatch = TECHNOLOGY_SYMBOLS.has(s) || /\b(TECHNOLOGY|INFORMATION TECHNOLOGY|SOFTWARE|CLOUD|CYBERSECURITY|SEMICONDUCTORS?|ELECTRONIC COMPONENTS?)\b/.test(classification);
      const us = usMarketDecision(asset, "technology");
      return { allowed: us.allowed && technologyMatch, reason: us.allowed && technologyMatch ? "matched_technology_category" : (["crypto", "forex", "commodity"].includes(type) ? "technology_category_asset_type_mismatch" : "technology_category_mismatch"), category, type };
    }
    if (category === "semiconductors") {
      const semisMatch = SEMICONDUCTOR_SYMBOLS.has(s) || /\b(SEMICONDUCTORS?|SEMICONDUCTOR EQUIPMENT|SEMICONDUCTOR MATERIALS?|INTEGRATED CIRCUITS?|CHIP(?:S|MAKER|MAKERS)?)\b/.test(classification);
      return { allowed: type === "stock" && semisMatch, reason: type === "stock" && semisMatch ? "matched_semiconductors_category" : (["crypto", "forex", "commodity"].includes(type) ? "semiconductors_category_asset_type_mismatch" : "semiconductors_category_mismatch"), category, type };
    }
    return { allowed: false, reason: "unknown_category", category, type };
  }
  function isAssetAllowedForSelection(asset, selectedMarket, selectedCategory) {
    const local = localMarketDecision(asset, selectedMarket);
    if (!local.allowed) { warnSelectionExclusion(asset, selectedMarket, selectedCategory, local); return false; }
    const us = usMarketDecision(asset, selectedMarket);
    if (!us.allowed) { warnSelectionExclusion(asset, selectedMarket, selectedCategory, us); return false; }
    const category = categoryDecision(asset, selectedMarket, selectedCategory);
    if (!category.allowed) { warnSelectionExclusion(asset, selectedMarket, selectedCategory, category); return false; }
    return true;
  }
  function warnSelectionExclusion(asset, selectedMarket, selectedCategory, decision) {
    if (!DEV_DIAGNOSTICS) return;
    const marketId = String(selectedMarket || "").toLowerCase();
    const category = normalizedCategory(selectedCategory || categoryFromSelection(selectedMarket));
    const type = decision.type || inferredAssetType(asset);
    const payload = {
      symbol: asset.symbol,
      exchange: asset.exchange || asset.exchangeName || asset.exchangeCode,
      market: asset.market || asset.marketName,
      country: asset.country || asset.countryCode || decision.country || countryForAsset(asset),
      currency: asset.currency || decision.currency || currency(asset),
      assetType: asset.assetType || asset.asset_type || type,
      sector: asset.sector,
      industry: asset.industry,
      category,
      reason: decision.reason
    };
    if (marketId === "qatar" && (payload.currency !== "QAR" || !["QA", "QATAR"].includes(String(payload.country || "").toUpperCase()))) console.warn("[trader] Excluding non-Qatar asset from Qatar selection", payload);
    else if (marketId === "kuwait" && (payload.currency !== "KWD" || !["KW", "KUWAIT"].includes(String(payload.country || "").toUpperCase()))) console.warn("[trader] Excluding non-Kuwait asset from Kuwait selection", payload);
    else if (category === "technology" && ["crypto", "forex", "commodity"].includes(type)) console.warn("[trader] Excluding non-technology asset from technology selection", payload);
    else console.warn("[trader] Excluding asset outside selected market/category", payload);
  }
  function mergeRecLists(primary, fallback) {
    const map = new Map();
    fallback.forEach(item => { if (item.symbol) map.set(sym(item.symbol), item); });
    primary.forEach(item => {
      const key = sym(item.symbol);
      if (key) map.set(key, { ...(map.get(key) || {}), ...item });
    });
    return Array.from(map.values());
  }
  function signalToRec(x) {
    x = x || {};
    const base = norm({ ...x, name: x.assetName || x.asset_name || x.name });
    const currentPrice = num(x.currentPrice, x.current_price, x.price, base.price);
    const targetPrice = num(x.targetPrice, x.target_price, x.target, base.target);
    const stopLoss = num(x.stopLoss, x.stop_loss, x.stop, base.stopLoss);
    const reasons = arr(x.reasons).map(String).filter(Boolean);
    const warnings = arr(x.warnings).map(String).filter(Boolean);
    return {
      ...base,
      assetType: x.assetType || x.asset_type || base.assetType,
      market: x.market || base.market,
      currency: x.currency || base.currency,
      signal: x.finalRecommendation ?? x.final_recommendation ?? x.finalRecommendationAr ?? x.final_recommendation_ar ?? x.action ?? base.signal,
      recommendation: x.finalRecommendation ?? x.final_recommendation ?? x.finalRecommendationAr ?? x.final_recommendation_ar ?? x.action ?? base.recommendation,
      action: x.finalRecommendation ?? x.final_recommendation ?? x.action ?? base.action,
      id: x.id || base.id,
      sourceSignalId: x.id || x.sourceSignalId || x.source_signal_id || base.sourceSignalId,
      actionLabelAr: x.actionLabelAr || x.action_label_ar,
      confidence: num(x.aiConfidence, x.ai_confidence, x.confidence, base.confidence),
      aiConfidence: num(x.aiConfidence, x.ai_confidence, x.confidence, base.aiConfidence),
      score: num(x.finalScore, x.confidence, base.score),
      price: currentPrice,
      currentPrice,
      target: targetPrice,
      targetPrice,
      stopLoss,
      stop: stopLoss,
      riskLevel: x.riskLevel || x.risk_level || base.riskLevel,
      dataQuality: (x.dataQualityStatus && x.dataQualityStatus.status) || x.dataQuality || x.data_quality,
      dataQualityStatus: x.dataQualityStatus || x.data_quality_status,
      samples: x.samples,
      finalRecommendation: x.finalRecommendation ?? x.final_recommendation,
      finalRecommendationAr: x.finalRecommendationAr ?? x.final_recommendation_ar,
      finalScore: x.finalScore ?? x.final_score,
      strategyCount: x.strategyCount ?? x.strategy_count,
      strategyAgreement: x.strategyAgreement,
      strategyConsensus: x.strategyConsensus,
      strategies: x.strategies,
      technicalAvailable: x.technicalAvailable ?? x.technical_available,
      provider: x.provider || base.provider || "",
      source: x.provider || base.source,
      timeframe: x.timeframe || base.timeframe,
      reasons,
      warnings,
      reason: reasons[0] || x.reason || base.reason,
      summary: x.summary || reasons.join(" Â· "),
      status: x.status || (x.action === "wait" ? "Ø§Ù†ØªØ¸Ø§Ø±" : x.action === "watch" ? "ØªØ­Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©" : "open"),
      scoreBreakdown: x.scoreBreakdown || x.score_breakdown,
      technicalSummary: x.technicalSummary || x.technical_summary,
      newsSentimentSummary: x.newsSentimentSummary || x.news_sentiment_summary,
      explanation: x.explanation || x.explanationAr || x.explanationEn,
      explanationAr: x.explanationAr,
      explanationEn: x.explanationEn,
      disclaimer: x.disclaimer,
      disclaimerAr: x.disclaimerAr,
      disclaimerEn: x.disclaimerEn,
      lastUpdated: x.lastUpdated || x.last_updated || x.created_at
    };
  }
  function signalNotifications() { return arr(state.signalAlerts.notifications || state.signalAlerts.items || state.signalAlerts.data || state.signalAlerts.results); }
  function signalHistoryItems() {
    const rows = arr(state.signals.history || state.signals.signalHistory || state.signals.signal_history);
    if (rows.length) return rows.map(row => ({
      title: row.title || `ØªØºÙŠØ±Øª Ø§Ù„Ø¥Ø´Ø§Ø±Ø© Ø¹Ù„Ù‰ ${sym(row.symbol)}`,
      symbol: row.symbol,
      message: row.message || `${sigLabel(row.old_action || row.oldAction || "watch")} â†’ ${sigLabel(row.new_action || row.newAction || "watch")} Â· ${latinNumber(row.new_confidence || row.newConfidence)}%`
    }));
    return signalNotifications().filter(item => String(item.event || "").includes("change") || String(item.title || "").includes("ØªØºÙŠØ±")).slice(0, 4);
  }
  function smartAlerts() { return [...signalNotifications(), ...arr(state.rec.smartAlerts || state.rec.alerts || state.rec.signals)]; }
  function newsItems() { return arr(state.news.items || state.news.articles || state.news.news || state.news.data || state.news.results); }
  function trades() { return mergeTradeLists(arr(state.followed.followedTrades || state.followed.trades || state.followed.items || state.followed.data || state.followed.followed), state.localTrades || []); }
  function matchRec(s) { const k = sym(s); return recs().find(x => sym(x.symbol) === k) || null; }
  function topPicks(r, n) { return [...r].sort((a, b) => (num(b.aiConfidence, b.ai_confidence, b.confidence, b.score) || 0) - (num(a.aiConfidence, a.ai_confidence, a.confidence, a.score) || 0)).slice(0, n); }
  function sortMovers(r) { const withChg = r.filter(x => num(x.changePercent, x.percentChange) !== null); const byChg = [...withChg].sort((a, b) => num(b.changePercent, b.percentChange) - num(a.changePercent, a.percentChange)); return { gainers: byChg, losers: [...byChg].reverse(), active: topPicks(r, r.length) }; }
  function mergeTradeLists(server, local) {
    const seen = new Set(), output = [];
    [...server, ...local].forEach(item => {
      const s = sym(item.symbol || item.asset || item.ticker), key = item.id || `${s}:${item.action || item.signal}:${item.openedAt || item.createdAt || ""}`;
      if (!s || seen.has(key)) return;
      seen.add(key);
      output.push({ ...item, symbol: s });
    });
    return output.sort((a, b) => new Date(b.openedAt || b.createdAt || 0) - new Date(a.openedAt || a.createdAt || 0));
  }
  function tradeAction(t) { return signal({ action: t.action, signal: t.signal, recommendation: t.recommendation, type: t.type }); }
  function tradeStatus(t) {
    const st = String(t.status || t.state || "").toLowerCase();
    if (st.includes("won") || st.includes("win") || st.includes("target") || st.includes("Ø±Ø§Ø¨Ø­")) return "won";
    if (st.includes("lost") || st.includes("loss") || st.includes("stop") || st.includes("Ø®Ø§Ø³Ø±")) return "lost";
    if (st.includes("expire") || st.includes("Ù…Ù†ØªÙ‡ÙŠ")) return "expired";
    if (st.includes("wait") || st.includes("pending") || st.includes("Ø§Ù†ØªØ¸Ø§Ø±")) return "waiting";
    if (st.includes("watch") || st.includes("Ù…ØªØ§Ø¨Ø¹Ø©") || st.includes("Ù…Ø±Ø§Ù‚Ø¨Ø©")) return "watching";
    if (st.includes("open") || st.includes("Ù…ÙØªÙˆØ­")) return "open";
    const action = tradeAction(t);
    return action === "wait" ? "waiting" : action === "watch" ? "watching" : "open";
  }
  function tradeStatusLabel(st) { return st === "won" ? "Ø±Ø§Ø¨Ø­Ø©" : st === "lost" ? "Ø®Ø§Ø³Ø±Ø©" : st === "open" ? "Ù…ÙØªÙˆØ­Ø©" : st === "waiting" ? "Ø§Ù†ØªØ¸Ø§Ø±" : st === "expired" ? "Ù…Ù†ØªÙ‡ÙŠØ©" : "ØªØ­Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©"; }
  function tradeStatusTone(st) { return st === "won" ? "ok" : st === "lost" ? "bad" : st === "waiting" ? "warn" : st === "expired" ? "muted" : ""; }
  function groupTrades(items) {
    const g = { win: [], loss: [], open: [], wait: [], follow: [] };
    items.forEach(t => {
      const st = tradeStatus(t);
      if (st === "won") g.win.push(t);
      else if (st === "lost") g.loss.push(t);
      else if (st === "open") g.open.push(t);
      else if (st === "waiting") g.wait.push(t);
      else g.follow.push(t);
    });
    return g;
  }
  function tradeSummary(items) { const g = groupTrades(items), resolved = g.win.length + g.loss.length; return { ...g, successRate: resolved ? Math.round(g.win.length / resolved * 100) : null }; }
  function norm(x) {
    x = x || {};
    const providerSymbol = sym(x.providerSymbol || x.provider_symbol || x.providerSymbolUsed || x.provider_symbol_used || x.ticker || x.code || "");
    const displaySymbol = sym(x.displaySymbol || x.display_symbol || x.symbol || x.asset || providerSymbol || x.name || "");
    const s = displaySymbol || providerSymbol;
    const companyName = x.companyName || x.company_name_en || x.company_name_ar || x.assetName || x.longName || x.name || s;
    const normalized = {
      ...x,
      providerSymbol,
      providerSymbolUsed: x.providerSymbolUsed || x.provider_symbol_used || providerSymbol,
      displaySymbol,
      symbol: s,
      exchange: x.exchange || x.exchangeName || x.exchange_name || x.exchangeCode || x.exchange_code || "",
      exchangeCode: x.exchangeCode || x.exchange_code || "",
      market: x.market || x.marketName || x.market_name || "",
      country: x.country || x.countryCode || x.country_code || "",
      currency: x.currency || x.currencyCode || x.quoteCurrency || "",
      assetType: assetType(s, x.assetType || x.asset_type || x.quoteType || x.instrumentType || x.category),
      fundType: x.fundType || x.fund_type || "",
      fundTypeLabelAr: x.fundTypeLabelAr || x.fund_type_label_ar,
      fundTypeLabelEn: x.fundTypeLabelEn || x.fund_type_label_en,
      fundStructure: x.fundStructure || x.fund_structure,
      fundName: x.fundName || x.fund_name || companyName,
      issuer: x.issuer || x.fundIssuer || x.fund_issuer,
      expenseRatio: x.expenseRatio ?? x.expense_ratio,
      distributionYield: x.distributionYield ?? x.distribution_yield ?? x.yield,
      nav: x.nav ?? x.netAssetValue ?? x.net_asset_value,
      aum: x.aum ?? x.assetsUnderManagement ?? x.assets_under_management,
      dataAvailability: x.dataAvailability || x.data_availability,
      shariahStatus: x.shariahStatus || x.shariah_status || x.shariaStatus,
      sector: x.sector || "",
      industry: x.industry || "",
      companyName,
      name: x.name || companyName,
    };
    return normalized;
  }
  function signal(x) {
    const raw = String(x.finalRecommendation || x.finalRecommendationAr || x.signal || x.recommendation || x.action || x.side || x.type || "watch").toLowerCase();
    if (raw.includes("insufficient") || raw.includes("Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± ÙƒØ§ÙÙŠØ©")) return "insufficient_data";
    if (raw.includes("weak_buy") || raw.includes("weak buy") || raw.includes("Ø´Ø±Ø§Ø¡ Ø¶Ø¹ÙŠÙ")) return "weak_buy";
    if (raw.includes("cautious") || raw.includes("Ø¨Ø­Ø°Ø±")) return "cautious_buy";
    if (raw.includes("avoid") || raw.includes("sell_or_avoid") || raw.includes("ØªØ¬Ù†Ø¨")) return "sell_or_avoid";
    if (raw.includes("sell") || raw.includes("Ø¨ÙŠØ¹") || raw.includes("short")) return "sell";
    if (raw.includes("buy") || raw.includes("Ø´Ø±Ø§Ø¡") || raw.includes("long")) return "buy";
    if (raw.includes("wait") || raw.includes("hold") || raw.includes("Ø§Ù†ØªØ¸Ø§Ø±")) return "wait";
    return "watch";
  }
  function sigLabel(s) { return s === "buy" ? "Ø´Ø±Ø§Ø¡" : s === "weak_buy" ? "Ø´Ø±Ø§Ø¡ Ø¶Ø¹ÙŠÙ" : s === "cautious_buy" ? "Ø´Ø±Ø§Ø¡ Ø¨Ø­Ø°Ø±" : isSellSignalName(s) ? "ØªØ¬Ù†Ø¨ / Ø¨ÙŠØ¹" : s === "insufficient_data" ? "Ø¨ÙŠØ§Ù†Ø§Øª ØºÙŠØ± ÙƒØ§ÙÙŠØ©" : s === "wait" ? "Ø§Ù†ØªØ¸Ø§Ø±" : "Ù…Ø±Ø§Ù‚Ø¨Ø©"; }
  function sigLabelEn(s) { return s === "buy" ? "Buy" : s === "weak_buy" ? "Weak Buy" : s === "cautious_buy" ? "Cautious Buy" : isSellSignalName(s) ? "Avoid / Sell" : s === "insufficient_data" ? "Insufficient data" : s === "wait" ? "Wait" : "Watch"; }
  function recStatus(x) { const s = String(x.status || x.state || "open").toLowerCase(); if (s.includes("complet") || s.includes("Ù…ÙƒØªÙ…Ù„")) return "Ù…ÙƒØªÙ…Ù„Ø©"; if (s.includes("fail") || s.includes("ÙØ§Ø´Ù„")) return "ÙØ§Ø´Ù„Ø©"; if (s.includes("expÐ¸Ñ€") || s.includes("expire") || s.includes("Ù…Ù†ØªÙ‡ÙŠ")) return "Ù…Ù†ØªÙ‡ÙŠØ©"; if (s.includes("watch") || s.includes("Ù…ØªØ§Ø¨Ø¹Ø©")) return "ØªØ­Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©"; return "Ù…ÙØªÙˆØ­Ø©"; }
  function recStatusTone(x) { const s = recStatus(x); return s === "Ù…ÙƒØªÙ…Ù„Ø©" ? "ok" : s === "ÙØ§Ø´Ù„Ø©" ? "bad" : s === "Ù…Ù†ØªÙ‡ÙŠØ©" ? "muted" : ""; }
  function confText(x) { const c = num(x.aiConfidence, x.ai_confidence, x.confidence, x.score); return c === null ? "--" : Math.round(c) + "%"; }
  function riskKey(v) { const s = String(v || "").toLowerCase(); if (s.includes("high") || s.includes("Ù…Ø±ØªÙØ¹") || s.includes("Ø¹Ø§Ù„ÙŠ")) return "high"; if (s.includes("low") || s.includes("Ù…Ù†Ø®ÙØ¶")) return "low"; return "medium"; }
  function riskShort(v) { const k = riskKey(v); return k === "high" ? "Ø¹Ø§Ù„ÙŠØ©" : k === "low" ? "Ù…Ù†Ø®ÙØ¶Ø©" : "Ù…ØªÙˆØ³Ø·Ø©"; }
  function riskTone(v) { const k = riskKey(v); return k === "high" ? "bad" : k === "low" ? "ok" : "warn"; }
  function riskLabel(r) { return r === "conservative" ? "Ù…Ø­Ø§ÙØ¸" : r === "aggressive" ? "Ù‡Ø¬ÙˆÙ…ÙŠ" : "Ù…ØªÙˆØ§Ø²Ù†"; }
  function dataQualityLabel(value) { const v = String(value || "").toLowerCase(); if (v === "complete") return "Ù…ÙƒØªÙ…Ù„Ø©"; if (v === "live") return "Ù…Ø¨Ø§Ø´Ø±Ø©"; if (v === "cached") return "Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø®Ø²Ù†Ø© Ù…Ø¤Ù‚ØªØ§Ù‹"; if (v === "delayed") return "Ù…ØªØ£Ø®Ø±Ø©"; if (v === "partial") return "Ø¬Ø²Ø¦ÙŠØ©"; if (v === "unavailable") return "ØºÙŠØ± Ù…ØªØ§Ø­Ø©"; return value || "ØºÙŠØ± Ù…ØªØ§Ø­"; }
  function signalPrefs() {
    const s = state.settings || {};
    const enabledMarkets = Array.isArray(s.enabledMarkets) && s.enabledMarkets.length
      ? s.enabledMarkets
      : ["US", "Kuwait", "Saudi", "UAE", "Qatar", "Bahrain", "Oman", "Forex", "Crypto", "Commodities"];
    return {
      minConfidence: Math.max(0, Math.min(95, Number(s.signalMinConfidence) || 70)),
      riskProfile: s.risk || "balanced",
      enabledMarkets,
      buyAlertsEnabled: s.buyAlertsEnabled !== false,
      sellAlertsEnabled: s.sellAlertsEnabled !== false,
      waitAlertsEnabled: s.waitAlertsEnabled === true,
      inAppAlertsEnabled: s.inAppAlertsEnabled !== false,
      emailAlertsEnabled: s.emailAlertsEnabled === true,
      telegramAlertsEnabled: false,
      pushAlertsEnabled: false
    };
  }
  function marketApi(id) { const m = MARKETS.find(x => x.id === id); return m ? m.apiMarket : (id || "us-stocks"); }
  function currentMarket() { return MARKETS.find(x => x.id === state.settings.defaultMarket) || MARKETS[0]; }
  function currency(a) { const s = sym(a.symbol || a.ticker || ""), explicit = a.currency || a.currencyCode || a.quoteCurrency; if (explicit && String(explicit).toUpperCase() !== "KWF") return String(explicit).toUpperCase(); if (/\.KW$/i.test(s)) return "KWD"; if (/\.SR$|\.SA$/i.test(s)) return "SAR"; if (/\.AE$|\.DU$|\.AD$/i.test(s)) return "AED"; if (/\.QA$/i.test(s)) return "QAR"; if (/\.OM$/i.test(s)) return "OMR"; if (/\.BH$/i.test(s)) return "BHD"; if (/\.T$/i.test(s)) return "JPY"; if (/\.HK$/i.test(s)) return "HKD"; if (/\.DE$|\.AS$|\.PA$|\.MI$|\.MC$/i.test(s)) return "EUR"; if (/\.L$/i.test(s)) return "GBP"; if (/\.SW$/i.test(s)) return "CHF"; if (/\.KS$/i.test(s)) return "KRW"; if (/^(NAS100|US30|SPX|SPX500|NDX|DJI|DXY|IXIC|DAX|FTSE|CAC40|NIKKEI|HSI)$/.test(s)) return "USD"; if (/^[A-Z]{6}$/.test(s)) return s.slice(3); if (/USD$/.test(s) || /^(XAUUSD|XAGUSD|WTI|BRENT|GC=F|SI=F|CL=F|BZ=F)$/.test(s)) return "USD"; if (/^[A-Z]{1,5}$/.test(s)) return "USD"; return "--"; }
  function assetType(s, explicit) { s = sym(s); if (explicit) { const e = String(explicit).toLowerCase(); if (/crypto/.test(e)) return "crypto"; if (/forex|fx|currency/.test(e)) return "forex"; if (/commodit|metal/.test(e)) return "commodity"; if (/etf|fund|reit|sukuk|mutual/.test(e)) return "fund"; if (/index/.test(e)) return "index"; if (/stock|equity/.test(e)) return "stock"; } if (/BTC|ETH|SOL|USDT|XRP|ADA|BNB|DOGE/i.test(s) && /USD|USDT/i.test(s)) return "crypto"; if (/^(XAUUSD|XAGUSD|WTI|BRENT|GC=F|SI=F|CL=F|BZ=F)$/.test(s) || /XAU|XAG|WTI|BRENT|OIL|GOLD|SILVER/i.test(s)) return "commodity"; if (/^(NAS100|US30|SPX|SPX500|NDX|DJI|DXY|IXIC|DAX|FTSE|CAC40|NIKKEI|HSI)$/.test(s)) return "index"; if (/^[A-Z]{6}$/.test(s.replace(/[.\-=].*/, ""))) return "forex"; if (/^(SPY|QQQ|VOO|DIA|IWM|GLD|SLV|VTI|VEA|VWO|AGG|BND|TLT|HYG|XLK|XLF|XLE|XLV|XLY|XLI|XLP|XLU|VNQ|SOXX|AMCREIT|ENBDREIT|REIT)$/.test(s)) return "fund"; return "stock"; }
  function sym(v) { return String(v || "").trim().toUpperCase().replace(/\s+/g, ""); }
  function price(v, c) { return v === null || v === undefined || Number.isNaN(Number(v)) ? "ØºÙŠØ± Ù…ØªØ§Ø­" : `${Number(v).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${c && c !== "--" ? c : ""}`.trim(); }
  function change(v) { return v === null || v === undefined ? "ØºÙŠØ± Ù…ØªØ§Ø­" : `${v > 0 ? "+" : ""}${Number(v).toFixed(2)}%`; }
  function date(v) { if (!v) return "--"; const d = new Date(Number(v) ? Number(v) * (String(v).length <= 10 ? 1000 : 1) : v); return Number.isNaN(d.getTime()) ? "--" : d.toLocaleString("ar-KW", { dateStyle: "medium", timeStyle: "short" }); }
  function num(...values) { for (const v of values) { if (v === null || v === undefined || v === "") continue; const n = Number(v); if (Number.isFinite(n)) return n; } return null; }
  function arr(v) { if (Array.isArray(v)) return v; if (v && typeof v === "object") return Object.values(v).filter(x => x && typeof x === "object"); return []; }
  function unique(v) { return Array.from(new Set(v.map(sym).filter(Boolean))); }
  function read(k, f) { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : f; } catch (_e) { return f; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_e) {} }
  function renderAfterData() { if (!state.loading) render(); }
  function requestLabel(path) {
    if (path.includes("/trader/provider-status")) return "providerStatus";
    if (path.includes("/trader/calendar/")) return "calendar";
    if (path.includes("/market-news")) return "news";
    if (path.includes("/market/signals") || path.includes("/market/signal-") || path.includes("/market/technical-analysis")) return "signals";
    return "quotes";
  }
  function timeoutFor(path, label) {
    if (label === "providerStatus") return REQUEST_TIMEOUTS.providerStatus;
    if (label === "calendar") return REQUEST_TIMEOUTS.calendar;
    if (label === "news") return REQUEST_TIMEOUTS.news;
    if (label === "signals") return REQUEST_TIMEOUTS.signals;
    if (path.includes("/recommendations") || path.includes("/market/history") || path.includes("/market/asset-profile") || path.includes("/markets")) return REQUEST_TIMEOUTS.quotes;
    return REQUEST_TIMEOUTS.default;
  }
  function settledValue(result, label) {
    if (result.status === "fulfilled") return result.value || failurePayload(label);
    const payload = failurePayload(label, errorMessage(result.reason));
    devLog(label, "failed", { message: payload.message });
    return payload;
  }
  function failurePayload(label, message) {
    return {
      ok: false,
      message: message || UNAVAILABLE_MESSAGE,
      status: "unavailable",
      data: [],
      items: [],
      results: [],
      failed: [{ provider: label, reason: message || "request_failed", status: "failed" }]
    };
  }
  function errorName(error) { return error && typeof error === "object" && "name" in error ? String(error.name) : ""; }
  function errorMessage(error) { return formatProviderError(error, { empty: UNAVAILABLE_MESSAGE }); }
  function responseFailed(payload) {
    if (!payload || payload.ok === false || payload.timeout || payload.routeUnavailable) return true;
    const status = String(payload.status || payload.legacyStatus || payload.dataProvider?.status || "").toLowerCase();
    return ["provider_error", "invalid_request", "not_configured", "missing_provider", "unauthorized", "forbidden", "rate_limited"].includes(status);
  }
  function logRequestResult(label, path, timeoutMs, payload) {
    const failed = responseFailed(payload);
    devLog(label, failed ? "failed" : "loaded", {
      path: safeLogPath(path),
      status: payload?.status || null,
      httpStatus: payload?.statusCode || payload?.providerStatusCode || null,
      resultCount: payload?.resultCount ?? payload?.count ?? arr(payload?.data || payload?.items || payload?.results).length,
      timedOut: Boolean(payload?.timeout)
    });
    if (payload && payload.timeout) devLog(label, "timed out", { path: safeLogPath(path), timeoutMs });
  }
  function safeLogPath(path) {
    try {
      const url = new URL(path, location.origin);
      ["apiKey", "apikey", "token", "key"].forEach(key => url.searchParams.delete(key));
      return `${url.pathname}${url.search}`;
    } catch (_error) {
      return String(path).replace(/([?&](?:apiKey|apikey|token|key)=)[^&]+/gi, "$1[redacted]");
    }
  }
  function devLog(area, status, details) {
    if (!DEV_DIAGNOSTICS) return;
    const method = status === "loaded" ? "info" : "warn";
    console[method](`[trader] ${area} ${status}`, details || {});
  }
  function providerLocale(locale) {
    const value = String(locale || document.documentElement.lang || navigator.language || "ar").toLowerCase();
    return value.startsWith("en") ? "en" : "ar";
  }
  function canonicalProviderStatusKey(status) {
    const value = String(status || "").trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(PROVIDER_STATUS_LABELS, value)) return value;
    if (["loading", "pending", "checking", "fetching"].includes(value)) return "provider_status_loading";
    if (["success", "available", "configured", "connected", "healthy"].includes(value)) return "provider_status_available";
    if (["partial", "degraded", "rate_limited"].includes(value) || /429|rate_limited|rate limit|too many/i.test(value)) return "provider_status_partial";
    if (["failed", "failure", "unavailable", "missing", "not_configured", "missing_provider", "provider_error", "invalid_request", "unauthorized", "forbidden", "not_entitled", "timeout"].includes(value)) return "provider_status_failed";
    if (/provider_status_/i.test(value)) return "provider_status_unknown";
    if (/error|fail|denied|unauthorized|forbidden|not_configured|missing|unavailable|timeout/i.test(value)) return "provider_status_failed";
    return "provider_status_unknown";
  }
  function getProviderStatusMessage(status, locale) {
    const statusKey = canonicalProviderStatusKey(status);
    const lang = providerLocale(locale);
    return (PROVIDER_STATUS_LABELS[statusKey] || PROVIDER_STATUS_LABELS.provider_status_unknown)[lang];
  }
  function getProviderStatusExplanation(status, locale) {
    const statusKey = canonicalProviderStatusKey(status);
    if (statusKey !== "provider_status_failed" && statusKey !== "provider_status_partial") return "";
    return PROVIDER_STATUS_EXPLANATION[providerLocale(locale)];
  }
  function getProviderRetryLabel(locale) {
    return PROVIDER_RETRY_LABEL[providerLocale(locale)];
  }
  function providerStatusCopy(status, options = {}) {
    const locale = providerLocale(options.locale);
    const statusKey = canonicalProviderStatusKey(status);
    const title = getProviderStatusMessage(statusKey, locale);
    const explanation = getProviderStatusExplanation(statusKey, locale);
    const provider = providerName(options.provider || "");
    const activeProviderCopy = locale === "en" ? `Active provider: ${provider}` : `Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ù†Ø´Ø·: ${provider}`;
    return {
      title,
      copy: options.copy || (statusKey === "provider_status_available" ? activeProviderCopy : explanation || title),
      explanation,
      className: statusKey === "provider_status_available" ? "online" : "warning",
      tone: statusKey === "provider_status_available" ? "ok" : "warn",
      statusKey,
      label: title,
      retryLabel: getProviderRetryLabel(locale),
      showRetry: ["provider_status_failed", "provider_status_partial", "provider_status_unknown"].includes(statusKey)
    };
  }
  function providerCopy() {
    const normalized = state.providerStatus && state.providerStatus.normalizedStatus;
    const p = (state.providerStatus && state.providerStatus.dataProvider) || state.provider || {};
    if (state.loading && !Object.keys(state.providerStatus || {}).length) return providerStatusCopy("provider_status_loading", { provider: p.active || p.provider });
    if (state.providerStatus && state.providerStatus.ok === false) return providerStatusCopy("provider_status_failed", { provider: p.active || p.provider });
    const configured = p.configured === true || Boolean(p.active);
    const raw = (normalized && normalized.status) || p.status || (configured ? "configured" : "not_configured");
    const ok = configured && ["success", "available", "configured", "connected", "healthy"].includes(String(raw));
    return providerStatusCopy(ok ? "provider_status_available" : raw, { provider: p.active || p.provider });
  }
  function h(v) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

  document.addEventListener("click", async (e) => {
    const chip = e.target.closest("[data-rec-market]");
    if (!chip) return;
    state.settings.defaultMarket = chip.dataset.recMarket;
    try { localStorage.setItem(keys.settings, JSON.stringify(state.settings)); } catch {}
    render();
    state.rec = await get(`/recommendations?market=${marketApi(state.settings.defaultMarket)}`, { label: "quotes" });
    render();
  });

})();
