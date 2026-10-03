import type { RssNewsProviderConfig } from './providers/rss';

/**
 * Supplemental, publisher-specific Gulf coverage.  These feeds complement
 * (rather than replace) the exchange-owned sources in the main registry.
 *
 * Google News is used only as a transport for publisher-constrained queries.
 * `rssParser` extracts each item's real publisher and verifies a source domain
 * before allowing the official label to remain on regulatory notices.
 */
export const GULF_DIVERSIFIED_RSS_PROVIDERS: RssNewsProviderConfig[] = [
  {
    id: 'official-kuwait-cma-market-notices',
    name: 'Kuwait Capital Markets Authority — Market Notices',
    // The regulator operates the iFSAH disclosure regime alongside Boursa Kuwait.
    url: 'https://news.google.com/rss/search?q=site%3Acma.gov.kw%20%28%22Boursa%20Kuwait%22%20OR%20disclosure%20OR%20trading%29&hl=en&gl=KW&ceid=KW%3Aen',
    sourceType: 'regulator', priority: 1, reliabilityScore: 0.97, officialSource: true,
    officialSourceDomains: ['cma.gov.kw'], sourceNetworkId: 'cma.gov.kw',
    supportedMarkets: ['GULF', 'KW', 'KUWAIT'], marketCodes: ['GULF', 'KW', 'KUWAIT'],
    exchangeCodes: ['Boursa Kuwait'], countries: ['KW'], assetTypes: ['equity', 'fund'],
    originalLanguage: 'en', revalidateSeconds: 300,
  },
  {
    id: 'rss-kuwait-times-boursa-kuwait',
    name: 'Kuwait Times — Boursa Kuwait Market Coverage',
    // Independent market context; it never replaces official disclosures.
    url: 'https://news.google.com/rss/search?q=site%3Akuwaittimes.com%20%22Boursa%20Kuwait%22&hl=en&gl=KW&ceid=KW%3Aen',
    sourceType: 'regional_market_publication', priority: 3, reliabilityScore: 0.78, officialSource: false,
    sourceNetworkId: 'kuwaittimes.com', supportedMarkets: ['GULF', 'KW', 'KUWAIT'],
    marketCodes: ['GULF', 'KW', 'KUWAIT'], exchangeCodes: ['Boursa Kuwait'], countries: ['KW'],
    assetTypes: ['equity', 'fund'], originalLanguage: 'en', revalidateSeconds: 300,
  },
  {
    id: 'rss-times-of-oman-msx-market',
    name: 'Times of Oman — Muscat Stock Exchange Market Coverage',
    url: 'https://news.google.com/rss/search?q=site%3Atimesofoman.com%20%22Muscat%20Stock%20Exchange%22&hl=en&gl=OM&ceid=OM%3Aen',
    sourceType: 'regional_market_publication', priority: 3, reliabilityScore: 0.76, officialSource: false,
    sourceNetworkId: 'timesofoman.com', supportedMarkets: ['GULF', 'OM', 'OMAN', 'oman'],
    marketCodes: ['GULF', 'OM', 'OMAN'], exchangeCodes: ['MSX'], countries: ['OM'],
    assetTypes: ['equity', 'fund', 'bond'], originalLanguage: 'en', revalidateSeconds: 300,
  },
  {
    id: 'official-saudi-cma-market-notices',
    name: 'Saudi Capital Market Authority — Market Notices',
    url: 'https://news.google.com/rss/search?q=site%3Acma.gov.sa%20%28Tadawul%20OR%20disclosure%20OR%20trading%29&hl=en&gl=SA&ceid=SA%3Aen',
    sourceType: 'regulator', priority: 1, reliabilityScore: 0.97, officialSource: true,
    officialSourceDomains: ['cma.gov.sa'], sourceNetworkId: 'cma.gov.sa',
    supportedMarkets: ['GULF', 'SA', 'SAUDI', 'saudi'], marketCodes: ['GULF', 'SA', 'SAUDI'],
    exchangeCodes: ['Tadawul'], countries: ['SA'], assetTypes: ['equity', 'fund', 'bond'],
    originalLanguage: 'en', revalidateSeconds: 300,
  },
  {
    id: 'rss-argaam-tadawul-market',
    name: 'Argaam — Saudi Exchange Market Coverage',
    url: 'https://news.google.com/rss/search?q=site%3Aargaam.com%20%28Tadawul%20OR%20%22Saudi%20Exchange%22%29&hl=en&gl=SA&ceid=SA%3Aen',
    sourceType: 'regional_market_publication', priority: 3, reliabilityScore: 0.8, officialSource: false,
    sourceNetworkId: 'argaam.com', supportedMarkets: ['GULF', 'SA', 'SAUDI', 'saudi'],
    marketCodes: ['GULF', 'SA', 'SAUDI'], exchangeCodes: ['Tadawul'], countries: ['SA'],
    assetTypes: ['equity', 'fund', 'bond'], originalLanguage: 'en', revalidateSeconds: 300,
  },
  {
    id: 'official-qatar-qfma-market-notices',
    name: 'Qatar Financial Markets Authority — Market Notices',
    url: 'https://news.google.com/rss/search?q=site%3Aqfma.org.qa%20%28%22Qatar%20Exchange%22%20OR%20%22capital%20market%22%29&hl=en&gl=QA&ceid=QA%3Aen',
    sourceType: 'regulator', priority: 1, reliabilityScore: 0.97, officialSource: true,
    officialSourceDomains: ['qfma.org.qa'], sourceNetworkId: 'qfma.org.qa',
    supportedMarkets: ['GULF', 'QA', 'QATAR', 'qatar'], marketCodes: ['GULF', 'QA', 'QATAR'],
    exchangeCodes: ['QSE'], countries: ['QA'], assetTypes: ['equity', 'fund', 'bond'],
    originalLanguage: 'en', revalidateSeconds: 300,
  },
  {
    id: 'rss-gulf-times-qatar-exchange',
    name: 'Gulf Times — Qatar Stock Exchange Market Coverage',
    url: 'https://news.google.com/rss/search?q=site%3Agulf-times.com%20%22Qatar%20Stock%20Exchange%22&hl=en&gl=QA&ceid=QA%3Aen',
    sourceType: 'regional_market_publication', priority: 3, reliabilityScore: 0.78, officialSource: false,
    sourceNetworkId: 'gulf-times.com', supportedMarkets: ['GULF', 'QA', 'QATAR', 'qatar'],
    marketCodes: ['GULF', 'QA', 'QATAR'], exchangeCodes: ['QSE'], countries: ['QA'],
    assetTypes: ['equity', 'fund', 'bond'], originalLanguage: 'en', revalidateSeconds: 300,
  },
  {
    id: 'official-bahrain-cbb-market-notices',
    name: 'Central Bank of Bahrain — Market Notices',
    url: 'https://news.google.com/rss/search?q=site%3Acbb.gov.bh%20%28%22Bahrain%20Bourse%22%20OR%20disclosure%20OR%20listed%29&hl=en&gl=BH&ceid=BH%3Aen',
    sourceType: 'regulator', priority: 1, reliabilityScore: 0.97, officialSource: true,
    officialSourceDomains: ['cbb.gov.bh'], sourceNetworkId: 'cbb.gov.bh',
    supportedMarkets: ['GULF', 'BH', 'BAHRAIN', 'bahrain'], marketCodes: ['GULF', 'BH', 'BAHRAIN'],
    exchangeCodes: ['Bahrain Bourse'], countries: ['BH'], assetTypes: ['equity', 'fund', 'bond'],
    originalLanguage: 'en', revalidateSeconds: 300,
  },
  {
    id: 'rss-tradearabia-bahrain-bourse',
    name: 'TradeArabia — Bahrain Bourse Market Coverage',
    url: 'https://news.google.com/rss/search?q=site%3Atradearabia.com%20%22Bahrain%20Bourse%22&hl=en&gl=BH&ceid=BH%3Aen',
    sourceType: 'regional_market_publication', priority: 3, reliabilityScore: 0.76, officialSource: false,
    sourceNetworkId: 'tradearabia.com', supportedMarkets: ['GULF', 'BH', 'BAHRAIN', 'bahrain'],
    marketCodes: ['GULF', 'BH', 'BAHRAIN'], exchangeCodes: ['Bahrain Bourse'], countries: ['BH'],
    assetTypes: ['equity', 'fund', 'bond'], originalLanguage: 'en', revalidateSeconds: 300,
  },
  {
    id: 'official-uae-sca-market-notices',
    name: 'UAE Securities and Commodities Authority — Market Notices',
    // The UAE regulator spans both ADX and DFM.
    url: 'https://news.google.com/rss/search?q=site%3Asca.gov.ae%20%28ADX%20OR%20%22Dubai%20Financial%20Market%22%20OR%20disclosure%29&hl=en&gl=AE&ceid=AE%3Aen',
    sourceType: 'regulator', priority: 1, reliabilityScore: 0.96, officialSource: true,
    officialSourceDomains: ['sca.gov.ae'], sourceNetworkId: 'sca.gov.ae',
    supportedMarkets: ['GULF', 'ADX', 'DFM', 'AE', 'UAE', 'uae-adx'],
    marketCodes: ['GULF', 'ADX', 'DFM', 'AE', 'UAE'], exchangeCodes: ['ADX', 'DFM'], countries: ['AE'],
    assetTypes: ['equity', 'fund', 'bond'], originalLanguage: 'en', revalidateSeconds: 300,
  },
  {
    id: 'rss-the-national-adx-market',
    name: 'The National — ADX Market Coverage',
    url: 'https://news.google.com/rss/search?q=site%3Athenationalnews.com%20%22Abu%20Dhabi%20Securities%20Exchange%22&hl=en&gl=AE&ceid=AE%3Aen',
    sourceType: 'regional_market_publication', priority: 3, reliabilityScore: 0.8, officialSource: false,
    sourceNetworkId: 'thenationalnews.com', supportedMarkets: ['GULF', 'ADX', 'AE', 'UAE', 'uae-adx'],
    marketCodes: ['GULF', 'ADX', 'AE', 'UAE'], exchangeCodes: ['ADX'], countries: ['AE'],
    assetTypes: ['equity', 'fund', 'bond'], originalLanguage: 'en', revalidateSeconds: 300,
  },
  {
    id: 'rss-the-national-dfm-market',
    name: 'The National — DFM Market Coverage',
    url: 'https://news.google.com/rss/search?q=site%3Athenationalnews.com%20%22Dubai%20Financial%20Market%22&hl=en&gl=AE&ceid=AE%3Aen',
    sourceType: 'regional_market_publication', priority: 3, reliabilityScore: 0.8, officialSource: false,
    sourceNetworkId: 'thenationalnews.com', supportedMarkets: ['GULF', 'DFM', 'AE', 'UAE'],
    marketCodes: ['GULF', 'DFM', 'AE', 'UAE'], exchangeCodes: ['DFM'], countries: ['AE'],
    assetTypes: ['equity', 'fund', 'bond'], originalLanguage: 'en', revalidateSeconds: 300,
  },
];
