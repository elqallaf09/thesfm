'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Globe2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { Lang } from '@/lib/translations';

interface Props {
  value?: Lang;
  onChange?: (l: Lang) => void;
  variant?: 'light' | 'dark' | 'gold';
  compact?: boolean;
  size?: 'sm' | 'md';
}

const LANGS: Array<{ id: Lang; label: string; short: string }> = [
  { id: 'ar', label: 'العربية', short: 'AR' },
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'fr', label: 'Français', short: 'FR' },
];

const SWITCHER_LABEL: Record<Lang, string> = {
  ar: 'اختيار اللغة',
  en: 'Choose language',
  fr: 'Choisir la langue',
};

const MENU_WIDTH = 204;
const VIEWPORT_GUTTER = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function LanguageSwitcher({ value, onChange, variant = 'light', compact = false, size = 'md' }: Props) {
  const id = useId();
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = value ?? language.lang;
  const selectedIndex = Math.max(0, LANGS.findIndex(item => item.id === selected));
  const selectedLanguage = LANGS[selectedIndex] ?? LANGS[0];
  const handleChange = onChange ?? language.setLang;
  const isCompact = compact || size === 'sm';

  const updateMenuPosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const viewportOffsetLeft = viewport?.offsetLeft ?? 0;
    const viewportOffsetTop = viewport?.offsetTop ?? 0;
    const maxWidth = Math.max(160, viewportWidth - VIEWPORT_GUTTER * 2);
    const width = Math.min(Math.max(rect.width, MENU_WIDTH), maxWidth);
    const alignRight = document.documentElement.dir === 'rtl';
    const preferredLeft = alignRight ? rect.right - width : rect.left;
    const minLeft = viewportOffsetLeft + VIEWPORT_GUTTER;
    const maxLeft = Math.max(minLeft, viewportOffsetLeft + viewportWidth - width - VIEWPORT_GUTTER);
    const left = clamp(preferredLeft + viewportOffsetLeft, minLeft, maxLeft);
    const preferredTop = rect.bottom + viewportOffsetTop + 8;
    const minTop = viewportOffsetTop + VIEWPORT_GUTTER;
    const maxTop = Math.max(minTop, viewportOffsetTop + viewportHeight - 260 - VIEWPORT_GUTTER);
    const top = clamp(preferredTop, minTop, maxTop);

    setMenuStyle({
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(width),
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();

    const isInsideSwitcher = (target: EventTarget | null) => {
      const node = target as Node | null;
      return Boolean(node && (rootRef.current?.contains(node) || menuRef.current?.contains(node)));
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!isInsideSwitcher(event.target)) setOpen(false);
    };
    const onTouchStart = (event: TouchEvent) => {
      if (!isInsideSwitcher(event.target)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onViewportChange = () => updateMenuPosition();

    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    window.visualViewport?.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('scroll', onViewportChange);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
      window.visualViewport?.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('scroll', onViewportChange);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => itemRefs.current[selectedIndex]?.focus());
  }, [open, selectedIndex]);

  function selectLanguage(next: Lang) {
    handleChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      updateMenuPosition();
      setOpen(true);
    }
  }

  function handleItemKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      itemRefs.current[(index + 1) % LANGS.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      itemRefs.current[(index - 1 + LANGS.length) % LANGS.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      itemRefs.current[LANGS.length - 1]?.focus();
    }
  }

  const menu = open ? (
    <div
      ref={menuRef}
      id={`${id}-menu`}
      className="sfm-language-menu"
      data-variant={variant}
      role="listbox"
      aria-label={SWITCHER_LABEL[selected]}
      style={menuStyle}
    >
      {LANGS.map((item, index) => {
        const active = item.id === selected;
        return (
          <button
            key={item.id}
            ref={node => {
              itemRefs.current[index] = node;
            }}
            type="button"
            className={active ? 'sfm-language-option active' : 'sfm-language-option'}
            role="option"
            aria-selected={active}
            tabIndex={open ? 0 : -1}
            onClick={() => selectLanguage(item.id)}
            onKeyDown={event => handleItemKeyDown(event, index)}
          >
            <span>{item.label}</span>
            {active ? <Check className="sfm-language-check" size={16} aria-hidden="true" /> : <span className="sfm-language-check-placeholder" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="sfm-language-dropdown" data-variant={variant} data-compact={isCompact ? 'true' : 'false'}>
      <button
        ref={triggerRef}
        type="button"
        className="sfm-language-trigger"
        aria-label={SWITCHER_LABEL[selected]}
        title={SWITCHER_LABEL[selected]}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        suppressHydrationWarning
        onPointerDown={() => {
          if (!open) updateMenuPosition();
        }}
        onTouchStart={() => {
          if (!open) updateMenuPosition();
        }}
        onClick={() => {
          if (!open) updateMenuPosition();
          setOpen(value => !value);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <Globe2 size={16} aria-hidden="true" />
        <span className="sfm-language-label-full">{selectedLanguage.label}</span>
        <span className="sfm-language-label-short">{selectedLanguage.short}</span>
        <ChevronDown className="sfm-language-chevron" size={15} aria-hidden="true" />
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}

      <style jsx global>{`
        .sfm-language-dropdown {
          position: relative;
          display: inline-flex;
          width: max-content;
          max-width: 100%;
          flex-shrink: 0;
          font-family: var(--font-ui);
          z-index: 2147483647;
          overflow: visible;
        }
        .sfm-language-trigger {
          min-height: var(--control-h);
          min-width: 132px;
          max-width: 100%;
          border-radius: var(--radius-control);
          border: 1px solid var(--border-strong);
          background: var(--surface);
          color: var(--foreground);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 13px;
          font: 600 var(--type-navigation-size) var(--font-ui);
          cursor: pointer;
          box-shadow: var(--shadow-xs);
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease, color .18s ease;
          white-space: nowrap;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .sfm-language-label-short {
          display: none;
        }
        .sfm-language-dropdown[data-compact='true'] .sfm-language-trigger {
          min-width: 112px;
          min-height: var(--control-h);
          padding-inline: 11px;
          font-size: var(--type-navigation-size);
        }
        .sfm-language-dropdown[data-variant='dark'] .sfm-language-trigger {
          background: var(--surface);
          color: var(--foreground);
          border-color: var(--border-strong);
          box-shadow: var(--shadow-xs);
        }
        .sfm-language-dropdown[data-variant='gold'] .sfm-language-trigger {
          background: var(--surface);
          color: var(--foreground);
          border-color: var(--border-strong);
        }
        .sfm-language-trigger:hover {
          transform: translateY(-1px);
          border-color: color-mix(in srgb, var(--primary) 42%, var(--border));
          background: var(--surface-hover);
          box-shadow: var(--shadow-sm);
        }
        .sfm-language-trigger:active {
          transform: translateY(0) scale(.98);
        }
        .sfm-language-trigger:focus-visible,
        .sfm-language-option:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }
        .sfm-language-chevron {
          transition: transform .18s ease;
        }
        .sfm-language-trigger[aria-expanded='true'] .sfm-language-chevron {
          transform: rotate(180deg);
        }
        .sfm-language-menu {
          position: fixed !important;
          max-width: calc(100vw - 24px);
          max-height: min(260px, calc(100dvh - 24px));
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          border-radius: var(--radius-card);
          border: 1px solid var(--border);
          background: var(--popover);
          color: var(--popover-foreground);
          padding: 7px;
          box-shadow: var(--shadow-popover);
          display: grid;
          gap: 4px;
          z-index: 2147483647 !important;
          pointer-events: auto;
          animation: sfmLangMenuIn .16s ease-out;
          -webkit-overflow-scrolling: touch;
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
          font-family: var(--font-ui);
        }
        .sfm-language-menu[data-variant='dark'] {
          background: var(--popover);
          color: var(--popover-foreground);
          border-color: var(--border);
          box-shadow: var(--shadow-popover);
        }
        .sfm-language-option {
          min-height: 40px;
          border: 1px solid transparent;
          border-radius: var(--radius-control);
          background: transparent;
          color: inherit;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 11px;
          font: 500 var(--type-navigation-size) var(--font-ui);
          cursor: pointer;
          text-align: start;
          transition: background .16s ease, color .16s ease, border-color .16s ease, transform .16s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .sfm-language-option:hover {
          background: var(--surface-hover);
          border-color: var(--border);
          transform: translateY(-1px);
        }
        .sfm-language-menu[data-variant='dark'] .sfm-language-option:hover {
          background: var(--surface-hover);
          border-color: var(--border);
        }
        .sfm-language-option.active {
          background: var(--primary-soft);
          border-color: color-mix(in srgb, var(--primary) 32%, var(--border));
          color: var(--primary-hover);
        }
        .sfm-language-menu[data-variant='dark'] .sfm-language-option.active {
          color: var(--primary-hover);
          background: var(--primary-soft);
        }
        .sfm-language-check {
          color: var(--primary);
          flex: 0 0 auto;
        }
        .sfm-language-check-placeholder {
          width: 16px;
          height: 16px;
          flex: 0 0 auto;
        }
        @keyframes sfmLangMenuIn {
          from { opacity: 0; transform: translateY(-4px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 720px) {
          .sfm-language-dropdown {
            max-width: 100%;
          }
          .sfm-language-trigger {
            min-height: var(--control-h);
          }
          .sfm-language-menu {
            min-width: 178px;
          }
        }
        @media (max-width: 520px) {
          .sfm-language-dropdown[data-compact='true'] {
            max-width: 86px;
          }
          .sfm-language-dropdown[data-compact='true'] .sfm-language-trigger {
            min-width: 0;
            width: auto;
            max-width: 86px;
            min-height: var(--control-h);
            gap: 6px;
            border-radius: var(--radius-control);
            padding-inline: 10px;
          }
          .sfm-language-dropdown[data-compact='true'] .sfm-language-label-full {
            display: none;
          }
          .sfm-language-dropdown[data-compact='true'] .sfm-language-label-short {
            display: inline;
            font-weight: 600;
            letter-spacing: 0;
          }
          .sfm-language-dropdown[data-compact='true'] .sfm-language-chevron {
            width: 13px;
            height: 13px;
          }
        }
      `}</style>
    </div>
  );
}

export function FloatingLangSwitcher({ value, onChange }: Pick<Props, 'value' | 'onChange'>) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 'max(20px, env(safe-area-inset-bottom))',
      left: 'max(20px, env(safe-area-inset-left))',
      zIndex: 9999,
      maxWidth: 'calc(100vw - 40px)',
    }}>
      <LanguageSwitcher value={value} onChange={onChange} variant="light" />
    </div>
  );
}

export default LanguageSwitcher;
