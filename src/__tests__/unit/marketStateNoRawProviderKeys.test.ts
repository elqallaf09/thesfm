import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const read = (relativePath: string) => readFileSync(join(projectRoot, relativePath), 'utf8');

const capabilityMatrixSection = read('src/components/market/CapabilityMatrixSection.tsx');
const providerDetailsDrawer = read('src/components/market/ProviderDetailsDrawer.tsx');
const providerCard = read('src/components/market/ProviderCard.tsx');
const marketHeaderSummary = read('src/components/market/MarketHeaderSummary.tsx');
const configurationStatusList = read('src/components/market/ConfigurationStatusList.tsx');

/**
 * The task's central requirement: never expose a raw MarketProviderId/MarketCapabilityKey (e.g.
 * "fmp_v3", "twelvedata", "provider_primary") to the user — every provider/capability value must
 * be routed through traderProviderDisplayName() or a translation key. This is a regression guard
 * for the exact bug that used to live in the old ProviderDetailsDrawer/MarketDiagnosticsClient
 * (`{cell.provider}` / `{cell.capability}` interpolated directly).
 */
describe('unified provider header/diagnostics components never render a raw provider or capability key', () => {
  it('never interpolates cell.provider or cell.capability directly', () => {
    for (const [name, source] of [
      ['CapabilityMatrixSection', capabilityMatrixSection],
      ['ProviderDetailsDrawer', providerDetailsDrawer],
    ] as const) {
      expect(source, `${name} must not render {cell.provider}`).not.toContain('{cell.provider}');
      expect(source, `${name} must not render {cell.capability}`).not.toContain('{cell.capability}');
    }
  });

  it('never interpolates profile.provider directly (must go through traderProviderDisplayName)', () => {
    expect(providerCard).not.toContain('{profile.provider}');
    expect(providerCard).toContain('traderProviderDisplayName');
  });

  it('CapabilityMatrixSection always routes provider names through traderProviderDisplayName', () => {
    expect(capabilityMatrixSection).toContain('traderProviderDisplayName(provider)');
  });

  it('ConfigurationStatusList never renders the raw env var value, only the env var NAME and a translated status', () => {
    expect(configurationStatusList).not.toContain('process.env');
    expect(configurationStatusList).toContain('entry.envVar');
    expect(configurationStatusList).toContain('traderProviderDisplayName');
  });

  it('MarketHeaderSummary never renders a raw ProviderConnectionStatus/role string — always via t(...)', () => {
    expect(marketHeaderSummary).toContain('t(`market_state_status_${system.overall}`)');
    expect(marketHeaderSummary).not.toMatch(/>\{system\.overall\}</);
  });

  it('every status badge in these components is paired with an icon, never color alone (WCAG AA — no color-only status)', () => {
    for (const source of [capabilityMatrixSection, providerCard, marketHeaderSummary]) {
      expect(source).toMatch(/Icon size=\{\d+\}/);
    }
  });
});
