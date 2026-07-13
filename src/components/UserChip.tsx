'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { useLanguage } from '@/hooks/useLanguage';

const MENU_WIDTH = 296;

type MenuPosition = {
  left: number;
  top: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function UserChip({ displayName }: { displayName?: string }) {
  const { signOut } = useAuth();
  const currentUser = useCurrentUserProfile();
  const { t, dir } = useLanguage();
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ left: 12, top: 12 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const name = currentUser.isLoading
    ? t('loading')
    : displayName || currentUser.displayName || (currentUser.isGuest ? t('guest_mode') : t('common_user'));
  const email = currentUser.email;
  const avatarUrl = currentUser.avatarUrl;
  const avatarStyle = avatarUrl ? { backgroundImage: `url("${avatarUrl}")` } : undefined;
  const avatarClassName = avatarUrl ? 'sfm-user-avatar has-image' : 'sfm-user-avatar';
  const initials = (currentUser.avatarInitial || name
    .split(/\s+/)
    .map((word: string) => word[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'S').slice(0, 1);

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button || typeof window === 'undefined') return;

    const rect = button.getBoundingClientRect();
    const margin = 8;
    const desiredLeft = dir === 'rtl' ? rect.right - MENU_WIDTH : rect.left;
    const left = clamp(desiredLeft, margin, window.innerWidth - MENU_WIDTH - margin);
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 260;
    const top = spaceBelow < menuHeight + 16
      ? Math.max(margin, rect.top - menuHeight - margin)
      : rect.bottom + margin;

    setPosition({ left, top });
  }, [dir]);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        window.requestAnimationFrame(() => buttonRef.current?.focus());
      }
    };

    const handleViewportChange = () => updatePosition();

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open || !mounted) return;
    const frame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mounted, open]);

  const goProfile = () => {
    setOpen(false);
    router.push('/profile');
  };

  const goSecurity = () => {
    setOpen(false);
    router.push('/security');
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.push('/login');
    router.refresh();
  };

  const menu = open && mounted ? createPortal(
    <div
      ref={menuRef}
      className="sfm-user-menu"
      dir={dir}
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        width: MENU_WIDTH,
        zIndex: 10020,
      }}
      role="menu"
      aria-label={name}
      onKeyDown={event => {
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
        const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          items[(currentIndex + 1 + items.length) % items.length]?.focus();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          items[(currentIndex - 1 + items.length) % items.length]?.focus();
        } else if (event.key === 'Home') {
          event.preventDefault();
          items[0]?.focus();
        } else if (event.key === 'End') {
          event.preventDefault();
          items.at(-1)?.focus();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <div className="sfm-user-menu-head" role="none">
        <span className={`${avatarClassName} sfm-user-avatar-lg`} style={avatarStyle} aria-hidden="true">
          {avatarUrl ? null : initials}
        </span>
        <span className="sfm-user-menu-copy">
          <strong>{name}</strong>
          <small dir="ltr">{currentUser.isGuest ? t('guest_mode') : email || t('common_user')}</small>
        </span>
      </div>
      <button type="button" role="menuitem" className="sfm-user-menu-item" onClick={goProfile}>
        <UserRound size={17} />
        <span>{t('nav_profile')}</span>
      </button>
      <button type="button" role="menuitem" className="sfm-user-menu-item" onClick={goSecurity}>
        <ShieldCheck size={17} />
        <span>{t('nav_security')}</span>
      </button>
      <button type="button" role="menuitem" className="sfm-user-menu-item danger" onClick={handleSignOut}>
        <LogOut size={17} />
        <span>{t('nav_logout')}</span>
      </button>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <style>{`
        .sfm-user-chip-wrap{position:relative;display:inline-flex;width:auto;max-width:min(190px,100%);min-width:0;flex:0 1 auto;font-family:var(--font-ui);vertical-align:top}
        .sfm-user-chip{display:inline-flex;align-items:center;gap:8px;width:auto;max-width:100%;min-width:0;min-height:44px;padding:6px 10px 6px 7px;border-radius:var(--radius-pill);background:var(--surface-elevated);border:1px solid var(--border);cursor:pointer;color:var(--foreground);text-align:start;box-shadow:var(--shadow-xs);transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease;font-family:var(--font-ui)}
        .sfm-user-chip:hover,.sfm-user-chip[aria-expanded="true"]{background:var(--surface-hover);border-color:color-mix(in srgb,var(--primary) 36%,var(--border));box-shadow:var(--shadow-card)}
        .sfm-user-chip:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}
        .sfm-user-chip:active{transform:translateY(1px)}
        .sfm-user-avatar{width:28px;height:28px;border-radius:var(--radius-pill);background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--primary-foreground);flex:0 0 auto;box-shadow:var(--shadow-xs);overflow:hidden;background-size:cover;background-position:center}
        .sfm-user-identity{flex:1 1 auto;min-width:0;max-width:118px;display:block}
        .sfm-user-name{display:block;min-width:0;font-size:12.5px;font-weight:600;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--foreground)}
        .sfm-user-chevron{color:var(--foreground-muted);transition:transform .18s ease,color .18s ease;flex:0 0 auto}
        .sfm-user-chip[aria-expanded="true"] .sfm-user-chevron{transform:rotate(180deg)}
        .sfm-user-menu{background:var(--surface-elevated);border:1px solid var(--border);border-radius:var(--radius-card);box-shadow:var(--shadow-lg);padding:7px;animation:sfmUserMenuIn .16s ease-out;font-family:var(--font-ui)}
        .sfm-user-menu-head{display:flex;align-items:center;gap:10px;padding:9px 10px 10px;margin-bottom:5px;border-radius:var(--radius-control);background:var(--surface-muted);border:1px solid var(--border);min-width:0}
        .sfm-user-avatar-lg{width:34px;height:34px;font-size:12px;color:var(--primary-foreground)}
        .sfm-user-menu-copy{display:grid;gap:2px;min-width:0}
        .sfm-user-menu-copy strong{min-width:0;color:var(--foreground);font:600 13px var(--font-ui);line-height:1.35;overflow-wrap:anywhere}
        .sfm-user-menu-copy small{min-width:0;color:var(--foreground-muted);font:400 11px var(--font-ui);line-height:1.35;overflow-wrap:anywhere}
        .sfm-user-menu-item{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:0 12px;border:1px solid transparent;border-radius:var(--radius-control);background:transparent;color:var(--foreground);font:500 13px var(--font-ui);cursor:pointer;text-align:start;transition:background .16s ease,color .16s ease,transform .16s ease,border-color .16s ease}
        .sfm-user-menu-item:hover,.sfm-user-menu-item:focus-visible{background:var(--surface-hover);color:var(--primary-hover);border-color:color-mix(in srgb,var(--primary) 28%,var(--border));outline:2px solid var(--focus-ring);outline-offset:1px;box-shadow:var(--focus-shadow)}
        .sfm-user-menu-item:active{transform:translateY(1px)}
        .sfm-user-menu-item svg{color:var(--foreground-muted);flex:0 0 auto}
        .sfm-user-menu-item.danger{color:var(--danger)}
        .sfm-user-menu-item.danger:hover,.sfm-user-menu-item.danger:focus-visible{background:var(--danger-soft);color:var(--danger);border-color:color-mix(in srgb,var(--danger) 30%,var(--border))}
        .sfm-user-menu-item.danger svg{color:var(--danger)}
        @keyframes sfmUserMenuIn{from{opacity:0;transform:translateY(-5px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        @media(max-width:640px){.sfm-user-chip-wrap{max-width:128px}.sfm-mobile-user .sfm-user-chip-wrap{max-width:min(190px,100%)}.sfm-user-chip{min-height:44px;padding:5px 8px 5px 6px}.sfm-user-avatar{width:28px;height:28px;font-size:10px}.sfm-user-identity{max-width:72px}.sfm-user-name{font-size:12px}.sfm-user-menu{border-radius:var(--radius-card)}.sfm-user-menu-item{min-height:48px;font-size:14px}}
        @media(prefers-reduced-motion:reduce){.sfm-user-chip,.sfm-user-menu,.sfm-user-menu-item{animation:none;transition:none}}
      `}</style>
      <div className="sfm-user-chip-wrap">
        <button
          ref={buttonRef}
          type="button"
          className="sfm-user-chip"
          onClick={() => setOpen(value => !value)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={name}
        >
          <span className={avatarClassName} style={avatarStyle}>{avatarUrl ? null : initials}</span>
          <span className="sfm-user-identity">
            <span className="sfm-user-name">{name}</span>
          </span>
          <ChevronDown className="sfm-user-chevron" size={15} />
        </button>
      </div>
      {menu}
    </>
  );
}
