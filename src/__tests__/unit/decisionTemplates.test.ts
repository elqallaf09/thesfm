import { describe, expect, it } from 'vitest';
import { decisionTemplateFor, missingTemplateInputs, visibleDecisionFields } from '@/lib/decisions/decisionTemplates';

const base = {
  title: 'Decision',
  amount: 1000,
  currency: 'KWD',
  priority: 'medium' as const,
};

describe('decision templates', () => {
  it('keeps cash purchases simple until financing is selected', () => {
    expect(visibleDecisionFields('purchase', base as any)).not.toContain('financingPrincipal');
    expect(visibleDecisionFields('purchase', { ...base, financingPrincipal: 800 } as any)).toEqual(
      expect.arrayContaining(['financingPrincipal', 'monthlyPayment', 'loanTermMonths']),
    );
  });

  it('requires complete financed-purchase terms once financing is used', () => {
    const missing = missingTemplateInputs({
      ...base,
      decisionType: 'purchase',
      financingPrincipal: 800,
    });
    expect(missing).toEqual(expect.arrayContaining(['monthlyPayment', 'upfrontCashOutflow']));
  });

  it('switches debt fields by direction', () => {
    expect(visibleDecisionFields('debt_saving', { ...base, debtDirection: 'new_loan' } as any)).not.toContain('debtPaydownAmount');
    expect(visibleDecisionFields('debt_saving', { ...base, debtDirection: 'repay_debt' } as any)).not.toContain('financingPrincipal');
  });

  it('marks unsupported deterministic simulations explicitly', () => {
    expect(decisionTemplateFor('charity_zakat').supportsSimulation).toBe(false);
    expect(decisionTemplateFor('budget').supportsSimulation).toBe(false);
    expect(decisionTemplateFor('project').supportsSimulation).toBe(true);
  });
});
