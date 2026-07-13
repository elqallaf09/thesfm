import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

const bank = read('src/components/banking-stocks/BankNewsPage.tsx');
const cyclical = read('src/components/cyclical-stocks/CyclicalStocksNewsPage.tsx');
const income = read('src/app/income/page.tsx');
const subscriptions = read('src/app/expenses/monthly-subscriptions/page.tsx');

function ruleBodies(source: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...source.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))]
    .map((match) => match[1]);
}

function expectRuleColor(source: string, selector: string, token: string) {
  const bodies = ruleBodies(source, selector);
  expect(bodies.length, selector).toBeGreaterThan(0);
  expect(bodies.some((body) => body.includes(`color: var(--${token})`)), selector).toBe(true);
  expect(bodies.some((body) => body.includes('color: var(--accent)')), selector).toBe(false);
}

describe('stock-news text hierarchy', () => {
  it('uses foreground roles for normal banking labels, prose, and values', () => {
    expectRuleColor(bank, '.bankTickerItem strong', 'foreground');
    expectRuleColor(bank, '.bankMetricValue', 'foreground');
    expectRuleColor(bank, '.bankMetricDetail', 'foreground-muted');
    expectRuleColor(bank, '.bankStockPriceRow strong', 'foreground');
    expectRuleColor(bank, '.bankStockMetaGrid dd', 'foreground');
    expectRuleColor(bank, '.newsMeta', 'foreground-muted');
    expectRuleColor(bank, '.sourceList b', 'foreground');
    expectRuleColor(bank, '.sourceList em', 'foreground-muted');
    expectRuleColor(bank, '.quickTechnicalGrid span', 'foreground-muted');
    expectRuleColor(bank, '.quickTechnicalGrid strong', 'foreground');
    expect(bank.match(/color:\s*var\(--accent\)/g)).toHaveLength(3);
  });

  it('uses foreground roles for normal cyclical labels, prose, and values', () => {
    expectRuleColor(cyclical, '.ticker-source', 'foreground-muted');
    expectRuleColor(cyclical, '.metric-card em', 'foreground-muted');
    expectRuleColor(cyclical, '.macro-item small', 'foreground-muted');
    expectRuleColor(cyclical, '.bar-label strong', 'foreground');
    expectRuleColor(cyclical, '.bar-label span', 'foreground-muted');
    expectRuleColor(cyclical, '.mover-list h3', 'foreground');
    expectRuleColor(cyclical, '.stock-metrics small', 'foreground-muted');
    expectRuleColor(cyclical, '.stock-metrics b', 'foreground');
    expectRuleColor(cyclical, '.stock-table th', 'foreground-secondary');
    expectRuleColor(cyclical, '.stock-table td', 'foreground');
    expectRuleColor(cyclical, '.article-meta', 'foreground-muted');
    expectRuleColor(cyclical, '.news-card h3', 'foreground');
    expectRuleColor(cyclical, '.accordion-card button', 'foreground');
    expect(cyclical.match(/color:\s*var\(--accent\)/g)).toHaveLength(2);
  });

  it('does not introduce raw palette, type, radius, or shadow debt', () => {
    const combined = `${bank}\n${cyclical}`;
    expect(combined).not.toMatch(/#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})\b|(?:rgb|hsl)a?\(|oklch\(/i);
    expect(combined).not.toMatch(/\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto|Noto Sans Arabic)\b/i);
    expect(combined).not.toMatch(/border-radius\s*:\s*(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem)|box-shadow\s*:\s*(?!\s*(?:var\(|none\b))/i);
  });
});

describe('shared-shell geometry ownership', () => {
  it('keeps Income and Subscriptions free of route-owned outer offsets', () => {
    for (const body of ruleBodies(income, '.income-main')) {
      expect(body).not.toMatch(/(?:^|;)\s*(?:width|max-width|margin(?:-inline(?:-start)?)?|padding(?:-(?:inline|block)(?:-(?:start|end))?)?)\s*:/i);
    }

    expect(ruleBodies(subscriptions, '.subscriptions-main')).toHaveLength(0);
    for (const body of ruleBodies(subscriptions, '.subscriptions-content')) {
      expect(body).not.toMatch(/(?:^|;)\s*(?:width|max-width|margin(?:-inline(?:-start)?)?|padding(?:-(?:inline|block)(?:-(?:start|end))?)?)\s*:/i);
    }
    expect(subscriptions).not.toMatch(/calc\(74px\s*\+\s*env\(safe-area-inset-top\)\)/);
    expect(income).not.toMatch(/calc\(84px\s*\+\s*env\(safe-area-inset-top\)\)/);
  });
});
