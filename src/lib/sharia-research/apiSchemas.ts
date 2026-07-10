import { z } from 'zod';
import { SHARIA_CLASSIFICATIONS } from './types';

export const SearchRequestSchema = z.object({
  query: z.string().trim().min(1).max(160),
  methodologyId: z.string().trim().min(1).max(120).optional(),
  selectedCanonicalId: z.string().trim().min(1).max(220).optional(),
  forceRefresh: z.boolean().optional().default(false),
}).strict();

export const ManualSourceRequestSchema = z.object({
  jobId: z.string().uuid(),
  url: z.string().url().max(2_048),
}).strict();

export const RefreshRequestSchema = z.object({
  force: z.literal(true).optional().default(true),
}).strict();

export const ClassificationSchema = z.enum(SHARIA_CLASSIFICATIONS);

export function zodErrorDetails(error: z.ZodError) {
  return error.issues.map(issue => ({ path: issue.path.join('.'), code: issue.code, message: issue.message }));
}
