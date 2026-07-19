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

const timelineTimestampSchema = z.string().datetime({ offset: true });
const analysisIdSchema = z.string().uuid();

export const intelligenceTimelineQuerySchema = z.object({
  symbol: symbolSchema,
  assetType: z.enum(INTELLIGENCE_ASSET_TYPES),
  horizon: z.enum(INTELLIGENCE_HORIZONS).default('SWING'),
  locale: z.enum(['ar', 'en', 'fr']).default('ar'),
  from: timelineTimestampSchema.nullable().optional(),
  to: timelineTimestampSchema.nullable().optional(),
  cursor: timelineTimestampSchema.nullable().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  analysisId: analysisIdSchema.nullable().optional(),
  compareAnalysisId: analysisIdSchema.nullable().optional(),
}).strict().superRefine((value, context) => {
  if (Boolean(value.analysisId) !== Boolean(value.compareAnalysisId)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['compareAnalysisId'], message: 'comparison_requires_two_analysis_ids' });
  }
  if (value.analysisId && value.analysisId === value.compareAnalysisId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['compareAnalysisId'], message: 'comparison_ids_must_differ' });
  }
  if (value.from && value.to) {
    const from = Date.parse(value.from);
    const to = Date.parse(value.to);
    if (to < from) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'timeline_range_order_invalid' });
    } else if (to - from > 730 * 24 * 60 * 60 * 1000) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'timeline_range_too_large' });
    }
  }
});

export const latestIntelligenceOutcomeQuerySchema = z.object({
  symbol: symbolSchema,
  assetType: z.enum(INTELLIGENCE_ASSET_TYPES),
  horizon: z.enum(INTELLIGENCE_HORIZONS).default('SWING'),
  locale: z.enum(['ar', 'en', 'fr']).default('ar'),
}).strict();

export type IntelligenceTimelineQueryInput = z.infer<typeof intelligenceTimelineQuerySchema>;
