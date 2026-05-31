import type { ReactNode } from 'react';

type MoneyAmountProps = {
  children: ReactNode;
  className?: string;
};

export function MoneyAmount({ children, className }: MoneyAmountProps) {
  return <span className={className ? `money-amount ${className}` : 'money-amount'}>{children}</span>;
}
