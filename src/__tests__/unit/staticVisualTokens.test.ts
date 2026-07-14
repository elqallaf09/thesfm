import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('static visual-token adapter', () => {
  it('matches the canonical light palette for non-CSS metadata', () => {
    const themes = read('src/styles/themes.css');
    const adapter = read('src/styles/static-tokens.ts');
    const manifest = read('src/app/manifest.ts');

    expect(themes).toContain('--background: #F4F7FB;');
    expect(themes).toContain('--foreground: #0F2742;');
    expect(adapter).toContain("background: '#F4F7FB'");
    expect(adapter).toContain("foreground: '#0F2742'");
    expect(manifest).toContain('STATIC_LIGHT_VISUAL_TOKENS.background');
    expect(manifest).toContain('STATIC_LIGHT_VISUAL_TOKENS.foreground');
    expect(manifest).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('centralizes the semantic palette and typography used by email HTML', () => {
    const themes = read('src/styles/themes.css');
    const tokens = read('src/styles/tokens.css');
    const adapter = read('src/styles/static-tokens.ts');
    const emailRoutes = [
      'src/app/api/company-listings/route.ts',
      'src/app/api/admin/companies/review/route.ts',
      'src/app/api/business/subscriptions/reminders/test-email/route.ts',
      'src/lib/subscriptionReminderEmails.ts',
      'src/lib/businessSubscriptions.ts',
    ].map(read);

    for (const [name, value] of [
      ['surface', '#FFFFFF'],
      ['foregroundSecondary', '#334155'],
      ['foregroundMuted', '#5F6F84'],
      ['border', '#E2E8F0'],
      ['primary', '#1769D2'],
      ['primaryForeground', '#FFFFFF'],
    ]) {
      expect(adapter).toContain(`${name}: '${value}'`);
      expect(themes).toContain(value);
    }
    expect(tokens).toContain('--radius-card: 14px;');
    expect(tokens).toContain('--radius-panel: 20px;');
    expect(adapter).toContain('STATIC_EMAIL_VISUAL_STYLES');
    expect(adapter).toContain("'IBM Plex Sans Arabic'");

    for (const route of emailRoutes) {
      expect(route).toContain('STATIC_EMAIL_VISUAL_STYLES');
      expect(route).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(route).not.toMatch(/(?:linear|radial)-gradient\(/i);
      expect(route).not.toMatch(/font-family\s*:/i);
      expect(route).not.toMatch(/border-radius\s*:\s*\d/i);
    }
  });

  it('keeps production reminder templates on shared static email styles', () => {
    const reminderTemplates = [
      read('src/lib/subscriptionReminderEmails.ts'),
      read('src/lib/businessSubscriptions.ts'),
    ];

    for (const template of reminderTemplates) {
      expect(template).toContain('STATIC_EMAIL_VISUAL_STYLES');
      expect(template).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(template).not.toMatch(/(?:linear|radial|conic)-gradient\(/i);
      expect(template).not.toMatch(/font-family\s*:/i);
      expect(template).not.toMatch(/\b(?:Inter|Tajawal|Arial|Tahoma)\b/);
    }
  });
});
