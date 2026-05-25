import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  actions,
  className = '',
}: EmptyStateProps) {
  return (
    <section className={`sfm-empty-state ${className}`.trim()}>
      {icon ? <div className="sfm-empty-state-icon" aria-hidden="true">{icon}</div> : null}
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {actions ? <div className="sfm-empty-state-actions">{actions}</div> : null}
    </section>
  );
}

export default EmptyState;

