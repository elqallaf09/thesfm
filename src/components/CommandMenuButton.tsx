'use client';

import { forwardRef, type ButtonHTMLAttributes, type MouseEvent } from 'react';
import { Search } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

type CommandMenuOpenDetail = {
  focusOrigin: HTMLElement | null;
};

export function openCommandMenu(focusOrigin?: HTMLElement | null) {
  if (typeof window === 'undefined') return;
  const resolvedFocusOrigin = focusOrigin ?? (
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  );
  window.dispatchEvent(new CustomEvent<CommandMenuOpenDetail>('sfm:open-command-menu', {
    detail: { focusOrigin: resolvedFocusOrigin },
  }));
}

export interface CommandMenuButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  compact?: boolean;
  dark?: boolean;
  onBeforeOpen?: () => void;
  focusReturnTarget?: () => HTMLElement | null;
}

export const CommandMenuButton = forwardRef<HTMLButtonElement, CommandMenuButtonProps>(
  function CommandMenuButton(
    {
      compact = false,
      dark = false,
      onBeforeOpen,
      focusReturnTarget,
      onClick,
      className,
      'aria-label': ariaLabel,
      ...buttonProps
    },
    ref,
  ) {
    const { t, dir } = useLanguage();

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;

      const focusOrigin = focusReturnTarget?.()
        ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      onBeforeOpen?.();
      openCommandMenu(focusOrigin);
    };

    return (
      <button
        {...buttonProps}
        ref={ref}
        type="button"
        className={`sfm-command-trigger${compact ? ' compact' : ''}${dark ? ' dark' : ''}${className ? ` ${className}` : ''}`}
        onClick={handleClick}
        aria-label={ariaLabel ?? (compact ? t('command_open') : undefined)}
        dir={buttonProps.dir ?? dir}
      >
        <Search size={compact ? 18 : 16} aria-hidden="true" />
        {!compact && <span>{t('command_open')}</span>}
        {!compact && <kbd aria-hidden="true">{t('command_shortcut')}</kbd>}
        <style jsx>{`
        .sfm-command-trigger {
          width: 100%;
          min-height: 44px;
          border: 1px solid var(--border);
          border-radius: var(--radius-control);
          background: var(--surface-elevated);
          color: var(--foreground);
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 10px;
          font-family: var(--font-ui);
          font-size: var(--type-navigation-size);
          font-weight: var(--type-navigation-weight);
          cursor: pointer;
          overflow: hidden;
          transition:
            background-color var(--duration-fast) var(--ease),
            border-color var(--duration-fast) var(--ease),
            color var(--duration-fast) var(--ease);
        }
        .sfm-command-trigger.compact {
          width: 44px;
          height: 44px;
          min-height: 44px;
          justify-content: center;
          padding: 0;
        }
        .sfm-command-trigger:hover {
          background: var(--sidebar-hover);
          border-color: var(--border-strong);
        }
        .sfm-command-trigger:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
          box-shadow: var(--focus-shadow);
        }
        .sfm-command-trigger svg {
          color: var(--primary);
          flex: 0 0 auto;
        }
        .sfm-command-trigger span {
          flex: 1;
          min-width: 0;
          text-align: start;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sfm-command-trigger kbd {
          flex: 0 0 auto;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 2px 5px;
          color: var(--foreground-muted);
          background: var(--surface-muted);
          font-size: 12px;
          font-family: var(--font-ui);
          font-weight: 500;
          line-height: 1.3;
        }
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-command-trigger{width:44px;padding:0;justify-content:center}
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-command-trigger span,
        .sfm-shared-sidebar[data-collapsed="true"] .sfm-command-trigger kbd{display:none}
        @media(max-width:360px){.sfm-command-trigger kbd{display:none}}
        @media(prefers-reduced-motion:reduce){.sfm-command-trigger{transition:none}}
      `}</style>
      </button>
    );
  },
);

CommandMenuButton.displayName = 'CommandMenuButton';

