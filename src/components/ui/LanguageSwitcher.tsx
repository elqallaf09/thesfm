'use client';
import { useState, useEffect } from 'react';

type Lang = 'ar' | 'en';

interface Props {
  value:    Lang;
  onChange: (l: Lang) => void;
  variant?: 'light' | 'dark' | 'gold';
  compact?: boolean;
}

const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'ar', label: 'عربي', flag: '🇸🇦' },
  { id: 'en', label: 'EN',   flag: '🇺🇸' },
];

export function LanguageSwitcher({ value, onChange, variant = 'light', compact = false }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const idx = LANGS.findIndex(l => l.id === value);

  const track = variant === 'dark'  ? 'rgba(255,255,255,0.09)'
              : variant === 'gold'  ? 'rgba(216,174,99,0.14)'
              : '#EFEDE8';

  const pill  = variant === 'dark'  ? 'rgba(255,255,255,0.90)'
              : variant === 'gold'  ? '#FFFDFC'
              : '#FFFFFF';

  const border = variant === 'dark'  ? '1px solid rgba(255,255,255,0.12)'
               : variant === 'gold'  ? '1px solid rgba(216,174,99,0.28)'
               : '1.5px solid #E8E2D6';

  const textActive = variant === 'dark' ? '#111111' : '#1B2430';
  const textIdle   = variant === 'dark' ? 'rgba(255,255,255,0.50)'
                   : variant === 'gold' ? 'rgba(216,174,99,0.65)'
                   : '#9A9086';

  const h = compact ? '26px' : '30px';
  const px = compact ? '7px' : '10px';
  const fs = compact ? '11px' : '12px';

  return (
    <div
      dir="ltr"
      title="Switch language"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        background: track,
        borderRadius: '40px',
        padding: '3px',
        border,
        gap: 0,
        userSelect: 'none',
      }}
    >
      {/* Sliding pill */}
      {mounted && (
        <span style={{
          position: 'absolute',
          top: '3px',
          left: `calc(3px + ${idx * 50}%)`,
          width: '50%',
          height: `calc(100% - 6px)`,
          background: pill,
          borderRadius: '36px',
          boxShadow: variant === 'dark'
            ? '0 1px 6px rgba(0,0,0,0.25)'
            : '0 1px 5px rgba(27,36,48,0.12)',
          transition: 'left 0.22s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}

      {LANGS.map((lang, i) => (
        <button
          key={lang.id}
          onClick={() => onChange(lang.id)}
          aria-pressed={value === lang.id}
          style={{
            position: 'relative', zIndex: 2,
            flex: 1,
            minWidth: compact ? '36px' : '44px',
            height: h,
            padding: `0 ${px}`,
            background: 'transparent',
            border: 'none',
            borderRadius: '36px',
            cursor: 'pointer',
            fontSize: fs,
            fontWeight: value === lang.id ? '700' : '500',
            color: value === lang.id ? textActive : textIdle,
            fontFamily: lang.id === 'ar'
              ? "'Tajawal', sans-serif"
              : "-apple-system, 'Segoe UI', sans-serif",
            letterSpacing: lang.id !== 'ar' ? '0.04em' : '0',
            transition: 'color 0.18s ease',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          {!compact && <span style={{ fontSize: '13px' }}>{lang.flag}</span>}
          {lang.label}
        </button>
      ))}
    </div>
  );
}

/* ─ Floating global switcher (fixed position) ─ */
export function FloatingLangSwitcher({ value, onChange }: Pick<Props, 'value' | 'onChange'>) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      zIndex: 9999,
      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))',
    }}>
      <LanguageSwitcher value={value} onChange={onChange} variant="light" />
    </div>
  );
}

export default LanguageSwitcher;
