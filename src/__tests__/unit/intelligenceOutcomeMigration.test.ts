import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260719083438_create_intelligence_analysis_outcomes.sql',
);
const migration = readFileSync(migrationPath, 'utf8').toLowerCase();

describe('intelligence outcome migration security', () => {
  it('creates a one-to-one, versioned outcome record with price and methodology provenance', () => {
    expect(migration).toContain('create table public.intelligence_analysis_outcomes');
    expect(migration).toMatch(/analysis_id uuid not null unique references public\.intelligence_analyses/);
    expect(migration).toContain('evaluation_window_start timestamptz not null');
    expect(migration).toContain('original_engine_version text not null');
    expect(migration).toContain('original_weighting_version text not null');
    expect(migration).toContain('confidence_bucket text not null');
    expect(migration).toContain('provider_provenance jsonb not null');
    expect(migration).toContain('methodology_snapshot jsonb not null');
    expect(migration.match(/create index intelligence_analysis_outcomes_/g)).toHaveLength(3);
  });

  it('enforces RLS, excludes anonymous access, and allows only service writes', () => {
    expect(migration).toContain('alter table public.intelligence_analysis_outcomes enable row level security');
    expect(migration).toContain('alter table public.intelligence_analysis_outcomes force row level security');
    expect(migration).toContain('revoke all on table public.intelligence_analysis_outcomes from public, anon, authenticated');
    expect(migration).toContain('grant select on table public.intelligence_analysis_outcomes to authenticated');
    expect(migration).toContain('grant select, insert, update, delete on table public.intelligence_analysis_outcomes to service_role');
    expect(migration).not.toMatch(/grant\s+(?:select,\s*)?(?:insert|update|delete)[^;]+to\s+authenticated/);
    expect(migration).toContain('from public.intelligence_analyses analysis');
    expect(migration).toContain("analysis.scope = 'shared'");
    expect(migration).toContain("analysis.scope = 'private' and analysis.user_id = (select auth.uid())");
    expect(migration).toContain('create function public.validate_intelligence_analysis_outcome_parent()');
    expect(migration).toContain('intelligence outcome must match immutable parent analysis provenance');
    expect(migration).toContain('before insert on public.intelligence_analysis_outcomes');
  });

  it('permits only a pending-to-terminal transition and prohibits normal deletion', () => {
    expect(migration).toContain('create function public.enforce_intelligence_analysis_outcome_immutability()');
    expect(migration).toContain("if old.evaluation_status <> 'pending' then");
    expect(migration).toContain("new.evaluation_status not in ('evaluated', 'insufficient_data', 'invalidated', 'failed')");
    expect(migration).toContain('before update or delete on public.intelligence_analysis_outcomes');
    expect(migration).toContain("raise exception 'intelligence analysis outcomes are immutable'");
    expect(migration).toContain('revoke all on function public.enforce_intelligence_analysis_outcome_immutability() from public, anon, authenticated');
  });
});
