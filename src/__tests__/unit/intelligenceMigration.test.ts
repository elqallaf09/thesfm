import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260718215822_create_intelligence_analyses.sql',
);
const migration = readFileSync(migrationPath, 'utf8').toLowerCase();
const cacheMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260720090000_harden_intelligence_analysis_cache.sql',
), 'utf8').toLowerCase();

describe('intelligence analysis migration security', () => {
  it('creates immutable versioned history fields and supporting indexes', () => {
    expect(migration).toContain('create table public.intelligence_analyses');
    expect(migration).toContain('engine_version text not null');
    expect(migration).toContain('weighting_version text not null');
    expect(migration).toContain('previous_analysis_id uuid references public.intelligence_analyses');
    expect(migration.match(/create index intelligence_analyses_/g)).toHaveLength(4);
  });

  it('forces RLS and never grants anonymous table access', () => {
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('force row level security');
    expect(migration).toContain('revoke all on table public.intelligence_analyses from public, anon, authenticated');
    expect(migration).not.toMatch(/grant\s+select[^;]+\s+to\s+anon/);
  });

  it('separates intentional shared reads from user-owned private reads', () => {
    expect(migration).toContain('using (scope = \'shared\')');
    expect(migration).toContain("scope = 'private' and user_id = (select auth.uid())");
    expect(migration).toContain("(scope = 'shared' and user_id is null)");
    expect(migration).toContain("(scope = 'private' and user_id is not null)");
  });

  it('does not grant client-side inserts or persist a secret-shaped column', () => {
    expect(migration).not.toMatch(/grant\s+insert[^;]+\s+to\s+authenticated/);
    expect(migration).not.toMatch(/\b(api_key|access_token|service_role_key|raw_prompt|password)\b\s+(text|jsonb)/);
  });

  it('adds scoped immutable cache keys without weakening the existing RLS contract', () => {
    expect(cacheMigration).toContain('add column if not exists cache_scope_key text');
    expect(cacheMigration).toContain('add column if not exists cache_key text');
    expect(cacheMigration).toContain('cache_scope_key set not null');
    expect(cacheMigration).toContain('create unique index if not exists intelligence_analyses_cache_key_unique_idx');
    expect(cacheMigration).not.toMatch(/disable row level security|grant\s+.+\s+to\s+(anon|authenticated)|drop policy/);
  });
});
