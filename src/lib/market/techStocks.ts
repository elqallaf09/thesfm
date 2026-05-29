export type TechStockSector =
  | 'ai'
  | 'semiconductors'
  | 'software'
  | 'hardware'
  | 'ecommerce'
  | 'cloud'
  | 'ev';

export type TechStockConfig = {
  name: string;
  symbol: string;
  aliases?: string[];
  sector: TechStockSector;
};

export const TECH_STOCKS: TechStockConfig[] = [
  { name: 'Apple', symbol: 'AAPL', sector: 'hardware' },
  { name: 'Microsoft', symbol: 'MSFT', sector: 'cloud' },
  { name: 'Nvidia', symbol: 'NVDA', sector: 'ai' },
  { name: 'Alphabet', symbol: 'GOOGL', aliases: ['GOOG'], sector: 'cloud' },
  { name: 'Alphabet Class C', symbol: 'GOOG', sector: 'cloud' },
  { name: 'Amazon', symbol: 'AMZN', sector: 'ecommerce' },
  { name: 'Meta', symbol: 'META', sector: 'ai' },
  { name: 'Tesla', symbol: 'TSLA', sector: 'ev' },
  { name: 'AMD', symbol: 'AMD', sector: 'semiconductors' },
  { name: 'Intel', symbol: 'INTC', sector: 'semiconductors' },
  { name: 'Broadcom', symbol: 'AVGO', sector: 'semiconductors' },
  { name: 'Salesforce', symbol: 'CRM', sector: 'software' },
  { name: 'Oracle', symbol: 'ORCL', sector: 'cloud' },
  { name: 'Netflix', symbol: 'NFLX', sector: 'software' },
  { name: 'Adobe', symbol: 'ADBE', sector: 'software' },
  { name: 'Qualcomm', symbol: 'QCOM', sector: 'semiconductors' },
  { name: 'Taiwan Semiconductor', symbol: 'TSM', sector: 'semiconductors' },
  { name: 'Shopify', symbol: 'SHOP', sector: 'ecommerce' },
  { name: 'Uber', symbol: 'UBER', sector: 'software' },
  { name: 'Palantir', symbol: 'PLTR', sector: 'ai' },
];

export const TECH_NEWS_SECTORS = [
  'all',
  'ai',
  'semiconductors',
  'software',
  'hardware',
  'ecommerce',
  'cloud',
  'ev',
] as const;

export type TechNewsSectorFilter = typeof TECH_NEWS_SECTORS[number];
