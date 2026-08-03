import Link from 'next/link';
import type { ReactNode } from 'react';

type HeaderIconActionProps = {
  href: string;
  label: string;
  className?: string;
  children: ReactNode;
};

/**
 * Shared presentational contract for icon-only header actions (currently:
 * notifications). Carries no styling of its own — the caller supplies the
 * visual class (e.g. "sfm-global-notifications"), which is styled centrally
 * in AppHeader.tsx alongside the other header controls it shares a track
 * with, rather than duplicating rules per icon-action component.
 */
export function HeaderIconAction({ href, label, className = '', children }: HeaderIconActionProps) {
  return (
    <Link href={href} prefetch={false} className={className} aria-label={label} title={label}>
      {children}
    </Link>
  );
}

export default HeaderIconAction;
