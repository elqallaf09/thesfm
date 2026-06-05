import type { TR } from '@/lib/translations';

export type StockCategoryId =
  | 'defensive'
  | 'growth'
  | 'dividend'
  | 'cyclical'
  | 'energy'
  | 'banking'
  | 'sharia';

export type StockCategoryFilterKey = string;

export type StockCategoryStock = {
  symbol: string;
  name: string;
  filter: StockCategoryFilterKey;
  filters?: StockCategoryFilterKey[];
  aliases?: string[];
};

export type StockCategoryFilter = {
  key: StockCategoryFilterKey;
  labelKey: keyof typeof TR;
  keywords: string[];
};

export type StockCategoryMetric = {
  labelKey: keyof typeof TR;
  bodyKey: keyof typeof TR;
};

export type StockCategoryConfig = {
  id: StockCategoryId;
  route: string;
  navKey: keyof typeof TR;
  titleKey: keyof typeof TR;
  subtitleKey: keyof typeof TR;
  badgeKey: keyof typeof TR;
  explanationTitleKey: keyof typeof TR;
  explanationBodyKey: keyof typeof TR;
  disclaimerTitleKey: keyof typeof TR;
  disclaimerBodyKey: keyof typeof TR;
  searchPlaceholderKey: keyof typeof TR;
  filterLabelKey: keyof typeof TR;
  moversTitleKey: keyof typeof TR;
  mentionedTitleKey: keyof typeof TR;
  sourcesTitleKey: keyof typeof TR;
  sectorGuideTitleKey: keyof typeof TR;
  noNewsMessage: string;
  rssQuery: string;
  filters: StockCategoryFilter[];
  watchlist: StockCategoryStock[];
  metricCards?: StockCategoryMetric[];
  commoditySymbols?: StockCategoryStock[];
  shariaCaution?: boolean;
};

const commonFilterAll: StockCategoryFilter = {
  key: 'all',
  labelKey: 'stock_category_filter_all',
  keywords: [],
};

export const STOCK_CATEGORY_CONFIGS: StockCategoryConfig[] = [
  {
    id: 'defensive',
    route: '/defensive-stocks',
    navKey: 'nav_defensive_stocks',
    titleKey: 'defensive_news_title',
    subtitleKey: 'stock_category_defensive_subtitle',
    badgeKey: 'stock_category_defensive_badge',
    explanationTitleKey: 'defensive_news_what_title',
    explanationBodyKey: 'stock_category_defensive_explanation',
    disclaimerTitleKey: 'defensive_news_disclaimer_title',
    disclaimerBodyKey: 'defensive_news_disclaimer_body',
    searchPlaceholderKey: 'stock_category_search_placeholder',
    filterLabelKey: 'stock_category_filter_label',
    moversTitleKey: 'defensive_news_movers_title',
    mentionedTitleKey: 'defensive_news_most_mentioned',
    sourcesTitleKey: 'stock_category_sources_title',
    sectorGuideTitleKey: 'defensive_news_sectors_guide',
    noNewsMessage: 'No recent defensive stocks news found from configured real data sources.',
    rssQuery: 'defensive stocks OR consumer staples stocks OR healthcare stocks OR utility stocks OR telecom stocks OR dividend stocks',
    filters: [
      commonFilterAll,
      { key: 'consumer_staples', labelKey: 'defensive_news_category_consumer_staples', keywords: ['consumer staples', 'staples', 'household products'] },
      { key: 'healthcare', labelKey: 'defensive_news_category_healthcare', keywords: ['healthcare', 'health care', 'medical', 'hospital'] },
      { key: 'food_beverage', labelKey: 'defensive_news_category_food_beverage', keywords: ['food', 'beverage', 'drinks', 'snacks', 'grocery'] },
      { key: 'pharmaceuticals', labelKey: 'defensive_news_category_pharmaceuticals', keywords: ['pharmaceutical', 'pharma', 'drug', 'medicine', 'vaccine'] },
      { key: 'telecom', labelKey: 'defensive_news_category_telecom', keywords: ['telecom', 'telecommunications', 'wireless', 'broadband'] },
      { key: 'utilities', labelKey: 'defensive_news_category_utilities', keywords: ['utilities', 'utility', 'electricity', 'power'] },
      { key: 'essential_retail', labelKey: 'defensive_news_category_essential_retail', keywords: ['retail', 'warehouse club', 'essential retail', 'supermarket'] },
    ],
    watchlist: [
      { symbol: 'PG', name: 'Procter & Gamble', filter: 'consumer_staples', aliases: ['Procter', 'P&G'] },
      { symbol: 'KO', name: 'Coca-Cola', filter: 'food_beverage', filters: ['consumer_staples', 'food_beverage'], aliases: ['Coca Cola'] },
      { symbol: 'PEP', name: 'PepsiCo', filter: 'food_beverage', filters: ['consumer_staples', 'food_beverage'] },
      { symbol: 'WMT', name: 'Walmart', filter: 'essential_retail', filters: ['consumer_staples', 'essential_retail'] },
      { symbol: 'COST', name: 'Costco Wholesale', filter: 'essential_retail', filters: ['consumer_staples', 'essential_retail'] },
      { symbol: 'CL', name: 'Colgate-Palmolive', filter: 'consumer_staples', aliases: ['Colgate'] },
      { symbol: 'KMB', name: 'Kimberly-Clark', filter: 'consumer_staples', aliases: ['Kimberly Clark'] },
      { symbol: 'GIS', name: 'General Mills', filter: 'food_beverage', filters: ['consumer_staples', 'food_beverage'] },
      { symbol: 'MDLZ', name: 'Mondelez International', filter: 'food_beverage', filters: ['consumer_staples', 'food_beverage'], aliases: ['Mondelez'] },
      { symbol: 'HSY', name: 'Hershey', filter: 'food_beverage', filters: ['consumer_staples', 'food_beverage'] },
      { symbol: 'JNJ', name: 'Johnson & Johnson', filter: 'healthcare', filters: ['healthcare', 'pharmaceuticals'], aliases: ['Johnson and Johnson'] },
      { symbol: 'PFE', name: 'Pfizer', filter: 'pharmaceuticals', filters: ['healthcare', 'pharmaceuticals'] },
      { symbol: 'MRK', name: 'Merck', filter: 'pharmaceuticals', filters: ['healthcare', 'pharmaceuticals'] },
      { symbol: 'ABBV', name: 'AbbVie', filter: 'pharmaceuticals', filters: ['healthcare', 'pharmaceuticals'] },
      { symbol: 'LLY', name: 'Eli Lilly', filter: 'pharmaceuticals', filters: ['healthcare', 'pharmaceuticals'], aliases: ['Lilly'] },
      { symbol: 'UNH', name: 'UnitedHealth Group', filter: 'healthcare', filters: ['healthcare'], aliases: ['UnitedHealth'] },
      { symbol: 'NEE', name: 'NextEra Energy', filter: 'utilities', aliases: ['NextEra'] },
      { symbol: 'DUK', name: 'Duke Energy', filter: 'utilities' },
      { symbol: 'SO', name: 'Southern Company', filter: 'utilities' },
      { symbol: 'AEP', name: 'American Electric Power', filter: 'utilities' },
      { symbol: 'VZ', name: 'Verizon', filter: 'telecom' },
      { symbol: 'T', name: 'AT&T', filter: 'telecom', aliases: ['AT and T'] },
      { symbol: 'XLP', name: 'Consumer Staples Select Sector SPDR Fund', filter: 'consumer_staples', aliases: ['Consumer Staples Select Sector'] },
      { symbol: 'XLV', name: 'Health Care Select Sector SPDR Fund', filter: 'healthcare', aliases: ['Health Care Select Sector'] },
      { symbol: 'XLU', name: 'Utilities Select Sector SPDR Fund', filter: 'utilities', aliases: ['Utilities Select Sector'] },
    ],
  },
  {
    id: 'growth',
    route: '/growth-stocks',
    navKey: 'nav_growth_stocks',
    titleKey: 'stock_category_growth_title',
    subtitleKey: 'stock_category_growth_subtitle',
    badgeKey: 'stock_category_growth_badge',
    explanationTitleKey: 'stock_category_growth_explanation_title',
    explanationBodyKey: 'stock_category_growth_explanation',
    disclaimerTitleKey: 'defensive_news_disclaimer_title',
    disclaimerBodyKey: 'stock_category_growth_disclaimer',
    searchPlaceholderKey: 'stock_category_growth_search_placeholder',
    filterLabelKey: 'stock_category_filter_label',
    moversTitleKey: 'stock_category_growth_movers',
    mentionedTitleKey: 'stock_category_most_mentioned',
    sourcesTitleKey: 'stock_category_sources_title',
    sectorGuideTitleKey: 'stock_category_growth_sectors_title',
    noNewsMessage: 'No recent growth stocks news found from configured real data sources.',
    rssQuery: 'growth stocks OR revenue growth stocks OR cloud software stocks OR fintech stocks OR e-commerce growth stocks OR artificial intelligence stocks OR semiconductor stocks',
    filters: [
      commonFilterAll,
      { key: 'software', labelKey: 'tech_news_dashboard_category_software', keywords: ['software', 'SaaS', 'enterprise software'] },
      { key: 'cloud', labelKey: 'tech_news_dashboard_category_cloud', keywords: ['cloud', 'cloud computing', 'cloud infrastructure'] },
      { key: 'artificial_intelligence', labelKey: 'tech_news_dashboard_category_ai', keywords: ['artificial intelligence', 'AI', 'machine learning', 'generative AI'] },
      { key: 'semiconductors', labelKey: 'tech_news_dashboard_category_semiconductors', keywords: ['semiconductor', 'chip', 'GPU', 'processor'] },
      { key: 'ecommerce', labelKey: 'stock_category_filter_ecommerce', keywords: ['e-commerce', 'ecommerce', 'online retail', 'marketplace'] },
      { key: 'fintech', labelKey: 'stock_category_filter_fintech', keywords: ['fintech', 'payments', 'digital wallet'] },
      { key: 'cybersecurity', labelKey: 'tech_news_dashboard_category_cybersecurity', keywords: ['cybersecurity', 'security software', 'zero trust', 'ransomware'] },
      { key: 'electric_vehicles', labelKey: 'tech_news_sector_ev', keywords: ['electric vehicle', 'EV', 'autonomous driving'] },
      { key: 'innovative_healthcare', labelKey: 'stock_category_filter_innovative_healthcare', keywords: ['robotic surgery', 'medical technology', 'innovative healthcare'] },
      { key: 'digital_consumption', labelKey: 'stock_category_filter_digital_consumption', keywords: ['digital consumption', 'advertising', 'streaming', 'travel platform'] },
    ],
    watchlist: [
      { symbol: 'AMZN', name: 'Amazon', filter: 'ecommerce', filters: ['ecommerce', 'cloud', 'digital_consumption'] },
      { symbol: 'TSLA', name: 'Tesla', filter: 'electric_vehicles', filters: ['electric_vehicles', 'digital_consumption'] },
      { symbol: 'SHOP', name: 'Shopify', filter: 'ecommerce' },
      { symbol: 'CRM', name: 'Salesforce', filter: 'software' },
      { symbol: 'NOW', name: 'ServiceNow', filter: 'software' },
      { symbol: 'SNOW', name: 'Snowflake', filter: 'cloud', filters: ['software', 'cloud'] },
      { symbol: 'DDOG', name: 'Datadog', filter: 'cloud', filters: ['software', 'cloud'] },
      { symbol: 'NET', name: 'Cloudflare', filter: 'cloud' },
      { symbol: 'PLTR', name: 'Palantir', filter: 'artificial_intelligence', filters: ['software', 'artificial_intelligence'] },
      { symbol: 'UBER', name: 'Uber', filter: 'digital_consumption' },
      { symbol: 'SQ', name: 'Block', filter: 'fintech', aliases: ['Block', 'Square'] },
      { symbol: 'MELI', name: 'MercadoLibre', filter: 'ecommerce', aliases: ['Mercado Libre'] },
      { symbol: 'RBLX', name: 'Roblox', filter: 'digital_consumption' },
      { symbol: 'ABNB', name: 'Airbnb', filter: 'digital_consumption' },
      { symbol: 'ISRG', name: 'Intuitive Surgical', filter: 'innovative_healthcare' },
      { symbol: 'TTD', name: 'The Trade Desk', filter: 'digital_consumption' },
      { symbol: 'DXCM', name: 'DexCom', filter: 'innovative_healthcare' },
      { symbol: 'CRWD', name: 'CrowdStrike', filter: 'cybersecurity', filters: ['software', 'cybersecurity'] },
      { symbol: 'ZS', name: 'Zscaler', filter: 'cybersecurity', filters: ['software', 'cybersecurity'] },
      { symbol: 'MDB', name: 'MongoDB', filter: 'software', filters: ['software', 'cloud'] },
      { symbol: 'NVDA', name: 'NVIDIA', filter: 'artificial_intelligence', filters: ['artificial_intelligence', 'semiconductors'] },
      { symbol: 'AMD', name: 'Advanced Micro Devices', filter: 'semiconductors', filters: ['semiconductors', 'artificial_intelligence'], aliases: ['AMD'] },
      { symbol: 'AVGO', name: 'Broadcom', filter: 'semiconductors' },
      { symbol: 'AAPL', name: 'Apple', filter: 'digital_consumption', filters: ['digital_consumption', 'software'], aliases: ['Apple Intelligence', 'iPhone'] },
      { symbol: 'META', name: 'Meta Platforms', filter: 'artificial_intelligence', filters: ['artificial_intelligence', 'digital_consumption'], aliases: ['Meta', 'Facebook', 'Instagram'] },
      { symbol: 'MSFT', name: 'Microsoft', filter: 'artificial_intelligence', filters: ['artificial_intelligence', 'cloud', 'software'], aliases: ['Microsoft Copilot'] },
      { symbol: 'GOOGL', name: 'Alphabet', filter: 'artificial_intelligence', filters: ['artificial_intelligence', 'cloud', 'digital_consumption'], aliases: ['Google', 'Gemini'] },
      { symbol: 'PYPL', name: 'PayPal', filter: 'fintech' },
    ],
  },
  {
    id: 'dividend',
    route: '/dividend-stocks',
    navKey: 'nav_dividend_stocks',
    titleKey: 'stock_category_dividend_title',
    subtitleKey: 'stock_category_dividend_subtitle',
    badgeKey: 'stock_category_dividend_badge',
    explanationTitleKey: 'stock_category_dividend_explanation_title',
    explanationBodyKey: 'stock_category_dividend_explanation',
    disclaimerTitleKey: 'defensive_news_disclaimer_title',
    disclaimerBodyKey: 'stock_category_dividend_disclaimer',
    searchPlaceholderKey: 'stock_category_dividend_search_placeholder',
    filterLabelKey: 'stock_category_filter_label',
    moversTitleKey: 'stock_category_dividend_movers',
    mentionedTitleKey: 'stock_category_most_mentioned',
    sourcesTitleKey: 'stock_category_sources_title',
    sectorGuideTitleKey: 'stock_category_dividend_sectors_title',
    noNewsMessage: 'No recent dividend stocks news found from configured real data sources.',
    rssQuery: 'dividend stocks OR dividend yield OR dividend growth OR dividend aristocrats OR REIT income stocks OR bank dividends OR energy dividends',
    filters: [
      commonFilterAll,
      { key: 'consumer_goods', labelKey: 'stock_category_filter_consumer_goods', keywords: ['consumer staples', 'consumer goods', 'staples'] },
      { key: 'energy', labelKey: 'stock_category_filter_energy', keywords: ['energy', 'oil', 'gas', 'energy dividend'] },
      { key: 'banks', labelKey: 'stock_category_filter_banks', keywords: ['bank', 'banks', 'financial dividend'] },
      { key: 'telecom', labelKey: 'defensive_news_category_telecom', keywords: ['telecom', 'wireless'] },
      { key: 'utilities', labelKey: 'defensive_news_category_utilities', keywords: ['utility', 'utilities'] },
      { key: 'reits', labelKey: 'stock_category_filter_real_estate_reits', keywords: ['REIT', 'real estate investment trust'] },
      { key: 'healthcare', labelKey: 'defensive_news_category_healthcare', keywords: ['healthcare', 'pharma', 'drug'] },
      { key: 'industrials', labelKey: 'stock_category_filter_industry', keywords: ['industrial', 'industry', 'manufacturing'] },
      { key: 'technology', labelKey: 'stock_category_filter_technology', keywords: ['technology', 'tech dividend'] },
    ],
    metricCards: [
      { labelKey: 'stock_category_metric_dividend_yield', bodyKey: 'stock_category_metric_dividend_yield_body' },
      { labelKey: 'stock_category_metric_payout_ratio', bodyKey: 'stock_category_metric_payout_ratio_body' },
      { labelKey: 'stock_category_metric_dividend_growth', bodyKey: 'stock_category_metric_dividend_growth_body' },
      { labelKey: 'stock_category_metric_continuity', bodyKey: 'stock_category_metric_continuity_body' },
    ],
    watchlist: [
      { symbol: 'KO', name: 'Coca-Cola', filter: 'consumer_goods' },
      { symbol: 'PEP', name: 'PepsiCo', filter: 'consumer_goods' },
      { symbol: 'PG', name: 'Procter & Gamble', filter: 'consumer_goods' },
      { symbol: 'KMB', name: 'Kimberly-Clark', filter: 'consumer_goods', aliases: ['Kimberly Clark'] },
      { symbol: 'GIS', name: 'General Mills', filter: 'consumer_goods' },
      { symbol: 'JNJ', name: 'Johnson & Johnson', filter: 'healthcare' },
      { symbol: 'PFE', name: 'Pfizer', filter: 'healthcare' },
      { symbol: 'MCD', name: "McDonald's", filter: 'consumer_goods' },
      { symbol: 'O', name: 'Realty Income', filter: 'reits', aliases: ['Realty Income'] },
      { symbol: 'VZ', name: 'Verizon', filter: 'telecom' },
      { symbol: 'T', name: 'AT&T', filter: 'telecom' },
      { symbol: 'MO', name: 'Altria', filter: 'consumer_goods' },
      { symbol: 'PM', name: 'Philip Morris International', filter: 'consumer_goods' },
      { symbol: 'XOM', name: 'Exxon Mobil', filter: 'energy' },
      { symbol: 'CVX', name: 'Chevron', filter: 'energy' },
      { symbol: 'NEE', name: 'NextEra Energy', filter: 'utilities' },
      { symbol: 'DUK', name: 'Duke Energy', filter: 'utilities' },
      { symbol: 'SO', name: 'Southern Company', filter: 'utilities' },
      { symbol: 'ABBV', name: 'AbbVie', filter: 'healthcare' },
      { symbol: 'IBM', name: 'IBM', filter: 'technology' },
      { symbol: 'MMM', name: '3M', filter: 'industrials' },
    ],
  },
  {
    id: 'cyclical',
    route: '/cyclical-stocks',
    navKey: 'nav_cyclical_stocks',
    titleKey: 'stock_category_cyclical_title_rebuilt',
    subtitleKey: 'stock_category_cyclical_subtitle_rebuilt',
    badgeKey: 'stock_category_cyclical_badge',
    explanationTitleKey: 'stock_category_cyclical_explanation_title',
    explanationBodyKey: 'stock_category_cyclical_explanation_rebuilt',
    disclaimerTitleKey: 'defensive_news_disclaimer_title',
    disclaimerBodyKey: 'stock_category_cyclical_disclaimer',
    searchPlaceholderKey: 'stock_category_cyclical_search_placeholder',
    filterLabelKey: 'stock_category_filter_label',
    moversTitleKey: 'stock_category_cyclical_movers',
    mentionedTitleKey: 'stock_category_most_mentioned',
    sourcesTitleKey: 'stock_category_sources_title',
    sectorGuideTitleKey: 'stock_category_cyclical_sectors_title',
    noNewsMessage: 'No recent cyclical stocks news found from configured real data sources.',
    rssQuery: 'cyclical stocks OR travel stocks OR auto stocks OR industrial stocks OR luxury stocks OR consumer discretionary stocks',
    filters: [
      commonFilterAll,
      { key: 'autos', labelKey: 'stock_category_filter_autos', keywords: ['automaker', 'auto', 'vehicle', 'cars'] },
      { key: 'airlines_travel', labelKey: 'stock_category_filter_travel_airlines', keywords: ['airline', 'travel', 'passenger traffic'] },
      { key: 'hotels_entertainment', labelKey: 'stock_category_filter_hotels_entertainment', keywords: ['hotel', 'resort', 'entertainment'] },
      { key: 'industrials', labelKey: 'stock_category_filter_industry', keywords: ['industrial', 'machinery', 'aerospace'] },
      { key: 'luxury_goods', labelKey: 'stock_category_filter_luxury_goods', keywords: ['luxury', 'premium goods'] },
      { key: 'construction_real_estate', labelKey: 'stock_category_filter_construction_real_estate', keywords: ['construction', 'housing', 'real estate', 'materials'] },
      { key: 'nonessential_retail', labelKey: 'stock_category_filter_nonessential_retail', keywords: ['consumer discretionary', 'nonessential retail'] },
      { key: 'basic_materials', labelKey: 'stock_category_filter_basic_materials', keywords: ['materials', 'basic materials', 'metals', 'chemicals'] },
      { key: 'transport', labelKey: 'stock_category_filter_transport', keywords: ['shipping', 'transport', 'freight', 'logistics'] },
    ],
    watchlist: [
      { symbol: 'F', name: 'Ford Motor', filter: 'autos' },
      { symbol: 'GM', name: 'General Motors', filter: 'autos' },
      { symbol: 'TSLA', name: 'Tesla', filter: 'autos' },
      { symbol: 'DAL', name: 'Delta Air Lines', filter: 'airlines_travel' },
      { symbol: 'UAL', name: 'United Airlines', filter: 'airlines_travel' },
      { symbol: 'AAL', name: 'American Airlines', filter: 'airlines_travel' },
      { symbol: 'MAR', name: 'Marriott International', filter: 'hotels_entertainment' },
      { symbol: 'HLT', name: 'Hilton Worldwide', filter: 'hotels_entertainment' },
      { symbol: 'WYNN', name: 'Wynn Resorts', filter: 'hotels_entertainment' },
      { symbol: 'LVS', name: 'Las Vegas Sands', filter: 'hotels_entertainment' },
      { symbol: 'RCL', name: 'Royal Caribbean', filter: 'airlines_travel', aliases: ['Royal Caribbean Cruises'] },
      { symbol: 'CCL', name: 'Carnival', filter: 'airlines_travel', aliases: ['Carnival Corporation'] },
      { symbol: 'NCLH', name: 'Norwegian Cruise Line', filter: 'airlines_travel', aliases: ['Norwegian Cruise'] },
      { symbol: 'CAT', name: 'Caterpillar', filter: 'industrials' },
      { symbol: 'DE', name: 'Deere', filter: 'industrials' },
      { symbol: 'BA', name: 'Boeing', filter: 'industrials' },
      { symbol: 'NKE', name: 'Nike', filter: 'luxury_goods' },
      { symbol: 'SBUX', name: 'Starbucks', filter: 'nonessential_retail' },
      { symbol: 'MCD', name: "McDonald's", filter: 'nonessential_retail' },
      { symbol: 'HD', name: 'Home Depot', filter: 'construction_real_estate' },
      { symbol: 'LOW', name: "Lowe's", filter: 'construction_real_estate' },
      { symbol: 'DHI', name: 'D.R. Horton', filter: 'construction_real_estate', aliases: ['DR Horton'] },
      { symbol: 'LEN', name: 'Lennar', filter: 'construction_real_estate' },
      { symbol: 'LVMUY', name: 'LVMH', filter: 'luxury_goods' },
      { symbol: 'RACE', name: 'Ferrari', filter: 'luxury_goods' },
    ],
  },
  {
    id: 'energy',
    route: '/energy-stocks',
    navKey: 'nav_energy_stocks',
    titleKey: 'stock_category_energy_title',
    subtitleKey: 'stock_category_energy_subtitle',
    badgeKey: 'stock_category_energy_badge',
    explanationTitleKey: 'stock_category_energy_explanation_title',
    explanationBodyKey: 'stock_category_energy_explanation',
    disclaimerTitleKey: 'defensive_news_disclaimer_title',
    disclaimerBodyKey: 'stock_category_standard_disclaimer',
    searchPlaceholderKey: 'stock_category_search_placeholder',
    filterLabelKey: 'stock_category_filter_label',
    moversTitleKey: 'stock_category_energy_movers',
    mentionedTitleKey: 'stock_category_most_mentioned',
    sourcesTitleKey: 'stock_category_sources_title',
    sectorGuideTitleKey: 'stock_category_energy_context_title',
    noNewsMessage: 'No recent energy stocks news found from configured real data sources.',
    rssQuery: 'energy stocks OR oil stocks OR natural gas stocks OR renewable energy stocks OR oilfield services stocks',
    filters: [
      commonFilterAll,
      { key: 'oil_gas', labelKey: 'stock_category_filter_oil_gas', keywords: ['oil', 'gas', 'exploration', 'production'] },
      { key: 'oil_services', labelKey: 'stock_category_filter_oil_services', keywords: ['oilfield services', 'drilling', 'services'] },
      { key: 'refiners', labelKey: 'stock_category_filter_refiners', keywords: ['refinery', 'refining', 'downstream'] },
      { key: 'pipelines', labelKey: 'stock_category_filter_pipelines', keywords: ['pipeline', 'midstream'] },
      { key: 'natural_gas', labelKey: 'stock_category_filter_natural_gas', keywords: ['natural gas', 'LNG'] },
      { key: 'renewables', labelKey: 'stock_category_filter_renewables', keywords: ['renewable', 'clean energy'] },
      { key: 'solar', labelKey: 'stock_category_filter_solar', keywords: ['solar', 'photovoltaic'] },
      { key: 'nuclear', labelKey: 'stock_category_filter_nuclear', keywords: ['nuclear', 'uranium'] },
    ],
    metricCards: [
      { labelKey: 'stock_category_metric_wti', bodyKey: 'stock_category_metric_wti_body' },
      { labelKey: 'stock_category_metric_brent', bodyKey: 'stock_category_metric_brent_body' },
      { labelKey: 'stock_category_metric_natgas', bodyKey: 'stock_category_metric_natgas_body' },
    ],
    watchlist: [
      { symbol: 'XOM', name: 'Exxon Mobil', filter: 'oil_gas' },
      { symbol: 'CVX', name: 'Chevron', filter: 'oil_gas' },
      { symbol: 'COP', name: 'ConocoPhillips', filter: 'oil_gas' },
      { symbol: 'SLB', name: 'SLB', filter: 'oil_services', aliases: ['Schlumberger'] },
      { symbol: 'HAL', name: 'Halliburton', filter: 'oil_services' },
      { symbol: 'OXY', name: 'Occidental Petroleum', filter: 'oil_gas' },
      { symbol: 'EOG', name: 'EOG Resources', filter: 'oil_gas' },
      { symbol: 'BP', name: 'BP', filter: 'oil_gas' },
      { symbol: 'SHEL', name: 'Shell', filter: 'oil_gas' },
      { symbol: 'TTE', name: 'TotalEnergies', filter: 'oil_gas' },
      { symbol: 'ENB', name: 'Enbridge', filter: 'pipelines' },
      { symbol: 'LNG', name: 'Cheniere Energy', filter: 'natural_gas' },
      { symbol: 'FSLR', name: 'First Solar', filter: 'solar', filters: ['renewables', 'solar'] },
      { symbol: 'ENPH', name: 'Enphase Energy', filter: 'solar', filters: ['renewables', 'solar'] },
      { symbol: 'NEE', name: 'NextEra Energy', filter: 'renewables' },
      { symbol: 'BEP', name: 'Brookfield Renewable Partners', filter: 'renewables' },
      { symbol: 'CCJ', name: 'Cameco', filter: 'nuclear' },
    ],
  },
  {
    id: 'banking',
    route: '/banking-stocks',
    navKey: 'nav_banking_stocks',
    titleKey: 'stock_category_banking_title',
    subtitleKey: 'stock_category_banking_subtitle',
    badgeKey: 'stock_category_banking_badge',
    explanationTitleKey: 'stock_category_banking_explanation_title',
    explanationBodyKey: 'stock_category_banking_explanation',
    disclaimerTitleKey: 'defensive_news_disclaimer_title',
    disclaimerBodyKey: 'stock_category_standard_disclaimer',
    searchPlaceholderKey: 'stock_category_search_placeholder',
    filterLabelKey: 'stock_category_filter_label',
    moversTitleKey: 'stock_category_banking_movers',
    mentionedTitleKey: 'stock_category_most_mentioned',
    sourcesTitleKey: 'stock_category_sources_title',
    sectorGuideTitleKey: 'stock_category_metrics_title',
    noNewsMessage: 'No recent banking stocks news found from configured real data sources.',
    rssQuery: 'bank stocks OR financial services stocks OR interest rates banks OR credit quality banks OR deposit growth banks',
    filters: [
      commonFilterAll,
      { key: 'large_banks', labelKey: 'stock_category_filter_large_banks', keywords: ['large bank', 'money center bank'] },
      { key: 'regional_banks', labelKey: 'stock_category_filter_regional_banks', keywords: ['regional bank'] },
      { key: 'investment_banks', labelKey: 'stock_category_filter_investment_banks', keywords: ['investment bank', 'capital markets'] },
      { key: 'payments', labelKey: 'stock_category_filter_payments', keywords: ['payments', 'cards', 'transactions'] },
      { key: 'insurance', labelKey: 'stock_category_filter_insurance', keywords: ['insurance', 'insurer'] },
      { key: 'asset_management', labelKey: 'stock_category_filter_asset_management', keywords: ['asset management', 'wealth management'] },
      { key: 'exchanges_services', labelKey: 'stock_category_filter_exchanges_services', keywords: ['exchange', 'financial data', 'ratings'] },
    ],
    metricCards: [
      { labelKey: 'stock_category_metric_nim', bodyKey: 'stock_category_metric_nim_body' },
      { labelKey: 'stock_category_metric_credit_quality', bodyKey: 'stock_category_metric_credit_quality_body' },
      { labelKey: 'stock_category_metric_deposits', bodyKey: 'stock_category_metric_deposits_body' },
      { labelKey: 'stock_category_metric_capital_liquidity', bodyKey: 'stock_category_metric_capital_liquidity_body' },
      { labelKey: 'stock_category_metric_rates', bodyKey: 'stock_category_metric_rates_body' },
    ],
    watchlist: [
      { symbol: 'JPM', name: 'JPMorgan Chase', filter: 'large_banks' },
      { symbol: 'BAC', name: 'Bank of America', filter: 'large_banks' },
      { symbol: 'WFC', name: 'Wells Fargo', filter: 'large_banks' },
      { symbol: 'C', name: 'Citigroup', filter: 'large_banks' },
      { symbol: 'GS', name: 'Goldman Sachs', filter: 'investment_banks' },
      { symbol: 'MS', name: 'Morgan Stanley', filter: 'investment_banks' },
      { symbol: 'USB', name: 'U.S. Bancorp', filter: 'regional_banks' },
      { symbol: 'PNC', name: 'PNC Financial Services', filter: 'regional_banks' },
      { symbol: 'SCHW', name: 'Charles Schwab', filter: 'asset_management' },
      { symbol: 'BLK', name: 'BlackRock', filter: 'asset_management' },
      { symbol: 'AXP', name: 'American Express', filter: 'payments' },
      { symbol: 'V', name: 'Visa', filter: 'payments' },
      { symbol: 'MA', name: 'Mastercard', filter: 'payments' },
      { symbol: 'PYPL', name: 'PayPal', filter: 'payments' },
      { symbol: 'ICE', name: 'Intercontinental Exchange', filter: 'exchanges_services' },
      { symbol: 'CME', name: 'CME Group', filter: 'exchanges_services' },
      { symbol: 'SPGI', name: 'S&P Global', filter: 'exchanges_services' },
      { symbol: 'MCO', name: "Moody's", filter: 'exchanges_services' },
    ],
  },
  {
    id: 'sharia',
    route: '/sharia-stocks',
    navKey: 'nav_sharia_stocks',
    titleKey: 'stock_category_sharia_title',
    subtitleKey: 'stock_category_sharia_subtitle',
    badgeKey: 'stock_category_sharia_badge',
    explanationTitleKey: 'stock_category_sharia_explanation_title',
    explanationBodyKey: 'stock_category_sharia_explanation',
    disclaimerTitleKey: 'stock_category_sharia_disclaimer_title',
    disclaimerBodyKey: 'stock_category_sharia_disclaimer_body',
    searchPlaceholderKey: 'stock_category_search_placeholder',
    filterLabelKey: 'stock_category_filter_label',
    moversTitleKey: 'stock_category_sharia_movers',
    mentionedTitleKey: 'stock_category_most_mentioned',
    sourcesTitleKey: 'stock_category_sources_title',
    sectorGuideTitleKey: 'stock_category_sharia_status_title',
    noNewsMessage: 'No recent Sharia-screening related stocks news found from configured real data sources.',
    rssQuery: 'Sharia stock screening OR Islamic finance investing OR sukuk market OR Islamic ETF',
    shariaCaution: true,
    filters: [
      commonFilterAll,
      { key: 'possible', labelKey: 'stock_category_sharia_status_possible', keywords: [] },
      { key: 'needs_review', labelKey: 'stock_category_sharia_status_review', keywords: [] },
      { key: 'unclassified', labelKey: 'stock_category_sharia_status_unclassified', keywords: [] },
      { key: 'non_compliant', labelKey: 'stock_category_sharia_status_non_compliant', keywords: [] },
    ],
    metricCards: [
      { labelKey: 'stock_category_sharia_status_possible', bodyKey: 'stock_category_sharia_status_possible_body' },
      { labelKey: 'stock_category_sharia_status_review', bodyKey: 'stock_category_sharia_status_review_body' },
      { labelKey: 'stock_category_sharia_status_unclassified', bodyKey: 'stock_category_sharia_status_unclassified_body' },
    ],
    watchlist: [
      { symbol: 'SPUS', name: 'SP Funds S&P 500 Sharia Industry Exclusions ETF', filter: 'unclassified', aliases: ['SP Funds'] },
      { symbol: 'HLAL', name: 'Wahed FTSE USA Shariah ETF', filter: 'unclassified', aliases: ['Wahed', 'FTSE USA Shariah'] },
      { symbol: 'UMMA', name: 'Wahed Dow Jones Islamic World ETF', filter: 'unclassified', aliases: ['Dow Jones Islamic World'] },
    ],
  },
];

export function getStockCategoryConfig(id: string | null | undefined) {
  return STOCK_CATEGORY_CONFIGS.find(config => config.id === id);
}

export function getStockCategoryByRoute(route: string) {
  return STOCK_CATEGORY_CONFIGS.find(config => config.route === route);
}
