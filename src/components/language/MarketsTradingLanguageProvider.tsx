'use client';

import { LanguageProvider } from '@/components/LanguageProvider';
import { MARKETS_TRADING_TRANSLATIONS } from '@/lib/translations/bundles/marketsTrading';

export function MarketsTradingLanguageProvider({ children }: { children: React.ReactNode }) {
  return <LanguageProvider translations={MARKETS_TRADING_TRANSLATIONS}>{children}</LanguageProvider>;
}
