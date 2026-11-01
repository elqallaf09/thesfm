import { z } from 'zod';
import type { MobileField, MobileResource } from './resourceContract';

function fieldSchema(field: MobileField) {
  if (field.type === 'number') return z.number().finite().min(0).max(field.max ?? 1e15);
  if (field.type === 'boolean') return z.boolean();
  if (field.type === 'currency') return z.string().regex(/^[A-Z]{3}$/);
  if (field.type === 'email') return z.email().max(254);
  if (field.type === 'choice' && field.options?.length) return z.enum(field.options as [string, ...string[]]);
  if (field.type === 'date') return z.iso.date();
  return z.string().trim().min(1).max(field.key === 'notes' ? 4000 : field.key === 'symbol' || field.key === 'provider_symbol' ? 80 : 250);
}

export function recordInputSchema(resource: MobileResource, partial = false) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of resource.fields) {
    const value = fieldSchema(field);
    shape[field.key] = field.required && !partial ? value : value.optional();
  }
  return z.object(shape).strict().refine(value => Object.keys(value).length > 0, 'EMPTY_RECORD');
}

export const recordIdSchema = z.uuid();
const cursorSchema = z.object({ created_at: z.iso.datetime({ offset: true }), id: z.uuid() }).strict();
export function decodeMobileCursor(input: string | null) {
  if (!input) return null;
  if (input.length > 512) throw new Error('INVALID_CURSOR');
  try { return cursorSchema.parse(JSON.parse(Buffer.from(input, 'base64url').toString('utf8'))); }
  catch { throw new Error('INVALID_CURSOR'); }
}
export function encodeMobileCursor(row: { created_at: string; id: string }) {
  return Buffer.from(JSON.stringify({ created_at: row.created_at, id: row.id })).toString('base64url');
}
