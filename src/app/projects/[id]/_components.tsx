'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, BarChart3, Bot, CalendarDays, CheckCircle2, ClipboardList,
  Coins, FileText, FolderKanban, Gauge, Pencil, Plus, Presentation, ReceiptText, Trash2,
} from 'lucide-react';
import type { Translation } from './_text';
import type {
  ProjectIncomeRow, ProjectExpenseRow, MoneyFormatter, CurrencyAmountRow,
  TabId, RiskLevel,
} from './_types';
import type { ProjectTasksSummary } from '@/components/projects/ProjectTasksTab';
import type { ProjectKpiSummary } from '@/components/projects/ProjectKpisTab';
import {
  formatRowsByCurrency, formatRowMoney, formatProjectExpenseMoney,
  toNum, normalizeCurrencyCode,
} from './_utils';

export function OverviewTab({
  tr,
  projectTitle,
  model,
  typeLabel,
  statusLabel,
  riskText,
  taskSummary,
  documentsCount,
  kpiSummary,
  projectIncome,
  projectExpenses,
  openProjectIncomeModal,
  openProjectExpenseModal,
  onEditProjectIncome,
  onEditProjectExpense,
  onDeleteProjectIncome,
  onDeleteProjectExpense,
  money,
  projectCurrency,
  dateLabel,
  setActiveTab,
  routerPush,
}: {
  tr: Translation;
  projectTitle: string;
  model: any;
  typeLabel: string;
  statusLabel: string;
  riskText: string;
  taskSummary: ProjectTasksSummary;
  documentsCount: number;
  kpiSummary: ProjectKpiSummary;
  projectIncome: ProjectIncomeRow[];
  projectExpenses: ProjectExpenseRow[];
  openProjectIncomeModal: () => void;
  openProjectExpenseModal: () => void;
  onEditProjectIncome: (row: ProjectIncomeRow) => void;
  onEditProjectExpense: (row: ProjectExpenseRow) => void;
  onDeleteProjectIncome: (row: ProjectIncomeRow) => void;
  onDeleteProjectExpense: (row: ProjectExpenseRow) => void;
  money: MoneyFormatter;
  projectCurrency: string;
  dateLabel: (value?: string | null) => string;
  setActiveTab: (tab: TabId) => void;
  routerPush: (href: string) => void;
}) {
  const hasTimelineData = Boolean(model.startDate || model.endDate || model.daysRemaining !== null || model.duration !== null);
  const hasProjectIncome = projectIncome.length > 0;
  const hasProjectExpenses = projectExpenses.length > 0;
  const actualVsExpected = model.plannedIncome > 0
    ? `${Math.round((model.actualProjectIncome / model.plannedIncome) * 100)}%`
    : tr.noData;
  const actualVsPlanned = model.plannedExpenses > 0
    ? `${Math.round((model.actualProjectExpenses / model.plannedExpenses) * 100)}%`
    : tr.noData;
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const recentActivity = [...projectIncome.map(row => ({
    id: `income-${row.id}`,
    kind: 'income' as const,
    type: tr.projectIncome,
    title: row.title || tr.projectIncome,
    amount: toNum(row.amount),
    currency: normalizeCurrencyCode(row.currency, projectCurrency),
    date: row.income_date ?? row.created_at ?? null,
  })), ...projectExpenses.map(row => ({
    id: `expense-${row.id}`,
    kind: 'expense' as const,
    type: tr.projectExpenses,
    title: row.title || tr.projectExpense,
    amount: -toNum(row.amount),
    currency: normalizeCurrencyCode(row.currency, 'KWD'),
    date: row.expense_date ?? row.created_at ?? null,
  }))]
    .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
    .slice(0, 5);
  const totalProjectIncome = formatRowsByCurrency(projectIncome, money, projectCurrency);
  const totalProjectExpenses = formatRowsByCurrency(projectExpenses, formatProjectExpenseMoney, 'KWD');

  return (
    <section className="project-overview">
      <div className="overview-kpi-grid">
        <Metric label={tr.projectHealthScore} value={kpiSummary.score === null ? tr.noData : `${kpiSummary.score}/100`} />
        <Metric label={tr.financialSnapshot} value={money(model.net, projectCurrency)} />
        <Metric label={tr.timelineSnapshot} value={model.daysRemaining === null ? tr.noData : String(model.daysRemaining)} />
        <Metric label={tr.riskSnapshot} value={tr[model.risk as RiskLevel]} />
        <Metric label={tr.projectProgress} value={`${taskSummary.progressPercent}%`} />
        <Metric label={tr.documents} value={String(documentsCount)} />
      </div>

      <div className="overview-main-layout">
        <div className="overview-main-column">
          <article className="warm-card project-summary-card">
            <CardTitle icon={<FolderKanban size={20} />} title={tr.projectSummary} />
            <p className={`project-description ${summaryExpanded ? 'expanded' : ''}`}>{model.description || tr.noData}</p>
            {model.description ? (
              <button type="button" className="text-toggle" onClick={() => setSummaryExpanded(value => !value)}>
                {summaryExpanded ? tr.showLess : tr.showMore}
              </button>
            ) : null}
            <dl className="details-list compact-details">
              <div><dt>{tr.projectType}</dt><dd>{typeLabel}</dd></div>
              <div><dt>{tr.status}</dt><dd><span className={`badge ${model.statusKey}`}>{statusLabel}</span></dd></div>
              <div><dt>{tr.priority}</dt><dd>{model.priority}</dd></div>
              <div><dt>{tr.currentPhase}</dt><dd>{String(model.phase)}</dd></div>
              <div><dt>{tr.startDate}</dt><dd>{dateLabel(model.startDate)}</dd></div>
              <div><dt>{tr.endDate}</dt><dd>{dateLabel(model.endDate)}</dd></div>
            </dl>
          </article>

          <ProjectTransactionSection
            kind="income"
            tr={tr}
            rows={projectIncome}
            model={model}
            money={money}
            projectCurrency={projectCurrency}
            dateLabel={dateLabel}
            actualRatio={actualVsExpected}
            onAdd={openProjectIncomeModal}
            onEdit={onEditProjectIncome}
            onDelete={onDeleteProjectIncome}
          />

          <ProjectTransactionSection
            kind="expense"
            tr={tr}
            rows={projectExpenses}
            model={model}
            money={money}
            projectCurrency={projectCurrency}
            dateLabel={dateLabel}
            actualRatio={actualVsPlanned}
            onAdd={openProjectExpenseModal}
            onEdit={onEditProjectExpense}
            onDelete={onDeleteProjectExpense}
          />

          <article className="warm-card">
            <CardTitle icon={<Coins size={20} />} title={tr.financialSnapshot} />
            <div className="metric-grid">
              <Metric label={tr.capital} value={money(model.capital, projectCurrency)} />
              <Metric label={tr.totalIncome} value={totalProjectIncome || tr.noData} />
              <Metric label={tr.totalExpenses} value={totalProjectExpenses || tr.noData} />
              <Metric label={tr.netResult} value={money(model.actualProjectIncome - model.actualProjectExpenses, projectCurrency)} />
              <Metric label={tr.remainingBudget} value={money(model.remainingBudget, projectCurrency)} />
              <Metric label={tr.targetProgress} value={`${model.progress.toFixed(0)}%`} />
            </div>
            <div className="progress-bar" aria-label={tr.targetProgress}>
              <span style={{ width: `${model.progress}%` }} />
            </div>
          </article>

          <article className="warm-card">
            <CardTitle icon={<CheckCircle2 size={20} />} title={tr.recentActivity} />
            {recentActivity.length ? (
              <div className="activity-list">
                {recentActivity.map(item => (
                  <div key={item.id}>
                    <span>{item.title}</span>
                    <small>{item.type} · {dateLabel(item.date)}</small>
                    <strong>{item.kind === 'expense' ? formatProjectExpenseMoney(item.amount, item.currency) : money(item.amount, item.currency)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="timeline-empty">{tr.noData}</p>
            )}
          </article>
        </div>

        <aside className="overview-side-column">
          <article className="warm-card quick-card">
            <CardTitle icon={<CheckCircle2 size={20} />} title={tr.quickActions} />
            <div className="quick-grid">
              <button type="button" onClick={openProjectExpenseModal}><ReceiptText size={16} /> {tr.addExpense}</button>
              <button type="button" onClick={openProjectIncomeModal}><Coins size={16} /> {tr.addIncome}</button>
              <button type="button" onClick={() => setActiveTab('tasks')}><ClipboardList size={16} /> {tr.addTask}</button>
              <button type="button" onClick={() => setActiveTab('feasibility')}><FileText size={16} /> {tr.generateFeasibility}</button>
              <button type="button" onClick={() => setActiveTab('financial')}><BarChart3 size={16} /> {tr.createFinancialModel}</button>
              <button type="button" onClick={() => routerPush('/documents')}><FileText size={16} /> {tr.documentsCenter}</button>
            </div>
          </article>

          <article className="warm-card missing-data-card">
            <CardTitle icon={<AlertTriangle size={20} />} title={tr.missingDataChecklist} />
            <ul>
              {!hasProjectExpenses ? <li>{tr.addProjectExpensesHint}</li> : null}
              {kpiSummary.score === null ? <li>{tr.addFinancialModelHint}</li> : null}
              {taskSummary.totalTasks === 0 ? <li>{tr.addTasksHint}</li> : null}
              {hasProjectExpenses && kpiSummary.score !== null && taskSummary.totalTasks > 0 ? <li>{tr.noRiskFlags}</li> : null}
            </ul>
          </article>

          <article className="warm-card">
            <CardTitle icon={<CalendarDays size={20} />} title={tr.nextSteps} />
            {hasTimelineData ? (
              <div className="timeline-list">
                <Metric label={tr.nextMilestone} value={dateLabel(taskSummary.nextMilestone)} />
                <Metric label={tr.upcomingDeadlines} value={dateLabel(taskSummary.upcomingDeadline)} />
                <Metric label={tr.daysRemaining} value={model.daysRemaining === null ? tr.noData : String(model.daysRemaining)} />
              </div>
            ) : (
              <p className="timeline-empty">{tr.timelineInsufficient}</p>
            )}
          </article>

          <article className={`warm-card risk-card ${model.risk}`}>
            <CardTitle icon={<AlertTriangle size={20} />} title={tr.projectStatus} />
            <div className="risk-badge">{tr[model.risk as RiskLevel]}</div>
            <p>{riskText}</p>
          </article>
        </aside>
      </div>
    </section>
  );
}

export function ProjectTransactionSection({
  kind,
  tr,
  rows,
  model,
  money,
  projectCurrency,
  dateLabel,
  actualRatio,
  onAdd,
  onEdit,
  onDelete,
}: {
  kind: 'income' | 'expense';
  tr: Translation;
  rows: ProjectIncomeRow[] | ProjectExpenseRow[];
  model: any;
  money: MoneyFormatter;
  projectCurrency: string;
  dateLabel: (value?: string | null) => string;
  actualRatio: string;
  onAdd: () => void;
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
}) {
  const isIncome = kind === 'income';
  const title = isIncome ? tr.projectIncome : tr.projectExpenses;
  const emptyText = isIncome ? tr.noProjectIncomeYet : tr.noProjectExpensesYet;
  const addText = isIncome ? tr.addIncome : tr.addExpense;
  const Icon = isIncome ? Coins : ReceiptText;
  const fallbackCurrency = isIncome ? projectCurrency : 'KWD';
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthRows = rows.filter(row => {
    const income = row as ProjectIncomeRow;
    const expense = row as ProjectExpenseRow;
    const date = isIncome ? income.income_date ?? income.created_at : expense.expense_date ?? expense.created_at;
    return String(date ?? '').slice(0, 7) === currentMonthKey;
  }) as CurrencyAmountRow[];
  const personalRows = rows.filter(row => isIncome
    ? (row as ProjectIncomeRow).transferred_to_personal_income === true
    : (row as ProjectExpenseRow).paid_from_personal_budget === true
  ) as CurrencyAmountRow[];
  const rowMoney: MoneyFormatter = isIncome ? money : formatProjectExpenseMoney;
  const totalDisplay = formatRowsByCurrency(rows as CurrencyAmountRow[], rowMoney, fallbackCurrency);
  const monthDisplay = formatRowsByCurrency(monthRows, rowMoney, fallbackCurrency);
  const personalDisplay = formatRowsByCurrency(personalRows, rowMoney, fallbackCurrency);

  return (
    <article className="warm-card project-transactions-card">
      <CardTitle icon={<Icon size={20} />} title={title} />
      {rows.length ? (
        <>
          <div className="metric-grid">
            <Metric label={isIncome ? tr.totalProjectIncome : tr.totalProjectExpenses} value={totalDisplay || rowMoney(isIncome ? model.actualProjectIncome : model.actualProjectExpenses, fallbackCurrency)} />
            <Metric label={isIncome ? tr.projectIncomeThisMonth : tr.projectExpensesThisMonth} value={monthDisplay || rowMoney(isIncome ? model.monthlyProjectIncome : model.monthlyProjectExpenses, fallbackCurrency)} />
            <Metric label={isIncome ? tr.personalIncomeProjectIncome : tr.personalBudgetProjectExpenses} value={personalDisplay || rowMoney(isIncome ? model.personalIncomeProjectIncome : model.personalBudgetProjectExpenses, fallbackCurrency)} />
            <Metric label={isIncome ? tr.actualVsExpected : tr.actualVsPlanned} value={actualRatio} />
          </div>
          <div className="transaction-list">
            {rows.slice(0, 6).map(row => {
              const income = row as ProjectIncomeRow;
              const expense = row as ProjectExpenseRow;
              const date = isIncome ? income.income_date ?? income.created_at : expense.expense_date ?? expense.created_at;
              const badge = isIncome
                ? income.transferred_to_personal_income ? tr.transferredToPersonalIncome : ''
                : expense.paid_from_personal_budget ? tr.paidFromPersonalBudget : '';
              return (
                <div className="transaction-row" key={row.id}>
                  <div className="transaction-main">
                    <strong>{row.title || title}</strong>
                    <span>{dateLabel(date)} · {String(row.category || tr.general)}</span>
                    {badge ? <small>{badge}</small> : null}
                  </div>
                  <div className="transaction-amount">{formatRowMoney(row as CurrencyAmountRow, rowMoney, fallbackCurrency)}</div>
                  <div className="transaction-actions">
                    <button type="button" onClick={() => onEdit(row)} aria-label={`${tr.edit} ${row.title || title}`}>
                      <Pencil size={15} />
                      {tr.edit}
                    </button>
                    <button type="button" className="danger" onClick={() => onDelete(row)} aria-label={`${tr.delete} ${row.title || title}`}>
                      <Trash2 size={15} />
                      {tr.delete}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="action-empty">
          <span className="action-empty-icon" aria-hidden="true"><Icon size={22} /></span>
          <div>
            <strong>{emptyText}</strong>
            <p>{isIncome ? tr.projectIncome : tr.projectExpenses}</p>
          </div>
          <button type="button" onClick={onAdd}>
            <Icon size={16} />
            {addText}
          </button>
        </div>
      )}
    </article>
  );
}

export function CardTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <div className="card-title"><h2>{title}</h2>{icon}</div>;
}

export function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><small>{label}</small><strong>{value}</strong></div>;
}

export function EmptyState({ title, button, onClick }: { title: string; button: string; onClick: () => void }) {
  return (
    <div className="empty-state">
      <article>
        <FolderKanban size={42} color="var(--primary)" />
        <h1>{title}</h1>
        <button type="button" onClick={onClick}>{button}</button>
      </article>
    </div>
  );
}
