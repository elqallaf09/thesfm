import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('SFM observation migration privilege boundary', () => {
  it('is append-only for service role and closed to browser roles', () => {
    const sql = readFileSync('supabase/migrations/20260917044000_create_sfm_market_observations.sql', 'utf8')
      .replace(/--[^\n]*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    expect(sql).toContain('alter table public.sfm_market_observations enable row level security');
    expect(sql).toContain('alter table public.sfm_market_observations force row level security');
    expect(sql).toContain('revoke all on table public.sfm_market_observations from public, anon, authenticated');
    expect(sql).toContain('revoke update, delete, truncate on table public.sfm_market_observations from service_role');
    expect(sql).toContain('grant select, insert on table public.sfm_market_observations to service_role');
  });
});
