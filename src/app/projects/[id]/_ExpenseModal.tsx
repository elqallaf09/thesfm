'use client';

import type { FormEvent } from 'react';
import { Bot, CheckCircle2, ReceiptText, Save } from 'lucide-react';
import { AppModal } from '@/components/ui/AppModal';
import { CurrencySelect } from '@/components/CurrencySelect';
import type { Lang, ProjectExpenseAiAnalysis, ProjectExpenseForm, ProjectExpenseReceiptAnalysis } from './_types';
import type { Translation } from './_text';
import { confidencePercent, formatProjectExpenseMoney, formatPercentValue, normalizeProjectExpenseCategory } from './_utils';

interface ExpenseModalProps {
  open: boolean;
  onClose: () => void;
  tr: Translation;
  lang: Lang;
  projectCurrency: string;
  editingProjectExpenseId: string | null;
  projectExpenseSaving: boolean;
  projectExpenseError: string;
  projectExpenseForm: ProjectExpenseForm;
  setProjectExpenseForm: React.Dispatch<React.SetStateAction<ProjectExpenseForm>>;
  receiptReading: boolean;
  expenseAnalyzing: boolean;
  projectExpenseAiError: string;
  projectExpenseReceiptAnalysis: ProjectExpenseReceiptAnalysis | null;
  projectExpenseAiAnalysis: ProjectExpenseAiAnalysis | null;
  setProjectExpenseReceiptAnalysis: (v: ProjectExpenseReceiptAnalysis | null) => void;
  setProjectExpenseAiError: (v: string) => void;
  readProjectExpenseReceipt: () => void;
  analyzeProjectExpense: () => void;
  applyReceiptAnalysisToExpenseForm: (analysis: ProjectExpenseReceiptAnalysis) => void;
  saveProjectExpense: (e: FormEvent<HTMLFormElement>) => void;
}

export function ExpenseModal({
  open, onClose, tr, lang, projectCurrency,
  editingProjectExpenseId, projectExpenseSaving,
  projectExpenseError, projectExpenseForm, setProjectExpenseForm,
  receiptReading, expenseAnalyzing, projectExpenseAiError,
  projectExpenseReceiptAnalysis, projectExpenseAiAnalysis,
  setProjectExpenseReceiptAnalysis, setProjectExpenseAiError,
  readProjectExpenseReceipt, analyzeProjectExpense,
  applyReceiptAnalysisToExpenseForm, saveProjectExpense,
}: ExpenseModalProps) {
  return (
    <AppModal
      open={open}
      title={editingProjectExpenseId ? tr.editProjectExpense : tr.addExpense}
      subtitle={tr.doNotIncludeInPersonalBudget}
      closeLabel={tr.cancel}
      onClose={onClose}
      size="md"
      className="expense-modal"
      bodyClassName="project-transaction-modal-body"
      footerClassName="modal-actions"
      footer={(
        <>
          <button type="button" className="secondary-action" onClick={onClose}>{tr.cancel}</button>
          <button type="submit" form="project-expense-form" className="primary-save" disabled={projectExpenseSaving}>
            <Save size={16} />
            {editingProjectExpenseId ? tr.saveEdit : tr.saveProjectExpense}
          </button>
        </>
      )}
    >
      {projectExpenseError ? <div className="modal-error" role="alert">{projectExpenseError}</div> : null}

      <form id="project-expense-form" className="project-expense-form-grid" onSubmit={saveProjectExpense}>
        <label className="form-field wide">
          <span>{tr.expenseName}</span>
          <input value={projectExpenseForm.title} onChange={e => setProjectExpenseForm(p => ({ ...p, title: e.target.value }))} placeholder={tr.expenseName} required />
        </label>

        <label className="form-field">
          <span>{tr.amount}</span>
          <input type="number" min="0" step="0.001" value={projectExpenseForm.amount}
            onChange={e => setProjectExpenseForm(p => ({ ...p, amount: e.target.value }))} required />
        </label>

        <div className="form-field">
          <span>{tr.currency}</span>
          <CurrencySelect value={projectExpenseForm.currency}
            onChange={value => setProjectExpenseForm(p => ({ ...p, currency: value }))}
            lang={lang} ariaLabel={tr.currency} className="project-currency-select" />
        </div>

        <label className="form-field">
          <span>{tr.date}</span>
          <input type="date" value={projectExpenseForm.expenseDate}
            onChange={e => setProjectExpenseForm(p => ({ ...p, expenseDate: e.target.value }))} />
        </label>

        <label className="form-field">
          <span>{tr.category}</span>
          <select value={projectExpenseForm.category}
            onChange={e => setProjectExpenseForm(p => ({ ...p, category: e.target.value }))}>
            {['general', 'operations', 'marketingExpense', 'payroll', 'rent', 'equipment', 'licenses'].map(item => (
              <option key={item} value={item}>{tr[item as keyof Translation] as string}</option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>{tr.paymentMethod}</span>
          <select value={projectExpenseForm.paymentMethod}
            onChange={e => setProjectExpenseForm(p => ({ ...p, paymentMethod: e.target.value }))}>
            <option value="">-</option>
            {['cash', 'card', 'transfer'].map(item => (
              <option key={item} value={item}>{tr[item as keyof Translation] as string}</option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>{tr.receipt}</span>
          <small>{tr.aiReceiptHelper}</small>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={e => {
              setProjectExpenseAiError('');
              setProjectExpenseReceiptAnalysis(null);
              setProjectExpenseForm(p => ({ ...p, receiptFile: e.target.files?.[0] ?? null }));
            }}
          />
          {projectExpenseForm.receiptFile ? <em>{projectExpenseForm.receiptFile.name}</em> : null}
        </label>

        <section className="project-expense-ai-panel wide" aria-label={tr.aiReceiptReading}>
          <div className="project-expense-ai-head">
            <span className="project-expense-ai-icon"><Bot size={18} /></span>
            <div className="project-expense-ai-copy">
              <strong>{tr.aiReceiptReading}</strong>
              <small>{tr.aiReceiptHelper}</small>
            </div>
          </div>
          <div className="project-expense-ai-actions">
            <button type="button" className="secondary-action" onClick={readProjectExpenseReceipt}
              disabled={receiptReading || !projectExpenseForm.receiptFile}>
              <ReceiptText size={16} />
              {receiptReading ? tr.readingReceipt : tr.readReceipt}
            </button>
            <button type="button" className="primary-save" onClick={analyzeProjectExpense} disabled={expenseAnalyzing}>
              <Bot size={16} />
              {expenseAnalyzing ? tr.analyzingExpense : tr.analyzeExpense}
            </button>
          </div>

          {projectExpenseAiError ? <div className="project-expense-ai-alert" role="alert">{projectExpenseAiError}</div> : null}

          {projectExpenseReceiptAnalysis ? (
            <article className="project-expense-ai-result">
              <div className="project-expense-ai-result-head">
                <strong>{tr.extractedReceiptTitle}</strong>
                <span>{projectExpenseReceiptAnalysis.warnings?.length ? tr.needsReview : tr.receiptReadSuccess}</span>
              </div>
              <div className="project-expense-extracted-grid">
                <div><span>{tr.expenseName}</span><b>{projectExpenseReceiptAnalysis.extracted.title || tr.notClear}</b></div>
                <div><span>{tr.vendorName}</span><b>{projectExpenseReceiptAnalysis.extracted.vendorName || tr.notClear}</b></div>
                <div><span>{tr.amount}</span><b>{projectExpenseReceiptAnalysis.extracted.amount ? formatProjectExpenseMoney(projectExpenseReceiptAnalysis.extracted.amount, projectExpenseReceiptAnalysis.extracted.currency || projectExpenseForm.currency) : tr.notClear}</b></div>
                <div><span>{tr.currency}</span><b>{projectExpenseReceiptAnalysis.extracted.currency || tr.notClear}</b></div>
                <div><span>{tr.date}</span><b>{projectExpenseReceiptAnalysis.extracted.invoiceDate || tr.notClear}</b></div>
                <div><span>{tr.category}</span><b>{projectExpenseReceiptAnalysis.extracted.category ? tr[normalizeProjectExpenseCategory(projectExpenseReceiptAnalysis.extracted.category) as keyof Translation] as string : tr.notClear}</b></div>
              </div>
              <div className="project-expense-confidence-row">
                <span>{tr.confidence}: {confidencePercent(projectExpenseReceiptAnalysis.confidence?.amount) || tr.needsReview}</span>
                {projectExpenseReceiptAnalysis.warnings?.length ? <span>{tr.needsReview}</span> : null}
              </div>
              <div className="project-expense-ai-actions compact">
                <button type="button" className="secondary-action" onClick={() => applyReceiptAnalysisToExpenseForm(projectExpenseReceiptAnalysis)}>{tr.applyExtractedData}</button>
                <button type="button" className="secondary-action" onClick={() => setProjectExpenseReceiptAnalysis(null)}>{tr.clearAiResult}</button>
              </div>
            </article>
          ) : null}

          {projectExpenseAiAnalysis ? (
            <article className="project-expense-ai-result analysis">
              <div className="project-expense-ai-result-head">
                <strong>{tr.aiExpenseAnalysis}</strong>
                <span>{projectExpenseAiAnalysis.source === 'rules' ? tr.needsReview : tr.aiReceiptReading}</span>
              </div>
              <p>{projectExpenseAiAnalysis.summary || projectExpenseAiAnalysis.budgetImpact || tr.aiExpenseAnalysis}</p>
              <div className="project-expense-analysis-grid">
                <div><span>{tr.category}</span><b>{projectExpenseAiAnalysis.category || tr.notClear}</b></div>
                <div><span>{tr.amountLevel}</span><b>{tr[`amountLevel_${projectExpenseAiAnalysis.amountLevel || 'unknown'}` as keyof Translation] as string || tr.amountLevel_unknown}</b></div>
                <div><span>{tr.suggestedAction}</span><b>{tr[`expenseAction_${projectExpenseAiAnalysis.suggestedAction || 'review'}` as keyof Translation] as string || tr.expenseAction_review}</b></div>
                <div><span>{tr.budgetImpact}</span><b>{projectExpenseAiAnalysis.budgetImpact || tr.notClear}</b></div>
              </div>
              {projectExpenseAiAnalysis.budget?.plannedBudget ? (
                <div className="project-expense-budget-impact">
                  <span>{tr.remainingBudgetAfterExpense}: <b>{formatProjectExpenseMoney(projectExpenseAiAnalysis.budget.remainingAfterExpense ?? 0, projectExpenseForm.currency)}</b></span>
                  <span>{tr.budgetUsedPercent}: <b>{formatPercentValue(projectExpenseAiAnalysis.budget.percentageUsed) || tr.notClear}</b></span>
                </div>
              ) : (
                <small className="project-expense-budget-note">{tr.noProjectBudgetForAnalysis}</small>
              )}
              {projectExpenseAiAnalysis.warnings?.length ? (
                <ul className="project-expense-warning-list">
                  {projectExpenseAiAnalysis.warnings.map(w => <li key={w}>{w}</li>)}
                </ul>
              ) : null}
            </article>
          ) : null}
        </section>

        <label className="form-field wide">
          <span>{tr.notes}</span>
          <textarea rows={3} value={projectExpenseForm.notes}
            onChange={e => setProjectExpenseForm(p => ({ ...p, notes: e.target.value }))} />
        </label>

        <label className={`budget-checkbox wide ${projectExpenseForm.paidFromPersonalBudget ? 'selected' : ''}`}>
          <input className="budget-checkbox-input" type="checkbox"
            checked={projectExpenseForm.paidFromPersonalBudget}
            onChange={e => setProjectExpenseForm(p => ({ ...p, paidFromPersonalBudget: e.target.checked }))} />
          <span className="budget-checkbox-indicator" aria-hidden="true"><CheckCircle2 size={18} /></span>
          <span className="budget-checkbox-copy">
            <strong>{tr.paidFromPersonalBudget}</strong>
            <small>{projectExpenseForm.paidFromPersonalBudget ? tr.includeInPersonalBudget : tr.doNotIncludeInPersonalBudget}</small>
          </span>
        </label>
      </form>
    </AppModal>
  );
}
