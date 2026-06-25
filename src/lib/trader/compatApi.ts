import type { TraderStatus } from '@/lib/trader/types';

export type TraderMarketCategory = {
  id: string;
  labelAr: string;
  labelEn: string;
  countryCode: string | null;
  currency: string;
  kind: 'market' | 'asset-class' | 'theme';
};

export const TRADER_MARKET_CATEGORIES: TraderMarketCategory[] = [
  { id: 'forex', labelAr: 'الفوركس', labelEn: 'Forex', countryCode: 'FX', currency: 'PAIR', kind: 'asset-class' },
  { id: 'us-stocks', labelAr: 'الأسهم الأمريكية', labelEn: 'US Stocks', countryCode: 'US', currency: 'USD', kind: 'market' },
  { id: 'crypto', labelAr: 'العملات الرقمية', labelEn: 'Crypto', countryCode: null, currency: 'USD', kind: 'asset-class' },
  { id: 'commodities', labelAr: 'السلع', labelEn: 'Commodities', countryCode: null, currency: 'USD', kind: 'asset-class' },
  { id: 'saudi', labelAr: 'السوق السعودي', labelEn: 'Saudi Market', countryCode: 'SA', currency: 'SAR', kind: 'market' },
  { id: 'kuwait', labelAr: 'بورصة الكويت', labelEn: 'Kuwait Market', countryCode: 'KW', currency: 'KWD', kind: 'market' },
  { id: 'uae', labelAr: 'السوق الإماراتي', labelEn: 'UAE Market', countryCode: 'AE', currency: 'AED', kind: 'market' },
  { id: 'qatar', labelAr: 'السوق القطري', labelEn: 'Qatar Market', countryCode: 'QA', currency: 'QAR', kind: 'market' },
  { id: 'bahrain', labelAr: 'السوق البحريني', labelEn: 'Bahrain Market', countryCode: 'BH', currency: 'BHD', kind: 'market' },
  { id: 'oman', labelAr: 'السوق العماني', labelEn: 'Oman Market', countryCode: 'OM', currency: 'OMR', kind: 'market' },
  { id: 'european-stocks', labelAr: 'الأسهم الأوروبية', labelEn: 'European Stocks', countryCode: 'EU', currency: 'EUR', kind: 'market' },
  { id: 'asian-stocks', labelAr: 'الأسهم الآسيوية', labelEn: 'Asian Stocks', countryCode: 'ASIA', currency: 'MIXED', kind: 'market' },
  { id: 'technology-stocks', labelAr: 'أسهم التقنية', labelEn: 'Technology Stocks', countryCode: 'US', currency: 'USD', kind: 'theme' },
  { id: 'food-stocks', labelAr: 'الأسهم الغذائية', labelEn: 'Food / Consumer Staples', countryCode: 'US', currency: 'USD', kind: 'theme' },
  { id: 'pharma-stocks', labelAr: 'الأسهم الدوائية', labelEn: 'Pharmaceutical / Healthcare', countryCode: 'US', currency: 'USD', kind: 'theme' },
  { id: 'banking-stocks', labelAr: 'أسهم البنوك', labelEn: 'Banking Stocks', countryCode: 'US', currency: 'USD', kind: 'theme' },
  { id: 'energy-stocks', labelAr: 'أسهم الطاقة', labelEn: 'Energy Stocks', countryCode: 'US', currency: 'USD', kind: 'theme' },
  { id: 'ai-stocks', labelAr: 'أسهم الذكاء الاصطناعي', labelEn: 'AI Stocks', countryCode: 'US', currency: 'USD', kind: 'theme' },
  { id: 'semiconductors', labelAr: 'أسهم أشباه الموصلات', labelEn: 'Semiconductor Stocks', countryCode: 'US', currency: 'USD', kind: 'theme' },
];

export type TraderHealthPayload = {
  status: 'ok' | 'degraded' | 'unavailable';
  marketData: 'available' | 'unavailable';
  recommendations: 'available' | 'unavailable';
  scanner: 'available' | 'unavailable';
  lastSuccessfulUpdate: string | null;
};

export function buildTraderHealthPayload(status: TraderStatus): TraderHealthPayload {
  const scannerFresh = Boolean(status.scanner.lastScanCompletedAt && !status.scanner.lastErrorCode);
  const marketDataAvailable = status.marketData.connected;
  const recommendationsAvailable = scannerFresh && status.scanner.generatedSignals > 0;
  const availableCount = [marketDataAvailable, recommendationsAvailable, scannerFresh].filter(Boolean).length;

  return {
    status: availableCount === 3 ? 'ok' : availableCount > 0 ? 'degraded' : 'unavailable',
    marketData: marketDataAvailable ? 'available' : 'unavailable',
    recommendations: recommendationsAvailable ? 'available' : 'unavailable',
    scanner: scannerFresh ? 'available' : 'unavailable',
    lastSuccessfulUpdate: status.marketData.lastSuccessfulUpdate || status.scanner.lastScanCompletedAt,
  };
}

export function normalizeTraderCompatPath(parts: string[]) {
  const clean = parts.map((part) => part.trim()).filter(Boolean);
  return clean[0] === 'trader' ? clean.slice(1) : clean;
}
