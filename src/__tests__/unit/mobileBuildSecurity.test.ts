import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
const require = createRequire(import.meta.url);
const { validateMobileConfig } = require('../../../apps/expo-go/build-security.cjs');
const anon = `header.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.signature`;
const base = { apiBaseUrl: 'https://www.the-sfm.com', supabaseUrl: 'https://test.supabase.co', supabaseAnonKey: anon };
afterEach(() => { vi.unstubAllEnvs(); });
describe('mobile build credential boundary', () => {
  it('allows public keys and HTTPS origins', () => {
    expect(() => validateMobileConfig(base)).not.toThrow();
    expect(() => validateMobileConfig({ ...base, supabaseAnonKey: 'sb_publishable_test' })).not.toThrow();
  });
  it('rejects server secrets without echoing their values', () => {
    for (const key of ['sb_secret_do-not-print', `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.private`, 'unknown-secret']) {
      expect(() => validateMobileConfig({ ...base, supabaseAnonKey: key })).toThrow('publishable or anon');
      try { validateMobileConfig({ ...base, supabaseAnonKey: key }); } catch (error) { expect(String(error)).not.toContain(key); }
    }
  });
  it('rejects insecure origins and credentials or tokens embedded in URLs', () => {
    for (const url of ['http://example.com', 'https://user:password@example.com', 'https://example.com?token=private', 'https://example.com/#private', 'https://example.com/auth']) {
      expect(() => validateMobileConfig({ ...base, supabaseUrl: url })).toThrow('HTTPS origin');
      expect(() => validateMobileConfig({ ...base, apiBaseUrl: url })).toThrow('HTTPS origin');
    }
  });
  it.each(['finance', 'investor', 'business'])('keeps %s package, product and storage restrictions independent', product => {
    vi.stubEnv('SFM_PRODUCT', product);
    vi.stubEnv('EXPO_PUBLIC_SFM_SUPABASE_URL', base.supabaseUrl);
    vi.stubEnv('EXPO_PUBLIC_SFM_SUPABASE_ANON_KEY', anon);
    vi.stubEnv('EXPO_PUBLIC_SFM_API_BASE_URL', base.apiBaseUrl);
    const configPath = require.resolve('../../../apps/expo-go/app.config.js');
    delete require.cache[configPath];
    const { expo } = require(configPath);
    expect(expo.extra.sfmProduct).toBe(product);
    expect(expo.android.package).toBe(`com.thesfm.${product}`);
    expect(expo.ios.bundleIdentifier).toBe(`com.thesfm.${product}`);
    expect(expo.android.allowBackup).toBe(false);
    expect(expo.android.blockedPermissions).toEqual(expect.arrayContaining(['android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE']));
    expect(expo.orientation).toBe('default');
  });

});
