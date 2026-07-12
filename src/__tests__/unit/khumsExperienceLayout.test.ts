import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { TR_CHARITY } from '@/lib/translations/charity';

const projectRoot = process.cwd();
const khumsPage = readFileSync(join(projectRoot, 'src/app/khums/page.tsx'), 'utf8');

const expectedPanes = [
  'overview',
  'financial-data',
  'calculation',
  'distribution',
  'history',
  'reports',
  'documents',
];

const phaseKeys = [
  'khums_tab_financial_data',
  'khums_tab_reports',
  'khums_tab_documents',
  'khums_current_status',
  'khums_next_reminder',
  'khums_last_payment',
  'khums_action_calculate',
  'khums_action_pay',
  'khums_action_export_pdf',
  'khums_action_share',
  'khums_action_history',
  'khums_action_reminder',
  'khums_metric_formula',
  'khums_metric_source',
  'khums_metric_last_update',
  'khums_metric_explanation',
] as const;

describe('Phase 2.8 Khums experience', () => {
  it('uses the exact seven URL-backed workflow panes with compact mobile navigation', () => {
    expect(khumsPage).toContain(
      "const KHUMS_PANES = ['overview', 'financial-data', 'calculation', 'distribution', 'history', 'reports', 'documents'] as const;",
    );
    expect(khumsPage).toContain('useUrlTabState<KhumsPane>');
    expect(khumsPage).toContain("legacyValueResolver: value => value === 'data-entry' ? 'financial-data' : null");
    expect(khumsPage).toContain('mobileMode="auto"');

    const panelValues = Array.from(
      khumsPage.matchAll(/<PageTabPanel idBase="khums-workspace" value="([^"]+)"/g),
      match => match[1],
    );
    expect(panelValues).toEqual(expectedPanes);
    expect(khumsPage).not.toContain('value="data-entry"');
  });

  it('keeps all six overview actions named and routes payment and reminder focus safely', () => {
    for (const key of [
      'khums_action_calculate',
      'khums_action_pay',
      'khums_action_export_pdf',
      'khums_action_share',
      'khums_action_history',
      'khums_action_reminder',
    ]) {
      expect(khumsPage).toContain(`aria-label={t('${key}')}`);
    }
    expect(khumsPage).toContain("openDistributionTarget('payment')");
    expect(khumsPage).toContain("openDistributionTarget('reminder')");
    expect(khumsPage).toContain('ref={paymentAmountRef}');
    expect(khumsPage).toContain('ref={reminderDateRef}');
  });

  it('shows calculation evidence and keeps Reports separate from Documents', () => {
    expect(khumsPage).toContain('className="calculation-evidence"');
    expect(khumsPage).toContain("t('khums_metric_formula')");
    expect(khumsPage).toContain("t('khums_metric_source')");
    expect(khumsPage).toContain("t('khums_metric_last_update')");
    expect(khumsPage).toContain("value=\"reports\"");
    expect(khumsPage).toContain("value=\"documents\"");
  });

  it('provides complete Arabic, English, and French copy for the new experience', () => {
    for (const key of phaseKeys) {
      expect(TR_CHARITY[key]?.ar, `${key}: ar`).toBeTruthy();
      expect(TR_CHARITY[key]?.en, `${key}: en`).toBeTruthy();
      expect(TR_CHARITY[key]?.fr, `${key}: fr`).toBeTruthy();
    }

    for (const key of ['khums_metric_details_for', 'khums_share_text', 'khums_documents_count']) {
      const entry = TR_CHARITY[key];
      const placeholders = (value: string) => Array.from(value.matchAll(/\{([^}]+)\}/g), match => match[1]).sort();
      expect(placeholders(entry.ar)).toEqual(placeholders(entry.en));
      expect(placeholders(entry.fr ?? '')).toEqual(placeholders(entry.en));
    }
  });

  it('uses only a route-scoped Islamic-finance palette layer', () => {
    expect(khumsPage).toContain('--khums-deep-green:#123F35');
    expect(khumsPage).toContain('--khums-emerald:#087A5F');
    expect(khumsPage).toContain('--khums-gold:#C8993D');
    expect(khumsPage).toContain('--khums-warm-white:#FCFAF5');
    expect(khumsPage).toContain('.dark .khums-page');
  });
});
