'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

const MENU_WIDTH = 210;

type MenuPosition = {
  left: number;
  top: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function UserChip({ displayName }: { displayName?: string }) {
  const { user, isGuest, signOut } = useAuth();
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

  const name = displayName
    || user?.user_metadata?.display_name
    || user?.email?.replace('@smart-finance.local', '')
    || (isGuest ? t('guest_mode') : 'SFM');

  const initials = name
    .split(/\s+/)
    .map((word: string) => word[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || '??';

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button || typeof window === 'undefined') return;

    const rect = button.getBoundingClientRect();
    const margin = 8;
    const desiredLeft = dir === 'rtl' ? rect.right - MENU_WIDTH : rect.left;
    const left = clamp(desiredLeft, margin, window.innerWidth - MENU_WIDTH - margin);
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 116;
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
        zIndex: 1000,
      }}
      role="menu"
    >
      <button type="button" role="menuitem" className="sfm-user-menu-item" onClick={goProfile}>
        <UserRound size={17} />
        <span>{t('nav_profile')}</span>
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
        .sfm-user-chip-wrap{position:relative;font-family:Tajawal,Arial,sans-serif;width:100%}
        .sfm-user-chip{display:flex;align-items:center;gap:8px;width:100%;min-height:40px;padding:6px 10px;border-radius:16px;background:rgba(255,255,255,.08);border:1px solid rgba(216,174,99,.22);cursor:pointer;color:#D8AE63;text-align:start;transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease;font-family:Tajawal,Arial,sans-serif}
        .sfm-user-chip:hover,.sfm-user-chip[aria-expanded="true"]{background:rgba(216,174,99,.14);border-color:rgba(216,174,99,.45);box-shadow:0 8px 22px rgba(0,0,0,.16)}
        .sfm-user-chip:active{transform:translateY(1px)}
        .sfm-user-avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#D8AE63,#9A6C3C);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#111;flex:0 0 auto}
        .sfm-user-name{flex:1;min-width:0;font-size:12px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .sfm-user-guest{font-size:10px;padding:2px 7px;border-radius:999px;background:rgba(216,174,99,.18);color:#D8AE63;white-space:nowrap}
        .sfm-user-chevron{color:rgba(255,255,255,.48);transition:transform .18s ease;flex:0 0 auto}
        .sfm-user-chip[aria-expanded="true"] .sfm-user-chevron{transform:rotate(180deg)}
        .sfm-user-menu{background:linear-gradient(180deg,#FFFDFC,#F7F3EA);border:1px solid rgba(216,174,99,.24);border-radius:16px;box-shadow:0 22px 55px rgba(24,14,7,.28);padding:7px;animation:sfmUserMenuIn .16s ease-out;font-family:Tajawal,Arial,sans-serif}
        .sfm-user-menu-item{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:0 12px;border:0;border-radius:12px;background:transparent;color:#3B2618;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;text-align:start;transition:background .16s ease,color .16s ease,transform .16s ease}
        .sfm-user-menu-item:hover,.sfm-user-menu-item:focus-visible{background:rgba(216,174,99,.18);color:#111;outline:none}
        .sfm-user-menu-item:active{transform:translateY(1px)}
        .sfm-user-menu-item svg{color:#9A6C3C;flex:0 0 auto}
        .sfm-user-menu-item.danger{color:#8B1E16}
        .sfm-user-menu-item.danger:hover,.sfm-user-menu-item.danger:focus-visible{background:rgba(185,28,28,.10);color:#B91C1C}
        .sfm-user-menu-item.danger svg{color:#B91C1C}
        @keyframes sfmUserMenuIn{from{opacity:0;transform:translateY(-5px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        @media(max-width:640px){.sfm-user-menu{border-radius:18px}.sfm-user-menu-item{min-height:48px;font-size:14px}}
      `}</style>
      <div className="sfm-user-chip-wrap">
        <button
          ref={buttonRef}
          type="button"
          className="sfm-user-chip"
          onClick={() => setOpen(value => !value)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="sfm-user-avatar">{initials}</span>
          <span className="sfm-user-name">{name}</span>
          {isGuest && <span className="sfm-user-guest">{t('guest_mode')}</span>}
          <ChevronDown className="sfm-user-chevron" size={15} />
        </button>
      </div>
      {menu}
    </>
  );
}
