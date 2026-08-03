'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/hooks/useLanguage';

function persistThemePreference(theme: 'light' | 'dark') {
  localStorage.setItem('the-sfm-theme', theme);
  localStorage.setItem('theme', theme);
  try {
    const raw = localStorage.getItem('sfm_settings');
    const settings = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    localStorage.setItem('sfm_settings', JSON.stringify({ ...settings, theme }));
  } catch {
    localStorage.setItem('sfm_settings', JSON.stringify({ theme }));
  }
}

export function AuthThemeControl() {
  const { lang } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const activeTheme = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';
  const label = lang === 'ar' ? 'وضع العرض' : lang === 'fr' ? 'Mode d’affichage' : 'Display mode';
  const labels = lang === 'ar' ? ['الوضع الفاتح', 'الوضع الداكن'] : lang === 'fr' ? ['Mode clair', 'Mode sombre'] : ['Light mode', 'Dark mode'];

  function selectTheme(theme: 'light' | 'dark') {
    persistThemePreference(theme);
    setTheme(theme);
  }

  return (
    <div className="auth-theme-control" role="group" aria-label={label}>
      <button type="button" aria-label={labels[0]} aria-pressed={activeTheme === 'light'} data-active={activeTheme === 'light'} onClick={() => selectTheme('light')}><Sun size={17} /></button>
      <button type="button" aria-label={labels[1]} aria-pressed={activeTheme === 'dark'} data-active={activeTheme === 'dark'} onClick={() => selectTheme('dark')}><Moon size={17} /></button>
      <style jsx>{`
        .auth-theme-control{min-height:44px;display:grid;grid-template-columns:1fr 1fr;gap:3px;padding:3px;border:1px solid var(--border-strong);border-radius:var(--radius-pill);background:var(--surface);box-shadow:var(--shadow-xs)}
        button{inline-size:38px;block-size:36px;display:grid;place-items:center;border:0;border-radius:var(--radius-pill);background:transparent;color:var(--foreground-muted);cursor:pointer}
        button[data-active="true"]{background:var(--info);color:var(--info-foreground);box-shadow:var(--shadow-sm)}
        button:focus-visible{outline:3px solid color-mix(in srgb,var(--focus-ring) 35%,transparent);outline-offset:2px}
      `}</style>
    </div>
  );
}
