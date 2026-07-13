'use client';

import { currentMonthRange } from '@/lib/data/financeData';
import { calculateGoalProgress } from '@/lib/goalProgress';
import { parseMoneyValue } from '@/lib/money';
import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// ─── Types (subset needed by these components) ──────────────────────────────
export type DataRow = Record<string, unknown>;

export type DashboardLoadFailure = {
  section: string;
  table: string;
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

// ─── Utility functions ───────────────────────────────────────────────────────
export function numberValue(value: unknown): number | null {
  const parsed = parseMoneyValue(value);
  return parsed.status === 'valid' ? parsed.value : null;
}

export function firstNumber(row: DataRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = numberValue(row[key]);
    if (value !== null) return value;
  }
  return null;
}

export function firstText(row: DataRow, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

export function firstDate(row: DataRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

export function parseRecordDate(value: string) {
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isCurrentMonth(row: DataRow, keys: string[], range = currentMonthRange()) {
  const value = firstDate(row, keys);
  if (!value) return false;
  const date = parseRecordDate(value);
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

export function daysUntil(value?: string | null) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - start.getTime()) / 86_400_000);
}

export function isOpenStatus(row: DataRow) {
  const status = firstText(row, ['status', 'state']).toLowerCase();
  return !['done', 'completed', 'complete', 'cancelled', 'archived', 'read'].includes(status);
}

export function isTaskOverdue(row: DataRow) {
  const due = firstDate(row, ['due_date', 'target_date', 'end_date']);
  const days = daysUntil(due);
  return isOpenStatus(row) && days !== null && days < 0;
}

export function goalProgress(row: DataRow) {
  return calculateGoalProgress(row).progressRatio;
}

export function latestByDate(rows: DataRow[], keys: string[]) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(firstDate(a, keys) ?? 0).getTime();
    const bTime = new Date(firstDate(b, keys) ?? 0).getTime();
    return bTime - aTime;
  })[0];
}

export function statusLabel(score: number | null, text: { insufficientStatus: string; excellent: string; good: string; needsReview: string }) {
  if (score === null) return text.insufficientStatus;
  if (score >= 85) return text.excellent;
  if (score >= 65) return text.good;
  return text.needsReview;
}

export function getRecordCurrency(rows: DataRow[]) {
  for (const row of rows) {
    const currency = firstText(row, ['currency']);
    if (currency) return currency;
  }
  return null;
}
export function CardShell({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="dashboard-card">
      <div className="card-heading">
        <span className="card-icon" aria-hidden="true">
          {icon}
        </span>
        <h2>{title}</h2>
      </div>
      <div className="card-body">{children}</div>
      {action ? <div className="card-actions">{action}</div> : null}
    </section>
  );
}

export function MetricCard({
  title,
  value,
  detail,
  icon,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone?: 'neutral' | 'positive' | 'warning';
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}

export function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="small-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ActionLink({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Link
      className={`action-link action-link-${variant}`}
      href={href}
      prefetch={false}
      aria-label={typeof children === 'string' ? children : undefined}
    >
      <span className="action-link-label">{children}</span>
      <span className="action-link-icon" aria-hidden="true">
        <ArrowRight size={16} />
      </span>
    </Link>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="empty-state">
      <p>{title}</p>
      {body ? <span>{body}</span> : null}
    </div>
  );
}

const OPTIONAL_SECTIONS = new Set(['projectTasks','projectMilestones','projectFinancialModels','projectPitchDecks','projectFundingReadiness','marketWatchlist','marketPriceAlerts','zakatCalculations','zakatAssets','charityProjects','charityDonations','charityReminders','charityCommitments','notifications']);

export function normalizeDashboardError(error: unknown, fallback = 'Load failed') {
  if (!error) return { message: fallback };
  if (error instanceof Error) return { message: error.message || fallback };
  if (typeof error === 'string') return { message: error || fallback };

  if (typeof error === 'object') {
    const source = error as Record<string, unknown>;
    return {
      message: String(source.message || fallback),
      code: source.code ? String(source.code) : undefined,
      details: source.details ? String(source.details) : undefined,
      hint: source.hint ? String(source.hint) : undefined,
    };
  }

  return { message: fallback };
}

export function logDashboardFailure(failure: DashboardLoadFailure) {
  if (process.env.NODE_ENV === 'production') return;
  console.error('[ExecutiveDashboard] Real loading error', {
    section: failure.section,
    table: failure.table,
    code: failure.code,
    message: failure.message,
    details: failure.details,
    hint: failure.hint,
  });
}

export function isGlobalDashboardFailure(failure: DashboardLoadFailure) {
  return failure.section === 'auth' || failure.section === 'profile' || !OPTIONAL_SECTIONS.has(failure.section);
}


export function ProgressBar({ value, label }: { value: number; label: string }) {
  const normalized = Math.max(0, Math.min(value, 100));
  return (
    <div className="progress-wrap" aria-label={label} role="progressbar" aria-valuenow={normalized} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${normalized}%` }} />
    </div>
  );
}

