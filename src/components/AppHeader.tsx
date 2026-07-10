'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';
import { CommandMenuButton } from '@/components/CommandMenuButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { flattenNavigationItems, isNavigationItemActive } from '@/components/navigationConfig';

const MobileMenu = dynamic(() => import('@/components/MobileMenu').then(mod => mod.MobileMenu), {
  ssr: false,
});

export function AppHeader() {
  const pathname = usePathname() || '/';
  const { dir, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [effectivePathname, setEffectivePathname] = useState(pathname);

  useEffect(() => {
    setOpen(false);
    const nextPath = typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('next');
    setEffectivePathname(pathname === '/login' && nextPath?.startsWith('/') ? nextPath : pathname);
  }, [pathname]);

  const activeItem = useMemo(
    () => flattenNavigationItems()
      .filter(item => item.href && !item.href.includes('#'))
      .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))
      .find(item => isNavigationItemActive(effectivePathname, item.href)),
    [effectivePathname],
  );

  const title = activeItem ? t(activeItem.labelKey) : 'THE SFM';
  const crumb = effectivePathname === '/dashboard' ? 'THE SFM' : title;

  return (
    <>
      <header className="sfm-global-header" dir={dir}>
        <Link href="/dashboard" className="sfm-global-brand" aria-label="THE SFM">
          <Image src="/sfm-logo.png" alt="THE SFM" width={34} height={34} priority className="sfm-brand-mark sfm-brand-mark--header" />
          <div>
            <strong>THE SFM</strong>
            <span>{crumb}</span>
          </div>
        </Link>

        <div className="sfm-global-actions">
          <CommandMenuButton compact />
          <ThemeToggle />
          <LanguageSwitcher variant="gold" compact />
          <button
            type="button"
            className="sfm-global-menu-button"
            aria-label={t('nav_open_menu')}
            aria-expanded={open}
            aria-controls="sfm-mobile-menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {open && <MobileMenu open={open} onClose={() => setOpen(false)} />}

      <style jsx global>{`
        .sfm-global-header {
          display: none;
        }

        @media (max-width: 1024px) {
          .sfm-global-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 9998;
            height: calc(74px + env(safe-area-inset-top));
            padding: calc(10px + env(safe-area-inset-top)) 14px 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            max-width: 100%;
            overflow: visible;
            background: rgba(248, 251, 255, 0.94);
            border-bottom: 1px solid rgba(167, 243, 240, 0.22);
            box-shadow: 0 12px 34px rgba(3, 18, 37, 0.12);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            font-family: Tajawal, Arial, sans-serif;
          }

          .sfm-global-brand {
            flex: 1 1 auto;
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--sfm-foreground);
            text-decoration: none;
            overflow: hidden;
          }

          .sfm-global-brand > div {
            flex: 1 1 auto;
            min-width: 0;
            max-width: 100%;
          }

          .sfm-global-brand img {
            flex: 0 0 auto;
            object-fit: cover;
          }

          .sfm-global-brand strong {
            display: block;
            color: var(--sfm-foreground);
            font-size: 14px;
            font-weight: 900;
            line-height: 1.1;
            letter-spacing: 0;
          }

          .sfm-global-brand span {
            display: block;
            max-width: 46vw;
            overflow: hidden;
            color: var(--sfm-muted);
            font-size: 11px;
            font-weight: 800;
            line-height: 1.35;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .sfm-global-actions {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            max-width: calc(100vw - 112px);
          }

          .sfm-global-menu-button {
            width: 44px;
            height: 44px;
            border: 1px solid rgba(167, 243, 240, 0.34);
            border-radius: 14px;
            display: grid;
            place-items: center;
            background: linear-gradient(180deg, #FFFFFF, #F8FBFF);
            color: var(--sfm-primary-dark);
            box-shadow: 0 8px 20px rgba(3, 18, 37, 0.12);
            cursor: pointer;
          }

          .dark .sfm-global-header {
            background: rgba(10, 20, 34, 0.94);
            border-bottom-color: rgba(47, 214, 192, 0.18);
            box-shadow: 0 12px 34px rgba(0, 0, 0, 0.34);
          }

          .dark .sfm-global-brand,
          .dark .sfm-global-brand strong {
            color: #F8FBFF;
          }

          .dark .sfm-global-brand span {
            color: #B8C7D9;
          }

          .dark .sfm-global-menu-button,
          .dark .sfm-global-actions .sfm-command-trigger.compact,
          .dark .sfm-global-actions .sfm-language-trigger {
            background: #0F1D31 !important;
            background-image: none !important;
            border-color: #1D3050 !important;
            color: #E8EEF6 !important;
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22) !important;
          }

          .dark .sfm-global-menu-button:hover,
          .dark .sfm-global-actions .sfm-command-trigger.compact:hover,
          .dark .sfm-global-actions .sfm-language-trigger:hover {
            border-color: #2FD6C0 !important;
            color: #2FD6C0 !important;
            box-shadow: 0 0 0 4px rgba(47, 214, 192, 0.14), 0 10px 24px rgba(0, 0, 0, 0.24) !important;
          }
        }

        @media (max-width: 520px) {
          .sfm-global-header {
            padding: calc(10px + env(safe-area-inset-top)) 10px 10px;
            gap: 6px;
          }

          .sfm-global-brand {
            gap: 7px;
          }

          .sfm-brand-mark--header {
            width: 30px !important;
            height: 30px !important;
          }

          .sfm-global-brand strong {
            font-size: 12px;
          }

          .sfm-global-brand span {
            max-width: 100%;
            font-size: 10px;
          }

          .sfm-global-actions {
            gap: 5px;
            max-width: calc(100vw - 126px);
          }

          .sfm-global-actions .sfm-command-trigger.compact,
          .sfm-global-actions .sfm-theme-toggle,
          .sfm-global-menu-button {
            width: 40px;
            min-width: 40px;
            height: 40px;
            border-radius: 13px;
          }
        }
      `}</style>
    </>
  );
}

export default AppHeader;
