'use client';

import type { FormEvent } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { AppModal } from '@/components/ui/AppModal';
import { CurrencySelect } from '@/components/CurrencySelect';
import type { Lang, ProjectIncomeForm } from './_types';
import type { Translation } from './_text';

interface IncomeModalProps {
  open: boolean;
  onClose: () => void;
  tr: Translation;
  lang: Lang;
  projectCurrency: string;
  editingProjectIncomeId: string | null;
  projectIncomeSaving: boolean;
  projectIncomeError: string;
  projectIncomeForm: ProjectIncomeForm;
  setProjectIncomeForm: React.Dispatch<React.SetStateAction<ProjectIncomeForm>>;
  saveProjectIncome: (e: FormEvent<HTMLFormElement>) => void;
}

export function IncomeModal({
  open, onClose, tr, lang,
  editingProjectIncomeId, projectIncomeSaving,
  projectIncomeError, projectIncomeForm, setProjectIncomeForm,
  saveProjectIncome,
}: IncomeModalProps) {
  return (
    <AppModal
      open={open}
      title={editingProjectIncomeId ? tr.editProjectIncome : tr.addIncome}
      subtitle={tr.doNotIncludeInPersonalIncome}
      closeLabel={tr.cancel}
      onClose={onClose}
      size="md"
      className="expense-modal"
      bodyClassName="project-transaction-modal-body"
      footerClassName="modal-actions"
      footer={(
        <>
          <button type="button" className="secondary-action" onClick={onClose}>{tr.cancel}</button>
          <button type="submit" form="project-income-form" className="primary-save" disabled={projectIncomeSaving}>
            <Save size={16} />
            {editingProjectIncomeId ? tr.saveEdit : tr.saveProjectIncome}
          </button>
        </>
      )}
    >
      {projectIncomeError ? <div className="modal-error" role="alert">{projectIncomeError}</div> : null}

      <form id="project-income-form" className="project-expense-form-grid" onSubmit={saveProjectIncome}>
        <label className="form-field wide">
          <span>{tr.incomeName}</span>
          <input value={projectIncomeForm.title}
            onChange={e => setProjectIncomeForm(p => ({ ...p, title: e.target.value }))}
            placeholder={tr.incomeName} required />
        </label>

        <label className="form-field">
          <span>{tr.amount}</span>
          <input type="number" min="0" step="0.001" value={projectIncomeForm.amount}
            onChange={e => setProjectIncomeForm(p => ({ ...p, amount: e.target.value }))} required />
        </label>

        <div className="form-field">
          <span>{tr.currency}</span>
          <CurrencySelect value={projectIncomeForm.currency}
            onChange={value => setProjectIncomeForm(p => ({ ...p, currency: value }))}
            lang={lang} ariaLabel={tr.currency} className="project-currency-select" />
        </div>

        <label className="form-field">
          <span>{tr.date}</span>
          <input type="date" value={projectIncomeForm.incomeDate}
            onChange={e => setProjectIncomeForm(p => ({ ...p, incomeDate: e.target.value }))} />
        </label>

        <label className="form-field">
          <span>{tr.incomeSource}</span>
          <select value={projectIncomeForm.category}
            onChange={e => setProjectIncomeForm(p => ({ ...p, category: e.target.value }))}>
            {['general', 'salesIncome', 'servicesIncome', 'rentalIncome', 'investmentIncome', 'otherIncomeSource'].map(item => (
              <option key={item} value={item}>{tr[item as keyof Translation] as string}</option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>{tr.source}</span>
          <input value={projectIncomeForm.source}
            onChange={e => setProjectIncomeForm(p => ({ ...p, source: e.target.value }))}
            placeholder={tr.source} />
        </label>

        <label className="form-field wide">
          <span>{tr.description}</span>
          <textarea rows={3} value={projectIncomeForm.description}
            onChange={e => setProjectIncomeForm(p => ({ ...p, description: e.target.value }))} />
        </label>

        <label className="form-field wide">
          <span>{tr.notes}</span>
          <textarea rows={3} value={projectIncomeForm.notes}
            onChange={e => setProjectIncomeForm(p => ({ ...p, notes: e.target.value }))} />
        </label>

        <label className={`budget-checkbox wide ${projectIncomeForm.transferredToPersonalIncome ? 'selected' : ''}`}>
          <input className="budget-checkbox-input" type="checkbox"
            checked={projectIncomeForm.transferredToPersonalIncome}
            onChange={e => setProjectIncomeForm(p => ({ ...p, transferredToPersonalIncome: e.target.checked }))} />
          <span className="budget-checkbox-indicator" aria-hidden="true"><CheckCircle2 size={18} /></span>
          <span className="budget-checkbox-copy">
            <strong>{tr.transferredToPersonalIncome}</strong>
            <small>{projectIncomeForm.transferredToPersonalIncome ? tr.includeInPersonalIncome : tr.doNotIncludeInPersonalIncome}</small>
          </span>
        </label>
      </form>
    </AppModal>
  );
}
