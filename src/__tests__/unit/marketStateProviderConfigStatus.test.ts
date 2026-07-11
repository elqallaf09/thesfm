import { afterEach, describe, expect, it } from 'vitest';
import { getProviderConfigurationStatus } from '@/lib/market-state/providerConfigStatus';

const ENV_KEYS = ['FMP_API_KEY', 'FINNHUB_API_KEY', 'TWELVE_DATA_API_KEY', 'EODHD_API_KEY', 'MARKETSTACK_API_KEY', 'TRADING_ECONOMICS_API_KEY', 'NEWS_API_KEY'];
const original: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) original[key] = process.env[key];

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe('getProviderConfigurationStatus', () => {
  it('reports exactly the 7 known env vars, one entry per provider', () => {
    const entries = getProviderConfigurationStatus();
    expect(entries).toHaveLength(7);
    expect(entries.map(entry => entry.envVar).sort()).toEqual([...ENV_KEYS].sort());
  });

  it('never includes the credential value itself — only envVar name, provider id, and a boolean', () => {
    process.env.FMP_API_KEY = 'super-secret-value-should-never-leak';
    const entries = getProviderConfigurationStatus();
    const serialized = JSON.stringify(entries);
    expect(serialized).not.toContain('super-secret-value-should-never-leak');
    const fmpEntry = entries.find(entry => entry.envVar === 'FMP_API_KEY');
    expect(fmpEntry).toEqual({ envVar: 'FMP_API_KEY', provider: 'fmp', configured: true });
  });

  it('reports configured: false when the env var is unset or blank', () => {
    delete process.env.EODHD_API_KEY;
    const entries = getProviderConfigurationStatus();
    expect(entries.find(entry => entry.envVar === 'EODHD_API_KEY')?.configured).toBe(false);
  });
});
