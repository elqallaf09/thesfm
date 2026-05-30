'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/hooks/useLanguage';

type ThemeToggleProps = {
  className?: string;
};

function persistThemePreference(theme: 'light' | 'dark') {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem('the-sfm-theme', theme);
  window.localStorage.setItem('theme', theme);

  try {
    const raw = window.localStorage.getItem('sfm_settings');
    const settings = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    window.localStorage.setItem('sfm_settings', JSON.stringify({ ...settings, theme }));
  } catch {
    window.localStorage.setItem('sfm_settings', JSON.stringify({ theme }));
  }
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { lang } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';
  const label = lang === 'en'
    ? 'Toggle theme'
    : lang === 'fr'
      ? 'Changer le thème'
      : 'تغيير وضع العرض';

  const handleToggle = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    persistThemePreference(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <>
      <button
        type="button"
        className={`sfm-theme-toggle ${className}`.trim()}
        aria-label={label}
        title={label}
        onClick={handleToggle}
      >
        {isDark ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
      </button>
      <style jsx global>{`
        .sfm-theme-toggle {
          width: 44px;
          height: 44px;
          min-width: 44px;
          border: 1px solid rgba(29, 48, 80, 0.12);
          border-radius: 14px;
          display: inline-grid;
          place-items: center;
          background: linear-gradient(180deg, #ffffff, #f8fbff);
          color: #0f1d31;
          box-shadow: 0 8px 20px rgba(3, 18, 37, 0.10);
          cursor: pointer;
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            color 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease;
        }

        .sfm-theme-toggle:hover,
        .sfm-theme-toggle:focus-visible {
          outline: none;
          transform: translateY(-1px);
          border-color: rgba(47, 214, 192, 0.52);
          color: var(--sfm-accent, #18d4d4);
          box-shadow: 0 0 0 4px rgba(47, 214, 192, 0.12), 0 10px 24px rgba(3, 18, 37, 0.12);
        }

        .sfm-theme-toggle:active {
          transform: translateY(0);
        }

        .dark .sfm-theme-toggle,
        .sfm-shared-sidebar .sfm-theme-toggle,
        .sfm-mobile-panel .sfm-theme-toggle {
          background: #0f1d31;
          border-color: #1d3050;
          color: #e8eef6;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
        }

        .dark .sfm-theme-toggle:hover,
        .dark .sfm-theme-toggle:focus-visible,
        .sfm-shared-sidebar .sfm-theme-toggle:hover,
        .sfm-shared-sidebar .sfm-theme-toggle:focus-visible,
        .sfm-mobile-panel .sfm-theme-toggle:hover,
        .sfm-mobile-panel .sfm-theme-toggle:focus-visible {
          border-color: #2fd6c0;
          color: #2fd6c0;
          box-shadow: 0 0 0 4px rgba(47, 214, 192, 0.14), 0 10px 24px rgba(0, 0, 0, 0.22);
        }
      `}</style>
    </>
  );
}

export default ThemeToggle;
