import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SearchRequestSchema } from '@/lib/sharia-research/apiSchemas';

describe('Sharia research API and database contracts', () => {
  it('accepts supported search identifiers and rejects unexpected request fields', () => {
    expect(SearchRequestSchema.safeParse({ query: 'إنفيديا' }).success).toBe(true);
    expect(SearchRequestSchema.safeParse({ query: 'NVDA' }).success).toBe(true);
    expect(SearchRequestSchema.safeParse({ query: 'US67066G1040' }).success).toBe(true);
    expect(SearchRequestSchema.safeParse({ query: 'NVDA', classification: 'compliant' }).success).toBe(false);
  });

  it('creates all research tables with RLS and ownership predicates', () => {
    const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260710000013_create_sharia_research_system.sql'), 'utf8');
    for (const table of [
      'sharia_research_jobs', 'sharia_security_identities', 'sharia_source_documents', 'sharia_evidence_items',
      'sharia_financial_values', 'sharia_screening_results', 'sharia_methodologies', 'sharia_search_history',
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain('using ((select auth.uid()) = user_id)');
    expect(migration).toContain("classification in ('compliant', 'non_compliant', 'requires_review', 'insufficient_current_data', 'conflicting_evidence')");
  });
});
