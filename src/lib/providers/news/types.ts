import type { ProviderApiResponse } from '../shared';

export type MarketNewsProviderName = 'finnhub';
export type MarketNewsScope = 'general' | 'asset';

export type MarketNewsQuery = {
  scope: MarketNewsScope;
  symbol?: string | null;
  from: string;
  to: string;
  limit: number;
  force?: boolean;
};

export type MarketNewsArticle = {
  id: string;
  headline: string;
  summary: string | null;
  source: string;
  sourceUrl: string;
  imageUrl: string | null;
  publishedAt: string;
  category: string | null;
  relatedSymbols: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sentimentSource: 'provider' | 'ai' | null;
  provider: 'finnhub';
};

export type MarketNewsResponse = ProviderApiResponse<MarketNewsArticle[]>;

export interface MarketNewsProvider {
  provider: MarketNewsProviderName;
  getArticles(query: MarketNewsQuery): Promise<MarketNewsArticle[]>;
}
