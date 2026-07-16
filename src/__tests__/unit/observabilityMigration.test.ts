import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260716113325_production_observability_rum.sql', 'utf8');

describe('observability storage and retention migration', () => {
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

  it('remediates raw identity, title, and referrer retention in legacy analytics', () => {
    expect(migration).toContain('set user_id = null');
    expect(migration).toContain('page_title = null');
    expect(migration).toContain('referrer = null');
  });
});
