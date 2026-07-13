'use client';

import { Bot, Coins, FileText, Save, Target } from 'lucide-react';
import { CardTitle, Metric } from './_components';
import type { FeasibilityForm, FeasibilitySection, FeasibilityStatus, MoneyFormatter } from './_types';
import type { Translation } from './_text';
import { countryOptions, sectionCompletion } from './_utils';

interface FeasibilityTabProps {
  tr: Translation;
  feasibilityMetrics: {
    requiredCapital: number;
    monthlyProfit: number;
    breakEvenMonths: number | null;
    roi: number | null;
    hasFinancialInput: boolean;
    score: number;
    status: FeasibilityStatus;
    missingSections: number;
  };
  feasibilitySections: {
    id: FeasibilitySection;
    title: string;
    icon: React.ComponentType<{ size?: number }>;
    fields: { id: string; label: string; type?: string }[];
  }[];
  fieldMap: Record<FeasibilitySection, string[]>;
  feasibility: FeasibilityForm;
  notice: string;
  money: MoneyFormatter;
  projectCurrency: string;
  updateFeasibility: (section: FeasibilitySection, field: string, value: string) => void;
  saveFeasibility: () => void;
  exportFeasibilityPdf: () => void;
  savingFeasibility: boolean;
  exportingFeasibilityPdf: boolean;
  numericLabel: (value: number | null, suffix?: string) => string;
  statusLabel: (status: FeasibilityStatus) => string;
  moneyOrNoData: (value: number) => string;
}

export function FeasibilityTab({
  tr, feasibilityMetrics, feasibilitySections, fieldMap, feasibility,
  notice, money, projectCurrency, updateFeasibility, saveFeasibility,
  exportFeasibilityPdf, savingFeasibility, exportingFeasibilityPdf,
  numericLabel, statusLabel, moneyOrNoData,
}: FeasibilityTabProps) {
  return (
    <section className="feasibility-tab" role="tabpanel">
      <div className="feasibility-summary-grid">
        <article className={`warm-card score-card ${feasibilityMetrics.status}`}>
          <CardTitle icon={<Target size={20} />} title={tr.feasibilitySummary} />
          <div className="score-row">
            <div
              className="score-number"
              role="img"
              aria-label={`${tr.feasibilityScore}: ${feasibilityMetrics.score}/100`}
            >
              <strong>{feasibilityMetrics.score}</strong>
              <span>/100</span>
            </div>
            <div>
              <span className={`status-pill ${feasibilityMetrics.status}`}>{statusLabel(feasibilityMetrics.status)}</span>
              <p>{tr.internalScoreDisclaimer}</p>
            </div>
          </div>
        </article>
        <Metric label={tr.requiredCapital} value={moneyOrNoData(feasibilityMetrics.requiredCapital)} />
        <Metric label={tr.monthlyProfitEstimate} value={feasibilityMetrics.hasFinancialInput ? money(feasibilityMetrics.monthlyProfit, projectCurrency) : tr.noData} />
        <Metric label={tr.breakEvenEstimate} value={feasibilityMetrics.breakEvenMonths === null ? tr.noData : `${numericLabel(feasibilityMetrics.breakEvenMonths)} ${tr.months}`} />
        <Metric label={tr.roiEstimate} value={feasibilityMetrics.roi === null ? tr.noData : numericLabel(feasibilityMetrics.roi, '%')} />
        <Metric label={tr.missingSections} value={String(feasibilityMetrics.missingSections)} />
      </div>

      {notice ? <div className="notice" role="status">{notice}</div> : null}

      <div className="feasibility-layout">
        <div className="feasibility-sections">
          {feasibilitySections.map(section => {
            const Icon = section.icon;
            return (
              <article className="warm-card feasibility-section" key={section.id}>
                <div className="section-heading">
                  <div>
                    <small>{Math.round(sectionCompletion(feasibility[section.id], fieldMap[section.id]) * 100)}%</small>
                    <h2>{section.title}</h2>
                  </div>
                  <Icon size={22} />
                </div>
                <div className="feasibility-form-grid">
                  {section.fields.map(field => {
                    const value = feasibility[section.id][field.id] ?? '';
                    const inputId = `${section.id}-${field.id}`;
                    const fieldType = 'type' in field ? field.type : undefined;
                    if (fieldType === 'select') {
                      return (
                        <label className="form-field" htmlFor={inputId} key={field.id}>
                          <span>{field.label}</span>
                          <select id={inputId} value={value} onChange={e => updateFeasibility(section.id, field.id, e.target.value)}>
                            <option value="">{tr.noData}</option>
                            {countryOptions.map(c => (
                              <option value={c} key={c}>{tr[c as keyof Translation] as string}</option>
                            ))}
                          </select>
                        </label>
                      );
                    }
                    return (
                      <label className="form-field" htmlFor={inputId} key={field.id}>
                        <span>{field.label}</span>
                        {fieldType === 'number' ? (
                          <input id={inputId} type="number" min="0" step="0.01" value={value}
                            onChange={e => updateFeasibility(section.id, field.id, e.target.value)} />
                        ) : (
                          <textarea id={inputId} rows={3} value={value}
                            onChange={e => updateFeasibility(section.id, field.id, e.target.value)} />
                        )}
                      </label>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="feasibility-side">
          <article className="warm-card calculations-card">
            <CardTitle icon={<Coins size={20} />} title={tr.financialFeasibility} />
            <Metric label={tr.monthlyProfitEstimate} value={feasibilityMetrics.hasFinancialInput ? money(feasibilityMetrics.monthlyProfit, projectCurrency) : tr.noData} />
            <Metric label={tr.breakEvenEstimate} value={feasibilityMetrics.breakEvenMonths === null ? tr.noData : `${numericLabel(feasibilityMetrics.breakEvenMonths)} ${tr.months}`} />
            <Metric label={tr.roiEstimate} value={feasibilityMetrics.roi === null ? tr.noData : numericLabel(feasibilityMetrics.roi, '%')} />
          </article>

          <article className="warm-card ai-placeholder">
            <CardTitle icon={<Bot size={20} />} title={tr.aiFeasibilityAnalysis} />
            <p>{tr.aiFeasibilitySoon}</p>
          </article>

          <article className="warm-card future-actions">
            <button type="button" className="primary-save" onClick={saveFeasibility} disabled={savingFeasibility}>
              <Save size={16} />
              {tr.saveFeasibilityStudy}
            </button>
            <button type="button" className="secondary-action" onClick={exportFeasibilityPdf} disabled={exportingFeasibilityPdf}>
              <FileText size={16} />
              {exportingFeasibilityPdf ? tr.creatingFeasibilityPdf : tr.exportFeasibilityPdf}
            </button>
          </article>
        </aside>
      </div>
    </section>
  );
}
