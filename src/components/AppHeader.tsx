'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';
import { MobileMenu } from '@/components/MobileMenu';
import { flattenNavigationItems, isNavigationItemActive } from '@/components/navigationConfig';

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
  const crumb = effectivePathname === '/' ? 'THE SFM' : `THE SFM / ${title}`;

  return (
    <>
      <header className="sfm-global-header" dir={dir}>
        <Link href="/" className="sfm-global-brand" aria-label="THE SFM">
          <Image src="/sfm-logo.png" alt="THE SFM" width={34} height={34} priority />
          <div>
            <strong>THE SFM</strong>
            <span>{crumb}</span>
          </div>
        </Link>

        <div className="sfm-global-actions">
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

      <MobileMenu open={open} onClose={() => setOpen(false)} />

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
            overflow: hidden;
            background: rgba(248, 251, 255, 0.94);
            border-bottom: 1px solid rgba(167, 243, 240, 0.22);
            box-shadow: 0 12px 34px rgba(3, 18, 37, 0.12);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            font-family: Tajawal, Arial, sans-serif;
          }

          .sfm-global-brand {
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--sfm-foreground);
            text-decoration: none;
          }

          .sfm-global-brand img {
            flex: 0 0 auto;
            border-radius: 10px;
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
        }
      `}</style>
    </>
  );
}

export default AppHeader;
