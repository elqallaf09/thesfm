'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, ChevronDown } from 'lucide-react';
import { availableWorkspaces, resolveActiveWorkspace } from '@/config/workspaces/workspace-resolver';
import { useLanguage } from '@/hooks/useLanguage';

const SWITCHER_COPY = {
  ar: { workspace: 'مساحة العمل', switch: 'التبديل بين مساحات العمل' },
  en: { workspace: 'Workspace', switch: 'Switch workspace' },
  fr: { workspace: 'Espace de travail', switch: 'Changer d’espace de travail' },
} as const;

type WorkspaceSwitcherProps = {
  /**
   * Courtesy visibility filter for the Administration workspace. Real admin
   * authorization stays server-side (middleware + admin gates); hiding the
   * entry here only keeps the UI honest for regular users.
   */
  isAdmin: boolean;
  /** Called after a workspace link is followed (mobile menus close here). */
  onNavigate?: () => void;
  className?: string;
};

export function WorkspaceSwitcher({ isAdmin, onNavigate, className = '' }: WorkspaceSwitcherProps) {
  const pathname = usePathname() || '/';
  const { lang } = useLanguage();
  const locale = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const copy = SWITCHER_COPY[locale];
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const active = resolveActiveWorkspace(pathname);
  const workspaces = availableWorkspaces({ isAdmin });
  const ActiveIcon = active.icon;

  // Close when the route changes (a selection landed) and on outside click /
  // Escape, returning focus to the trigger so keyboard flow is unbroken.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`sfm-workspace-switcher ${className}`.trim()}>
      <style>{`
        .sfm-workspace-switcher{position:relative;display:grid;gap:4px}
        .sfm-workspace-caption{padding:0 4px;color:#8FB3CF;font:950 10px Tajawal,Arial,sans-serif;letter-spacing:.04em}
        .sfm-workspace-trigger{width:100%;min-height:44px;display:flex;align-items:center;gap:9px;padding:9px 11px;border:1px solid rgba(47,214,192,.26);border-radius:var(--r-md,10px);background:linear-gradient(135deg,rgba(29,140,255,.16),rgba(47,214,192,.08));color:#EAF6FF;cursor:pointer;text-align:start;font:900 12.5px Tajawal,Arial,sans-serif;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}
        .sfm-workspace-trigger:hover,.sfm-workspace-trigger:focus-visible{border-color:rgba(47,214,192,.5);box-shadow:0 0 0 2px rgba(24,212,212,.2);outline:0}
        .sfm-workspace-trigger .sfm-workspace-icon{width:20px;height:20px;display:grid;place-items:center;flex:0 0 20px;color:var(--sfm-soft-cyan,#7CE7DC)}
        .sfm-workspace-trigger .sfm-workspace-name{min-width:0;flex:1;overflow-wrap:anywhere;line-height:1.3}
        .sfm-workspace-trigger .sfm-workspace-chevron{flex:0 0 auto;opacity:.8;transition:transform .18s ease}
        .sfm-workspace-trigger[aria-expanded="true"] .sfm-workspace-chevron{transform:rotate(180deg)}
        .sfm-workspace-list{position:absolute;inset-inline:0;top:calc(100% + 6px);z-index:80;display:grid;gap:3px;margin:0;padding:6px;list-style:none;background:#071a30;border:1px solid rgba(167,243,240,.22);border-radius:var(--r-md,10px);box-shadow:0 18px 44px rgba(2,10,20,.55)}
        .sfm-workspace-option{display:flex;align-items:flex-start;gap:9px;width:100%;min-height:44px;padding:8px 10px;border:1px solid transparent;border-radius:var(--r-sm,8px);color:#C7D8E8;text-decoration:none;font:850 12px Tajawal,Arial,sans-serif;transition:background .16s ease,color .16s ease,border-color .16s ease}
        .sfm-workspace-option:hover,.sfm-workspace-option:focus-visible{background:rgba(29,140,255,.16);color:#F5FBFF;border-color:rgba(167,243,240,.2);outline:0;box-shadow:0 0 0 2px rgba(24,212,212,.16)}
        .sfm-workspace-option[aria-current="true"]{background:rgba(47,214,192,.14);color:#FFFFFF;border-color:rgba(47,214,192,.3)}
        .sfm-workspace-option .sfm-workspace-icon{margin-top:1px}
        .sfm-workspace-option-copy{min-width:0;flex:1;display:grid;gap:2px}
        .sfm-workspace-option-copy small{color:#8FB3CF;font-size:10.5px;font-weight:750;line-height:1.45;overflow-wrap:anywhere}
        .sfm-workspace-option .sfm-workspace-check{flex:0 0 auto;margin-top:2px;color:var(--sfm-accent,#18D4D4)}
        @media (prefers-reduced-motion: reduce){
          .sfm-workspace-trigger,.sfm-workspace-option,.sfm-workspace-trigger .sfm-workspace-chevron{transition:none}
        }
        /* Light theme: the sidebar surface is white, so the switcher flips
           to dark-on-light while keeping the same structure. */
        html:not(.dark) .sfm-workspace-caption{color:#41597a}
        html:not(.dark) .sfm-workspace-trigger{background:linear-gradient(135deg,rgba(29,140,255,.1),rgba(47,214,192,.06));border-color:rgba(21,93,199,.32);color:#10233c}
        html:not(.dark) .sfm-workspace-trigger .sfm-workspace-icon{color:#155dc7}
        html:not(.dark) .sfm-workspace-list{background:#ffffff;border-color:rgba(21,93,199,.24);box-shadow:0 18px 44px rgba(3,18,37,.18)}
        html:not(.dark) .sfm-workspace-option{color:#2b3f58}
        html:not(.dark) .sfm-workspace-option:hover,html:not(.dark) .sfm-workspace-option:focus-visible{background:rgba(29,140,255,.1);color:#10233c;border-color:rgba(21,93,199,.24)}
        html:not(.dark) .sfm-workspace-option[aria-current="true"]{background:rgba(47,214,192,.12);color:#0c3a33;border-color:rgba(16,107,55,.3)}
        html:not(.dark) .sfm-workspace-option-copy small{color:#5b7089}
        html:not(.dark) .sfm-workspace-option .sfm-workspace-icon{color:#155dc7}
        html:not(.dark) .sfm-workspace-option .sfm-workspace-check{color:#106b37}
      `}</style>
      <span className="sfm-workspace-caption" aria-hidden="true">{copy.workspace}</span>
      <button
        ref={triggerRef}
        type="button"
        className="sfm-workspace-trigger"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${copy.switch} — ${active.labels[locale]}`}
        onClick={() => setOpen(current => !current)}
      >
        <span className="sfm-workspace-icon" aria-hidden="true"><ActiveIcon size={18} /></span>
        <span className="sfm-workspace-name">{active.labels[locale]}</span>
        <ChevronDown className="sfm-workspace-chevron" size={15} aria-hidden="true" />
      </button>
      {open ? (
        <ul id={listId} className="sfm-workspace-list" aria-label={copy.switch}>
          {workspaces.map(workspace => {
            const Icon = workspace.icon;
            const current = workspace.id === active.id;
            return (
              <li key={workspace.id}>
                <Link
                  href={workspace.defaultRoute}
                  className="sfm-workspace-option"
                  aria-current={current ? 'true' : undefined}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                >
                  <span className="sfm-workspace-icon" aria-hidden="true"><Icon size={17} /></span>
                  <span className="sfm-workspace-option-copy">
                    {workspace.labels[locale]}
                    <small>{workspace.description[locale]}</small>
                  </span>
                  {current ? <Check className="sfm-workspace-check" size={14} aria-hidden="true" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export default WorkspaceSwitcher;
