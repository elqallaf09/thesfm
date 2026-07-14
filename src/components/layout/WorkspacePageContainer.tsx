import React, { type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

import styles from './WorkspacePageContainer.module.css';

export const WORKSPACE_PAGE_CONTAINER_VARIANTS = [
  'full',
  'wide',
  'standard',
  'reading',
] as const;

export type WorkspacePageContainerVariant =
  (typeof WORKSPACE_PAGE_CONTAINER_VARIANTS)[number];

export type WorkspacePageContainerElement =
  | 'div'
  | 'main'
  | 'section'
  | 'article';

export interface WorkspacePageContainerProps
  extends HTMLAttributes<HTMLElement> {
  /** Selects content measure only; the workspace shell owns available width. */
  variant?: WorkspacePageContainerVariant;
  /** Allows the container to provide the appropriate document landmark. */
  as?: WorkspacePageContainerElement;
}

const variantClassNames: Record<WorkspacePageContainerVariant, string> = {
  full: styles.full,
  wide: styles.wide,
  standard: styles.standard,
  reading: styles.reading,
};

export function WorkspacePageContainer({
  as: Component = 'div',
  variant = 'standard',
  className,
  ...props
}: WorkspacePageContainerProps) {
  return (
    <Component
      {...props}
      className={cn(styles.container, variantClassNames[variant], className)}
      data-workspace-page-container="true"
      data-workspace-page-variant={variant}
    />
  );
}

export default WorkspacePageContainer;
