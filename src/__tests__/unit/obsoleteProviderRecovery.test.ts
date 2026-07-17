import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getTraderMarketCatalog } from '@/lib/trader/marketCatalog';
import { getTraderProviderStatus } from '@/lib/trader/providers/providerStatus';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('obsolete provider recovery', () => {
  it('does not expose the removed OpenBB integration in provider catalogs or status contracts', async () => {
    const catalog = await getTraderMarketCatalog();
    const providerStatus = getTraderProviderStatus();

    expect(Object.keys(catalog.capabilityMatrix)).not.toContain('openbb');
    expect(catalog.diagnostics.summary).not.toHaveProperty('openbbStatus');
    expect(providerStatus.providers).not.toHaveProperty('openbbConfigured');
  });

  it.each([
    'src/lib/trader/marketCatalog.ts',
    'src/lib/trader/marketQuotes.ts',
    'src/lib/trader/marketMetadata.ts',
    'src/lib/trader/providers/types.ts',
    'src/lib/trader/providers/providerStatus.ts',
    'src/trader-app/public/app.js',
  ])('removes obsolete provider copy and runtime branches from %s', path => {
    expect(readSource(path)).not.toMatch(/openbb/i);
  });
});
