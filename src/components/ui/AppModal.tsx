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
  md: '680px',
  lg: '900px',
  xl: '1040px',
};

let openModalCount = 0;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
}

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
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const unlockPageScroll = lockPageScroll();
    const overlay = overlayRef.current;
    const backgroundState = new Map<HTMLElement, { inert: boolean; ariaHidden: string | null }>();

    Array.from(document.body.children).forEach(child => {
      if (!(child instanceof HTMLElement) || child === overlay || child.tagName === 'SCRIPT' || child.tagName === 'STYLE') return;
      backgroundState.set(child, {
        inert: child.inert,
        ariaHidden: child.getAttribute('aria-hidden'),
      });
      child.inert = true;
      child.setAttribute('aria-hidden', 'true');
    });

    const dialog = panelRef.current;
    const initialFocus = dialog?.querySelector<HTMLElement>('[autofocus]')
      ?? (dialog ? focusableElements(dialog)[0] : null)
      ?? dialog;
    initialFocus?.focus({ preventScroll: true });

    function handleKeyDown(event: KeyboardEvent) {
      const currentDialog = panelRef.current;
      if (!currentDialog) return;

      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = focusableElements(currentDialog);
      if (!focusable.length) {
        event.preventDefault();
        currentDialog.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !currentDialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !currentDialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      backgroundState.forEach(({ inert, ariaHidden }, element) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
      });
      unlockPageScroll();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [closeOnEscape, open]);

  if (!mounted || !open) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9998,
    width: '100vw',
    height: '100dvh',
    maxWidth: 'none',
    maxHeight: 'none',
    margin: 0,
    transform: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(12px, 2vw, 24px)',
    overflow: 'hidden',
    isolation: 'isolate',
    background: 'rgba(3, 18, 37, 0.56)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  };
  const panelStyle = {
    '--sfm-modal-width': WIDTHS[size],
    position: 'relative',
    zIndex: 9999,
    margin: 0,
    transform: 'none',
  } as CSSProperties;

  return createPortal(
    <div
      ref={overlayRef}
      className="sfm-modal-overlay"
      style={overlayStyle}
      role="presentation"
      onMouseDown={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={panelRef}
        className={`sfm-modal-panel ${className}`.trim()}
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descriptionId : undefined}
        tabIndex={-1}
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="sfm-modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p id={descriptionId}>{subtitle}</p> : null}
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
