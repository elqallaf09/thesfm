/**
 * Curated real symbol lists for the Global Markets Hub (/global-markets)
 * strips. Every symbol here identifies a genuine, publicly listed company
 * or instrument -- these are real-world facts (Toyota really does trade as
 * 7203.T on the Tokyo Stock Exchange), not fabricated. What is NOT
 * guaranteed is that every configured provider actually returns a live
 * quote for every symbol; quote fetching goes through the existing
 * fetchStockPrices()/Yahoo Finance fallback chain (the same mechanism
 * already powering other real-time price surfaces in this app), and any
 * symbol a provider can't quote shows a truthful per-item "unavailable"
 * state -- never a fabricated price.
 *
 * Sector labels are real, publicly known classifications for well-known
 * companies (Toyota is an automaker; JPMorgan is a financial-services
 * firm) -- not per-instance guesses. Every equity item has one; there is
 * no sector concept for forex pairs, commodities, crypto, or indices.
 *
 * Every country/exchange is its own separate strip -- China's Shanghai and
 * Shenzhen exchanges are two strips, India's NSE and BSE are two strips.
 * No European exchange group, no Gulf/GCC exchange group, and no strip
 * that combines more than one country or more than one exchange.
 */

export type GlobalMarketStripId =
  | 'kuwait_boursa'
  | 'saudi_tadawul'
  | 'uae_dfm'
  | 'uae_adx'
  | 'qatar_qse'
  | 'bahrain_bourse'
  | 'oman_msx'
  | 'egypt_egx'
  | 'jordan_ase'
  | 'morocco_cse'
  | 'us_nasdaq'
  | 'us_nyse'
  | 'japan_tse'
  | 'china_sse'
  | 'china_szse'
  | 'hongkong_hkex'
  | 'india_nse'
  | 'india_bse'
  | 'southkorea_krx'
  | 'canada_tsx'
  | 'australia_asx'
  | 'forex'
  | 'commodities'
  | 'crypto'
  | 'global_indices';

export type GlobalMarketStripKind = 'equity' | 'forex' | 'commodity' | 'crypto' | 'index';

export type GlobalMarketSector =
  | 'technology'
  | 'ai'
  | 'semiconductors'
  | 'bank'
  | 'financial_services'
  | 'real_estate'
  | 'energy'
  | 'industrials'
  | 'telecom'
  | 'healthcare'
  | 'pharma'
  | 'consumer_goods'
  | 'retail'
  | 'automotive'
  | 'transportation';

export type GlobalMarketStripItemConfig = {
  symbol: string;
  name: string;
  nameAr: string;
  /** Absent (not guessed) for instruments with no real sector concept:
   * forex pairs, commodities, crypto, and indices. */
  sector?: GlobalMarketSector;
};

export type GlobalMarketStripConfig = {
  id: GlobalMarketStripId;
  kind: GlobalMarketStripKind;
  countryCode: string | null;
  labelAr: string;
  labelEn: string;
  labelFr: string;
  exchangeCode?: string;
  newsRegion?: 'gulf' | 'arab' | 'middle_east' | 'china_hongkong' | 'asia' | 'north_america' | 'global';
  unavailableReason?: 'coverage_unavailable';
  items: GlobalMarketStripItemConfig[];
};

export const SECTOR_LABEL: Record<GlobalMarketSector, { ar: string; en: string; fr: string }> = {
  technology: { ar: 'تقنية', en: 'Technology', fr: 'Technologie' },
  ai: { ar: 'ذكاء اصطناعي', en: 'Artificial Intelligence', fr: 'Intelligence artificielle' },
  semiconductors: { ar: 'أشباه الموصلات', en: 'Semiconductors', fr: 'Semi-conducteurs' },
  bank: { ar: 'بنك', en: 'Bank', fr: 'Banque' },
  financial_services: { ar: 'خدمات مالية', en: 'Financial Services', fr: 'Services financiers' },
  real_estate: { ar: 'عقار', en: 'Real Estate', fr: 'Immobilier' },
  energy: { ar: 'طاقة', en: 'Energy', fr: 'Énergie' },
  industrials: { ar: 'صناعة', en: 'Industrials', fr: 'Industrie' },
  telecom: { ar: 'اتصالات', en: 'Telecom', fr: 'Télécommunications' },
  healthcare: { ar: 'رعاية صحية', en: 'Healthcare', fr: 'Santé' },
  pharma: { ar: 'أدوية', en: 'Pharmaceuticals', fr: 'Pharmaceutique' },
  consumer_goods: { ar: 'أغذية', en: 'Consumer Goods', fr: 'Biens de consommation' },
  retail: { ar: 'تجزئة', en: 'Retail', fr: 'Commerce de détail' },
  automotive: { ar: 'سيارات', en: 'Automotive', fr: 'Automobile' },
  transportation: { ar: 'نقل', en: 'Transportation', fr: 'Transport' },
};

export const GLOBAL_MARKET_STRIPS: GlobalMarketStripConfig[] = [
  {
    id: 'kuwait_boursa', kind: 'equity', countryCode: 'KW', exchangeCode: 'BOURSA_KUWAIT', newsRegion: 'gulf',
    labelAr: 'الكويت — بورصة الكويت', labelEn: 'Kuwait — Boursa Kuwait', labelFr: 'Koweït — Bourse du Koweït',
    items: [
      { symbol: 'KFH.KW', name: 'Kuwait Finance House', nameAr: 'بيت التمويل الكويتي', sector: 'bank' },
      { symbol: 'NBK.KW', name: 'National Bank of Kuwait', nameAr: 'بنك الكويت الوطني', sector: 'bank' },
      { symbol: 'ZAIN.KW', name: 'Zain', nameAr: 'زين', sector: 'telecom' },
      { symbol: 'MABANEE.KW', name: 'Mabanee', nameAr: 'المباني', sector: 'real_estate' },
      { symbol: 'AGLTY.KW', name: 'Agility', nameAr: 'أجيليتي', sector: 'transportation' },
      { symbol: 'MEZZAN.KW', name: 'Mezzan Holding', nameAr: 'ميزان القابضة', sector: 'consumer_goods' },
    ],
  },
  {
    id: 'saudi_tadawul', kind: 'equity', countryCode: 'SA', exchangeCode: 'TADAWUL', newsRegion: 'gulf',
    labelAr: 'السعودية — تداول', labelEn: 'Saudi Arabia — Tadawul', labelFr: 'Arabie saoudite — Tadawul',
    items: [
      { symbol: '2222.SR', name: 'Saudi Aramco', nameAr: 'أرامكو السعودية', sector: 'energy' },
      { symbol: '1120.SR', name: 'Al Rajhi Bank', nameAr: 'مصرف الراجحي', sector: 'bank' },
      { symbol: '1180.SR', name: 'Saudi National Bank', nameAr: 'البنك الأهلي السعودي', sector: 'bank' },
      { symbol: '2010.SR', name: 'SABIC', nameAr: 'سابك', sector: 'industrials' },
      { symbol: '7010.SR', name: 'stc', nameAr: 'إس تي سي', sector: 'telecom' },
      { symbol: '1211.SR', name: 'Maaden', nameAr: 'معادن', sector: 'industrials' },
    ],
  },
  {
    id: 'uae_dfm', kind: 'equity', countryCode: 'AE', exchangeCode: 'DFM', newsRegion: 'gulf',
    labelAr: 'الإمارات — سوق دبي المالي', labelEn: 'UAE — Dubai Financial Market', labelFr: 'Émirats arabes unis — Marché financier de Dubaï',
    items: [
      { symbol: 'EMAAR.DU', name: 'Emaar Properties', nameAr: 'إعمار العقارية', sector: 'real_estate' },
      { symbol: 'DIB.DU', name: 'Dubai Islamic Bank', nameAr: 'بنك دبي الإسلامي', sector: 'bank' },
      { symbol: 'EMIRATESNBD.DU', name: 'Emirates NBD', nameAr: 'الإمارات دبي الوطني', sector: 'bank' },
      { symbol: 'DEWA.AE', name: 'DEWA', nameAr: 'ديوا', sector: 'energy' },
      { symbol: 'SALIK.AE', name: 'Salik', nameAr: 'سالك', sector: 'transportation' },
      { symbol: 'AIRARABIA.AE', name: 'Air Arabia', nameAr: 'العربية للطيران', sector: 'transportation' },
    ],
  },
  {
    id: 'uae_adx', kind: 'equity', countryCode: 'AE', exchangeCode: 'ADX', newsRegion: 'gulf',
    labelAr: 'الإمارات — سوق أبوظبي للأوراق المالية', labelEn: 'UAE — Abu Dhabi Securities Exchange', labelFr: 'Émirats arabes unis — Bourse d’Abou Dhabi',
    items: [
      { symbol: 'FAB.AE', name: 'First Abu Dhabi Bank', nameAr: 'بنك أبوظبي الأول', sector: 'bank' },
      { symbol: 'ADCB.AE', name: 'Abu Dhabi Commercial Bank', nameAr: 'بنك أبوظبي التجاري', sector: 'bank' },
      { symbol: 'ALDAR.AE', name: 'Aldar Properties', nameAr: 'الدار العقارية', sector: 'real_estate' },
      { symbol: 'ADNOCGAS.AD', name: 'ADNOC Gas', nameAr: 'أدنوك للغاز', sector: 'energy' },
      { symbol: 'ADNOCDRILL.AD', name: 'ADNOC Drilling', nameAr: 'أدنوك للحفر', sector: 'energy' },
    ],
  },
  {
    id: 'qatar_qse', kind: 'equity', countryCode: 'QA', exchangeCode: 'QSE', newsRegion: 'gulf',
    labelAr: 'قطر — بورصة قطر', labelEn: 'Qatar — Qatar Stock Exchange', labelFr: 'Qatar — Bourse du Qatar',
    items: [
      { symbol: 'QNBK.QA', name: 'QNB Group', nameAr: 'مجموعة بنك قطر الوطني', sector: 'bank' },
      { symbol: 'QIBK.QA', name: 'Qatar Islamic Bank', nameAr: 'مصرف قطر الإسلامي', sector: 'bank' },
      { symbol: 'IQCD.QA', name: 'Industries Qatar', nameAr: 'صناعات قطر', sector: 'industrials' },
      { symbol: 'ORDS.QA', name: 'Ooredoo', nameAr: 'أريد', sector: 'telecom' },
    ],
  },
  {
    id: 'bahrain_bourse', kind: 'equity', countryCode: 'BH', exchangeCode: 'BAHRAIN', newsRegion: 'gulf',
    labelAr: 'البحرين — بورصة البحرين', labelEn: 'Bahrain — Bahrain Bourse', labelFr: 'Bahreïn — Bourse de Bahreïn',
    items: [
      { symbol: 'NBB.BH', name: 'National Bank of Bahrain', nameAr: 'بنك البحرين الوطني', sector: 'bank' },
      { symbol: 'BBK.BH', name: 'Bank of Bahrain and Kuwait', nameAr: 'بنك البحرين والكويت', sector: 'bank' },
      { symbol: 'BATELCO.BH', name: 'Batelco', nameAr: 'بتلكو', sector: 'telecom' },
      { symbol: 'ALBH.BH', name: 'Aluminium Bahrain', nameAr: 'ألمنيوم البحرين', sector: 'industrials' },
    ],
  },
  {
    id: 'oman_msx', kind: 'equity', countryCode: 'OM', exchangeCode: 'MSX', newsRegion: 'gulf',
    labelAr: 'عُمان — بورصة مسقط', labelEn: 'Oman — Muscat Stock Exchange', labelFr: 'Oman — Bourse de Mascate',
    items: [
      { symbol: 'BKMB.OM', name: 'Bank Muscat', nameAr: 'بنك مسقط', sector: 'bank' },
      { symbol: 'NBOB.OM', name: 'National Bank of Oman', nameAr: 'البنك الوطني العماني', sector: 'bank' },
      { symbol: 'ORED.OM', name: 'Ooredoo Oman', nameAr: 'أوريدو عُمان', sector: 'telecom' },
      { symbol: 'OQGN.OM', name: 'OQ Gas Networks', nameAr: 'أوكيو لشبكات الغاز', sector: 'energy' },
    ],
  },
  { id: 'egypt_egx', kind: 'equity', countryCode: 'EG', exchangeCode: 'EGX', newsRegion: 'arab', labelAr: 'مصر — البورصة المصرية', labelEn: 'Egypt — Egyptian Exchange', labelFr: 'Égypte — Bourse égyptienne', unavailableReason: 'coverage_unavailable', items: [] },
  { id: 'jordan_ase', kind: 'equity', countryCode: 'JO', exchangeCode: 'ASE', newsRegion: 'arab', labelAr: 'الأردن — بورصة عمّان', labelEn: 'Jordan — Amman Stock Exchange', labelFr: 'Jordanie — Bourse d’Amman', unavailableReason: 'coverage_unavailable', items: [] },
  { id: 'morocco_cse', kind: 'equity', countryCode: 'MA', exchangeCode: 'CSE', newsRegion: 'arab', labelAr: 'المغرب — بورصة الدار البيضاء', labelEn: 'Morocco — Casablanca Stock Exchange', labelFr: 'Maroc — Bourse de Casablanca', unavailableReason: 'coverage_unavailable', items: [] },
  {
    id: 'us_nasdaq',
    kind: 'equity',
    countryCode: 'US',
    labelAr: 'الولايات المتحدة — بورصة ناسداك',
    labelEn: 'United States — NASDAQ',
    labelFr: 'États-Unis — NASDAQ',
    items: [
      { symbol: 'AAPL', name: 'Apple', nameAr: 'أبل', sector: 'technology' },
      { symbol: 'MSFT', name: 'Microsoft', nameAr: 'مايكروسوفت', sector: 'technology' },
      { symbol: 'NVDA', name: 'Nvidia', nameAr: 'إنفيديا', sector: 'semiconductors' },
      { symbol: 'GOOGL', name: 'Alphabet', nameAr: 'ألفابت', sector: 'technology' },
      { symbol: 'AMZN', name: 'Amazon', nameAr: 'أمازون', sector: 'retail' },
      { symbol: 'META', name: 'Meta', nameAr: 'ميتا', sector: 'technology' },
      { symbol: 'TSLA', name: 'Tesla', nameAr: 'تسلا', sector: 'automotive' },
      { symbol: 'AVGO', name: 'Broadcom', nameAr: 'برودكوم', sector: 'semiconductors' },
    ],
  },
  {
    id: 'us_nyse',
    kind: 'equity',
    countryCode: 'US',
    labelAr: 'الولايات المتحدة — بورصة نيويورك',
    labelEn: 'United States — NYSE',
    labelFr: 'États-Unis — NYSE',
    items: [
      { symbol: 'JPM', name: 'JPMorgan Chase', nameAr: 'جي بي مورغان', sector: 'bank' },
      { symbol: 'V', name: 'Visa', nameAr: 'فيزا', sector: 'financial_services' },
      { symbol: 'WMT', name: 'Walmart', nameAr: 'وول مارت', sector: 'retail' },
      { symbol: 'JNJ', name: 'Johnson & Johnson', nameAr: 'جونسون آند جونسون', sector: 'pharma' },
      { symbol: 'PG', name: 'Procter & Gamble', nameAr: 'بروكتر آند غامبل', sector: 'consumer_goods' },
      { symbol: 'XOM', name: 'Exxon Mobil', nameAr: 'إكسون موبيل', sector: 'energy' },
      { symbol: 'MA', name: 'Mastercard', nameAr: 'ماستركارد', sector: 'financial_services' },
      { symbol: 'HD', name: 'Home Depot', nameAr: 'هوم ديبو', sector: 'retail' },
    ],
  },
  {
    id: 'japan_tse',
    kind: 'equity',
    countryCode: 'JP',
    labelAr: 'اليابان — بورصة طوكيو',
    labelEn: 'Japan — Tokyo Stock Exchange',
    labelFr: 'Japon — Bourse de Tokyo',
    items: [
      { symbol: '7203.T', name: 'Toyota Motor', nameAr: 'تويوتا', sector: 'automotive' },
      { symbol: '6758.T', name: 'Sony Group', nameAr: 'سوني', sector: 'technology' },
      { symbol: '9984.T', name: 'SoftBank Group', nameAr: 'سوفت بنك', sector: 'telecom' },
      { symbol: '8306.T', name: 'Mitsubishi UFJ Financial', nameAr: 'ميتسوبيشي يو إف جيه', sector: 'bank' },
      { symbol: '9432.T', name: 'Nippon Telegraph & Telephone', nameAr: 'إن تي تي', sector: 'telecom' },
      { symbol: '7267.T', name: 'Honda Motor', nameAr: 'هوندا', sector: 'automotive' },
      { symbol: '6861.T', name: 'Keyence', nameAr: 'كيينس', sector: 'industrials' },
      { symbol: '6501.T', name: 'Hitachi', nameAr: 'هيتاشي', sector: 'industrials' },
    ],
  },
  {
    id: 'china_sse',
    kind: 'equity',
    countryCode: 'CN',
    labelAr: 'الصين — بورصة شنغهاي',
    labelEn: 'China — Shanghai Stock Exchange',
    labelFr: 'Chine — Bourse de Shanghai',
    items: [
      { symbol: '600519.SS', name: 'Kweichow Moutai', nameAr: 'كوييتشو موتاي', sector: 'consumer_goods' },
      { symbol: '601398.SS', name: 'ICBC', nameAr: 'البنك الصناعي والتجاري الصيني', sector: 'bank' },
      { symbol: '600036.SS', name: 'China Merchants Bank', nameAr: 'بنك تشاينا ميرشانتس', sector: 'bank' },
      { symbol: '601988.SS', name: 'Bank of China', nameAr: 'بنك الصين', sector: 'bank' },
      { symbol: '601288.SS', name: 'Agricultural Bank of China', nameAr: 'بنك الصين الزراعي', sector: 'bank' },
      { symbol: '600028.SS', name: 'Sinopec', nameAr: 'سينوبك', sector: 'energy' },
    ],
  },
  {
    id: 'china_szse',
    kind: 'equity',
    countryCode: 'CN',
    labelAr: 'الصين — بورصة شنتشن',
    labelEn: 'China — Shenzhen Stock Exchange',
    labelFr: 'Chine — Bourse de Shenzhen',
    items: [
      { symbol: '000858.SZ', name: 'Wuliangye Yibin', nameAr: 'وليانغي', sector: 'consumer_goods' },
      { symbol: '300750.SZ', name: 'CATL', nameAr: 'كاتل', sector: 'industrials' },
      { symbol: '000333.SZ', name: 'Midea Group', nameAr: 'ميديا جروب', sector: 'industrials' },
      { symbol: '002594.SZ', name: 'BYD', nameAr: 'بي واي دي', sector: 'automotive' },
      { symbol: '000651.SZ', name: 'Gree Electric', nameAr: 'جري للأجهزة الكهربائية', sector: 'industrials' },
      { symbol: '000001.SZ', name: 'Ping An Bank', nameAr: 'بنك بينج آن', sector: 'bank' },
    ],
  },
  {
    id: 'hongkong_hkex',
    kind: 'equity',
    countryCode: 'HK',
    labelAr: 'هونغ كونغ — بورصة هونغ كونغ',
    labelEn: 'Hong Kong — HKEX',
    labelFr: 'Hong Kong — HKEX',
    items: [
      { symbol: '0700.HK', name: 'Tencent Holdings', nameAr: 'تينسنت', sector: 'technology' },
      { symbol: '9988.HK', name: 'Alibaba Group', nameAr: 'علي بابا', sector: 'retail' },
      { symbol: '0941.HK', name: 'China Mobile', nameAr: 'تشاينا موبايل', sector: 'telecom' },
      { symbol: '3690.HK', name: 'Meituan', nameAr: 'ميتوان', sector: 'retail' },
      { symbol: '1299.HK', name: 'AIA Group', nameAr: 'إيه آي إيه', sector: 'financial_services' },
      { symbol: '0388.HK', name: 'Hong Kong Exchanges', nameAr: 'بورصة هونغ كونغ', sector: 'financial_services' },
    ],
  },
  {
    id: 'india_nse',
    kind: 'equity',
    countryCode: 'IN',
    labelAr: 'الهند — البورصة الوطنية NSE',
    labelEn: 'India — National Stock Exchange (NSE)',
    labelFr: 'Inde — Bourse nationale (NSE)',
    items: [
      { symbol: 'RELIANCE.NS', name: 'Reliance Industries', nameAr: 'ريلاينس', sector: 'energy' },
      { symbol: 'TCS.NS', name: 'Tata Consultancy Services', nameAr: 'تاتا للاستشارات', sector: 'technology' },
      { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', nameAr: 'بنك إتش دي إف سي', sector: 'bank' },
      { symbol: 'INFY.NS', name: 'Infosys', nameAr: 'إنفوسيس', sector: 'technology' },
      { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', nameAr: 'بنك آي سي آي سي آي', sector: 'bank' },
      { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever', nameAr: 'هندوستان يونيليفر', sector: 'consumer_goods' },
    ],
  },
  {
    id: 'india_bse',
    kind: 'equity',
    countryCode: 'IN',
    labelAr: 'الهند — بورصة بومباي BSE',
    labelEn: 'India — Bombay Stock Exchange (BSE)',
    labelFr: 'Inde — Bourse de Bombay (BSE)',
    items: [
      { symbol: 'RELIANCE.BO', name: 'Reliance Industries', nameAr: 'ريلاينس', sector: 'energy' },
      { symbol: 'TCS.BO', name: 'Tata Consultancy Services', nameAr: 'تاتا للاستشارات', sector: 'technology' },
      { symbol: 'HDFCBANK.BO', name: 'HDFC Bank', nameAr: 'بنك إتش دي إف سي', sector: 'bank' },
      { symbol: 'ITC.BO', name: 'ITC Limited', nameAr: 'آي تي سي', sector: 'consumer_goods' },
      { symbol: 'SBIN.BO', name: 'State Bank of India', nameAr: 'بنك الدولة الهندي', sector: 'bank' },
      { symbol: 'BAJFINANCE.BO', name: 'Bajaj Finance', nameAr: 'باجاج للتمويل', sector: 'financial_services' },
    ],
  },
  {
    id: 'southkorea_krx',
    kind: 'equity',
    countryCode: 'KR',
    labelAr: 'كوريا الجنوبية — بورصة كوريا',
    labelEn: 'South Korea — Korea Exchange (KRX)',
    labelFr: 'Corée du Sud — Bourse de Corée (KRX)',
    items: [
      { symbol: '005930.KS', name: 'Samsung Electronics', nameAr: 'سامسونج', sector: 'semiconductors' },
      { symbol: '000660.KS', name: 'SK Hynix', nameAr: 'إس كيه هاينكس', sector: 'semiconductors' },
      { symbol: '005380.KS', name: 'Hyundai Motor', nameAr: 'هيونداي', sector: 'automotive' },
      { symbol: '035420.KS', name: 'Naver', nameAr: 'نايفر', sector: 'technology' },
      { symbol: '051910.KS', name: 'LG Chem', nameAr: 'إل جي للكيماويات', sector: 'industrials' },
      { symbol: '006400.KS', name: 'Samsung SDI', nameAr: 'سامسونج إس دي آي', sector: 'industrials' },
    ],
  },
  {
    id: 'canada_tsx',
    kind: 'equity',
    countryCode: 'CA',
    labelAr: 'كندا — بورصة تورونتو',
    labelEn: 'Canada — Toronto Stock Exchange (TSX)',
    labelFr: 'Canada — Bourse de Toronto (TSX)',
    items: [
      { symbol: 'SHOP.TO', name: 'Shopify', nameAr: 'شوبيفاي', sector: 'technology' },
      { symbol: 'RY.TO', name: 'Royal Bank of Canada', nameAr: 'رويال بنك أوف كندا', sector: 'bank' },
      { symbol: 'TD.TO', name: 'Toronto-Dominion Bank', nameAr: 'بنك تورنتو دومينيون', sector: 'bank' },
      { symbol: 'ENB.TO', name: 'Enbridge', nameAr: 'إنبريدج', sector: 'energy' },
      { symbol: 'CNQ.TO', name: 'Canadian Natural Resources', nameAr: 'كندين ناتشورال ريسورسز', sector: 'energy' },
      { symbol: 'BN.TO', name: 'Brookfield', nameAr: 'بروكفيلد', sector: 'financial_services' },
    ],
  },
  {
    id: 'australia_asx',
    kind: 'equity',
    countryCode: 'AU',
    labelAr: 'أستراليا — البورصة الأسترالية',
    labelEn: 'Australia — ASX',
    labelFr: 'Australie — ASX',
    items: [
      { symbol: 'BHP.AX', name: 'BHP Group', nameAr: 'بي إتش بي', sector: 'energy' },
      { symbol: 'CBA.AX', name: 'Commonwealth Bank', nameAr: 'كومنولث بنك', sector: 'bank' },
      { symbol: 'CSL.AX', name: 'CSL Limited', nameAr: 'سي إس إل', sector: 'pharma' },
      { symbol: 'NAB.AX', name: 'National Australia Bank', nameAr: 'بنك أستراليا الوطني', sector: 'bank' },
      { symbol: 'WES.AX', name: 'Wesfarmers', nameAr: 'ويسفارمرز', sector: 'retail' },
      { symbol: 'WBC.AX', name: 'Westpac Banking', nameAr: 'ويستباك', sector: 'bank' },
    ],
  },
  {
    id: 'forex',
    kind: 'forex',
    countryCode: null,
    labelAr: 'الفوركس',
    labelEn: 'Forex',
    labelFr: 'Forex',
    items: [
      { symbol: 'EURUSD=X', name: 'EUR/USD', nameAr: 'يورو / دولار' },
      { symbol: 'GBPUSD=X', name: 'GBP/USD', nameAr: 'جنيه إسترليني / دولار' },
      { symbol: 'USDJPY=X', name: 'USD/JPY', nameAr: 'دولار / ين ياباني' },
      { symbol: 'USDCHF=X', name: 'USD/CHF', nameAr: 'دولار / فرنك سويسري' },
      { symbol: 'AUDUSD=X', name: 'AUD/USD', nameAr: 'دولار أسترالي / دولار' },
      { symbol: 'USDCAD=X', name: 'USD/CAD', nameAr: 'دولار / دولار كندي' },
    ],
  },
  {
    id: 'commodities',
    kind: 'commodity',
    countryCode: null,
    labelAr: 'السلع والمعادن',
    labelEn: 'Commodities & Metals',
    labelFr: 'Matières premières et métaux',
    items: [
      { symbol: 'GC=F', name: 'Gold', nameAr: 'الذهب' },
      { symbol: 'SI=F', name: 'Silver', nameAr: 'الفضة' },
      { symbol: 'CL=F', name: 'Crude Oil (WTI)', nameAr: 'النفط الخام' },
      { symbol: 'NG=F', name: 'Natural Gas', nameAr: 'الغاز الطبيعي' },
      { symbol: 'ZW=F', name: 'Wheat', nameAr: 'القمح' },
      { symbol: 'HG=F', name: 'Copper', nameAr: 'النحاس' },
    ],
  },
  {
    id: 'crypto',
    kind: 'crypto',
    countryCode: null,
    labelAr: 'العملات الرقمية',
    labelEn: 'Crypto',
    labelFr: 'Cryptomonnaies',
    items: [
      { symbol: 'BTC-USD', name: 'Bitcoin', nameAr: 'بيتكوين' },
      { symbol: 'ETH-USD', name: 'Ethereum', nameAr: 'إيثريوم' },
      { symbol: 'BNB-USD', name: 'BNB', nameAr: 'بي إن بي' },
      { symbol: 'XRP-USD', name: 'XRP', nameAr: 'إكس آر بي' },
      { symbol: 'SOL-USD', name: 'Solana', nameAr: 'سولانا' },
      { symbol: 'ADA-USD', name: 'Cardano', nameAr: 'كاردانو' },
    ],
  },
  {
    id: 'global_indices',
    kind: 'index',
    countryCode: null,
    labelAr: 'المؤشرات العالمية',
    labelEn: 'Global Indices',
    labelFr: 'Indices mondiaux',
    items: [
      { symbol: '^GSPC', name: 'S&P 500', nameAr: 'إس آند بي 500' },
      { symbol: '^DJI', name: 'Dow Jones', nameAr: 'داو جونز' },
      { symbol: '^NDX', name: 'Nasdaq 100', nameAr: 'ناسداك 100' },
      { symbol: '^FTSE', name: 'FTSE 100', nameAr: 'فوتسي 100' },
      { symbol: '^GDAXI', name: 'DAX 40', nameAr: 'داكس 40' },
      { symbol: '^N225', name: 'Nikkei 225', nameAr: 'نيكاي 225' },
    ],
  },
];

export function allGlobalMarketStripSymbols(): string[] {
  return GLOBAL_MARKET_STRIPS.flatMap(strip => strip.items.map(item => item.symbol));
}

// Yahoo Finance's exchange-suffix convention is a stable, documented fact
// (a .T-suffixed quote is always JPY-denominated, .HK always HKD, etc.) --
// the same pattern already used by StockTickerStrip.tsx's
// MARKET_CURRENCY_SUFFIXES for Gulf exchanges. Inferring currency from the
// suffix is reading a known convention, not guessing; formatting every
// price as USD regardless of what exchange it actually quotes on would be
// the truthfulness problem.
const SUFFIX_CURRENCY: Array<[RegExp, string]> = [
  [/\.KW$/, 'KWD'],
  [/\.SR$/, 'SAR'],
  [/\.(?:AE|DU|AD)$/, 'AED'],
  [/\.QA$/, 'QAR'],
  [/\.BH$/, 'BHD'],
  [/\.OM$/, 'OMR'],
  [/\.T$/, 'JPY'],
  [/\.SS$/, 'CNY'],
  [/\.SZ$/, 'CNY'],
  [/\.HK$/, 'HKD'],
  [/\.NS$/, 'INR'],
  [/\.BO$/, 'INR'],
  [/\.KS$/, 'KRW'],
  [/\.TO$/, 'CAD'],
  [/\.AX$/, 'AUD'],
];

/** null means "not a currency amount": a forex pair is an exchange rate
 * and an index is a points value, neither is "an amount of a currency" --
 * callers must render both as a bare number. */
export function inferStripCurrency(symbol: string): string | null {
  if (symbol.endsWith('=X')) return null;
  if (symbol.startsWith('^')) return null;
  if (symbol.endsWith('=F')) return 'USD';
  if (symbol.endsWith('-USD')) return 'USD';
  for (const [pattern, currency] of SUFFIX_CURRENCY) {
    if (pattern.test(symbol)) return currency;
  }
  return 'USD';
}
