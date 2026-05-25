import type { ReactNode } from 'react';

type PageHeroProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  status?: ReactNode;
  className?: string;
};

export function PageHero({
  title,
  subtitle,
  eyebrow,
  icon,
  actions,
  status,
  className = '',
}: PageHeroProps) {
  return (
    <section className={`sfm-page-hero ${className}`.trim()}>
      {icon ? <div className="sfm-page-hero-icon" aria-hidden="true">{icon}</div> : null}
      <div className="sfm-page-hero-copy">
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {status ? <div className="sfm-page-hero-status">{status}</div> : null}
      {actions ? <div className="sfm-page-hero-actions">{actions}</div> : null}
    </section>
  );
}

export default PageHero;

