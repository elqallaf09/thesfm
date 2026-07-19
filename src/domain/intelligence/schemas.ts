import { z } from 'zod';
import {
  INTELLIGENCE_ASSET_TYPES,
  INTELLIGENCE_FACTOR_KEYS,
  INTELLIGENCE_HORIZONS,
} from './contracts';

const symbolSchema = z.string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9.^=:_/-]+$/, 'invalid_symbol')
  .refine(value => !value.includes('://') && !value.includes('//'), 'invalid_symbol');

export const analyzeIntelligenceInputSchema = z.object({
  asset: z.object({
    symbol: symbolSchema,
    assetType: z.enum(INTELLIGENCE_ASSET_TYPES),
    exchange: z.string().trim().min(1).max(40).nullable().optional(),
    market: z.string().trim().min(1).max(40).nullable().optional(),
    quoteCurrency: z.string().trim().regex(/^[A-Za-z]{3,8}$/).nullable().optional(),
  }).strict(),
  horizon: z.enum(INTELLIGENCE_HORIZONS).default('SWING'),
  locale: z.enum(['ar', 'en', 'fr']).default('ar'),
  requestedModules: z.array(z.enum(INTELLIGENCE_FACTOR_KEYS)).max(INTELLIGENCE_FACTOR_KEYS.length).optional(),
  source: z.enum(['SMART_MARKET_ANALYSIS', 'PUBLIC_API']).default('PUBLIC_API'),
  forceRefresh: z.boolean().default(false),
}).strict();

export type AnalyzeIntelligenceInput = z.infer<typeof analyzeIntelligenceInputSchema>;

export const latestIntelligenceQuerySchema = z.object({
  symbol: symbolSchema,
  assetType: z.enum(INTELLIGENCE_ASSET_TYPES),
  horizon: z.enum(INTELLIGENCE_HORIZONS).default('SWING'),
  locale: z.enum(['ar', 'en', 'fr']).default('ar'),
}).strict();
