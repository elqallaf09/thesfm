'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getCurrency } from '@/lib/currencies';
import type { Investment, InvestmentInput, InvestmentType, RiskLevel } from '@/types/investment';

type Mode = 'create' | 'edit';

interface Props {
  open: boolean;
  mode: Mode;
  currency: string;
  dir: 'rtl' | 'ltr';
  labels: {
    titleAdd: string;
    titleEdit: string;
    close: string;
    name: string;
    namePlaceholder: string;
    type: string;
    currentValue: string;
    monthly: string;
    startDate: string;
    risk: string;
    expectedReturn: string;
    notes: string;
    save: string;
    update: string;
    cancel: string;
    errors: {
      nameRequired: string;
      valuePositive: string;
      contributionPositive: string;
      returnRange: string;
    };
  };
  typeOptions: InvestmentType[];
  riskOptions: RiskLevel[];
  typeLabel: (type: InvestmentType) => string;
  riskLabel: (risk: RiskLevel) => string;
  initialValues?: Investment | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: InvestmentInput) => Promise<void> | void;
}

export function InvestmentFormModal({
  open,
  mode,
  currency,
  dir,
  labels,
  typeOptions,
  riskOptions,
  typeLabel,
  riskLabel,
  initialValues,
  saving,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('stocks');
  const [currentValue, setCurrentValue] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medium');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currencyInfo = useMemo(() => getCurrency(currency), [currency]);
  const symbol = dir === 'rtl' ? currencyInfo.symbolAr : currencyInfo.symbolEn;

  useEffect(() => {
    if (!open) return;
    setErrors({});

    if (mode === 'edit' && initialValues) {
      setName(initialValues.name);
      setType(initialValues.type);
      setCurrentValue(String(initialValues.currentValue));
      setMonthlyContribution(String(initialValues.monthlyContribution || ''));
      setStartDate(initialValues.startDate);
      setRiskLevel(initialValues.riskLevel);
      setExpectedReturn(initialValues.expectedAnnualReturn === undefined ? '' : String(initialValues.expectedAnnualReturn));
      setNotes(initialValues.notes || '');
      return;
    }

    setName('');
    setType('stocks');
    setCurrentValue('');
    setMonthlyContribution('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setRiskLevel('medium');
    setExpectedReturn('');
    setNotes('');
  }, [initialValues, mode, open]);

  function validate() {
    const nextErrors: Record<string, string> = {};
    const value = Number(currentValue);
    const monthly = Number(monthlyContribution || 0);
    const expected = Number(expectedReturn || 0);

    if (!name.trim()) nextErrors.name = labels.errors.nameRequired;
    if (!currentValue || Number.isNaN(value) || value <= 0) nextErrors.currentValue = labels.errors.valuePositive;
    if (monthlyContribution && (Number.isNaN(monthly) || monthly < 0)) nextErrors.monthlyContribution = labels.errors.contributionPositive;
    if (expectedReturn && (Number.isNaN(expected) || expected < 0 || expected > 100)) nextErrors.expectedReturn = labels.errors.returnRange;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    await onSave({
      name: name.trim(),
      type,
      currentValue: Number(currentValue),
      monthlyContribution: Number(monthlyContribution || 0),
      startDate,
      riskLevel,
      expectedAnnualReturn: expectedReturn ? Number(expectedReturn) : undefined,
      notes: notes.trim() || undefined,
    });
  }

  if (!open) return null;

  return (
    <div className="invest-overlay" role="presentation" onMouseDown={onClose}>
      <div className="invest-modal" role="dialog" aria-modal="true" aria-labelledby="invest-modal-title" onMouseDown={event => event.stopPropagation()}>
        <div className="invest-modal-head">
          <h2 id="invest-modal-title">{mode === 'create' ? labels.titleAdd : labels.titleEdit}</h2>
          <button type="button" className="invest-icon-btn" onClick={onClose} aria-label={labels.close}>
            <X size={18} />
          </button>
        </div>

        <form className="invest-form" onSubmit={handleSubmit}>
          <Field label={labels.name} error={errors.name} required>
            <input value={name} onChange={event => setName(event.target.value)} placeholder={labels.namePlaceholder} autoFocus />
          </Field>

          <Field label={labels.type} required>
            <select value={type} onChange={event => setType(event.target.value as InvestmentType)}>
              {typeOptions.map(option => <option key={option} value={option}>{typeLabel(option)}</option>)}
            </select>
          </Field>

          <Field label={`${labels.currentValue} (${symbol})`} error={errors.currentValue} required>
            <input type="number" min="0" step="0.001" value={currentValue} onChange={event => setCurrentValue(event.target.value)} dir="ltr" />
          </Field>

          <Field label={`${labels.monthly} (${symbol})`} error={errors.monthlyContribution}>
            <input type="number" min="0" step="0.001" value={monthlyContribution} onChange={event => setMonthlyContribution(event.target.value)} dir="ltr" />
          </Field>

          <Field label={labels.startDate} required>
            <input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />
          </Field>

          <Field label={labels.risk} required>
            <select value={riskLevel} onChange={event => setRiskLevel(event.target.value as RiskLevel)}>
              {riskOptions.map(option => <option key={option} value={option}>{riskLabel(option)}</option>)}
            </select>
          </Field>

          <Field label={`${labels.expectedReturn} %`} error={errors.expectedReturn}>
            <input type="number" min="0" max="100" step="0.1" value={expectedReturn} onChange={event => setExpectedReturn(event.target.value)} placeholder="0 - 100" dir="ltr" />
          </Field>

          <Field label={labels.notes} className="span-2">
            <textarea value={notes} onChange={event => setNotes(event.target.value)} />
          </Field>

          <div className="invest-form-actions span-2">
            <button type="button" className="invest-secondary-btn" onClick={onClose} disabled={saving}>
              {labels.cancel}
            </button>
            <button type="submit" className="invest-primary-btn" disabled={saving}>
              {mode === 'create' ? labels.save : labels.update}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  required,
  children,
  className = '',
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`invest-field ${className}`}>
      <span>{label}{required && <b>*</b>}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}

