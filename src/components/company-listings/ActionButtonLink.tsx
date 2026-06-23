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
        border-radius: 14px;
        padding: 0 16px;
        border: 1px solid rgba(11, 118, 224, 0.18);
        text-decoration: none;
        font: 950 13px/1.2 Tajawal, Arial, sans-serif;
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
        color: #ffffff;
        background: linear-gradient(135deg, #0b76e0, #18d4d4);
        box-shadow: 0 12px 24px rgba(11, 118, 224, 0.20);
      }

      .sfm-action-link-secondary {
        color: #0b76e0;
        background: rgba(255, 255, 255, 0.94);
      }

      .sfm-action-link-ghost {
        color: #eaf6ff;
        border-color: rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.10);
      }

      .sfm-action-link:hover,
      .sfm-action-link:focus-visible {
        outline: none;
        transform: translateY(-1px);
        box-shadow: 0 0 0 3px rgba(24, 212, 212, 0.16), 0 14px 28px rgba(15, 23, 42, 0.12);
      }

      .sfm-action-link-secondary:hover,
      .sfm-action-link-secondary:focus-visible {
        border-color: rgba(24, 212, 212, 0.42);
        background: #f0fdff;
        color: #075fb8;
      }

      .sfm-action-link-primary:hover,
      .sfm-action-link-primary:focus-visible {
        color: #ffffff;
        background: linear-gradient(135deg, #075fb8, #0fbfc9);
      }

      .sfm-action-link-ghost:hover,
      .sfm-action-link-ghost:focus-visible {
        color: #ffffff;
        border-color: rgba(24, 212, 212, 0.46);
        background: rgba(255, 255, 255, 0.16);
      }

      .sfm-action-link:active {
        transform: translateY(0) scale(.98);
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.10);
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

      .dark .sfm-action-link-secondary {
        color: #d9fbff;
        border-color: rgba(74, 222, 228, 0.22);
        background: rgba(15, 36, 59, 0.92);
      }

      .dark .sfm-action-link-secondary:hover,
      .dark .sfm-action-link-secondary:focus-visible {
        color: #ffffff;
        background: rgba(14, 116, 144, 0.32);
        border-color: rgba(74, 222, 228, 0.46);
      }
    `}</style>
  );
}
