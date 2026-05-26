'use client';

import type { ViewMode } from '@/hooks/useViewMode';
import { useLanguage } from '@/hooks/useLanguage';

type ViewModeSelectorProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  variant?: 'light' | 'dark';
  compact?: boolean;
};

const COPY = {
  ar: {
    label: 'وضع العرض',
    simple: 'الوضع البسيط',
    professional: 'الوضع الاحترافي',
    simpleHint: 'يعرض الصفحات الأساسية فقط.',
    professionalHint: 'يعرض كل أدوات THE SFM.',
  },
  en: {
    label: 'View Mode',
    simple: 'Simple',
    professional: 'Professional',
    simpleHint: 'Shows only core pages.',
    professionalHint: 'Shows every THE SFM tool.',
  },
  fr: {
    label: 'Mode d’affichage',
    simple: 'Simple',
    professional: 'Professionnel',
    simpleHint: 'Affiche seulement les pages essentielles.',
    professionalHint: 'Affiche tous les outils THE SFM.',
  },
} as const;

export function ViewModeSelector({
  value,
  onChange,
  variant = 'light',
  compact = false,
}: ViewModeSelectorProps) {
  const { lang, dir } = useLanguage();
  const text = COPY[lang as keyof typeof COPY] ?? COPY.ar;
  const modes: ViewMode[] = ['simple', 'professional'];

  return (
    <section className={`sfm-view-mode-selector ${variant} ${compact ? 'compact' : ''}`} dir={dir} aria-label={text.label}>
      <div className="sfm-view-mode-head">
        <span>{text.label}</span>
        {!compact ? <p>{value === 'simple' ? text.simpleHint : text.professionalHint}</p> : null}
      </div>
      <div className="sfm-view-mode-options" role="group" aria-label={text.label}>
        {modes.map(mode => (
          <button
            key={mode}
            type="button"
            aria-pressed={value === mode}
            className={value === mode ? 'active' : ''}
            onClick={() => onChange(mode)}
          >
            {mode === 'simple' ? text.simple : text.professional}
          </button>
        ))}
      </div>
      <style jsx>{`
        .sfm-view-mode-selector {
          display: grid;
          gap: 10px;
          min-width: 0;
          color: var(--sfm-foreground);
          font-family: Tajawal, Arial, sans-serif;
        }
        .sfm-view-mode-selector.dark {
          color: #EAF6FF;
        }
        .sfm-view-mode-head {
          display: grid;
          gap: 4px;
          min-width: 0;
        }
        .sfm-view-mode-head span {
          color: inherit;
          font-size: 12px;
          font-weight: 950;
        }
        .sfm-view-mode-head p {
          margin: 0;
          color: var(--sfm-muted);
          font-size: 12px;
          line-height: 1.5;
        }
        .dark .sfm-view-mode-head p {
          color: rgba(234, 246, 255, .62);
        }
        .sfm-view-mode-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
          padding: 5px;
          border-radius: 999px;
          border: 1px solid rgba(29, 140, 255, .2);
          background: rgba(255, 255, 255, .82);
        }
        .dark .sfm-view-mode-options {
          border-color: rgba(167, 243, 240, .16);
          background: rgba(255, 255, 255, .08);
        }
        .sfm-view-mode-options button {
          min-height: 34px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: var(--sfm-primary-dark);
          cursor: pointer;
          font: 950 12px Tajawal, Arial, sans-serif;
          transition: background .18s ease, color .18s ease, box-shadow .18s ease;
        }
        .dark .sfm-view-mode-options button {
          color: rgba(234, 246, 255, .76);
        }
        .sfm-view-mode-options button.active {
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          box-shadow: 0 8px 18px rgba(29, 140, 255, .2);
        }
        .sfm-view-mode-options button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(24, 212, 212, .22);
        }
        .sfm-view-mode-selector.compact {
          gap: 7px;
        }
        .sfm-view-mode-selector.compact .sfm-view-mode-head span {
          font-size: 11px;
          color: rgba(167, 243, 240, .72);
        }
        .sfm-view-mode-selector.compact .sfm-view-mode-options button {
          min-height: 30px;
          font-size: 11px;
        }
      `}</style>
    </section>
  );
}

export default ViewModeSelector;
