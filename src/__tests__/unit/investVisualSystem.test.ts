import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { resolveAssetLogoUrl } from '@/lib/assetVisuals';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const investCss = readSource('src/app/invest/invest.css');
const investPage = readSource('src/app/invest/page.tsx');
const investCharts = readSource('src/components/invest/InvestPerformanceCharts.tsx');
const investmentModal = readSource('src/components/invest/InvestmentFormModal.tsx');
const investmentRow = readSource('src/components/invest/InvestmentRow.tsx');
const investmentSparkline = readSource('src/components/invest/InvestmentSparkline.tsx');
const platformIdentity = readSource('src/components/invest/PlatformIdentity.tsx');
const activeVisualSources = [investCss, investPage, investCharts, investmentModal, investmentRow, investmentSparkline, platformIdentity].join('\n');

describe('investments visual system', () => {
  it('uses only the centralized semantic palette on the active production route', () => {
    expect(activeVisualSources).not.toMatch(/#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(/i);
    expect(activeVisualSources).not.toMatch(/(?:linear|radial|conic)-gradient\(/i);
    expect(activeVisualSources).not.toMatch(/var\(--sfm-/i);
    expect(activeVisualSources).not.toMatch(/\b(?:Tajawal|Cairo|Arial)\b/i);
    expect(activeVisualSources).not.toMatch(/font(?:-weight|Weight|):\s*(?:[89]00|[7-9][1-9]0)/);
  });

  it('keeps the only branded gradient on the investments hero', () => {
    expect(investCss.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(investCss).toMatch(/\.invest-hero\s*\{[\s\S]*?background:\s*var\(--hero-gradient\);/);
    expect(investCss).toMatch(/\.invest-panel,[\s\S]*?background:\s*var\(--surface\);/);
    expect(investCss).toContain('box-shadow: var(--shadow-card);');
  });

  it('reuses the merged sidebar glass language for investment cards', () => {
    expect(investCss).toContain('background: var(--sidebar-glass-bg);');
    expect(investCss).toContain('border: 1px solid var(--sidebar-glass-border);');
    expect(investCss).toContain('box-shadow: var(--sidebar-glass-inner-shadow), var(--sidebar-glass-shadow);');
    expect(investCss).toContain('backdrop-filter: var(--sidebar-glass-filter);');
    expect(investCss).toContain('background: var(--sidebar-glass-reflection);');
  });

  it('maps status, control, and chart roles to shared semantic tokens', () => {
    expect(investCss).toContain('background: var(--success-soft);');
    expect(investCss).toContain('background: var(--warning-soft);');
    expect(investCss).toContain('background: var(--danger-soft);');
    expect(investCss).toContain('background: var(--primary);');
    expect(investCss).toContain('background: var(--surface-hover);');
    expect(investCss).toContain('box-shadow: var(--focus-shadow);');
    expect(investPage).toContain("'var(--chart-1)',");
    expect(investCharts).toContain("fill=\"var(--chart-2)\"");
    expect(investCharts).toContain("fill: 'var(--chart-label)'");
    expect(investCharts).toContain("background: 'var(--chart-tooltip)'");
  });

  it('uses the UI font for controls and the mono font only for financial data', () => {
    expect(investCss).toContain('font-family: var(--font-ui);');
    expect(investCss).toContain('font-family: var(--font-data);');
    expect(investCss).toMatch(/\.invest-summary-card strong,[\s\S]*?font-family:\s*var\(--font-data\);/);
    expect(investCss).toMatch(/\.invest-primary-btn,[\s\S]*?font-family:\s*var\(--font-ui\);/);
    expect(investCharts).toContain("fontFamily: 'var(--font-data)'");
  });

  it('has one stylesheet source for modal theme behavior and no inline row palette', () => {
    expect(investmentModal).not.toContain('<style jsx>');
    expect(investmentModal).not.toMatch(/\.dark\b|:global\(\.dark\)/);
    expect(investmentRow).not.toContain('style={{');
    expect(investmentRow).toContain('className="invest-holding-summary"');
    expect(investmentRow).toContain('invest-holding-metric--${tone}');
    expect(investmentRow).toContain('<AssetAvatar');
    expect(investmentRow).toContain('<PlatformIdentity');
    expect(investmentRow).toContain('<InvestmentSparkline');
    expect(investmentRow).toContain('<DropdownMenu');
    expect(investmentRow).toContain('labels.moreActions');
  });

  it('keeps the expansion focused on real data without manufacturing financial records', () => {
    // The refined expansion only renders sections that carry real content:
    // overview, price history, allocation, performance, plus conditional
    // notes/data-source. Placeholder-only sections were removed on purpose.
    for (const label of ['overview', 'allocation', 'performance', 'notes', 'priceHistory', 'dataSource']) {
      expect(investmentRow).toContain(`labels.${label}`);
    }
    for (const removedPlaceholder of ['labels.aiSummary', 'labels.dividends', 'labels.attachments', 'labels.brokerNotes', 'labels.transactions', 'labels.documents']) {
      expect(investmentRow).not.toContain(removedPlaceholder);
    }
    expect(investmentRow).toContain('investment.notes ? (');
    expect(investmentRow).toContain('labels.noData');
    expect(investmentRow).not.toMatch(/Math\.random|mock|samplePrice|fake/i);
    expect(investmentRow).toContain("range: '1M'");
    expect(investmentRow).toContain("cache: 'no-store'");
    expect(investmentRow).toContain('controller.abort()');
    expect(investmentRow).toContain('{isExpanded ? (');
    expect(investmentSparkline).toContain('points: InvestmentHistoryPoint[]');
    expect(investmentSparkline).not.toMatch(/start:\s*number|end:\s*number|Math\.abs\(delta\)/);
  });

  it('uses verified identities for supported assets and never substitutes AMD branding', () => {
    expect(resolveAssetLogoUrl({ symbol: 'NVDA', assetType: 'stock' })).toBe('https://cdn.simpleicons.org/nvidia');
    expect(resolveAssetLogoUrl({ symbol: 'AMD', assetType: 'stock' })).toBe('https://cdn.simpleicons.org/amd');
    expect(resolveAssetLogoUrl({ symbol: 'BTC-USD', assetType: 'crypto' })).toContain('cdn.simpleicons.org/bitcoin/');
    expect(resolveAssetLogoUrl({ symbol: 'KFH.KW', assetType: 'stock' })).toContain('domain_url=https://www.kfh.com');
    expect(platformIdentity).toContain('invest-platform-monogram');
    expect(platformIdentity).not.toContain('<Building2');
  });

  it('retains responsive, directional, focus, and reduced-motion behavior', () => {
    expect(investCss).toContain('inset-inline-end:');
    expect(investCss).toContain('margin-inline-start:');
    expect(investCss).toContain('border-inline-start-width: 3px;');
    expect(investCss).toContain('@media (max-width: 74rem)');
    expect(investCss).toContain('@media (max-width: 47.5rem)');
    expect(investCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(investCss).toContain('outline: 3px solid var(--focus-ring);');
    expect(investCss).not.toMatch(/100vw|margin-(?:left|right)|var\(--sidebar-(?:w|width)/i);
  });
});
