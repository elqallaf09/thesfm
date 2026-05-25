import type { HTMLAttributes, ReactNode } from 'react';

type ActionRowProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function ActionRow({ children, className = '', ...props }: ActionRowProps) {
  return (
    <div className={`sfm-action-row ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export default ActionRow;

