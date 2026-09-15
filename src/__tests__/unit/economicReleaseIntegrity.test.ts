import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isCronApiPath, isProtectedApiPath } from '@/lib/auth/accessPolicy';

const migrationsPath = resolve(process.cwd(), 'supabase/migrations');
const economicMigrations = [
  '20260914083512_economic_intelligence_event_identity.sql',
  '20260914083531_economic_intelligence_event_outcomes.sql',
  '20260914083552_economic_intelligence_confirmations.sql',
] as const;

describe('Economic Intelligence release integrity', () => {
  it('gives every migration a unique version, including legacy numeric versions', () => {
    const files = readdirSync(migrationsPath).filter(file => file.endsWith('.sql')).sort();
    const byVersion = new Map<string, string[]>();
    for (const file of files) {
      const version = /^(\d+)_/.exec(file)?.[1];
      if (!version) throw new Error(`Migration has no numeric version: ${file}`);
      byVersion.set(version, [...(byVersion.get(version) ?? []), file]);
    }
    const collisions = [...byVersion.entries()].filter(([, names]) => names.length > 1);
    expect(collisions).toEqual([]);
  });

  it('uses the three Economic Intelligence versions recorded in deployed migration history', () => {
    const files = readdirSync(migrationsPath);
    for (const file of economicMigrations) expect(files).toContain(file);
    expect(files).not.toContain('047_notifications_event_key.sql');
    expect(files).not.toContain('048_economic_intelligence_event_outcomes.sql');
    expect(files).not.toContain('20260914090000_economic_intelligence_confirmations.sql');
  });

  it('does not reconstruct a read notification as a user action on a clean database', () => {
    const sql = readFileSync(resolve(migrationsPath, economicMigrations[1]), 'utf8');
    expect(sql).toContain('new.opened_at :=');
    expect(sql).not.toMatch(/new\.actioned_at\s*:=/i);
    expect(sql).toContain('security invoker');
    expect(sql).toContain('set search_path = pg_catalog, public');
  });

  it.each([
    '/api/economic-intelligence',
    '/api/economic-intelligence/event-outcomes',
    '/api/economic-intelligence/provenance',
    '/api/market/shariah',
    '/api/market/shariah/refresh',
  ])('preserves session protection for %s after merging main', pathname => {
    expect(isProtectedApiPath(pathname)).toBe(true);
  });

  it('keeps scheduler exemptions exact and separate from personal intelligence', () => {
    expect(isCronApiPath('/api/market/shariah/refresh')).toBe(true);
    expect(isCronApiPath('/api/market/signals/refresh')).toBe(true);
    expect(isCronApiPath('/api/market/shariah/refresh/extra')).toBe(false);
    expect(isCronApiPath('/api/economic-intelligence/event-outcomes')).toBe(false);
    expect(isProtectedApiPath('/api/sharia-stocks/screening')).toBe(false);
    expect(isProtectedApiPath('/api/economic-intelligence-public')).toBe(false);
  });
});
