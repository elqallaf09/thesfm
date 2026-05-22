'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import type { Lang } from '@/lib/translations';

interface Props {
  value?: Lang;
  onChange?: (l: Lang) => void;
  variant?: 'light' | 'dark' | 'gold';
  compact?: boolean;
  size?: 'sm' | 'md';
}

const LANGS: { id: Lang; label: string; flag: string; full: string }[] = [
  { id: 'ar', label: 'عربي', flag: 'SA', full: 'العربية' },
  { id: 'en', label: 'EN', flag: 'EN', full: 'English' },
  { id: 'fr', label: 'FR', flag: 'FR', full: 'Français' },
];

export function LanguageSwitcher({ value, onChange, variant = 'light', compact = false, size = 'md' }: Props) {
  const [mounted, setMounted] = useState(false);
  const language = useLanguage();
  useEffect(() => setMounted(true), []);

  const selected = value ?? language.lang;
  const handleChange = onChange ?? language.setLang;
  const isCompact = compact || size === 'sm';
  const idx = Math.max(0, LANGS.findIndex(l => l.id === selected));

  const track = variant === 'dark' ? 'rgba(255,255,255,0.09)'
    : variant === 'gold' ? 'rgba(216,174,99,0.14)'
      : '#EFEDE8';
  const pill = variant === 'dark' ? 'rgba(255,255,255,0.90)'
    : variant === 'gold' ? '#FFFDFC'
      : '#FFFFFF';
  const border = variant === 'dark' ? '1px solid rgba(255,255,255,0.12)'
    : variant === 'gold' ? '1px solid rgba(216,174,99,0.28)'
      : '1.5px solid #E8E2D6';
  const textActive = variant === 'dark' ? '#111111' : '#1B2430';
  const textIdle = variant === 'dark' ? 'rgba(255,255,255,0.50)'
    : variant === 'gold' ? 'rgba(90,67,51,0.72)'
      : '#9A9086';

  const h = isCompact ? '26px' : '30px';
  const px = isCompact ? '7px' : '10px';
  const fs = isCompact ? '11px' : '12px';

  return (
    <div
      dir="ltr"
      title={selected === 'ar' ? 'تغيير اللغة' : selected === 'fr' ? 'Changer la langue' : 'Switch language'}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        maxWidth: '100%',
        background: track,
        borderRadius: '40px',
        padding: '3px',
        border,
        gap: 0,
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {mounted && (
        <span style={{
          position: 'absolute',
          top: '3px',
          left: '3px',
          width: `calc((100% - 6px) / ${LANGS.length})`,
          height: 'calc(100% - 6px)',
          background: pill,
          borderRadius: '36px',
          boxShadow: variant === 'dark'
            ? '0 1px 6px rgba(0,0,0,0.25)'
            : '0 1px 5px rgba(27,36,48,0.12)',
          transform: `translateX(${idx * 100}%)`,
          transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}

      {LANGS.map(lang => (
        <button
          key={lang.id}
          type="button"
          onClick={() => handleChange(lang.id)}
          aria-label={lang.full}
          aria-pressed={selected === lang.id}
          style={{
            position: 'relative',
            zIndex: 2,
            flex: '1 1 0',
            minWidth: isCompact ? '34px' : '42px',
            height: h,
            padding: `0 ${px}`,
            background: 'transparent',
            border: 'none',
            borderRadius: '36px',
            cursor: 'pointer',
            fontSize: fs,
            fontWeight: selected === lang.id ? '800' : '600',
            color: selected === lang.id ? textActive : textIdle,
            fontFamily: lang.id === 'ar'
              ? "'Tajawal', sans-serif"
              : "-apple-system, 'Segoe UI', sans-serif",
            letterSpacing: 0,
            transition: 'color 0.18s ease',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          {!isCompact && <span style={{ fontSize: '10px', fontWeight: 900 }}>{lang.flag}</span>}
          {lang.label}
        </button>
      ))}
    </div>
  );
}

export function FloatingLangSwitcher({ value, onChange }: Pick<Props, 'value' | 'onChange'>) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 'max(20px, env(safe-area-inset-bottom))',
      left: 'max(20px, env(safe-area-inset-left))',
      zIndex: 9999,
      maxWidth: 'calc(100vw - 40px)',
      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))',
    }}>
      <LanguageSwitcher value={value} onChange={onChange} variant="light" />
    </div>
  );
}

export default LanguageSwitcher;
