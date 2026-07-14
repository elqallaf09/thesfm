import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const zakatPage = readFileSync(join(projectRoot, 'src/app/zakat/page.tsx'), 'utf8');

describe('Phase 2.8 Zakat experience', () => {
  it('uses the complete independent URL-backed Zakat workflow', () => {
    expect(zakatPage).toContain(
      "const ZAKAT_TAB_IDS = ['overview', 'assets', 'liabilities', 'calculation', 'payment', 'history', 'reports', 'documents'] as const;",
    );
    expect(zakatPage).toContain('useUrlTabState<ZakatTab>');
    expect(zakatPage).toContain("defaultValue: 'overview'");
    expect(zakatPage).toContain('mobileMode="auto"');

    for (const tab of ['overview', 'assets', 'liabilities', 'calculation', 'payment', 'history', 'reports', 'documents']) {
      expect(zakatPage).toContain(`value="${tab}"`);
    }

    expect(zakatPage).not.toContain('value="calculator"');
    expect(zakatPage).not.toContain('value="reminders"');
  });

  it('shows a reviewable Zakat-only formula path with evidence metadata', () => {
    expect(zakatPage).toContain('data-calculation-scope="zakat"');
    expect(zakatPage).toContain('zakatableAssetsTotal');
    expect(zakatPage).toContain('wx.formulaNetBase');
    expect(zakatPage).toContain('wx.formulaNisab');
    expect(zakatPage).toContain('wx.formulaZakatDue');
    expect(zakatPage).toContain('className="metric-meta"');
    expect(zakatPage).toContain('wx.sourceMetals');
    expect(zakatPage).toContain('calculationUpdatedAt');
    expect(zakatPage).not.toContain('annual surplus × 20%');
  });

  it('provides six actions and honest payment, report, and document states', () => {
    for (const action of ['wx.actionCalculate', 'wx.actionPay', 'wx.actionPdf', 'wx.actionShare', 'wx.actionHistory', 'wx.actionReminder']) {
      expect(zakatPage).toContain(action);
    }

    expect(zakatPage).toContain('wx.noPaymentsTitle');
    expect(zakatPage).toContain('wx.notRecorded');
    expect(zakatPage).toContain('latestSavedDue');
    expect(zakatPage).toContain('report-status draft');
    expect(zakatPage).toContain('wx.zakatableAsset');
    expect(zakatPage).toContain('/charity-projects?tab=projects');
    expect(zakatPage).toContain('className="report-record"');
    expect(zakatPage).toContain('wx.noDocumentsTitle');
    expect(zakatPage).toContain('/charity-projects?tab=documents&scope=zakat');
  });

  it('uses the shared semantic palette and remains responsive', () => {
    expect(zakatPage).not.toMatch(/#[0-9a-f]{3,8}\b|--zakat-|:global\(\.dark\)/i);
    expect(zakatPage).toContain('background:var(--hero-gradient)');
    expect(zakatPage).toContain('color:var(--foreground)');
    expect(zakatPage).toContain('font-family:var(--font-data)');
    expect(zakatPage).toContain('@media(max-width:560px)');
    expect(zakatPage).toContain('@media(max-width:360px)');
    expect(zakatPage).toContain('@media(prefers-reduced-motion:reduce)');
  });

  it('prevents mixed-currency imports and keeps selected Nisab methods internally consistent', () => {
    expect(zakatPage).toContain("String(row.currency ?? '').trim().toUpperCase() === 'KWD'");
    expect(zakatPage).toContain('excludedSavings: financeRes.records.savings.length - kwdSavings.length');
    expect(zakatPage).toContain("nisabMethod === 'gold'");
    expect(zakatPage).toContain('? hasGoldNisab');
    expect(zakatPage).toContain(': hasGoldNisab && hasSilverNisab;');
    expect(zakatPage).toContain('if (!hasCriticalPriceData)');
  });

  it('opens the reports workflow before printing and sends Zakat payments only to Zakat-scoped projects', () => {
    expect(zakatPage).toContain('printRequestedRef.current = true');
    expect(zakatPage).toContain("setActiveTab('reports')");
    expect(zakatPage).toContain('href="/charity-projects?tab=projects&scope=zakat"');
    expect(zakatPage).toContain('href="/charity-projects?tab=documents&scope=zakat"');
    expect(zakatPage).toContain('role="status" aria-live="polite"');
  });
});
