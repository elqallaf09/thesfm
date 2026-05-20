'use client';
import { useEffect, useState } from 'react';

type Lang = 'ar' | 'en' | 'fr';

interface Props {
  value: Lang;
  onChange: (lang: Lang) => void;
  variant?: 'light' | 'dark';   // light = on white bg, dark = on dark bg
}

const LANGS: { id: Lang; label: string }[] = [
  { id: 'ar', label: 'عربي' },
  { id: 'en', label: 'EN'   },
  { id: 'fr', label: 'FR'   },
];

export function LanguageSwitcher({ value, onChange, variant = 'light' }: Props) {
  const idx = LANGS.findIndex(l => l.id === value);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const track = variant === 'dark'
    ? 'rgba(255,255,255,0.10)'
    : '#EFEDE7';

  const pill = variant === 'dark'
    ? 'rgba(255,255,255,0.92)'
    : '#FFFFFF';

  const textActive = '#1B2430';
  const textIdle   = variant === 'dark' ? 'rgba(255,255,255,0.55)' : '#8A9BB0';

  return (
    <div
      dir="ltr"
      role="group"
      aria-label="Language selector"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        background: track,
        borderRadius: '40px',
        padding: '3px',
        gap: '0',
        border: variant === 'light' ? '1.5px solid #E8E2D6' : '1px solid rgba(255,255,255,0.14)',
        minWidth: '124px',
      }}
    >
      {/* Sliding pill */}
      {mounted && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '3px',
            left: `calc(3px + ${idx} * 33.33%)`,
            width: 'calc(33.33% - 0px)',
            height: 'calc(100% - 6px)',
            background: pill,
            borderRadius: '36px',
            boxShadow: variant === 'light'
              ? '0 1px 6px rgba(27,36,48,0.13), 0 0 0 0.5px rgba(27,36,48,0.05)'
              : '0 2px 8px rgba(0,0,0,0.22)',
            transition: 'left 0.22s cubic-bezier(0.4,0,0.2,1)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {LANGS.map((lang, i) => (
        <button
          key={lang.id}
          onClick={() => onChange(lang.id)}
          aria-pressed={value === lang.id}
          style={{
            position: 'relative',
            zIndex: 2,
            flex: 1,
            minWidth: '38px',
            height: '28px',
            padding: '0 6px',
            background: 'transparent',
            border: 'none',
            borderRadius: '36px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: value === lang.id ? '700' : '500',
            color: value === lang.id ? textActive : textIdle,
            fontFamily: lang.id === 'ar' ? "'Tajawal', sans-serif" : "-apple-system, 'Segoe UI', sans-serif",
            letterSpacing: lang.id !== 'ar' ? '0.04em' : '0',
            transition: 'color 0.18s ease, font-weight 0.18s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
