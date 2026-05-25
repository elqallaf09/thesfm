import type { HTMLAttributes, ReactNode } from 'react';

type AppCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: 'default' | 'dark' | 'muted';
};

export function AppCard({
  children,
  className = '',
  tone = 'default',
  ...props
}: AppCardProps) {
  return (
    <div className={`sfm-app-card sfm-app-card-${tone} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export default AppCard;

