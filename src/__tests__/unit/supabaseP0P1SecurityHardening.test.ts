import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260717212305_phase_5_0d_p0_p1_security_hardening.sql',
  ),
  'utf8',
);

describe('Phase 5.0D P0/P1 Supabase hardening', () => {
  it.each(['handle_new_user', 'sync_profile_email_from_auth'])(
    'keeps %s trigger-only and removes direct client execution',
    (functionName) => {
      expect(migration).toMatch(
        new RegExp(
          `create or replace function public\\.${functionName}\\(\\)[\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`,
          'i',
        ),
      );
      expect(migration).toMatch(
        new RegExp(
          `revoke all privileges on function public\\.${functionName}\\(\\)[\\s\\S]*?from public, anon, authenticated, service_role`,
          'i',
        ),
      );
    },
  );

  it('limits avatar SELECT to the authenticated user folder', () => {
    expect(migration).toMatch(
      /drop policy "Authenticated users can read avatars" on storage\.objects/i,
    );
    expect(migration).toMatch(
      /create policy "Users can read own avatar objects"[\s\S]*?bucket_id = 'avatars'[\s\S]*?\(select auth\.uid\(\)\)::text = \(storage\.foldername\(name\)\)\[1\]/i,
    );
    expect(migration).not.toMatch(
      /create policy "Authenticated users can read avatars"[\s\S]*?using \(bucket_id = 'avatars'\)/i,
    );
  });

  it('moves the admin authorization boundary outside the exposed public schema', () => {
    expect(migration).toContain('create schema app_private;');
    expect(migration).toMatch(
      /create function app_private\.is_current_user_admin_role[\s\S]*?security definer[\s\S]*?set search_path = ''/i,
    );
    expect(migration).toMatch(
      /grant execute on function app_private\.is_current_user_admin_role\(text\)[\s\S]*?to authenticated, service_role/i,
    );
    expect(migration).toMatch(
      /revoke all privileges on function public\.is_current_user_admin_role\(text\)[\s\S]*?from public, anon, authenticated, service_role/i,
    );
    expect(migration.match(/app_private\.is_current_user_admin_role\('super_admin'\)/g)).toHaveLength(6);
  });

  it('does not include P2/P3 or observability remediation', () => {
    expect(migration).not.toMatch(/\b(create|drop)\s+index\b/i);
    expect(migration).not.toMatch(/^\s*(delete\s+from|truncate)\b/im);
    expect(migration).not.toContain('observability_events');
    expect(migration).not.toContain('auth_rls_initplan');
    expect(migration).not.toContain('unindexed_foreign_keys');
    expect(migration).not.toContain('unused_index');
  });
});
