import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SUPABASE_PUBLIC_CONFIG_ERROR,
  resolveSupabasePublicConfig,
} from '@/integrations/supabase/environment';
import {
  SUPABASE_PRIVILEGED_CONFIG_ERROR,
  resolveSupabasePrivilegedConfig,
} from '@/lib/server/supabaseEnvironment';

describe('Supabase integration environment compatibility', () => {
  it('prefers the publishable key when both public keys exist', () => {
    expect(resolveSupabasePublicConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://preview.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'legacy-anon-key',
    })).toEqual({ url: 'https://preview.supabase.co', key: 'publishable-key' });
  });

  it('keeps the legacy anon key as a public fallback', () => {
    expect(resolveSupabasePublicConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://preview.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'legacy-anon-key',
    })).toEqual({ url: 'https://preview.supabase.co', key: 'legacy-anon-key' });
  });

  it('prefers the secret key when both privileged keys exist', () => {
    expect(resolveSupabasePrivilegedConfig({
      SUPABASE_URL: 'https://preview.supabase.co',
      NEXT_PUBLIC_SUPABASE_URL: 'https://production.supabase.co',
      SUPABASE_SECRET_KEY: 'secret-key',
      SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role-key',
    })).toEqual({ url: 'https://preview.supabase.co', secretKey: 'secret-key' });
  });

  it('keeps the legacy service-role key as a privileged fallback', () => {
    expect(resolveSupabasePrivilegedConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://preview.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role-key',
    })).toEqual({ url: 'https://preview.supabase.co', secretKey: 'legacy-service-role-key' });
  });

  it('returns null for missing key pairs and exposes only safe variable names in errors', () => {
    expect(resolveSupabasePublicConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://preview.supabase.co' })).toBeNull();
    expect(resolveSupabasePrivilegedConfig({ SUPABASE_URL: 'https://preview.supabase.co' })).toBeNull();
    expect(SUPABASE_PUBLIC_CONFIG_ERROR).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    expect(SUPABASE_PUBLIC_CONFIG_ERROR).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(SUPABASE_PRIVILEGED_CONFIG_ERROR).toContain('SUPABASE_SECRET_KEY');
    expect(SUPABASE_PRIVILEGED_CONFIG_ERROR).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(SUPABASE_PUBLIC_CONFIG_ERROR).not.toContain('publishable-key');
    expect(SUPABASE_PRIVILEGED_CONFIG_ERROR).not.toContain('secret-key');
  });

  it('does not reference server-only keys from the browser client modules', () => {
    const browserFiles = [
      'src/integrations/supabase/client.ts',
      'src/integrations/supabase/environment.ts',
    ].map(file => readFileSync(path.join(process.cwd(), file), 'utf8')).join('\n');

    expect(browserFiles).not.toMatch(/SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|DATABASE_SERVICE_ROLE_KEY/);
  });

  it('keeps the CI contract compatible with both new and legacy key names', () => {
    const workflow = readFileSync(path.join(process.cwd(), '.github/workflows/ci.yml'), 'utf8');

    expect(workflow).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    expect(workflow).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(workflow).toContain('SUPABASE_SECRET_KEY');
    expect(workflow).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(workflow).toContain('public_key="$(trim_whitespace');
    expect(workflow).toContain('secret_key="$(trim_whitespace');
  });
});
