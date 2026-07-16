import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const baseline = readFileSync('supabase/migrations/00000000000000_create_base_public_schema.sql', 'utf8');
const migration = readFileSync('supabase/migrations/20260716113325_create_observability_schema.sql', 'utf8');
const supabaseConfig = readFileSync('supabase/config.toml', 'utf8');

describe('Supabase Preview configuration', () => {
  it('uses PostgreSQL 17 without seeds or paid Vector Buckets', () => {
    expect(supabaseConfig).toMatch(/\[db\][\s\S]*?major_version = 17/);
    expect(supabaseConfig).toMatch(/\[db\.seed\][\s\S]*?enabled = false/);
    expect(supabaseConfig).toMatch(/\[storage\.vector\][\s\S]*?enabled = false/);
  });
});

describe('schema-only public baseline migration', () => {
  it('creates exactly the seven required base tables', () => {
    const createdTables = [...baseline.matchAll(/create table if not exists public\.([a-z_]+)/g)].map(
      ([, table]) => table,
    );

    expect(createdTables).toEqual([
      'profiles',
      'expense_items',
      'investment_items',
      'financial_goals',
      'monthly_income_sources',
      'projects',
      'savings_items',
    ]);
  });

  it('is transactional, time-bounded, data-free, and enables RLS immediately', () => {
    expect(baseline.trimStart()).toMatch(/^--[\s\S]*?\nbegin;/);
    expect(baseline.trimEnd()).toMatch(/commit;$/);
    expect(baseline).toContain("set local lock_timeout = '5s'");
    expect(baseline).toContain("set local statement_timeout = '60s'");
    expect(baseline.match(/ enable row level security;/g)).toHaveLength(7);
    expect(baseline).not.toMatch(/^\s*(insert|update|delete|truncate|copy)\b/gim);
    expect(baseline).not.toMatch(/auth\.users\s+(?:values|select)|seed|secret|environment/i);
  });
});

describe('observability storage and retention migration', () => {
  it('is transactional and time-bounded', () => {
    expect(migration.trimStart()).toMatch(/^--[\s\S]*?\nbegin;/);
    expect(migration.trimEnd()).toMatch(/commit;$/);
    expect(migration).toContain("set local lock_timeout = '5s'");
    expect(migration).toContain("set local statement_timeout = '60s'");
  });

  it('enforces RLS and removes browser grants', () => {
    expect(migration).toContain('observability_events enable row level security');
    expect(migration).toContain('revoke all on table public.observability_events from public, anon, authenticated');
    expect(migration).toContain('grant select, insert, delete on table public.observability_events to service_role');
  });

  it('implements bounded raw, rollup, and alert cleanup', () => {
    expect(migration).toContain('cleanup_observability_data');
    expect(migration).toContain("p_raw_days integer default 14");
    expect(migration).toContain("p_rollup_days integer default 180");
    expect(migration).toContain("p_alert_days integer default 90");
    expect(migration).toContain("retention outside approved bounds");
  });

  it('does not read or mutate legacy analytics tables', () => {
    expect(migration).not.toMatch(/site_events|site_sessions/);
  });

  it('creates and cleans up only the four observability tables', () => {
    const createdTables = [...migration.matchAll(/create table if not exists public\.([a-z_]+)/g)].map(
      ([, table]) => table,
    );
    const cleanupBody = migration.match(
      /create or replace function public\.cleanup_observability_data[\s\S]*?\n\$\$;/,
    )?.[0];

    expect(createdTables).toEqual([
      'observability_events',
      'observability_rollups',
      'observability_alerts',
      'observability_error_fingerprints',
    ]);
    expect(cleanupBody).toBeDefined();
    expect(cleanupBody?.match(/delete from public\.observability_[a-z_]+/g)).toEqual([
      'delete from public.observability_events',
      'delete from public.observability_rollups',
      'delete from public.observability_alerts',
      'delete from public.observability_error_fingerprints',
    ]);
  });
});
