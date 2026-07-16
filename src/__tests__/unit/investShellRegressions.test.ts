import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizePlatformIdentifier, resolvePlatformLogoUrl } from '@/components/invest/PlatformIdentity';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const globals = read('src/app/globals.css');
const assetAvatar = read('src/components/asset/AssetAvatar.tsx');
const sidebar = read('src/components/Sidebar.tsx');
const appHeader = read('src/components/AppHeader.tsx');
const investPage = read('src/app/invest/page.tsx');
const investmentList = read('src/components/invest/InvestmentList.tsx');

describe('invest and shell production regressions', () => {
  it('renders exactly one asset visual: fallback disappears once the logo loads', () => {
    expect(assetAvatar).toContain('{(!showImage || !imageLoaded) && fallback}');
    expect(assetAvatar).toContain('onError={() => setImageFailed(true)}');
    expect(assetAvatar).toContain('onLoad={() => setImageLoaded(true)}');
  });

  it('restores the verified ZAD platform logo across identifier variations', () => {
    const expected = 'https://www.google.com/s2/favicons?domain_url=https://joinzad.com&sz=64';
    for (const variant of ['zad', 'ZAD', ' Zad ', 'زاد', 'Zad Fintech', 'zad investments', 'JoinZad']) {
      expect(resolvePlatformLogoUrl(variant), variant).toBe(expected);
    }
    expect(normalizePlatformIdentifier('زاد')).toBe('zad');
    expect(normalizePlatformIdentifier('  ZAD   Fintech ')).toBe('zad');
    // unrelated names keep their own identity and mappings
    expect(resolvePlatformLogoUrl('Binance')).toBe('https://cdn.simpleicons.org/binance');
    expect(resolvePlatformLogoUrl('Unknown Broker XYZ')).toBeNull();
  });

  it('keeps the shell scroll container sticky-compatible (clip, never hidden)', () => {
    const htmlBlock = globals.match(/html \{[\s\S]*?\n\}/)?.[0] ?? '';
    const bodyBlock = globals.match(/\nbody \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(htmlBlock).toContain('overflow-x:clip');
    expect(htmlBlock).not.toContain('overflow-x:hidden');
    expect(bodyBlock).toContain('overflow-x:clip');
    expect(bodyBlock).not.toContain('overflow-x:hidden');
  });

  it('keeps the sidebar and header sticky with viewport-bound sidebar height', () => {
    expect(sidebar).toContain('position:sticky');
    expect(sidebar).toContain('height:calc(100dvh - var(--global-header-height)');
    expect(sidebar).toContain('overflow-y:auto');
    expect(appHeader).toContain('position: sticky');
    expect(appHeader).toContain('z-index: 100;');
  });

  it('stacks modal backdrops above application chrome', () => {
    // The shared modal-normalization layer owns the final z-order for every
    // backdrop, including .invest-overlay; chrome stays below it.
    const overlayLayer = globals.match(/\n\.sfm-modal-overlay,\r?\n[\s\S]*?z-index: [0-9]+ !important;/)?.[0] ?? '';
    expect(overlayLayer).toContain('.invest-overlay,');
    expect(overlayLayer).toContain('z-index: 9998 !important;');
  });

  it('fetches platform logos once at page level and shares them with both panels', () => {
    expect(investPage).toContain("fetch('/api/investment-platforms?limit=50'");
    expect(investPage).toContain('platformLogos={platformLogos}');
    expect(investPage.match(/platformLogoUrl=\{item\.purchasePlatformId \? platformLogos\[item\.purchasePlatformId\] : null\}/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(investmentList).not.toContain("fetch('/api/investment-platforms");
    expect(investmentList).toContain('platformLogos = {}');
  });
});
