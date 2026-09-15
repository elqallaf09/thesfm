import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260915133000_grant_economic_intelligence_confirmations_access.sql', 'utf8');
const sql = migration.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const original = readFileSync('supabase/migrations/20260914083552_economic_intelligence_confirmations.sql', 'utf8');

describe('economic confirmation privilege repair', () => {
  it('adds only authenticated CRUD access on the existing table', () => {
    expect(sql).toBe('begin; grant select, insert, update, delete on table public.economic_intelligence_confirmations to authenticated; commit;');
  });
  it('retains enabled RLS and all four ownership policies', () => {
    expect(original).toContain('enable row level security');
    for (const command of ['select', 'insert', 'update', 'delete']) {
      expect(original).toContain(`for ${command} to authenticated`);
    }
    expect(original.match(/\(select auth\.uid\(\)\) = user_id/g)).toHaveLength(5);
  });
});
