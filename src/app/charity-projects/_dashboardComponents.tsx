'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';
import { PageTabs, type PageTabItem } from '@/components/layout/PageTabs';
import type { CharityProjectsTab } from './_types';

type CharityButtonVariant = 'primary' | 'secondary' | 'ghost';

export function CharityActionButton({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: CharityButtonVariant;
}) {
  return (
    <button className={`charity-action-button ${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function CharityStatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <article className="warm-card summary-card charity-stat-card">
      <span aria-hidden="true"><Icon size={18} /></span>
      <small>{label}</small>
      <strong dir="ltr">{value}</strong>
      {helper && <em>{helper}</em>}
    </article>
  );
}

export function CharityTabs({
  tabs,
  active,
  onChange,
  ariaLabel,
}: {
  tabs: Array<PageTabItem & { id: CharityProjectsTab }>;
  active: CharityProjectsTab;
  onChange: (id: CharityProjectsTab) => void;
  ariaLabel: string;
}) {
  return (
    <PageTabs
      tabs={tabs}
      active={active}
      onChange={id => onChange(id as CharityProjectsTab)}
      ariaLabel={ariaLabel}
      className="charity-tabs"
    />
  );
}

export function CharitySectionHeader({
  eyebrow,
  title,
  description,
  icon,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="section-head vault-head charity-section-header">
      <div>
        {eyebrow && <small>{eyebrow}</small>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action ?? (icon ? <span className="charity-section-icon" aria-hidden="true">{icon}</span> : null)}
    </div>
  );
}

export function CharityEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <EmptyState
      className="charity-empty-state compact"
      icon={icon}
      title={title}
      description={description}
      actions={action}
    />
  );
}

export function CharityFormSection({
  className = '',
  eyebrow,
  title,
  description,
  icon,
  action,
  children,
}: {
  className?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className={`charity-form-section ${className}`.trim()}>
      <CharitySectionHeader eyebrow={eyebrow} title={title} description={description} icon={icon} action={action} />
      {children}
    </article>
  );
}

export function CharityReportCard({
  icon,
  title,
  description,
  action,
  children,
  className = '',
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <article className={`report-option-card charity-report-card ${className}`.trim()}>
      <span className="report-card-icon" aria-hidden="true">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {children}
      {action}
    </article>
  );
}
