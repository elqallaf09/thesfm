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
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-control);
          display: inline-grid;
          place-items: center;
          background: var(--surface);
          color: var(--foreground-secondary);
          box-shadow: var(--shadow-xs);
          cursor: pointer;
          transition:
            border-color var(--duration-fast) ease,
            color var(--duration-fast) ease,
            box-shadow var(--duration-fast) ease,
            background var(--duration-fast) ease;
        }

        .sfm-theme-toggle:hover,
        .sfm-theme-toggle:focus-visible {
          outline: none;
          border-color: var(--primary);
          background: var(--surface-hover);
          color: var(--primary);
          box-shadow: var(--focus-shadow);
        }

      `}</style>
    </>
  );
}

export default ThemeToggle;
