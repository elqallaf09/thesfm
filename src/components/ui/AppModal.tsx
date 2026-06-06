'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type AppModalSize = 'sm' | 'md' | 'lg' | 'xl';

type AppModalProps = {
  open: boolean;
  title: string;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  subtitle?: string;
  size?: AppModalSize;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
};

const WIDTHS: Record<AppModalSize, string> = {
  sm: '520px',
  md: '720px',
  lg: '900px',
  xl: '1040px',
};

let openModalCount = 0;

function lockPageScroll() {
  openModalCount += 1;
  if (openModalCount === 1) {
    document.documentElement.classList.add('sfm-modal-open');
    document.body.classList.add('sfm-modal-open-body');
  }

  return () => {
    openModalCount = Math.max(0, openModalCount - 1);
    if (openModalCount === 0) {
      document.documentElement.classList.remove('sfm-modal-open');
      document.body.classList.remove('sfm-modal-open-body');
    }
  };
}

export function AppModal({
  open,
  title,
  subtitle,
  closeLabel,
  children,
  footer,
  size = 'md',
  className = '',
  bodyClassName = '',
  footerClassName = '',
  onClose,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: AppModalProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    return lockPageScroll();
  }, [open]);

  useEffect(() => {
    if (!open || !closeOnEscape) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape, onClose, open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  if (!mounted || !open) return null;

  const style = { '--sfm-modal-width': WIDTHS[size] } as CSSProperties;

  return createPortal(
    <div
      className="sfm-modal-overlay"
      role="presentation"
      onMouseDown={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={panelRef}
        className={`sfm-modal-panel ${className}`.trim()}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="sfm-modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="sfm-modal-close" onClick={onClose} aria-label={closeLabel}>
            <X size={18} />
          </button>
        </div>

        <div className={`sfm-modal-body ${bodyClassName}`.trim()}>
          {children}
        </div>

        {footer ? (
          <div className={`sfm-modal-footer ${footerClassName}`.trim()}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
