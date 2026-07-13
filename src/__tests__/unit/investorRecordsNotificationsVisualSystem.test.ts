import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const sources = {
  investorWorkspace: read('src/app/investment-offers/investor.module.css'),
  investorViewer: read('src/app/investor/[token]/viewer.module.css'),
  notifications: read('src/components/finance/NotificationsPage.tsx'),
  businessRecords: read('src/components/business/BusinessRecordsModulePage.tsx'),
};

const legacyVisuals = /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(|oklch\(|(?:linear|radial|conic)-gradient\(|\b(?:Tajawal|Cairo|Arial|Tahoma|Helvetica|Inter|Poppins|Roboto)\b/i;
const excessiveWeight = /font(?:-weight|Weight|):?\s*[:=]?\s*(?:7(?:0[1-9]|[1-9]\d)|[89]\d{2}|[1-9]\d{3,})\b|font:\s*(?:8|9)\d{2}/;

describe('investor, notifications, and business records visual-system contract', () => {
  it.each(Object.entries(sources))('%s uses centralized palette, typography, radii, and shadows', (name, source) => {
    expect(source, name).not.toMatch(legacyVisuals);
    expect(source, name).not.toMatch(excessiveWeight);
    expect(source, name).not.toMatch(/(?:^|[\s:])(?:global\()?\.dark\b/m);
    expect(source, name).not.toContain('var(--sfm-');

    const radii = [...source.matchAll(/border(?:-[\w]+)?-radius:\s*([^;}\r\n]+)/g)]
      .map(match => match[1].trim())
      .filter(value => /\d+(?:\.\d+)?px/.test(value));
    expect(radii, name).toEqual([]);

    const shadows = [...source.matchAll(/box-shadow:\s*([^;}\r\n]+)/g)]
      .map(match => match[1].trim())
      .filter(value => !/^var\(--(?:shadow|focus-shadow)/.test(value));
    expect(shadows, name).toEqual([]);
  });

  it('keeps the sole intentional gradient on the notifications hero', () => {
    expect(sources.notifications.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    for (const [name, source] of Object.entries(sources)) {
      expect(source.replaceAll('var(--hero-gradient)', ''), name).not.toContain('gradient');
    }
  });

  it('preserves semantic status differentiation without relying on color alone', () => {
    for (const state of ['complete', 'partial', 'missing', 'blocked', 'needs_review']) {
      expect(sources.investorWorkspace).toContain(`.status_${state}`);
    }
    for (const severity of ['low', 'medium', 'high', 'critical']) {
      expect(sources.investorWorkspace).toContain(`.severity_${severity}`);
    }
    for (const severity of ['info', 'success', 'warning', 'danger']) {
      expect(sources.notifications).toContain(`.notice-icon.${severity},.severity.${severity}`);
    }
    expect(sources.notifications).toContain('border-inline-start:4px solid var(--primary)');
    expect(sources.businessRecords).toContain('.business-alert,');
    expect(sources.businessRecords).toContain('.business-notice {');
  });

  it('uses the UI font for interface text and data font for scores and financial values', () => {
    expect(sources.investorWorkspace).toContain('font-family: var(--font-ui)');
    expect(sources.investorWorkspace).toContain('font-family: var(--font-data)');
    expect(sources.investorViewer).toContain('font-family: var(--font-data)');
    expect(sources.notifications).toContain('font-family:var(--font-data)');
    expect(sources.businessRecords).toContain('font-family: var(--font-data)');
  });

  it('leaves workspace width to the shell and preserves logical RTL and responsive behavior', () => {
    expect(sources.notifications).not.toMatch(/100vw|calc\(100vw|margin-inline-start:\s*230px|width:\s*calc\(100%\s*-\s*230px\)/i);
    expect(sources.notifications).toContain('.notif-page{width:100%;min-width:0;');
    expect(sources.businessRecords).toContain('[dir="rtl"] .business-back-link svg');
    expect(sources.investorWorkspace).toContain('padding-inline-start');
    expect(sources.investorViewer).toContain('margin-inline: auto');
    expect(sources.investorWorkspace).toContain('@media (max-width: 720px)');
    expect(sources.investorViewer).toContain('@media (max-width: 560px)');
    expect(sources.notifications).toContain('@media(max-width:680px)');
    expect(sources.businessRecords).toContain('@media (max-width: 720px)');
  });

  it('retains visible keyboard focus across forms, actions, filters, and uploads', () => {
    for (const source of Object.values(sources)) {
      expect(source).toContain('focus');
      expect(source).toContain('var(--focus-ring)');
      expect(source).toContain('var(--focus-shadow)');
    }
  });
});
