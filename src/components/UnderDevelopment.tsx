'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Construction } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { TR } from '@/lib/translations';

type TranslationKey = keyof typeof TR;

interface UnderDevelopmentProps {
  titleKey: TranslationKey;
  descriptionKey?: TranslationKey;
  helperKey?: TranslationKey;
  statusKey?: TranslationKey;
}

export function UnderDevelopment({ titleKey, descriptionKey, helperKey, statusKey = 'common_comingSoon' }: UnderDevelopmentProps) {
  const { t, dir, isAr } = useLanguage();

  return (
    <div className="sfm-under-shell" dir={dir}>
      <div className="sfm-under-main">
        <section className="sfm-under-card" aria-labelledby="under-development-title">
          <div className="sfm-under-icon">
            <Construction size={34} />
          </div>
          <p className="sfm-under-kicker">{t('nav_services_section')}</p>
          <h1 id="under-development-title">{t(titleKey)}</h1>
          <p className="sfm-under-message">{t('common_underDevelopment')}</p>
          {descriptionKey && <p className="sfm-under-description">{t(descriptionKey)}</p>}
          {helperKey && <p className="sfm-under-description">{t(helperKey)}</p>}

          <div className="sfm-under-status">
            <span />
            {t(statusKey)}
          </div>

          <div className="sfm-under-footer">
            <Link href="/dashboard" className="sfm-under-link">
              {t('common_backToDashboard')}
              {isAr ? <ArrowRight size={16} aria-hidden="true" /> : <ArrowLeft size={16} aria-hidden="true" />}
            </Link>
          </div>
        </section>
      </div>

      <style>{`
        .sfm-under-shell{width:100%;min-width:0;color:var(--foreground);font-family:var(--font-ui)}
        .sfm-under-main{min-height:60vh;display:grid;place-items:center;padding:clamp(16px,3vw,28px)}
        .sfm-under-card{width:min(100%,470px);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-panel);box-shadow:var(--shadow-card);padding:34px;text-align:center;position:relative;overflow:hidden}
        .sfm-under-icon{width:72px;height:72px;margin:0 auto 18px;border-radius:var(--radius-panel);background:var(--surface-muted);color:var(--foreground-muted);display:grid;place-items:center;border:1px solid var(--border);position:relative;z-index:1}
        .sfm-under-kicker{margin:0 0 8px;color:var(--foreground-muted);font-size:12px;font-weight:500;letter-spacing:.04em;text-transform:uppercase;position:relative;z-index:1}
        .sfm-under-card h1{margin:0;color:var(--foreground);font-size:25px;font-weight:600;line-height:1.35;position:relative;z-index:1}
        .sfm-under-message{margin:12px 0 0;color:var(--foreground-secondary);font-size:15px;font-weight:400;line-height:1.7;position:relative;z-index:1}
        .sfm-under-description{margin:8px auto 0;color:var(--foreground-muted);font-size:13px;line-height:1.75;max-width:360px;position:relative;z-index:1}
        .sfm-under-status{margin:24px auto 0;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:var(--radius-pill);background:var(--info-soft);color:var(--info);border:1px solid color-mix(in srgb,var(--info) 30%,var(--border));font-size:12px;font-weight:500;position:relative;z-index:1}
        .sfm-under-status span{width:8px;height:8px;border-radius:var(--radius-pill);background:var(--info);animation:sfmPulse 1.4s infinite}
        .sfm-under-footer{margin-top:26px;padding-top:22px;border-top:1px solid var(--border);position:relative;z-index:1}
        .sfm-under-link{min-height:44px;display:inline-flex;align-items:center;gap:7px;color:var(--primary);text-decoration:none;font-size:13px;font-weight:500;border-radius:var(--radius-control);transition:background-color var(--duration-fast) ease,color var(--duration-fast) ease}
        .sfm-under-link:hover{background:var(--primary-soft);color:var(--primary-hover)}
        .sfm-under-link:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
        @keyframes sfmPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.82)}}
        @media(max-width:1024px){.sfm-under-main{padding:20px}.sfm-under-card{padding:28px 22px}}
        @media(prefers-reduced-motion:reduce){.sfm-under-status span{animation:none}}
      `}</style>
    </div>
  );
}

export default UnderDevelopment;
