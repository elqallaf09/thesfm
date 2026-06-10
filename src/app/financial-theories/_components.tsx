'use client';

import { CurrencySelect } from '@/components/CurrencySelect';
import Link from 'next/link';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ArrowUpRight, Calculator, ChevronDown, Lightbulb, RotateCcw, Target, X } from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import {
  type FinancialTheory, type FinancialTheoryLang, type TheoryCalculatorDefinition,
  THEORY_CALCULATOR_TEXT,
  getFinancialTheoryText, FINANCIAL_THEORY_CATEGORIES,
} from '@/lib/financial-theories';
import {
  type CalculatorId, type FinancialHealthSnapshot, type DebtRow,
  THEORY_ICONS, LEARNING_LEVELS,
  applyCopy, calculatorForTheory, commonMistakeCopy,
  financialHealthScore, formatPercent, ratioPercent, theoryLevel,
} from './_lib';

export function CalculatorField({
  label,
  value,
  onChange,
  min = 0,
  step = '0.01',
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  step?: string;
  suffix?: string;
}) {
  return (
    <label className="calculator-field">
      <span>{label}</span>
      <span className="calculator-input-wrap">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          onChange={event => onChange(event.target.value)}
        />
        {suffix ? <em>{suffix}</em> : null}
      </span>
    </label>
  );
}

export function ResultCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'strong' | 'warning' }) {
  return (
    <div className={`calculator-result-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


export function positiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function hasPositive(value: number | null) {
  return value !== null && value > 0;
}

export function monthlyPaymentForPrincipal(principal: number, annualRate: number, months: number) {
  if (principal <= 0 || months <= 0) return 0;
  const monthlyRate = Math.max(0, annualRate) / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  return principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
}

export function futureValue(initial: number, monthly: number, annualReturn: number, years: number) {
  const months = Math.max(0, Math.round(years * 12));
  const monthlyRate = Math.max(0, annualReturn) / 100 / 12;
  if (monthlyRate === 0) return initial + monthly * months;
  return initial * Math.pow(1 + monthlyRate, months) + monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

export function principalFromPayment(payment: number, annualRate: number, months: number) {
  if (payment <= 0 || months <= 0) return 0;
  const monthlyRate = Math.max(0, annualRate) / 100 / 12;
  if (monthlyRate === 0) return payment * months;
  return payment * (1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate;
}

export function formatDuration(months: number, copy: Record<string, string>) {
  const rounded = Math.max(0, Math.ceil(months));
  if (rounded < 12) return `${rounded} ${copy.months}`;
  const years = rounded / 12;
  return `${years.toFixed(years >= 10 ? 0 : 1)} ${copy.yearsUnit}`;
}

export function riskLabel(value: 'low' | 'medium' | 'high', copy: Record<string, string>) {
  if (value === 'low') return copy.low;
  if (value === 'medium') return copy.medium;
  return copy.high;
}

export function simulateDebtPayoff(rows: DebtRow[], extraPayment: number, strategy: 'snowball' | 'avalanche') {
  const debts = rows
    .map((row, index) => ({
      id: row.id,
      index,
      name: row.name || `#${index + 1}`,
      balance: positiveNumber(row.balance) ?? 0,
      rate: positiveNumber(row.rate) ?? 0,
      minimum: positiveNumber(row.minimum) ?? 0,
    }))
    .filter(debt => debt.balance > 0 && debt.minimum > 0);

  if (debts.length === 0) return null;

  let months = 0;
  let totalInterest = 0;
  let rollingExtra = Math.max(0, extraPayment);
  const activeDebts = debts.map(debt => ({ ...debt }));

  while (activeDebts.some(debt => debt.balance > 0.005) && months < 1200) {
    months += 1;
    let freedMinimums = 0;
    activeDebts.forEach(debt => {
      if (debt.balance <= 0) return;
      const interest = debt.balance * (debt.rate / 100 / 12);
      debt.balance += interest;
      totalInterest += interest;
      const basePayment = Math.min(debt.balance, debt.minimum);
      debt.balance -= basePayment;
      if (debt.balance <= 0.005) {
        freedMinimums += debt.minimum;
        debt.balance = 0;
      }
    });

    rollingExtra += freedMinimums;
    const target = activeDebts
      .filter(debt => debt.balance > 0.005)
      .sort((a, b) => strategy === 'snowball' ? a.balance - b.balance : b.rate - a.rate)[0];
    if (target && rollingExtra > 0) {
      const extra = Math.min(target.balance, rollingExtra);
      target.balance -= extra;
      if (target.balance <= 0.005) target.balance = 0;
    }
  }

  return { months, totalInterest, stalled: months >= 1200 };
}

export function ResultSection({
  copy,
  children,
  summary,
  interpretation,
  theory,
}: {
  copy: Record<string, string>;
  children: ReactNode;
  summary: string;
  interpretation: string;
  theory: string;
}) {
  return (
    <div className="calculator-results" role="status" aria-live="polite">
      <div className="calculator-list-card">
        <strong>{copy.inputSummary}</strong>
        <p>{summary}</p>
      </div>
      <div className="calculator-result-group">
        <strong>{copy.result}</strong>
        <div className="calculator-result-grid">{children}</div>
      </div>
      <div className="calculator-list-card">
        <strong>{copy.theoryConnection}</strong>
        <p>{theory}</p>
      </div>
      <div className="calculator-list-card">
        <strong>{copy.practicalInterpretation}</strong>
        <p>{interpretation}</p>
      </div>
      <p className="calculator-note">{copy.disclaimer}</p>
    </div>
  );
}

export function SmartCalculatorPanel({
  activeId,
  tool,
  lang,
  defaultCurrency,
  healthSnapshot,
  onClose,
}: {
  activeId: CalculatorId;
  tool: TheoryCalculatorDefinition;
  lang: FinancialTheoryLang;
  defaultCurrency: string;
  healthSnapshot: FinancialHealthSnapshot;
  onClose: () => void;
}) {
  const copy = THEORY_CALCULATOR_TEXT[lang];
  const [currency, setCurrency] = useState(defaultCurrency);
  const [compound, setCompound] = useState({ initial: '', monthly: '', returnRate: '', years: '' });
  const [loan, setLoan] = useState({ amount: '', rate: '', months: '', income: '' });
  const [fire, setFire] = useState({ savings: '', monthly: '', returnRate: '', spending: '', swr: '4' });
  const [rentBuy, setRentBuy] = useState({ assetType: 'home', price: '', down: '', rate: '', termYears: '', rent: '', maintenance: '', fees: '', returnRate: '', years: '' });
  const [affordability, setAffordability] = useState({ income: '', fixed: '', debts: '', purchase: '', down: '', termYears: '', rate: '' });
  const [opportunity, setOpportunity] = useState({ amount: '', returnRate: '', years: '', monthly: '' });
  const [debtRows, setDebtRows] = useState<DebtRow[]>([{ id: 'debt-1', name: '', balance: '', rate: '', minimum: '' }]);
  const [debtExtra, setDebtExtra] = useState('');
  const [riskAnswers, setRiskAnswers] = useState<Record<string, string>>({});
  const [health, setHealth] = useState({ income: '', expenses: '', savings: '', debts: '' });
  const [salarySplit, setSalarySplit] = useState({ income: '', needsPct: '50', wantsPct: '30', savingsPct: '20' });
  const [emergencyFund, setEmergencyFund] = useState({ monthlyExpenses: '', targetMonths: '6', currentSavings: '' });
  const [debtPlan, setDebtPlan] = useState({ balance: '', rate: '', monthly: '' });
  const [goalPlan, setGoalPlan] = useState({ target: '', current: '', months: '' });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function money(amount: number) {
    return formatMoney(Number.isFinite(amount) ? amount : 0, currency || 'KWD', lang);
  }

  function reset() {
    setCurrency(defaultCurrency);
    setCompound({ initial: '', monthly: '', returnRate: '', years: '' });
    setLoan({ amount: '', rate: '', months: '', income: '' });
    setFire({ savings: '', monthly: '', returnRate: '', spending: '', swr: '4' });
    setRentBuy({ assetType: 'home', price: '', down: '', rate: '', termYears: '', rent: '', maintenance: '', fees: '', returnRate: '', years: '' });
    setAffordability({ income: '', fixed: '', debts: '', purchase: '', down: '', termYears: '', rate: '' });
    setOpportunity({ amount: '', returnRate: '', years: '', monthly: '' });
    setDebtRows([{ id: 'debt-1', name: '', balance: '', rate: '', minimum: '' }]);
    setDebtExtra('');
    setRiskAnswers({});
    setHealth({ income: '', expenses: '', savings: '', debts: '' });
    setSalarySplit({ income: '', needsPct: '50', wantsPct: '30', savingsPct: '20' });
    setEmergencyFund({ monthlyExpenses: '', targetMonths: '6', currentSavings: '' });
  }

  function prefillIncome() {
    if (!healthSnapshot.hasIncome) return;
    const income = String(Math.round(healthSnapshot.income * 100) / 100);
    setLoan(prev => ({ ...prev, income }));
    setAffordability(prev => ({
      ...prev,
      income,
      fixed: healthSnapshot.hasExpenses ? String(Math.round(healthSnapshot.expenses * 100) / 100) : prev.fixed,
    }));
  }

  const relatedTheoryText = tool.relatedTheories.map(item => getFinancialTheoryText(item, lang)).join(' · ');

  // financial-health
  const healthIncome = positiveNumber(health.income);
  const healthExpenses = positiveNumber(health.expenses);
  const healthSavings = positiveNumber(health.savings);
  const healthDebts = positiveNumber(health.debts) ?? 0;
  const healthReady = hasPositive(healthIncome) && healthExpenses !== null && healthSavings !== null;
  const healthScore = healthReady ? financialHealthScore(healthIncome!, healthExpenses!, healthSavings!, healthDebts) : 0;
  const healthExpenseRatio = healthReady ? ratioPercent(healthExpenses! + healthDebts, healthIncome!) : 0;
  const healthSavingsRatio = healthReady ? ratioPercent(healthSavings!, healthIncome!) : 0;
  const healthEmergencyMonths = healthReady && healthExpenses! > 0 ? healthSavings! / healthExpenses! : 0;
  const healthNetFlow = healthReady ? healthIncome! - healthExpenses! - healthDebts : 0;

  // salary-split
  const splitIncome = positiveNumber(salarySplit.income);
  const splitNeedsPct = positiveNumber(salarySplit.needsPct) ?? 50;
  const splitWantsPct = positiveNumber(salarySplit.wantsPct) ?? 30;
  const splitSavingsPct = positiveNumber(salarySplit.savingsPct) ?? 20;
  const splitReady = hasPositive(splitIncome) && (splitNeedsPct + splitWantsPct + splitSavingsPct) <= 100;
  const splitNeeds = splitReady ? splitIncome! * splitNeedsPct / 100 : 0;
  const splitWants = splitReady ? splitIncome! * splitWantsPct / 100 : 0;
  const splitSavings = splitReady ? splitIncome! * splitSavingsPct / 100 : 0;

  // emergency-fund
  const emergMonthlyExp = positiveNumber(emergencyFund.monthlyExpenses);
  const emergTargetMonths = positiveNumber(emergencyFund.targetMonths) ?? 6;
  const emergCurrentSavings = positiveNumber(emergencyFund.currentSavings) ?? 0;
  const emergReady = hasPositive(emergMonthlyExp);
  const emergTarget = emergReady ? emergMonthlyExp! * emergTargetMonths : 0;
  const emergGap = emergReady ? Math.max(0, emergTarget - emergCurrentSavings) : 0;
  const emergMonthsCovered = emergReady && emergMonthlyExp! > 0 ? emergCurrentSavings / emergMonthlyExp! : 0;
  // debt-plan
  const debtPlanBalance = positiveNumber(debtPlan.balance);
  const debtPlanRate = positiveNumber(debtPlan.rate) ?? 0;
  const debtPlanMonthly = positiveNumber(debtPlan.monthly);
  const debtPlanReady = hasPositive(debtPlanBalance) && hasPositive(debtPlanMonthly);
  const debtPlanMonthlyRate = debtPlanRate / 100 / 12;
  const debtPlanMonths = debtPlanReady && debtPlanMonthly! > debtPlanBalance! * debtPlanMonthlyRate
    ? Math.ceil(debtPlanMonthlyRate > 0
        ? -Math.log(1 - (debtPlanBalance! * debtPlanMonthlyRate) / debtPlanMonthly!) / Math.log(1 + debtPlanMonthlyRate)
        : debtPlanBalance! / debtPlanMonthly!)
    : null;
  const debtPlanTotalPaid = debtPlanMonths !== null ? debtPlanMonths * debtPlanMonthly! : null;
  const debtPlanTotalInterest = debtPlanTotalPaid !== null ? debtPlanTotalPaid - debtPlanBalance! : null;
  // goal-plan
  const goalPlanTarget = positiveNumber(goalPlan.target);
  const goalPlanCurrent = positiveNumber(goalPlan.current) ?? 0;
  const goalPlanMonths = positiveNumber(goalPlan.months);
  const goalPlanReady = hasPositive(goalPlanTarget) && hasPositive(goalPlanMonths);
  const goalPlanRemaining = goalPlanReady ? Math.max(0, goalPlanTarget! - goalPlanCurrent) : 0;
  const goalPlanMonthly = goalPlanReady ? goalPlanRemaining / goalPlanMonths! : 0;
  const goalComplete = goalPlanReady && goalPlanCurrent >= goalPlanTarget!;
  const compoundValues = {
    initial: positiveNumber(compound.initial),
    monthly: positiveNumber(compound.monthly),
    returnRate: positiveNumber(compound.returnRate),
    years: positiveNumber(compound.years),
  };
  const compoundReady = compoundValues.initial !== null && compoundValues.monthly !== null && compoundValues.returnRate !== null && hasPositive(compoundValues.years);
  const compoundFinal = compoundReady ? futureValue(compoundValues.initial!, compoundValues.monthly!, compoundValues.returnRate!, compoundValues.years!) : 0;
  const compoundContributions = compoundReady ? compoundValues.initial! + compoundValues.monthly! * compoundValues.years! * 12 : 0;

  const loanPrincipal = positiveNumber(loan.amount);
  const loanRate = positiveNumber(loan.rate);
  const loanMonths = positiveNumber(loan.months);
  const loanIncome = positiveNumber(loan.income);
  const loanReady = hasPositive(loanPrincipal) && loanRate !== null && hasPositive(loanMonths) && hasPositive(loanIncome);
  const loanPayment = loanReady ? monthlyPaymentForPrincipal(loanPrincipal!, loanRate!, loanMonths!) : 0;
  const loanTotal = loanPayment * (loanMonths ?? 0);
  const loanDti = loanReady ? ratioPercent(loanPayment, loanIncome!) : 0;
  const loanRisk = loanDti <= 25 ? 'low' : loanDti <= 40 ? 'medium' : 'high';

  const fireSavings = positiveNumber(fire.savings);
  const fireMonthly = positiveNumber(fire.monthly);
  const fireReturn = positiveNumber(fire.returnRate);
  const fireSpending = positiveNumber(fire.spending);
  const fireSwr = positiveNumber(fire.swr);
  const fireReady = fireSavings !== null && fireMonthly !== null && fireReturn !== null && hasPositive(fireSpending) && hasPositive(fireSwr);
  const fireTarget = fireReady ? fireSpending! * 12 / (fireSwr! / 100) : 0;
  let fireMonths = 0;
  if (fireReady && fireTarget > fireSavings!) {
    let balance = fireSavings!;
    const monthlyRate = fireReturn! / 100 / 12;
    while (balance < fireTarget && fireMonths < 1200) {
      balance = balance * (1 + monthlyRate) + fireMonthly!;
      fireMonths += 1;
    }
  }
  const fifteenYearRate = fireReady ? fireReturn! / 100 / 12 : 0;
  const fifteenYearMonths = 180;
  const suggestedFireMonthly = fireReady && fireTarget > 0
    ? Math.max(0, (fireTarget - fireSavings! * Math.pow(1 + fifteenYearRate, fifteenYearMonths)) * (fifteenYearRate || 1 / fifteenYearMonths) / (fifteenYearRate ? Math.pow(1 + fifteenYearRate, fifteenYearMonths) - 1 : 1))
    : 0;

  const rentBuyNumbers = {
    price: positiveNumber(rentBuy.price),
    down: positiveNumber(rentBuy.down),
    rate: positiveNumber(rentBuy.rate),
    termYears: positiveNumber(rentBuy.termYears),
    rent: positiveNumber(rentBuy.rent),
    maintenance: positiveNumber(rentBuy.maintenance),
    fees: positiveNumber(rentBuy.fees),
    returnRate: positiveNumber(rentBuy.returnRate),
    years: positiveNumber(rentBuy.years),
  };
  const rentBuyReady = hasPositive(rentBuyNumbers.price) && rentBuyNumbers.down !== null && rentBuyNumbers.rate !== null && hasPositive(rentBuyNumbers.termYears) && hasPositive(rentBuyNumbers.rent) && rentBuyNumbers.maintenance !== null && rentBuyNumbers.fees !== null && rentBuyNumbers.returnRate !== null && hasPositive(rentBuyNumbers.years);
  const buyMonths = rentBuyReady ? Math.min(rentBuyNumbers.years! * 12, rentBuyNumbers.termYears! * 12) : 0;
  const buyPayment = rentBuyReady ? monthlyPaymentForPrincipal(Math.max(0, rentBuyNumbers.price! - rentBuyNumbers.down!), rentBuyNumbers.rate!, rentBuyNumbers.termYears! * 12) : 0;
  const buyingCost = rentBuyReady ? rentBuyNumbers.down! + buyPayment * buyMonths + (rentBuyNumbers.maintenance! + rentBuyNumbers.fees!) * rentBuyNumbers.years! * 12 : 0;
  const rentingCost = rentBuyReady ? rentBuyNumbers.rent! * rentBuyNumbers.years! * 12 : 0;
  const rentOpportunityCost = rentBuyReady ? Math.max(0, futureValue(rentBuyNumbers.down!, 0, rentBuyNumbers.returnRate!, rentBuyNumbers.years!) - rentBuyNumbers.down!) : 0;
  const rentDifference = buyingCost + rentOpportunityCost - rentingCost;
  const rentRecommendation = rentDifference < -rentingCost * 0.05 ? copy.buy : rentDifference > rentingCost * 0.05 ? copy.rent : copy.neutral;

  const affordableNumbers = {
    income: positiveNumber(affordability.income),
    fixed: positiveNumber(affordability.fixed),
    debts: positiveNumber(affordability.debts),
    purchase: positiveNumber(affordability.purchase),
    down: positiveNumber(affordability.down),
    termYears: positiveNumber(affordability.termYears),
    rate: positiveNumber(affordability.rate),
  };
  const affordabilityReady = hasPositive(affordableNumbers.income) && affordableNumbers.fixed !== null && affordableNumbers.debts !== null && hasPositive(affordableNumbers.purchase) && affordableNumbers.down !== null && hasPositive(affordableNumbers.termYears) && affordableNumbers.rate !== null;
  const affordabilityPayment = affordabilityReady ? monthlyPaymentForPrincipal(Math.max(0, affordableNumbers.purchase! - affordableNumbers.down!), affordableNumbers.rate!, affordableNumbers.termYears! * 12) : 0;
  const remainingCashFlow = affordabilityReady ? affordableNumbers.income! - affordableNumbers.fixed! - affordableNumbers.debts! - affordabilityPayment : 0;
  const affordabilityDti = affordabilityReady ? ratioPercent(affordableNumbers.debts! + affordabilityPayment, affordableNumbers.income!) : 0;
  const affordableRisk = affordabilityDti <= 35 ? 'low' : affordabilityDti <= 45 ? 'medium' : 'high';
  const affordableLimit = affordabilityReady ? principalFromPayment(Math.max(0, affordableNumbers.income! * 0.35 - affordableNumbers.debts!), affordableNumbers.rate!, affordableNumbers.termYears! * 12) + affordableNumbers.down! : 0;
  const affordabilityRecommendation = !affordabilityReady ? '' : affordabilityDti <= 35 && remainingCashFlow > 0 ? copy.affordable : affordabilityDti <= 45 && remainingCashFlow >= 0 ? copy.borderline : copy.notRecommended;

  const opportunityAmount = positiveNumber(opportunity.amount);
  const opportunityReturn = positiveNumber(opportunity.returnRate);
  const opportunityYears = positiveNumber(opportunity.years);
  const opportunityMonthly = positiveNumber(opportunity.monthly);
  const opportunityReady = hasPositive(opportunityAmount) && opportunityReturn !== null && hasPositive(opportunityYears) && opportunityMonthly !== null;
  const opportunityFuture = opportunityReady ? futureValue(opportunityAmount!, opportunityMonthly!, opportunityReturn!, opportunityYears!) : 0;
  const opportunityContributions = opportunityReady ? opportunityAmount! + opportunityMonthly! * opportunityYears! * 12 : 0;

  const extraPayment = positiveNumber(debtExtra) ?? 0;
  const snowballResult = simulateDebtPayoff(debtRows, extraPayment, 'snowball');
  const avalancheResult = simulateDebtPayoff(debtRows, extraPayment, 'avalanche');
  const debtReady = Boolean(snowballResult && avalancheResult && !snowballResult.stalled && !avalancheResult.stalled);
  const debtRecommended = debtReady && avalancheResult!.totalInterest <= snowballResult!.totalInterest ? copy.avalanche : copy.snowball;

  const riskQuestions = [
    { id: 'goal', label: copy.questionGoal, answers: [[copy.answerSafety, 1], [copy.answerBalance, 2], [copy.answerGrowth, 3], [copy.answerMaxGrowth, 4]] },
    { id: 'horizon', label: copy.questionHorizon, answers: [[copy.answerShort, 1], [copy.answerMedium, 2], [copy.answerLong, 3], [copy.answerVeryLong, 4]] },
    { id: 'loss', label: copy.questionLoss, answers: [[copy.answerSell, 1], [copy.answerWait, 2], [copy.answerBuyMore, 4]] },
    { id: 'emergency', label: copy.questionEmergency, answers: [[copy.answerNone, 1], [copy.answerPartial, 2], [copy.answerStrong, 4]] },
    { id: 'income', label: copy.questionIncome, answers: [[copy.answerUnstable, 1], [copy.answerStable, 3], [copy.answerVeryStable, 4]] },
    { id: 'experience', label: copy.questionExperience, answers: [[copy.answerBeginner, 1], [copy.answerSome, 3], [copy.answerAdvanced, 4]] },
    { id: 'preference', label: copy.questionPreference, answers: [[copy.answerSafety, 1], [copy.answerBalance, 2], [copy.answerGrowth, 3], [copy.answerMaxGrowth, 4]] },
    { id: 'liquidity', label: copy.questionLiquidity, answers: [[copy.answerNeedLiquidity, 1], [copy.answerBalance, 2], [copy.answerCanLock, 4]] },
  ] as const;
  const riskReady = riskQuestions.every(question => riskAnswers[question.id]);
  const riskScore = riskReady ? riskQuestions.reduce((total, question) => total + Number(riskAnswers[question.id]), 0) / riskQuestions.length : 0;
  const riskProfile = riskScore <= 1.75 ? copy.conservative : riskScore <= 2.5 ? copy.balanced : riskScore <= 3.25 ? copy.growth : copy.aggressive;
  const riskAllocation = riskScore <= 1.75 ? copy.allocationConservative : riskScore <= 2.5 ? copy.allocationBalanced : riskScore <= 3.25 ? copy.allocationGrowth : copy.allocationAggressive;

  return (
    <section className="calculator-panel" aria-labelledby="smart-calculator-title">
      <div className="calculator-panel-head">
        <div>
          <span>{copy.calculatorTitle}</span>
          <h3 id="smart-calculator-title">{getFinancialTheoryText(tool.title, lang)}</h3>
          <p>{copy.calculatorIntro}</p>
        </div>
        <button type="button" className="calculator-close" onClick={onClose} aria-label={copy.close}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="calculator-layout">
        <div className="calculator-form-grid">
          {activeId !== 'risk-tolerance' ? (
            <CurrencySelect value={currency} onChange={setCurrency} lang={lang} label={copy.currency} ariaLabel={copy.currency} />
          ) : null}

          {activeId === 'compound-interest' ? (
            <>
              <CalculatorField label={copy.initialAmount} value={compound.initial} onChange={value => setCompound(prev => ({ ...prev, initial: value }))} />
              <CalculatorField label={copy.monthlyContribution} value={compound.monthly} onChange={value => setCompound(prev => ({ ...prev, monthly: value }))} />
              <CalculatorField label={copy.annualReturn} value={compound.returnRate} onChange={value => setCompound(prev => ({ ...prev, returnRate: value }))} suffix="%" />
              <CalculatorField label={copy.years} value={compound.years} onChange={value => setCompound(prev => ({ ...prev, years: value }))} step="1" />
            </>
          ) : null}

          {activeId === 'loan-financing' ? (
            <>
              <CalculatorField label={copy.loanAmount} value={loan.amount} onChange={value => setLoan(prev => ({ ...prev, amount: value }))} />
              <CalculatorField label={copy.annualRate} value={loan.rate} onChange={value => setLoan(prev => ({ ...prev, rate: value }))} suffix="%" />
              <CalculatorField label={copy.termMonths} value={loan.months} onChange={value => setLoan(prev => ({ ...prev, months: value }))} step="1" />
              <CalculatorField label={copy.monthlyIncome} value={loan.income} onChange={value => setLoan(prev => ({ ...prev, income: value }))} />
              <button type="button" className="calculator-prefill" onClick={prefillIncome} disabled={!healthSnapshot.hasIncome}>{copy.monthlyIncome}</button>
            </>
          ) : null}

          {activeId === 'retirement-fire' ? (
            <>
              <CalculatorField label={copy.currentSavings} value={fire.savings} onChange={value => setFire(prev => ({ ...prev, savings: value }))} />
              <CalculatorField label={copy.monthlyInvestment} value={fire.monthly} onChange={value => setFire(prev => ({ ...prev, monthly: value }))} />
              <CalculatorField label={copy.annualReturn} value={fire.returnRate} onChange={value => setFire(prev => ({ ...prev, returnRate: value }))} suffix="%" />
              <CalculatorField label={copy.retirementSpending} value={fire.spending} onChange={value => setFire(prev => ({ ...prev, spending: value }))} />
              <CalculatorField label={copy.safeWithdrawalRate} value={fire.swr} onChange={value => setFire(prev => ({ ...prev, swr: value }))} suffix="%" />
            </>
          ) : null}

          {activeId === 'rent-vs-buy' ? (
            <>
              <label className="calculator-field">
                <span>{copy.assetType}</span>
                <select value={rentBuy.assetType} onChange={event => setRentBuy(prev => ({ ...prev, assetType: event.target.value }))}>
                  <option value="home">{copy.home}</option>
                  <option value="car">{copy.car}</option>
                  <option value="other">{copy.other}</option>
                </select>
              </label>
              <CalculatorField label={copy.purchasePrice} value={rentBuy.price} onChange={value => setRentBuy(prev => ({ ...prev, price: value }))} />
              <CalculatorField label={copy.downPayment} value={rentBuy.down} onChange={value => setRentBuy(prev => ({ ...prev, down: value }))} />
              <CalculatorField label={copy.annualRate} value={rentBuy.rate} onChange={value => setRentBuy(prev => ({ ...prev, rate: value }))} suffix="%" />
              <CalculatorField label={copy.termYears} value={rentBuy.termYears} onChange={value => setRentBuy(prev => ({ ...prev, termYears: value }))} step="1" />
              <CalculatorField label={copy.rentAlternative} value={rentBuy.rent} onChange={value => setRentBuy(prev => ({ ...prev, rent: value }))} />
              <CalculatorField label={copy.maintenance} value={rentBuy.maintenance} onChange={value => setRentBuy(prev => ({ ...prev, maintenance: value }))} />
              <CalculatorField label={copy.insuranceFees} value={rentBuy.fees} onChange={value => setRentBuy(prev => ({ ...prev, fees: value }))} />
              <CalculatorField label={copy.investmentReturn} value={rentBuy.returnRate} onChange={value => setRentBuy(prev => ({ ...prev, returnRate: value }))} suffix="%" />
              <CalculatorField label={copy.periodYears} value={rentBuy.years} onChange={value => setRentBuy(prev => ({ ...prev, years: value }))} step="1" />
            </>
          ) : null}

          {activeId === 'affordability' ? (
            <>
              <CalculatorField label={copy.monthlyIncome} value={affordability.income} onChange={value => setAffordability(prev => ({ ...prev, income: value }))} />
              <CalculatorField label={copy.fixedExpenses} value={affordability.fixed} onChange={value => setAffordability(prev => ({ ...prev, fixed: value }))} />
              <CalculatorField label={copy.existingDebtPayments} value={affordability.debts} onChange={value => setAffordability(prev => ({ ...prev, debts: value }))} />
              <CalculatorField label={copy.purchaseAmount} value={affordability.purchase} onChange={value => setAffordability(prev => ({ ...prev, purchase: value }))} />
              <CalculatorField label={copy.downPayment} value={affordability.down} onChange={value => setAffordability(prev => ({ ...prev, down: value }))} />
              <CalculatorField label={copy.termYears} value={affordability.termYears} onChange={value => setAffordability(prev => ({ ...prev, termYears: value }))} step="1" />
              <CalculatorField label={copy.annualRate} value={affordability.rate} onChange={value => setAffordability(prev => ({ ...prev, rate: value }))} suffix="%" />
              <button type="button" className="calculator-prefill" onClick={prefillIncome} disabled={!healthSnapshot.hasIncome}>{copy.monthlyIncome}</button>
            </>
          ) : null}

          {activeId === 'opportunity-cost' ? (
            <>
              <CalculatorField label={copy.spendingAmount} value={opportunity.amount} onChange={value => setOpportunity(prev => ({ ...prev, amount: value }))} />
              <CalculatorField label={copy.annualReturn} value={opportunity.returnRate} onChange={value => setOpportunity(prev => ({ ...prev, returnRate: value }))} suffix="%" />
              <CalculatorField label={copy.years} value={opportunity.years} onChange={value => setOpportunity(prev => ({ ...prev, years: value }))} step="1" />
              <CalculatorField label={copy.monthlyContribution} value={opportunity.monthly} onChange={value => setOpportunity(prev => ({ ...prev, monthly: value }))} />
            </>
          ) : null}

          {activeId === 'debt-payoff' ? (
            <div className="debt-payoff-fields">
              {debtRows.map((row, index) => (
                <div className="debt-row-card" key={row.id}>
                  <label className="calculator-field">
                    <span>{copy.debtName}</span>
                    <input value={row.name} onChange={event => setDebtRows(prev => prev.map(item => item.id === row.id ? { ...item, name: event.target.value } : item))} />
                  </label>
                  <CalculatorField label={copy.balance} value={row.balance} onChange={value => setDebtRows(prev => prev.map(item => item.id === row.id ? { ...item, balance: value } : item))} />
                  <CalculatorField label={copy.annualRate} value={row.rate} onChange={value => setDebtRows(prev => prev.map(item => item.id === row.id ? { ...item, rate: value } : item))} suffix="%" />
                  <CalculatorField label={copy.minimumPayment} value={row.minimum} onChange={value => setDebtRows(prev => prev.map(item => item.id === row.id ? { ...item, minimum: value } : item))} />
                  {debtRows.length > 1 ? (
                    <button type="button" className="calculator-remove" onClick={() => setDebtRows(prev => prev.filter(item => item.id !== row.id))}>{copy.remove}</button>
                  ) : null}
                </div>
              ))}
              <CalculatorField label={copy.extraMonthlyPayment} value={debtExtra} onChange={setDebtExtra} />
              <button type="button" className="calculator-prefill" onClick={() => setDebtRows(prev => [...prev, { id: `debt-${prev.length + 1}-${Date.now()}`, name: '', balance: '', rate: '', minimum: '' }])}>{copy.addDebt}</button>
            </div>
          ) : null}

          {activeId === 'financial-health' ? (
            <>
              <CalculatorField label={copy.monthlyIncome} value={health.income} onChange={value => setHealth(prev => ({ ...prev, income: value }))} />
              <CalculatorField label={copy.monthlyExpenses} value={health.expenses} onChange={value => setHealth(prev => ({ ...prev, expenses: value }))} />
              <CalculatorField label={copy.currentSavings} value={health.savings} onChange={value => setHealth(prev => ({ ...prev, savings: value }))} />
              <CalculatorField label={lang === 'ar' ? 'إجمالي الالتزامات الشهرية' : lang === 'fr' ? 'Dettes mensuelles totales' : 'Total Monthly Debts'} value={health.debts} onChange={value => setHealth(prev => ({ ...prev, debts: value }))} />
              <button type="button" className="calculator-prefill" onClick={() => { if (healthSnapshot.hasIncome) setHealth(prev => ({ ...prev, income: String(Math.round(healthSnapshot.income * 100) / 100) })); }} disabled={!healthSnapshot.hasIncome}>{copy.monthlyIncome}</button>
            </>
          ) : null}

          {activeId === 'salary-split' ? (
            <>
              <CalculatorField label={copy.monthlyIncome} value={salarySplit.income} onChange={value => setSalarySplit(prev => ({ ...prev, income: value }))} />
              <CalculatorField label={copy.needs} value={salarySplit.needsPct} onChange={value => setSalarySplit(prev => ({ ...prev, needsPct: value }))} suffix="%" step="1" />
              <CalculatorField label={copy.wants} value={salarySplit.wantsPct} onChange={value => setSalarySplit(prev => ({ ...prev, wantsPct: value }))} suffix="%" step="1" />
              <CalculatorField label={copy.savingsInvestingDebt} value={salarySplit.savingsPct} onChange={value => setSalarySplit(prev => ({ ...prev, savingsPct: value }))} suffix="%" step="1" />
              <button type="button" className="calculator-prefill" onClick={() => { if (healthSnapshot.hasIncome) setSalarySplit(prev => ({ ...prev, income: String(Math.round(healthSnapshot.income * 100) / 100) })); }} disabled={!healthSnapshot.hasIncome}>{copy.monthlyIncome}</button>
            </>
          ) : null}

          {activeId === 'emergency-fund' ? (
            <>
              <CalculatorField label={copy.monthlyExpenses} value={emergencyFund.monthlyExpenses} onChange={value => setEmergencyFund(prev => ({ ...prev, monthlyExpenses: value }))} />
              <CalculatorField label={copy.monthsCount} value={emergencyFund.targetMonths} onChange={value => setEmergencyFund(prev => ({ ...prev, targetMonths: value }))} step="1" />
              <CalculatorField label={copy.currentSavings} value={emergencyFund.currentSavings} onChange={value => setEmergencyFund(prev => ({ ...prev, currentSavings: value }))} />
            </>
          ) : null}

          {activeId === 'debt-plan' ? (
            <>
              <CalculatorField label={copy.debtAmount} value={debtPlan.balance} onChange={value => setDebtPlan(prev => ({ ...prev, balance: value }))} />
              <CalculatorField label={copy.annualInterestRate} value={debtPlan.rate} onChange={value => setDebtPlan(prev => ({ ...prev, rate: value }))} suffix="%" />
              <CalculatorField label={copy.monthlyPayment} value={debtPlan.monthly} onChange={value => setDebtPlan(prev => ({ ...prev, monthly: value }))} />
            </>
          ) : null}

          {activeId === 'goal-plan' ? (
            <>
              <CalculatorField label={copy.targetAmount} value={goalPlan.target} onChange={value => setGoalPlan(prev => ({ ...prev, target: value }))} />
              <CalculatorField label={copy.currentAmount} value={goalPlan.current} onChange={value => setGoalPlan(prev => ({ ...prev, current: value }))} />
              <CalculatorField label={copy.monthsRemaining} value={goalPlan.months} onChange={value => setGoalPlan(prev => ({ ...prev, months: value }))} step="1" />
            </>
          ) : null}

          {activeId === 'risk-tolerance' ? (
            <div className="risk-question-list">
              {riskQuestions.map(question => (
                <fieldset className="risk-question" key={question.id}>
                  <legend>{question.label}</legend>
                  <div>
                    {question.answers.map(([label, score]) => (
                      <button
                        type="button"
                        key={label}
                        className={riskAnswers[question.id] === String(score) ? 'selected' : ''}
                        onClick={() => setRiskAnswers(prev => ({ ...prev, [question.id]: String(score) }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          ) : null}
        </div>

        {activeId === 'compound-interest' ? (
          compoundReady ? (
            <ResultSection copy={copy} summary={`${copy.initialAmount}: ${money(compoundValues.initial!)} · ${copy.monthlyContribution}: ${money(compoundValues.monthly!)} · ${copy.years}: ${compoundValues.years}`} theory={relatedTheoryText} interpretation={getFinancialTheoryText(tool.description, lang)}>
              <ResultCard label={copy.finalAmount} value={money(compoundFinal)} tone="strong" />
              <ResultCard label={copy.totalContributions} value={money(compoundContributions)} />
              <ResultCard label={copy.growthProfit} value={money(compoundFinal - compoundContributions)} />
              <ResultCard label={copy.ruleOf72} value={compoundValues.returnRate! > 0 ? formatDuration((72 / compoundValues.returnRate!) * 12, copy) : copy.notCalculable} />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'loan-financing' ? (
          loanReady ? (
            <ResultSection copy={copy} summary={`${copy.loanAmount}: ${money(loanPrincipal!)} · ${copy.termMonths}: ${loanMonths} · ${copy.monthlyIncome}: ${money(loanIncome!)}`} theory={relatedTheoryText} interpretation={riskLabel(loanRisk, copy)}>
              <ResultCard label={copy.monthlyPayment} value={money(loanPayment)} tone="strong" />
              <ResultCard label={copy.totalRepayment} value={money(loanTotal)} />
              <ResultCard label={copy.interestCost} value={money(Math.max(0, loanTotal - loanPrincipal!))} />
              <ResultCard label={copy.dti} value={formatPercent(loanDti, lang)} tone={loanRisk === 'high' ? 'warning' : 'default'} />
              <ResultCard label={copy.risk} value={riskLabel(loanRisk, copy)} />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'retirement-fire' ? (
          fireReady ? (
            <ResultSection copy={copy} summary={`${copy.currentSavings}: ${money(fireSavings!)} · ${copy.monthlyInvestment}: ${money(fireMonthly!)} · ${copy.safeWithdrawalRate}: ${formatPercent(fireSwr!, lang)}`} theory={relatedTheoryText} interpretation={fireMonths >= 1200 ? copy.notCalculable : formatDuration(fireMonths, copy)}>
              <ResultCard label={copy.fireTarget} value={money(fireTarget)} tone="strong" />
              <ResultCard label={copy.estimatedYears} value={fireSavings! >= fireTarget ? formatDuration(0, copy) : fireMonths >= 1200 ? copy.notCalculable : formatDuration(fireMonths, copy)} />
              <ResultCard label={copy.progress} value={formatPercent(Math.min(100, ratioPercent(fireSavings!, fireTarget)), lang)} />
              <ResultCard label={copy.suggestedMonthlyInvestment} value={money(suggestedFireMonthly)} />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'rent-vs-buy' ? (
          rentBuyReady ? (
            <ResultSection copy={copy} summary={`${copy.purchasePrice}: ${money(rentBuyNumbers.price!)} · ${copy.downPayment}: ${money(rentBuyNumbers.down!)} · ${copy.rentAlternative}: ${money(rentBuyNumbers.rent!)}`} theory={relatedTheoryText} interpretation={rentRecommendation}>
              <ResultCard label={copy.buyingCost} value={money(buyingCost)} tone="strong" />
              <ResultCard label={copy.rentingCost} value={money(rentingCost)} />
              <ResultCard label={copy.opportunityCost} value={money(rentOpportunityCost)} />
              <ResultCard label={copy.difference} value={money(Math.abs(rentDifference))} />
              <ResultCard label={copy.recommendation} value={rentRecommendation} tone={rentRecommendation === copy.neutral ? 'default' : 'strong'} />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'affordability' ? (
          affordabilityReady ? (
            <ResultSection copy={copy} summary={`${copy.monthlyIncome}: ${money(affordableNumbers.income!)} · ${copy.purchaseAmount}: ${money(affordableNumbers.purchase!)} · ${copy.existingDebtPayments}: ${money(affordableNumbers.debts!)}`} theory={relatedTheoryText} interpretation={affordabilityRecommendation}>
              <ResultCard label={copy.monthlyPayment} value={money(affordabilityPayment)} tone="strong" />
              <ResultCard label={copy.remainingCashFlow} value={money(remainingCashFlow)} tone={remainingCashFlow < 0 ? 'warning' : 'default'} />
              <ResultCard label={copy.dti} value={formatPercent(affordabilityDti, lang)} tone={affordableRisk === 'high' ? 'warning' : 'default'} />
              <ResultCard label={copy.safePurchaseLimit} value={money(affordableLimit)} />
              <ResultCard label={copy.risk} value={riskLabel(affordableRisk, copy)} />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'opportunity-cost' ? (
          opportunityReady ? (
            <ResultSection copy={copy} summary={`${copy.spendingAmount}: ${money(opportunityAmount!)} · ${copy.years}: ${opportunityYears} · ${copy.annualReturn}: ${formatPercent(opportunityReturn!, lang)}`} theory={relatedTheoryText} interpretation={money(Math.max(0, opportunityFuture - opportunityContributions))}>
              <ResultCard label={copy.futureValueIfInvested} value={money(opportunityFuture)} tone="strong" />
              <ResultCard label={copy.contributions} value={money(opportunityContributions)} />
              <ResultCard label={copy.growthProfit} value={money(Math.max(0, opportunityFuture - opportunityContributions))} />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'debt-payoff' ? (
          debtReady ? (
            <ResultSection copy={copy} summary={`${copy.extraMonthlyPayment}: ${money(extraPayment)} · ${copy.debtName}: ${debtRows.filter(row => hasPositive(positiveNumber(row.balance))).length}`} theory={relatedTheoryText} interpretation={debtRecommended}>
              <ResultCard label={`${copy.snowball} - ${copy.payoffTime}`} value={formatDuration(snowballResult!.months, copy)} />
              <ResultCard label={`${copy.snowball} - ${copy.totalInterest}`} value={money(snowballResult!.totalInterest)} />
              <ResultCard label={`${copy.avalanche} - ${copy.payoffTime}`} value={formatDuration(avalancheResult!.months, copy)} tone="strong" />
              <ResultCard label={`${copy.avalanche} - ${copy.totalInterest}`} value={money(avalancheResult!.totalInterest)} />
              <ResultCard label={copy.interestSaved} value={money(Math.abs(snowballResult!.totalInterest - avalancheResult!.totalInterest))} />
              <ResultCard label={copy.recommendedStrategy} value={debtRecommended} tone="strong" />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'debt-plan' ? (
          debtPlanReady && debtPlanMonths !== null ? (
            <ResultSection copy={copy} summary={`${copy.debtAmount}: ${money(debtPlanBalance!)} · ${copy.monthlyPayment}: ${money(debtPlanMonthly!)}`} theory={relatedTheoryText} interpretation={copy.simplifiedEstimateNote}>
              <ResultCard label={copy.estimatedMonths} value={formatDuration(debtPlanMonths, copy)} />
              <ResultCard label={copy.totalPaid} value={money(debtPlanTotalPaid!)} />
              <ResultCard label={copy.estimatedInterest} value={money(debtPlanTotalInterest!)} tone={debtPlanTotalInterest! > debtPlanBalance! * 0.2 ? 'warning' : 'default'} />
            </ResultSection>
          ) : debtPlanReady ? (
            <p className="calculator-error">{copy.debtPaymentTooLow}</p>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'goal-plan' ? (
          goalPlanReady ? (
            goalComplete ? (
              <ResultSection copy={copy} summary={`${copy.targetAmount}: ${money(goalPlanTarget!)} · ${copy.currentAmount}: ${money(goalPlanCurrent)}`} theory={relatedTheoryText} interpretation={copy.goalComplete}>
                <ResultCard label={copy.monthlyRequired} value={money(0)} tone="strong" />
                <ResultCard label={copy.monthsRemaining} value={String(Math.round(Number(goalPlan.months)))} />
              </ResultSection>
            ) : (
              <ResultSection copy={copy} summary={`${copy.targetAmount}: ${money(goalPlanTarget!)} · ${copy.monthsRemaining}: ${goalPlan.months}`} theory={relatedTheoryText} interpretation={goalPlanMonthly > 0 ? copy.goalLooksRealistic : copy.goalNeedsAdjustment}>
                <ResultCard label={copy.monthlyRequired} value={money(goalPlanMonthly)} tone={goalPlanMonthly > 0 ? 'strong' : 'warning'} />
                <ResultCard label={copy.remainingAmount} value={money(goalPlanRemaining)} />
              </ResultSection>
            )
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'risk-tolerance' ? (
          riskReady ? (
            <ResultSection copy={copy} summary={`${copy.progress}: ${formatPercent((riskQuestions.filter(question => riskAnswers[question.id]).length / riskQuestions.length) * 100, lang)}`} theory={relatedTheoryText} interpretation={riskAllocation}>
              <ResultCard label={copy.risk} value={riskProfile} tone="strong" />
              <ResultCard label={copy.progress} value={formatPercent((riskScore / 4) * 100, lang)} />
              <div className="calculator-list-card calculator-wide">
                <strong>{copy.recommendation}</strong>
                <p>{riskAllocation}</p>
              </div>
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'financial-health' ? (
          healthReady ? (
            <ResultSection copy={copy} summary={`${copy.monthlyIncome}: ${money(healthIncome!)} · ${copy.monthlyExpenses}: ${money(healthExpenses!)} · ${copy.currentSavings}: ${money(healthSavings!)}`} theory={relatedTheoryText} interpretation={copy.financialHealthScore}>
              <ResultCard label={copy.financialHealthScore} value={`${healthScore}/100`} tone={healthScore >= 60 ? 'strong' : healthScore >= 40 ? 'default' : 'warning'} />
              <ResultCard label={lang === 'ar' ? 'نسبة المصروفات' : lang === 'fr' ? 'Taux de dépenses' : 'Expense Ratio'} value={formatPercent(healthExpenseRatio, lang)} tone={healthExpenseRatio > 80 ? 'warning' : 'default'} />
              <ResultCard label={copy.savingsRatio} value={formatPercent(healthSavingsRatio, lang)} />
              <ResultCard label={copy.emergencyFundStatus} value={formatPercent(Math.min(100, (healthEmergencyMonths / 6) * 100), lang)} />
              <ResultCard label={lang === 'ar' ? 'التدفق النقدي الصافي' : lang === 'fr' ? 'Flux net' : 'Net Cash Flow'} value={money(healthNetFlow)} tone={healthNetFlow >= 0 ? 'default' : 'warning'} />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'salary-split' ? (
          splitReady ? (
            <ResultSection copy={copy} summary={`${copy.monthlyIncome}: ${money(splitIncome!)} · ${copy.needs}: ${formatPercent(splitNeedsPct, lang)} · ${copy.wants}: ${formatPercent(splitWantsPct, lang)}`} theory={relatedTheoryText} interpretation={copy.savingsInvestingDebt}>
              <ResultCard label={copy.needs} value={money(splitNeeds)} tone="strong" />
              <ResultCard label={copy.wants} value={money(splitWants)} />
              <ResultCard label={copy.savingsInvestingDebt} value={money(splitSavings)} />
              {(splitNeedsPct + splitWantsPct + splitSavingsPct) < 100 ? (
                <ResultCard label={lang === 'ar' ? 'غير مخصص' : lang === 'fr' ? 'Non alloué' : 'Unallocated'} value={money(splitIncome! * (100 - splitNeedsPct - splitWantsPct - splitSavingsPct) / 100)} />
              ) : null}
            </ResultSection>
          ) : <p className="calculator-error">{copy.incomeMustBePositive}</p>
        ) : null}

        {activeId === 'emergency-fund' ? (
          emergReady ? (
            <ResultSection copy={copy} summary={`${copy.monthlyExpenses}: ${money(emergMonthlyExp!)} · ${copy.monthsCount}: ${emergTargetMonths}`} theory={relatedTheoryText} interpretation={emergGap === 0 ? copy.emergencyComplete : copy.emergencyNeedsReview}>
              <ResultCard label={lang === 'ar' ? 'المبلغ المستهدف' : lang === 'fr' ? 'Montant cible' : 'Target Amount'} value={money(emergTarget)} tone="strong" />
              <ResultCard label={copy.currentSavings} value={money(emergCurrentSavings)} />
              <ResultCard label={copy.minimumEmergencyFund} value={money(emergMonthlyExp! * 3)} />
              <ResultCard label={copy.monthsCovered} value={`${emergMonthsCovered.toFixed(1)}`} tone={emergMonthsCovered >= 3 ? 'default' : 'warning'} />
              {emergGap > 0 ? <ResultCard label={copy.monthsRemaining} value={money(emergGap)} tone="warning" /> : null}
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}
      </div>

      <div className="calculator-actions">
        <button type="button" onClick={reset}>
          <RotateCcw size={16} aria-hidden="true" />
          {copy.reset}
        </button>
      </div>
    </section>
  );
}

export function TheoryCard({
  theory,
  lang,
  text,
  isOpen,
  isRead,
  onToggle,
  onMarkRead,
  onOpenRelatedTool,
}: {
  theory: FinancialTheory;
  lang: FinancialTheoryLang;
  text: Record<string, string>;
  isOpen: boolean;
  isRead: boolean;
  onToggle: () => void;
  onMarkRead: () => void;
  onOpenRelatedTool: () => void;
}) {
  const Icon = THEORY_ICONS[(theory.number - 1) % THEORY_ICONS.length];
  const title = getFinancialTheoryText(theory.title, lang);
  const short = getFinancialTheoryText(theory.short, lang);
  const category = FINANCIAL_THEORY_CATEGORIES.find(item => item.id === theory.category);
  const categoryLabel = category ? getFinancialTheoryText(category.label, lang) : '';
  const level = LEARNING_LEVELS.find(item => item.id === theoryLevel(theory));
  const levelLabel = level ? getFinancialTheoryText(level.label, lang) : '';
  const takeaway = getFinancialTheoryText(theory.keyTakeaway, lang);
  const tool = getFinancialTheoryText(theory.sfmTool, lang);
  const detailId = `theory-details-${theory.id}`;
  const examples = theory.examples?.[lang] ?? [];
  const rows = theory.tableRows?.[lang] ?? [];
  const hasRelatedTool = Boolean(theory.sfmToolHref || calculatorForTheory(theory));

  return (
    <article className={`theory-card ${isOpen ? 'expanded' : ''}`}>
      <div className="theory-card-head">
        <span className="theory-number">{String(theory.number).padStart(2, '0')}</span>
        <span className="theory-icon" aria-hidden="true"><Icon size={22} /></span>
        <div>
          <div className="theory-card-badges">
            <span className="theory-category">{categoryLabel}</span>
            {levelLabel ? <span className="theory-category theory-level-badge">{levelLabel}</span> : null}
            {isRead ? <span className="theory-read-badge">{text.done}</span> : null}
          </div>
          <h3>{title}</h3>
        </div>
      </div>

      <p className="theory-short">{short}</p>

      <div className="theory-meta-row">
        <span>{text.keyTakeaway}</span>
        <strong>{takeaway}</strong>
      </div>

      <div className="theory-tool-pill">
        <span>{text.relatedSfmTool}</span>
        <strong>{tool}</strong>
      </div>

      <div className="theory-actions">
        <button
          type="button"
          className="theory-primary-action"
          aria-expanded={isOpen}
          aria-controls={detailId}
          onClick={onToggle}
        >
          {isOpen ? text.hideTheory : text.quickExplanation}
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="theory-secondary-action"
          onClick={onToggle}
        >
          {text.practicalExampleAction}
          <Lightbulb size={15} aria-hidden="true" />
        </button>
        {hasRelatedTool && theory.sfmToolHref ? (
          <Link href={theory.sfmToolHref} className="theory-secondary-action" aria-label={`${text.openTool}: ${tool}`}>
            {text.applyTheory}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        ) : null}
        {hasRelatedTool && !theory.sfmToolHref ? (
          <button
            type="button"
            className="theory-secondary-action"
            onClick={onOpenRelatedTool}
            aria-label={`${text.openTool}: ${tool}`}
          >
            {text.applyTheory}
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div id={detailId} className="theory-details" hidden={!isOpen}>
        <div className="detail-block">
          <h4>{text.details}</h4>
          {theory.details[lang].map(line => <p key={line}>{line}</p>)}
        </div>

        {examples.length > 0 ? (
          <div className="detail-block">
            <h4>{text.educationalExample}</h4>
            <ul>
              {examples.map(example => <li key={example}>{example}</li>)}
            </ul>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <div className="detail-block table-block">
            <table>
              <tbody>
                {rows.map(row => (
                  <tr key={`${row.label}-${row.value}`}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="detail-block mistake-block">
          <h4>{text.commonMistake}</h4>
          <p>{commonMistakeCopy(theory, lang)}</p>
        </div>

        <div className="detail-block tool-block">
          <h4>{text.applyInSfm}</h4>
          <p>{applyCopy(lang, tool)}</p>
          {hasRelatedTool ? <small>{text.educationalDisclaimer}</small> : null}
        </div>

        <button type="button" className="theory-mark-read" onClick={onMarkRead} disabled={isRead}>
          {isRead ? text.done : text.markAsRead}
        </button>
      </div>
    </article>
  );
}

