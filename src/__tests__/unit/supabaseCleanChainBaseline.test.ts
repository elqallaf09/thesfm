import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDirectory = join(process.cwd(), 'supabase/migrations');
const migrations = readdirSync(migrationsDirectory)
  .filter((name) => name.endsWith('.sql'))
  .sort();
const baselineName = '00000000000000_create_base_public_schema.sql';
const baseline = readFileSync(join(migrationsDirectory, baselineName), 'utf8');

const legacyTables = [
  'profiles',
  'expense_items',
  'investment_items',
  'financial_goals',
  'monthly_income_sources',
  'projects',
  'savings_items',
  'events',
  'financial_profiles',
  'holdings',
  'orders',
  'page_views',
  'savings',
] as const;

describe('Supabase clean-chain baseline', () => {
  it('is the first migration in the repository', () => {
    expect(migrations[0]).toBe(baselineName);
  });

  it('creates every public table that predates the numbered migrations', () => {
    for (const table of legacyTables) {
      expect(baseline).toContain(`create table if not exists public.${table} (`);
      expect(baseline).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it('is data-free and does not weaken ownership controls', () => {
    expect(baseline).not.toMatch(
      /^\s*(insert\s+into|update\s+[^;]+|delete\s+from|truncate)\b/im,
    );
    expect(baseline).not.toMatch(/using\s*\(\s*true\s*\)/i);
    expect(baseline).not.toMatch(/with\s+check\s*\(\s*true\s*\)/i);
  });

  it('keeps the analytics helper server-only', () => {
    expect(baseline).toContain('security definer');
    expect(baseline).toContain('set search_path = public');
    expect(baseline).toMatch(
      /revoke execute on function public\.get_site_analytics\(\) from public, anon, authenticated;/i,
    );
    expect(baseline).toMatch(
      /grant execute on function public\.get_site_analytics\(\) to service_role;/i,
    );
  });
});
