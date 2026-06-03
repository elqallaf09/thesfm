export type DefensiveStockSector =
  | 'consumer_staples'
  | 'healthcare'
  | 'utilities'
  | 'telecom'
  | 'food_beverage'
  | 'essential_retail'
  | 'pharmaceuticals'
  | 'insurance_stable'
  | 'defensive_etf';

export type DefensiveStockConfig = {
  name: string;
  symbol: string;
  aliases?: string[];
  sector: DefensiveStockSector;
  sectors?: DefensiveStockSector[];
};

export const DEFENSIVE_STOCKS: DefensiveStockConfig[] = [
  { name: 'Procter & Gamble', symbol: 'PG', sector: 'consumer_staples', sectors: ['consumer_staples'] },
  { name: 'Coca-Cola', symbol: 'KO', sector: 'food_beverage', sectors: ['consumer_staples', 'food_beverage'] },
  { name: 'PepsiCo', symbol: 'PEP', sector: 'food_beverage', sectors: ['consumer_staples', 'food_beverage'] },
  { name: 'Walmart', symbol: 'WMT', sector: 'essential_retail', sectors: ['consumer_staples', 'essential_retail'] },
  { name: 'Costco Wholesale', symbol: 'COST', sector: 'essential_retail', sectors: ['consumer_staples', 'essential_retail'] },
  { name: 'Colgate-Palmolive', symbol: 'CL', sector: 'consumer_staples', sectors: ['consumer_staples'] },
  { name: 'Kimberly-Clark', symbol: 'KMB', sector: 'consumer_staples', sectors: ['consumer_staples'] },
  { name: 'General Mills', symbol: 'GIS', sector: 'food_beverage', sectors: ['consumer_staples', 'food_beverage'] },
  { name: 'Mondelez International', symbol: 'MDLZ', sector: 'food_beverage', sectors: ['consumer_staples', 'food_beverage'] },
  { name: 'Hershey', symbol: 'HSY', sector: 'food_beverage', sectors: ['consumer_staples', 'food_beverage'] },
  { name: 'Johnson & Johnson', symbol: 'JNJ', sector: 'healthcare', sectors: ['healthcare', 'pharmaceuticals'] },
  { name: 'Pfizer', symbol: 'PFE', sector: 'pharmaceuticals', sectors: ['healthcare', 'pharmaceuticals'] },
  { name: 'Merck', symbol: 'MRK', sector: 'pharmaceuticals', sectors: ['healthcare', 'pharmaceuticals'] },
  { name: 'AbbVie', symbol: 'ABBV', sector: 'pharmaceuticals', sectors: ['healthcare', 'pharmaceuticals'] },
  { name: 'Eli Lilly', symbol: 'LLY', sector: 'pharmaceuticals', sectors: ['healthcare', 'pharmaceuticals'] },
  { name: 'UnitedHealth Group', symbol: 'UNH', sector: 'healthcare', sectors: ['healthcare', 'insurance_stable'] },
  { name: 'Bristol Myers Squibb', symbol: 'BMY', sector: 'pharmaceuticals', sectors: ['healthcare', 'pharmaceuticals'] },
  { name: 'NextEra Energy', symbol: 'NEE', sector: 'utilities', sectors: ['utilities'] },
  { name: 'Duke Energy', symbol: 'DUK', sector: 'utilities', sectors: ['utilities'] },
  { name: 'Southern Company', symbol: 'SO', sector: 'utilities', sectors: ['utilities'] },
  { name: 'American Electric Power', symbol: 'AEP', sector: 'utilities', sectors: ['utilities'] },
  { name: 'Exelon', symbol: 'EXC', sector: 'utilities', sectors: ['utilities'] },
  { name: 'Verizon', symbol: 'VZ', sector: 'telecom', sectors: ['telecom'] },
  { name: 'AT&T', symbol: 'T', sector: 'telecom', sectors: ['telecom'] },
  { name: 'Consumer Staples Select Sector SPDR Fund', symbol: 'XLP', sector: 'defensive_etf', sectors: ['defensive_etf', 'consumer_staples'] },
  { name: 'Health Care Select Sector SPDR Fund', symbol: 'XLV', sector: 'defensive_etf', sectors: ['defensive_etf', 'healthcare'] },
  { name: 'Utilities Select Sector SPDR Fund', symbol: 'XLU', sector: 'defensive_etf', sectors: ['defensive_etf', 'utilities'] },
  { name: 'Vanguard Consumer Staples ETF', symbol: 'VDC', sector: 'defensive_etf', sectors: ['defensive_etf', 'consumer_staples'] },
  { name: 'Vanguard Health Care ETF', symbol: 'VHT', sector: 'defensive_etf', sectors: ['defensive_etf', 'healthcare'] },
];

export const DEFENSIVE_STOCK_SECTORS = [
  'all',
  'consumer_staples',
  'healthcare',
  'utilities',
  'telecom',
  'food_beverage',
  'essential_retail',
  'pharmaceuticals',
  'insurance_stable',
] as const;

export type DefensiveStockSectorFilter = typeof DEFENSIVE_STOCK_SECTORS[number];
