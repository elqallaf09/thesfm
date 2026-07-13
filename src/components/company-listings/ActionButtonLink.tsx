'use client';

import Link from 'next/link';
import type { MouseEventHandler, ReactNode } from 'react';

type ActionButtonLinkProps = {
  href: string;
  label: string;
  ariaLabel?: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  external?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

function isExternalHref(href: string) {
  return /^(https?:|mailto:|tel:)/i.test(href);
}

export function ActionButtonLink({
  href,
  label,
  ariaLabel,
  icon,
  variant = 'secondary',
  className = '',
  external,
  onClick,
}: ActionButtonLinkProps) {
  const classes = `sfm-action-link sfm-action-link-${variant} ${className}`.trim();
  const isExternal = external ?? isExternalHref(href);
  const content = (
    <>
      {icon ? <span className="sfm-action-link-icon" aria-hidden="true">{icon}</span> : null}
      <span>{label}</span>
    </>
  );

  if (isExternal) {
    return (
      <>
        <a
          className={classes}
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noreferrer' : undefined}
          aria-label={ariaLabel ?? label}
          onClick={onClick}
        >
          {content}
        </a>
        <ActionButtonLinkStyles />
      </>
    );
  }

  return (
    <>
      <Link className={classes} href={href} aria-label={ariaLabel ?? label} onClick={onClick}>
        {content}
      </Link>
      <ActionButtonLinkStyles />
    </>
  );
}

function ActionButtonLinkStyles() {
  return (
    <style jsx global>{`
      .sfm-action-link {
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: var(--radius-control);
        padding: 0 16px;
        border: 1px solid var(--border);
        text-decoration: none;
        font: 600 13px/1.25 var(--font-ui);
        cursor: pointer;
        white-space: nowrap;
        -webkit-tap-highlight-color: transparent;
        transition:
          transform .16s ease,
          box-shadow .16s ease,
          border-color .16s ease,
          background .16s ease,
          color .16s ease;
      }

      .sfm-action-link-primary {
        border-color: transparent;
        color: var(--primary-foreground);
        background: var(--primary);
        box-shadow: var(--shadow-sm);
      }

      .sfm-action-link-secondary {
        color: var(--primary);
        background: var(--surface);
      }

      .sfm-action-link-ghost {
        color: var(--hero-foreground);
        border-color: color-mix(in srgb, var(--hero-foreground) 28%, transparent);
        background: color-mix(in srgb, var(--surface) 12%, transparent);
      }

      .sfm-action-link:hover,
      .sfm-action-link:focus-visible {
        outline: 2px solid var(--focus-ring);
        outline-offset: 2px;
        transform: translateY(-1px);
        box-shadow: var(--focus-shadow);
      }

      .sfm-action-link-secondary:hover,
      .sfm-action-link-secondary:focus-visible {
        border-color: var(--primary);
        background: var(--surface-hover);
        color: var(--primary-hover);
      }

      .sfm-action-link-primary:hover,
      .sfm-action-link-primary:focus-visible {
        color: var(--primary-foreground);
        background: var(--primary-hover);
      }

      .sfm-action-link-ghost:hover,
      .sfm-action-link-ghost:focus-visible {
        color: var(--hero-foreground);
        border-color: var(--accent);
        background: color-mix(in srgb, var(--surface) 18%, transparent);
      }

      .sfm-action-link:active {
        transform: translateY(0) scale(.98);
        box-shadow: var(--shadow-xs);
      }

      .sfm-action-link-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
      }

      .sfm-action-link-icon svg {
        display: block;
      }

    `}</style>
  );
}
