import { expect, test, type Page } from '@playwright/test';
import path from 'path';

const qaEnabled = process.env.SFM_LOCAL_TRADER_QA === '1';
const screenshotDir = path.join(process.cwd(), '.playwright-mcp', 'trader-filter-validation');
const forbiddenGlobal = ['NVDA', 'TSLA', 'BTC-USD', 'BTCUSD', 'EURUSD', 'GLD'];

type SelectionCase = {
  name: string;
  chipPattern: RegExp;
  forbidden: string[];
  validate: (symbol: string) => boolean;
};

const cases: SelectionCase[] = [
  { name: 'Qatar Market QAR', chipPattern: /قطر|Qatar/i, forbidden: forbiddenGlobal, validate: symbol => /\.QA$/i.test(symbol) },
  { name: 'Kuwait Market KWD', chipPattern: /الكويت|Kuwait/i, forbidden: forbiddenGlobal, validate: symbol => /\.KW$/i.test(symbol) },
  { name: 'Bahrain Market BHD', chipPattern: /البحرين|Bahrain/i, forbidden: forbiddenGlobal, validate: symbol => /\.BH$/i.test(symbol) },
  { name: 'Saudi Market SAR', chipPattern: /السعودي|Saudi/i, forbidden: forbiddenGlobal, validate: symbol => /\.(SR|SA)$/i.test(symbol) },
  { name: 'UAE Market AED', chipPattern: /الإمارات|UAE/i, forbidden: forbiddenGlobal, validate: symbol => /\.(AE|DU|AD)$/i.test(symbol) },
  { name: 'US Technology', chipPattern: /التقنية|Technology/i, forbidden: ['BTC-USD', 'BTCUSD', 'EURUSD', 'GLD'], validate: symbol => !/BTC|ETH|EURUSD|XAU|XAG|GLD|SLV|SPY|QQQ/i.test(symbol) && !/[A-Z]{6}/.test(symbol) },
  { name: 'Semiconductors', chipPattern: /الموصلات|Semiconductors/i, forbidden: ['BTC-USD', 'BTCUSD', 'EURUSD', 'GLD'], validate: symbol => /^(NVDA|AMD|INTC|AVGO|TSM|ASML|QCOM|TXN|MU|AMAT|LRCX|KLAC|MRVL|MCHP|ON|NXPI|ADI|MPWR|ARM|SMCI|TER|SWKS|QRVO|LSCC|COHR|UMC|GFS|WOLF)$/i.test(symbol) },
  { name: 'Crypto', chipPattern: /الرقمية|Crypto/i, forbidden: ['NVDA', 'TSLA', 'EURUSD', 'GLD'], validate: symbol => /^(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|USDT|AVAX|DOT|LTC|BCH|LINK)(?:USD|-USD)?$/i.test(symbol) },
  { name: 'Forex', chipPattern: /العملات|Forex/i, forbidden: ['NVDA', 'TSLA', 'BTC-USD', 'BTCUSD', 'GLD'], validate: symbol => /^[A-Z]{6}$/i.test(symbol) },
  { name: 'Commodities', chipPattern: /السلع|Commodities/i, forbidden: ['NVDA', 'TSLA', 'BTC-USD', 'BTCUSD', 'EURUSD', 'GLD'], validate: symbol => /^(XAUUSD|XAGUSD|WTI|BRENT|GC=F|SI=F|CL=F|BZ=F)$/i.test(symbol) },
  { name: 'ETFs', chipPattern: /الصناديق|ETFs/i, forbidden: ['NVDA', 'TSLA', 'BTC-USD', 'BTCUSD', 'EURUSD'], validate: symbol => /^(SPY|QQQ|VOO|DIA|IWM|GLD|SLV|VTI|VEA|VWO|AGG|BND|TLT|HYG)$/i.test(symbol) },
];

async function visibleRecommendationSymbols(page: Page) {
  const symbols = await page.locator('.rec-card .asset-title strong, [data-tabpanel="rec"] .asset-card .symbol-code')
    .evaluateAll(nodes => nodes.map(node => (node.textContent || '').trim()).filter(Boolean));
  return Array.from(new Set(symbols));
}

test.describe('AI Trading Terminal strict market and category filters', () => {
  test.skip(!qaEnabled, 'Set SFM_LOCAL_TRADER_QA=1 for local direct terminal validation.');

  test('recommendation cards obey selected market/category', async ({ page }, testInfo) => {
    await page.goto('/thesfm-trader-own/app/index.html?route=recommendations', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const report: Array<{ selection: string; symbols: string[]; passed: Record<string, boolean>; screenshot: string }> = [];

    for (const selection of cases) {
      const chip = page.locator('[data-rec-market]').filter({ hasText: selection.chipPattern }).first();
      await expect(chip, `${selection.name} chip should exist`).toBeVisible();
      await chip.click();
      await page.waitForLoadState('networkidle');
      await expect(chip).toHaveClass(/is-active/);

      const emptyState = page.locator('.empty-state').filter({ hasText: 'No matching assets for this market or category right now' });
      const symbols = await visibleRecommendationSymbols(page);
      if (!symbols.length) await expect(emptyState).toBeVisible();

      for (const forbidden of selection.forbidden) {
        expect(symbols, `${selection.name} must not show ${forbidden}`).not.toContain(forbidden);
      }

      const passed = Object.fromEntries(symbols.map(symbol => [symbol, selection.validate(symbol)]));
      expect(Object.values(passed), `${selection.name} visible symbols failed validation: ${JSON.stringify(passed)}`).not.toContain(false);

      const screenshot = path.join(screenshotDir, `${testInfo.project.name}-${selection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      report.push({ selection: selection.name, symbols, passed, screenshot });
    }

    await testInfo.attach('trader-filter-validation-report', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });
  });
});
