import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { THEORY_CALCULATORS, THEORY_CALCULATOR_TEXT } from '@/lib/financial-theories';
import { formatMoney } from '@/lib/formatMoney';
import { UI_COPY } from '@/app/financial-theories/_lib';

const state = vi.hoisted(() => ({ balance: '1000', rate: '0', monthly: '300' }));
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initial: unknown) => actual.useState(
      initial && typeof initial === 'object' && 'balance' in initial && 'monthly' in initial
        ? { ...state }
        : initial,
    ),
  };
});
import { SmartCalculatorPanel } from '@/app/financial-theories/_components';

function render(lang: 'ar' | 'en' | 'fr' = 'en') {
  return renderToStaticMarkup(<SmartCalculatorPanel
    activeId="debt-plan"
    tool={THEORY_CALCULATORS.find(tool => tool.id === 'debt-plan')!}
    lang={lang}
    defaultCurrency="KWD"
    healthSnapshot={{ income: 0, expenses: 0, savings: 0, debts: 0, hasIncome: false, hasExpenses: false, hasSavings: false, isLoading: false, error: null }}
    onClose={() => {}}
  />);
}

describe('financial theory debt-plan results', () => {
  beforeEach(() => { Object.assign(state, { balance: '1000', rate: '0', monthly: '300' }); });

  it.each(['ar', 'en', 'fr'] as const)('shows principal only for a zero-rate partial final payment in %s', lang => {
    const html = render(lang);
    const copy = UI_COPY[lang];
    expect(html).toContain(`<span>${copy.debtAmount}</span>`);
    expect(html).toContain(`<span>${copy.annualInterestRate}</span>`);
    expect(html).toContain(`<span>${copy.totalPaid}</span><strong>${formatMoney(1000, 'KWD', lang)}</strong>`);
    expect(html).toContain(`<span>${copy.estimatedInterest}</span><strong>${formatMoney(0, 'KWD', lang)}</strong>`);
  });

  it.each(['', '   ', '-1', 'invalid', 'Infinity'])('does not assume a rate of zero for %j', rate => {
    state.rate = rate;
    const html = render();
    expect(html).toContain(THEORY_CALCULATOR_TEXT.en.enterValues);
    expect(html).not.toContain('calculator-result-card');
  });

  it.each(['ar', 'en', 'fr'] as const)('shows the localized warning instead of unpayable totals in %s', lang => {
    for (const monthly of ['9', '10']) {
      Object.assign(state, { rate: '12', monthly });
      const html = render(lang);
      expect(html).toContain(UI_COPY[lang].debtPaymentTooLow);
      expect(html).not.toContain('calculator-result-card');
    }
  });

  it('hides overflowing totals instead of formatting them as zero', () => {
    Object.assign(state, { balance: '1e308', rate: '1200', monthly: '1.5e308' });
    const html = render();
    expect(html).toContain(THEORY_CALCULATOR_TEXT.en.enterValues);
    expect(html).not.toContain('calculator-result-card');
  });

  it('clears results when a previously explicit rate is emptied', () => {
    expect(render()).toContain('calculator-result-card');
    state.rate = '';
    expect(render()).not.toContain('calculator-result-card');
    state.rate = '0';
    expect(render()).toContain('calculator-result-card');
  });
});
