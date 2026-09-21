import { z } from 'zod';
export const integrationSnapshotSchema=z.object({
 source:z.enum(['mt5','ibkr','bank','wallet','custom']),externalId:z.string().trim().min(1).max(100),
 observedAt:z.string().datetime({offset:true}).refine(value=>Date.parse(value)<=Date.now()+300000),
 currency:z.string().regex(/^[A-Z]{3}$/),balance:z.number().finite().min(-1e12).max(1e12).nullable(),equity:z.number().finite().min(-1e12).max(1e12).nullable(),
 positions:z.array(z.object({symbol:z.string().min(1).max(80),quantity:z.number().finite().min(-1e9).max(1e9),value:z.number().finite().min(-1e12).max(1e12).nullable(),currency:z.string().regex(/^[A-Z]{3}$/)}).strict()).max(500),
}).strict();
