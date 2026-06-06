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
      if (event.key === 'Escape') setOpen(false);
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
        .sfm-user-chip-wrap{position:relative;display:inline-flex;width:auto;max-width:min(190px,100%);min-width:0;flex:0 1 auto;font-family:Tajawal,Arial,sans-serif;vertical-align:top}
        .sfm-user-chip{display:inline-flex;align-items:center;gap:8px;width:auto;max-width:100%;min-width:0;min-height:40px;padding:6px 9px 6px 7px;border-radius:999px;background:rgba(255,255,255,.88);border:1px solid rgba(29,140,255,.18);cursor:pointer;color:#061B33;text-align:start;box-shadow:0 8px 22px rgba(3,18,37,.08);transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease;color-scheme:light;font-family:Tajawal,Arial,sans-serif}
        .sfm-user-chip:hover,.sfm-user-chip[aria-expanded="true"]{background:#FFFFFF;border-color:rgba(24,212,212,.46);box-shadow:0 12px 28px rgba(29,140,255,.16)}
        .sfm-user-chip:focus-visible{outline:none;border-color:rgba(24,212,212,.72);box-shadow:0 0 0 4px rgba(24,212,212,.20),0 12px 28px rgba(29,140,255,.14)}
        .sfm-user-chip:active{transform:translateY(1px)}
        .sfm-user-avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:950;color:#FFFFFF;flex:0 0 auto;box-shadow:0 8px 18px rgba(29,140,255,.24);overflow:hidden;background-size:cover;background-position:center}
        .sfm-user-identity{flex:1 1 auto;min-width:0;max-width:118px;display:block}
        .sfm-user-name{display:block;min-width:0;font-size:12.5px;font-weight:950;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#061B33}
        .sfm-user-chevron{color:#64748B;transition:transform .18s ease,color .18s ease;flex:0 0 auto}
        .sfm-user-chip[aria-expanded="true"] .sfm-user-chevron{transform:rotate(180deg)}
        .dark .sfm-user-chip,.sfm-shared-sidebar .sfm-user-chip,.sfm-mobile-panel .sfm-user-chip{background:rgba(255,255,255,.08);border-color:rgba(167,243,240,.22);color:#EAF6FF;box-shadow:none;color-scheme:dark}
        .dark .sfm-user-chip:hover,.dark .sfm-user-chip[aria-expanded="true"],.sfm-shared-sidebar .sfm-user-chip:hover,.sfm-shared-sidebar .sfm-user-chip[aria-expanded="true"],.sfm-mobile-panel .sfm-user-chip:hover,.sfm-mobile-panel .sfm-user-chip[aria-expanded="true"]{background:rgba(167,243,240,.14);border-color:rgba(167,243,240,.45);box-shadow:0 8px 22px rgba(0,0,0,.16)}
        .dark .sfm-user-name,.sfm-shared-sidebar .sfm-user-name,.sfm-mobile-panel .sfm-user-name{color:#EAF6FF}
        .dark .sfm-user-chevron,.sfm-shared-sidebar .sfm-user-chevron,.sfm-mobile-panel .sfm-user-chevron{color:rgba(234,246,255,.62)}
        .sfm-user-menu{background:linear-gradient(180deg,var(--sfm-card),var(--sfm-light-card));border:1px solid rgba(167,243,240,.24);border-radius:16px;box-shadow:0 22px 55px rgba(3,18,37,.28);padding:7px;animation:sfmUserMenuIn .16s ease-out;font-family:Tajawal,Arial,sans-serif}
        .sfm-user-menu-head{display:flex;align-items:center;gap:10px;padding:9px 10px 10px;margin-bottom:5px;border-radius:13px;background:rgba(29,140,255,.10);border:1px solid rgba(24,212,212,.18);min-width:0}
        .sfm-user-avatar-lg{width:34px;height:34px;font-size:12px;color:#FFFFFF}
        .sfm-user-menu-copy{display:grid;gap:2px;min-width:0}
        .sfm-user-menu-copy strong{min-width:0;color:var(--sfm-foreground);font:950 13px Tajawal,Arial,sans-serif;line-height:1.35;overflow-wrap:anywhere}
        .sfm-user-menu-copy small{min-width:0;color:var(--sfm-muted);font:800 11px Tajawal,Arial,sans-serif;line-height:1.35;overflow-wrap:anywhere}
        .sfm-user-menu-item{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:0 12px;border:0;border-radius:12px;background:transparent;color:var(--sfm-foreground);font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;text-align:start;transition:background .16s ease,color .16s ease,transform .16s ease}
        .sfm-user-menu-item:hover,.sfm-user-menu-item:focus-visible{background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.16)}
        .sfm-user-menu-item:active{transform:translateY(1px)}
        .sfm-user-menu-item svg{color:var(--sfm-muted);flex:0 0 auto}
        .sfm-user-menu-item.danger{color:#B91C1C}
        .sfm-user-menu-item.danger:hover,.sfm-user-menu-item.danger:focus-visible{background:rgba(185,28,28,.10);color:#B91C1C}
        .sfm-user-menu-item.danger svg{color:#B91C1C}
        @keyframes sfmUserMenuIn{from{opacity:0;transform:translateY(-5px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        @media(max-width:640px){.sfm-user-chip-wrap{max-width:128px}.sfm-mobile-user .sfm-user-chip-wrap{max-width:min(190px,100%)}.sfm-user-chip{min-height:38px;padding:5px 8px 5px 6px}.sfm-user-avatar{width:26px;height:26px;font-size:10px}.sfm-user-identity{max-width:72px}.sfm-user-name{font-size:12px}.sfm-user-menu{border-radius:18px;max-width:calc(100vw - 24px)}.sfm-user-menu-item{min-height:48px;font-size:14px}}
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
