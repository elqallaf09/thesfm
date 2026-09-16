import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260916130053_revoke_economic_intelligence_truncate.sql', 'utf8');
const statements = migration.replace(/--[^\n]*/g, '');
const sql = statements.replace(/\s+/g, ' ').trim().toLowerCase();

describe('economic intelligence whole-table privilege hardening', () => {
  it('scopes the migration to the three established user-owned tables', () => {
    expect(sql.match(/'public\.[a-z_]+'::regclass/g)).toEqual([
      "'public.user_decisions'::regclass",
      "'public.notifications'::regclass",
      "'public.economic_intelligence_confirmations'::regclass",
    ]);
  });

  it('revokes only TRUNCATE from application roles and PUBLIC', () => {
    expect(sql.match(/execute format\('[^']+'/g)).toEqual([
      "execute format('revoke truncate on table %s from anon, authenticated, public'",
    ]);
    expect(sql).not.toContain('cascade');
  });

  it('requires existing RLS without replacing ownership policies', () => {
    expect(sql).toContain('if not (select relrowsecurity from pg_class where oid = target_table) then');
    expect(sql).toContain("raise exception 'rls must already be enabled on %'");
    expect(sql).not.toMatch(/(?:create|alter|drop) policy/);
  });

  it('checks effective denial for both API roles in the database', () => {
    expect(sql).toContain("foreach caller_role in array array['anon', 'authenticated'] loop");
    expect(sql).toContain("if has_table_privilege(caller_role, target_table, 'truncate') then");
    expect(sql).toContain("raise exception 'role % still has truncate on %'");
  });

  it('compares all non-TRUNCATE privileges before and after the revoke', () => {
    expect(sql.match(/array\['select', 'insert', 'update', 'delete', 'references', 'trigger'\]/g)).toHaveLength(2);
    expect(sql.match(/array\['anon', 'authenticated', 'service_role'\]/g)).toHaveLength(2);
    expect(sql).toContain('if before_privileges is distinct from after_privileges then');
  });

  it('preserves the service role administrative privilege', () => {
    expect(sql).toContain("service_truncate_before := has_table_privilege('service_role', target_table, 'truncate')");
    expect(sql).toContain("if service_truncate_before is distinct from has_table_privilege('service_role', target_table, 'truncate') then");
  });

  it('uses one atomic guarded statement without executing destructive row operations', () => {
    expect(sql.startsWith('do $guard$')).toBe(true);
    expect(sql.endsWith('end; $guard$;')).toBe(true);
    expect(statements).not.toMatch(/^\s*(?:truncate|delete|insert|update|drop|alter|grant)\b/im);
    expect(sql).not.toContain('exception when');
  });
});
