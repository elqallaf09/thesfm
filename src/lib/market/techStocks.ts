export type TechStockSector =
  | 'ai'
  | 'semiconductors'
  | 'software'
  | 'hardware'
  | 'ecommerce'
  | 'cloud'
  | 'cybersecurity'
  | 'ev'
  | 'social_ads'
  | 'gaming'
  | 'infrastructure';

export type TechStockConfig = {
  name: string;
  symbol: string;
  aliases?: string[];
  sector: TechStockSector;
  sectors?: TechStockSector[];
};

export const TECH_STOCKS: TechStockConfig[] = [
  { name: 'Apple', symbol: 'AAPL', sector: 'hardware', sectors: ['hardware'] },
  { name: 'Microsoft', symbol: 'MSFT', sector: 'cloud', sectors: ['ai', 'software', 'cloud'] },
  { name: 'Nvidia', symbol: 'NVDA', sector: 'ai', sectors: ['ai', 'semiconductors', 'infrastructure'] },
  { name: 'Alphabet', symbol: 'GOOGL', aliases: ['GOOG'], sector: 'cloud', sectors: ['ai', 'cloud', 'social_ads'] },
  { name: 'Alphabet Class C', symbol: 'GOOG', sector: 'cloud', sectors: ['ai', 'cloud', 'social_ads'] },
  { name: 'Amazon', symbol: 'AMZN', sector: 'ecommerce', sectors: ['cloud', 'ecommerce'] },
  { name: 'Meta', symbol: 'META', sector: 'social_ads', sectors: ['ai', 'social_ads'] },
  { name: 'Tesla', symbol: 'TSLA', sector: 'ev', sectors: ['ev'] },
  { name: 'AMD', symbol: 'AMD', sector: 'semiconductors', sectors: ['ai', 'semiconductors', 'infrastructure'] },
  { name: 'Intel', symbol: 'INTC', sector: 'semiconductors', sectors: ['semiconductors'] },
  { name: 'Broadcom', symbol: 'AVGO', sector: 'semiconductors', sectors: ['semiconductors', 'infrastructure'] },
  { name: 'Salesforce', symbol: 'CRM', sector: 'software', sectors: ['software'] },
  { name: 'Oracle', symbol: 'ORCL', sector: 'cloud', sectors: ['software', 'cloud'] },
  { name: 'Netflix', symbol: 'NFLX', sector: 'gaming', sectors: ['gaming'] },
  { name: 'Adobe', symbol: 'ADBE', sector: 'software', sectors: ['software'] },
  { name: 'Qualcomm', symbol: 'QCOM', sector: 'semiconductors', sectors: ['semiconductors'] },
  { name: 'Taiwan Semiconductor', symbol: 'TSM', sector: 'semiconductors', sectors: ['semiconductors'] },
  { name: 'Shopify', symbol: 'SHOP', sector: 'ecommerce', sectors: ['ecommerce'] },
  { name: 'Uber', symbol: 'UBER', sector: 'software', sectors: ['software'] },
  { name: 'Palantir', symbol: 'PLTR', sector: 'ai', sectors: ['ai'] },
  { name: 'Micron', symbol: 'MU', sector: 'semiconductors', sectors: ['semiconductors'] },
  { name: 'ASML', symbol: 'ASML', sector: 'semiconductors', sectors: ['semiconductors'] },
  { name: 'Arm Holdings', symbol: 'ARM', sector: 'semiconductors', sectors: ['semiconductors'] },
  { name: 'ServiceNow', symbol: 'NOW', sector: 'software', sectors: ['software'] },
  { name: 'Snowflake', symbol: 'SNOW', sector: 'software', sectors: ['software', 'cloud'] },
  { name: 'Intuit', symbol: 'INTU', sector: 'software', sectors: ['software'] },
  { name: 'Atlassian', symbol: 'TEAM', sector: 'software', sectors: ['software'] },
  { name: 'Dell Technologies', symbol: 'DELL', sector: 'hardware', sectors: ['hardware', 'infrastructure'] },
  { name: 'HP', symbol: 'HPQ', sector: 'hardware', sectors: ['hardware'] },
  { name: 'Logitech', symbol: 'LOGI', sector: 'hardware', sectors: ['hardware'] },
  { name: 'IBM', symbol: 'IBM', sector: 'cloud', sectors: ['cloud'] },
  { name: 'Cloudflare', symbol: 'NET', sector: 'cloud', sectors: ['cloud', 'cybersecurity'] },
  { name: 'CrowdStrike', symbol: 'CRWD', sector: 'cybersecurity', sectors: ['cybersecurity'] },
  { name: 'Palo Alto Networks', symbol: 'PANW', sector: 'cybersecurity', sectors: ['cybersecurity'] },
  { name: 'Fortinet', symbol: 'FTNT', sector: 'cybersecurity', sectors: ['cybersecurity'] },
  { name: 'Zscaler', symbol: 'ZS', sector: 'cybersecurity', sectors: ['cybersecurity'] },
  { name: 'Okta', symbol: 'OKTA', sector: 'cybersecurity', sectors: ['cybersecurity'] },
  { name: 'SentinelOne', symbol: 'S', sector: 'cybersecurity', sectors: ['cybersecurity'] },
  { name: 'MercadoLibre', symbol: 'MELI', sector: 'ecommerce', sectors: ['ecommerce'] },
  { name: 'eBay', symbol: 'EBAY', sector: 'ecommerce', sectors: ['ecommerce'] },
  { name: 'Rivian', symbol: 'RIVN', sector: 'ev', sectors: ['ev'] },
  { name: 'Lucid', symbol: 'LCID', sector: 'ev', sectors: ['ev'] },
  { name: 'Snap', symbol: 'SNAP', sector: 'social_ads', sectors: ['social_ads'] },
  { name: 'Pinterest', symbol: 'PINS', sector: 'social_ads', sectors: ['social_ads'] },
  { name: 'The Trade Desk', symbol: 'TTD', sector: 'social_ads', sectors: ['social_ads'] },
  { name: 'Roblox', symbol: 'RBLX', sector: 'gaming', sectors: ['gaming'] },
  { name: 'Electronic Arts', symbol: 'EA', sector: 'gaming', sectors: ['gaming'] },
  { name: 'Take-Two Interactive', symbol: 'TTWO', sector: 'gaming', sectors: ['gaming'] },
  { name: 'Sony', symbol: 'SONY', sector: 'gaming', sectors: ['gaming'] },
  { name: 'Super Micro Computer', symbol: 'SMCI', sector: 'infrastructure', sectors: ['infrastructure'] },
  { name: 'Vertiv', symbol: 'VRT', sector: 'infrastructure', sectors: ['infrastructure'] },
  { name: 'Arista Networks', symbol: 'ANET', sector: 'infrastructure', sectors: ['infrastructure'] },
];

export const TECH_NEWS_SECTORS = [
  'all',
  'ai',
  'semiconductors',
  'software',
  'hardware',
  'cloud',
  'cybersecurity',
  'ecommerce',
  'ev',
  'social_ads',
  'gaming',
  'infrastructure',
] as const;

export type TechNewsSectorFilter = typeof TECH_NEWS_SECTORS[number];
