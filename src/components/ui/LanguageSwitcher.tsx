'use client';
/**
 * SFM Language Switcher Component
 * Premium segmented language selector with smooth animations.
 * Uses global language context.
 */
import { useEffect, useState } from 'react';
import { useLanguage, Lang } from '@/hooks/useLanguage';

type Props = {
  variant?: 'light' | 'dark';
  showFlag?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'ar', label: 'عربي', flag: '🌐' },
  { id: 'en', label: 'EN', flag: '🇬🇧' },
  { id: 'fr', label: 'FR', flag: '🇫🇷' },
];

export function LanguageSwitcher({ variant = 'light', showFlag = false, size = 'md' }: Props) {
  const { lang, setLang } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const idx = LANGS.findIndex(l => l.id === lang);

  // Size variants
  const sizeConfig = {
    sm: { width: '100px', height: '26px', fontSize: '11px' },
    md: { width: '126px', height: '30px', fontSize: '12px' },
    lg: { width: '150px', height: '34px', fontSize: '13px' },
  };

  const { width, height, fontSize } = sizeConfig[size];

  const track = variant === 'dark'
    ? 'rgba(255,255,255,0.10)'
    : 'rgba(239,237,231,0.8)';

  const pill = variant === 'dark'
    ? 'rgba(255,255,255,0.95)'
    : '#FFFFFF';

  const textActive = '#1B2430';
  const textIdle = variant === 'dark' ? 'rgba(255,255,255,0.6)' : '#8A9BB0';

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
        minWidth: width,
        height,
        border: variant === 'light'
          ? '1.5px solid rgba(216,174,99,0.2)'
          : '1px solid rgba(255,255,255,0.15)',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Sliding pill indicator */}
      {mounted && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '3px',
            left: `calc(3px + ${idx} * 33.33%)`,
            width: 'calc(33.33% - 2px)',
            height: `calc(100% - 6px)`,
            background: pill,
            borderRadius: '36px',
            boxShadow: variant === 'light'
              ? '0 2px 8px rgba(90,67,51,0.15), 0 0 0 0.5px rgba(216,174,99,0.1)'
              : '0 2px 8px rgba(0,0,0,0.25)',
            transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.2s ease',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {LANGS.map((l) => (
        <button
          key={l.id}
          onClick={() => setLang(l.id)}
          aria-pressed={lang === l.id}
          aria-label={`Switch to ${l.label}`}
          style={{
            position: 'relative',
            zIndex: 2,
            flex: 1,
            height: '100%',
            padding: '0 4px',
            background: 'transparent',
            border: 'none',
            borderRadius: '36px',
            cursor: 'pointer',
            fontSize,
            fontWeight: lang === l.id ? '700' : '500',
            color: lang === l.id ? textActive : textIdle,
            fontFamily: l.id === 'ar' ? "'Tajawal', sans-serif" : "-apple-system, 'Segoe UI', sans-serif",
            letterSpacing: l.id !== 'ar' ? '0.04em' : '0',
            transition: 'color 0.18s ease, font-weight 0.18s ease',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          {showFlag && <span style={{ fontSize: '14px' }}>{l.flag}</span>}
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Floating Language Selector (Dropdown)
// ─────────────────────────────────────────────────────────
export function FloatingLanguageSelector() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setOpen(false);
    if (open) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [open]);

  const currentLang = LANGS.find(l => l.id === lang);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          background: 'rgba(255,255,255,0.9)',
          border: '1.5px solid rgba(216,174,99,0.25)',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          color: '#5B4332',
          fontFamily: "'Tajawal', sans-serif",
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: '16px' }}>🌐</span>
        <span>{currentLang?.label}</span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          <path
            d="M1 1L5 5L9 1"
            stroke="#D8AE63"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && mounted && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: '0',
            minWidth: '140px',
            background: '#FFFFFF',
            border: '1px solid rgba(216,174,99,0.2)',
            borderRadius: '16px',
            padding: '6px',
            boxShadow: '0 8px 32px rgba(90,67,51,0.15)',
            zIndex: 1000,
            animation: 'fadeUp 0.2s ease',
          }}
        >
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setLang(l.id);
                setOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: lang === l.id ? 'rgba(216,174,99,0.1)' : 'transparent',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: lang === l.id ? '700' : '500',
                color: lang === l.id ? '#D8AE63' : '#5B4332',
                fontFamily: l.id === 'ar' ? "'Tajawal', sans-serif" : "-apple-system, sans-serif",
                transition: 'all 0.15s ease',
                textAlign: 'right',
              }}
            >
              <span style={{ fontSize: '18px' }}>{l.flag}</span>
              <span>{l.label}</span>
              {lang === l.id && (
                <svg
                  style={{ marginRight: 'auto' }}
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M3 8L6.5 11.5L13 4.5"
                    stroke="#D8AE63"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
