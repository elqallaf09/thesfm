import type { HTMLAttributes, ReactNode } from 'react';

type PrimitiveProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function StatGrid({ children, className = '', ...props }: PrimitiveProps) {
  return <div className={`sfm-stat-grid ${className}`.trim()} {...props}>{children}</div>;
}

export function CardsGrid({ children, className = '', ...props }: PrimitiveProps) {
  return <div className={`sfm-cards-grid ${className}`.trim()} {...props}>{children}</div>;
}

export function TwoColumnGrid({ children, className = '', ...props }: PrimitiveProps) {
  return <div className={`sfm-two-column-grid ${className}`.trim()} {...props}>{children}</div>;
}

