import type { DecisionInputs, DecisionType } from './decisionAnalysis';

export type DecisionTemplateField =
  | 'amount'
  | 'upfrontCashOutflow'
  | 'financingPrincipal'
  | 'monthlyPayment'
  | 'loanTermMonths'
  | 'recurringCost'
  | 'expectedMonthlyCost'
  | 'expectedMonthlyIncomeChange'
  | 'debtDirection'
  | 'debtPaydownAmount'
  | 'monthlyDebtPaymentReduction'
  | 'riskLevel'
  | 'expectedReturn'
  | 'alternativeAmount';

export type DecisionTemplate = {
  type: DecisionType;
  required: readonly DecisionTemplateField[];
  optional: readonly DecisionTemplateField[];
  supportsSimulation: boolean;
};

export const DECISION_TEMPLATES: Record<DecisionType, DecisionTemplate> = {
  purchase: {
    type: 'purchase',
    required: ['amount'],
    optional: ['upfrontCashOutflow', 'financingPrincipal', 'monthlyPayment', 'loanTermMonths', 'recurringCost', 'alternativeAmount'],
    supportsSimulation: true,
  },
  investment: {
    type: 'investment',
    required: ['amount', 'riskLevel'],
    optional: ['expectedReturn', 'alternativeAmount'],
    supportsSimulation: true,
  },
  project: {
    type: 'project',
    required: ['amount'],
    optional: ['upfrontCashOutflow', 'expectedMonthlyCost', 'expectedMonthlyIncomeChange', 'alternativeAmount'],
    supportsSimulation: true,
  },
  debt_saving: {
    type: 'debt_saving',
    required: ['amount', 'debtDirection'],
    optional: ['financingPrincipal', 'monthlyPayment', 'loanTermMonths', 'debtPaydownAmount', 'monthlyDebtPaymentReduction'],
    supportsSimulation: true,
  },
  charity_zakat: {
    type: 'charity_zakat',
    required: ['amount'],
    optional: [],
    supportsSimulation: false,
  },
  budget: {
    type: 'budget',
    required: ['amount'],
    optional: ['recurringCost', 'alternativeAmount'],
    supportsSimulation: false,
  },
};

function positive(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number > 0;
}

export function decisionTemplateFor(type: DecisionType) {
  return DECISION_TEMPLATES[type];
}

export function visibleDecisionFields(type: DecisionType, inputs?: Partial<DecisionInputs>) {
  const template = DECISION_TEMPLATES[type];
  const fields = new Set<DecisionTemplateField>([...template.required, ...template.optional]);

  if (type === 'purchase') {
    const financed = positive(inputs?.financingPrincipal) || positive(inputs?.monthlyPayment);
    if (!financed) {
      fields.delete('financingPrincipal');
      fields.delete('monthlyPayment');
      fields.delete('loanTermMonths');
    }
  }

  if (type === 'debt_saving') {
    if (inputs?.debtDirection === 'new_loan') {
      fields.delete('debtPaydownAmount');
      fields.delete('monthlyDebtPaymentReduction');
    } else if (inputs?.debtDirection === 'repay_debt') {
      fields.delete('financingPrincipal');
      fields.delete('monthlyPayment');
      fields.delete('loanTermMonths');
    }
  }

  return [...fields];
}

export function missingTemplateInputs(inputs: DecisionInputs) {
  const missing = new Set<DecisionTemplateField>();
  const template = DECISION_TEMPLATES[inputs.decisionType];

  for (const field of template.required) {
    if (field === 'riskLevel' || field === 'debtDirection') {
      if (!inputs[field]) missing.add(field);
      continue;
    }
    if (!positive(inputs[field])) missing.add(field);
  }

  if (inputs.decisionType === 'purchase') {
    const financed = positive(inputs.financingPrincipal) || positive(inputs.monthlyPayment);
    if (financed) {
      if (!positive(inputs.financingPrincipal)) missing.add('financingPrincipal');
      if (!positive(inputs.monthlyPayment)) missing.add('monthlyPayment');
      if (inputs.upfrontCashOutflow == null) missing.add('upfrontCashOutflow');
    }
  }

  if (inputs.decisionType === 'debt_saving' && inputs.debtDirection === 'new_loan') {
    if (!positive(inputs.financingPrincipal ?? inputs.debtAmount ?? inputs.amount)) missing.add('financingPrincipal');
    if (!positive(inputs.monthlyPayment)) missing.add('monthlyPayment');
  }

  if (inputs.decisionType === 'debt_saving' && inputs.debtDirection === 'repay_debt') {
    if (!positive(inputs.debtPaydownAmount ?? inputs.debtAmount ?? inputs.amount)) missing.add('debtPaydownAmount');
  }

  return [...missing];
}
