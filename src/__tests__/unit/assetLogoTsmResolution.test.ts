import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  canonicalAssetTicker,
  getAssetVisualMeta,
  resolveAssetLogoUrl,
} from '@/lib/assetVisuals';

const projectRoot = process.cwd();
const assetAvatarSource = readFileSync(join(projectRoot, 'src/components/asset/AssetAvatar.tsx'), 'utf8');
const platformIdentitySource = readFileSync(join(projectRoot, 'src/components/invest/PlatformIdentity.tsx'), 'utf8');
const investmentRowSource = readFileSync(join(projectRoot, 'src/components/invest/InvestmentRow.tsx'), 'utf8');

const TSMC_LOGO_URL = 'https://www.google.com/s2/favicons?domain_url=https://www.tsmc.com&sz=128';

const TSM_ALIAS_INPUTS: Array<{ label: string; input: Parameters<typeof resolveAssetLogoUrl>[0] }> = [
  { label: 'ticker TSM', input: { symbol: 'TSM' } },
  { label: 'ticker TSMC', input: { symbol: 'TSMC' } },
  { label: 'display name only: Taiwan Semiconductor Manufacturing', input: { name: 'Taiwan Semiconductor Manufacturing' } },
  { label: 'display name only: Taiwan Semiconductor Manufacturing Co. Ltd.', input: { companyName: 'Taiwan Semiconductor Manufacturing Co. Ltd.' } },
  { label: 'display name only: Taiwan Semiconductor Manufacturing Co. Ltd. ADR', input: { name: 'Taiwan Semiconductor Manufacturing Co. Ltd. ADR' } },
  { label: 'ticker with ADR suffix: TSM ADR', input: { symbol: 'TSM ADR' } },
  { label: 'ticker with dotted ADR suffix: TSM.ADR', input: { symbol: 'TSM.ADR' } },
  { label: 'ticker with hyphenated ADS suffix: TSM-ADS', input: { symbol: 'TSM-ADS' } },
  { label: 'lowercase ticker with ADR suffix: tsm adr', input: { symbol: 'tsm adr' } },
];

describe('TSM / TSMC asset logo resolution', () => {
  it('resolves ticker TSM to the verified TSMC logo instead of the generic fallback', () => {
    expect(resolveAssetLogoUrl({ symbol: 'TSM' })).toBe(TSMC_LOGO_URL);
    // The verified mapping must win over the generic image-stock guess.
    expect(resolveAssetLogoUrl({ symbol: 'TSM' })).not.toContain('image-stock');
  });

  it('resolves every canonical identity variant to the same verified logo', () => {
    for (const { label, input } of TSM_ALIAS_INPUTS) {
      expect(resolveAssetLogoUrl(input), label).toBe(TSMC_LOGO_URL);
      expect(canonicalAssetTicker(input), label).toBe('TSM');
    }
  });

  it('produces one consistent asset-visual meta record for every alias, with no generic fallback', () => {
    const metas = TSM_ALIAS_INPUTS.map(({ input }) => getAssetVisualMeta(input));
    for (const meta of metas) {
      expect(meta.symbol).toBe('TSM');
      expect(meta.logoUrl).toBe(TSMC_LOGO_URL);
      expect(meta.assetType).toBe('stock');
      expect(meta.fallbackText).toBe('TSM');
    }
  });

  it('keeps a full display name intact for the label even though the logo resolves by ticker', () => {
    const meta = getAssetVisualMeta({
      symbol: 'TSM',
      companyName: 'Taiwan Semiconductor Manufacturing Co. Ltd. ADR',
    });
    expect(meta.label).toBe('Taiwan Semiconductor Manufacturing Co. Ltd. ADR');
    expect(meta.logoUrl).toBe(TSMC_LOGO_URL);
  });
});

describe('ADR aliasing does not break other tickers (requirement: check all ADR holdings)', () => {
  it('strips ADR/ADS suffixes generically so any ticker still matches its verified logo', () => {
    expect(resolveAssetLogoUrl({ symbol: 'NVDA' })).toBe(resolveAssetLogoUrl({ symbol: 'NVDA ADR' }));
    expect(resolveAssetLogoUrl({ symbol: 'NVDA' })).toBe(resolveAssetLogoUrl({ symbol: 'NVDA.ADS' }));
    expect(resolveAssetLogoUrl({ symbol: 'AMD' })).toBe(resolveAssetLogoUrl({ symbol: 'AMD-ADR' }));
  });

  it('still resolves plain single-listing tickers unaffected by the ADR alias rules', () => {
    expect(canonicalAssetTicker({ symbol: 'AAPL' })).toBe('AAPL');
    expect(canonicalAssetTicker({ symbol: 'NVDA' })).toBe('NVDA');
  });
});

describe('Ticker identity takes priority over display name (resolve by ticker/market, not full name)', () => {
  it('lets an explicit ticker win even when the display name would otherwise match a different alias', () => {
    const meta = getAssetVisualMeta({ symbol: 'NVDA', name: 'Taiwan Semiconductor Manufacturing Co. Ltd. ADR' });
    expect(meta.symbol).toBe('NVDA');
    expect(meta.logoUrl).not.toBe(TSMC_LOGO_URL);
  });

  it('only falls back to a name alias when no ticker-shaped symbol is present', () => {
    expect(canonicalAssetTicker({ symbol: '', name: 'Taiwan Semiconductor Manufacturing' })).toBe('TSM');
    expect(canonicalAssetTicker({ symbol: undefined, companyName: 'TSMC' })).toBe('TSM');
  });
});

describe('Safe fallback behavior is preserved when no verified logo exists', () => {
  it('still returns a best-effort guess for an unmapped stock-like ticker', () => {
    expect(resolveAssetLogoUrl({ symbol: 'ZZZZ' })).toBe('https://financialmodelingprep.com/image-stock/ZZZZ.png');
  });

  it('returns null (fallback icon only) for non-ticker-shaped or unsupported input', () => {
    expect(resolveAssetLogoUrl({ symbol: '', name: '' })).toBeNull();
    expect(resolveAssetLogoUrl({ symbol: 'CASH', assetType: 'cash' })).toBeNull();
  });

  it('rejects unsafe explicit logo URLs instead of rendering them', () => {
    expect(resolveAssetLogoUrl({ symbol: 'TSM', logoUrl: 'javascript:alert(1)' })).toBe(TSMC_LOGO_URL);
    expect(resolveAssetLogoUrl({ symbol: 'ZZZZ', imageUrl: 'data:text/html,evil' }))
      .toBe('https://financialmodelingprep.com/image-stock/ZZZZ.png');
  });
});

describe('Exactly one asset logo is rendered, with safe fallback on a broken remote image', () => {
  it('renders at most one <img>, gated by cache-checked loaded/failed state', () => {
    const imgTagCount = (assetAvatarSource.match(/<img\b/g) ?? []).length;
    expect(imgTagCount).toBe(1);
    expect(assetAvatarSource).toContain('onError={handleImageError}');
    expect(assetAvatarSource).toContain('cacheAssetLogoFailure(meta.logoUrl);');
    expect(assetAvatarSource).toContain('isAssetLogoFailureCached(meta.logoUrl)');
    expect(assetAvatarSource).toContain('const showImage = Boolean(meta.logoUrl && currentImageState && !imageState.failed);');
    // The fallback icon renders only until the real logo has finished loading,
    // and re-appears if the image fails - never both visuals at once.
    expect(assetAvatarSource).toContain('{(!showImage || !imageLoaded) && fallback}');
  });

  it('checks cached failure state per logo so a prior URL cannot leak into the next asset', () => {
    expect(assetAvatarSource).toContain('logoUrl: meta.logoUrl,');
    expect(assetAvatarSource).toContain('cacheChecked: true,');
    expect(assetAvatarSource).toContain('loaded: false,');
    expect(assetAvatarSource).toMatch(/}, \[meta\.logoUrl\]\);/);
  });
});

describe('Asset logo and ZAD platform logo remain separate, non-overlapping identities', () => {
  it('keeps AssetAvatar and PlatformIdentity as independent components with no shared markup', () => {
    expect(assetAvatarSource).not.toMatch(/platform|ZAD/i);
    expect(platformIdentitySource).not.toMatch(/asset-avatar|AssetAvatar/i);
  });

  it('renders the asset logo and the ZAD/platform identity as separate sibling elements in the holding card', () => {
    expect(investmentRowSource).toContain('<span className="invest-asset-lens">');
    expect(investmentRowSource).toContain('<AssetAvatar');
    expect(investmentRowSource).toContain('<PlatformIdentity name={investment.purchasePlatformName} logoUrl={platformLogoUrl}');
    // The platform badge is driven by the platform's own id -> logo map, never the asset symbol.
    expect(investmentRowSource).not.toMatch(/PlatformIdentity[^>]*symbol=/);
  });
});
