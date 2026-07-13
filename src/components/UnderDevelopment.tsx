'use client';

import Link from 'next/link';
import { ArrowRight, Construction } from 'lucide-react';
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
      <main className="sfm-under-main">
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
              <ArrowRight size={16} className={isAr ? 'rtl-arrow' : ''} />
            </Link>
          </div>
        </section>
      </main>

      <style>{`
        .sfm-under-shell{min-height:100vh;background:var(--sfm-light-card);color:var(--sfm-foreground);font-family:Tajawal,Arial,sans-serif}
        .sfm-under-main{min-height:100vh;display:grid;place-items:center;padding:28px;margin-inline-end:230px}
        [dir="ltr"] .sfm-under-main{margin-inline-end:0;margin-inline-start:230px}
        .sfm-under-card{width:min(100%,470px);background:var(--sfm-card);border:1px solid rgba(167,243,240,.16);border-radius:var(--r-2xl);box-shadow:0 18px 60px rgba(3,18,37,.10);padding:34px;text-align:center;position:relative;overflow:hidden}
        .sfm-under-card:before{content:"";position:absolute;inset-inline-start:-80px;top:-90px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(167,243,240,.16),transparent 70%);pointer-events:none}
        .sfm-under-icon{width:72px;height:72px;margin:0 auto 18px;border-radius:var(--r-2xl);background:linear-gradient(135deg,rgba(167,243,240,.18),rgba(154,108,60,.08));color:var(--sfm-muted);display:grid;place-items:center;border:1px solid rgba(167,243,240,.22);position:relative;z-index:1}
        .sfm-under-kicker{margin:0 0 8px;color:var(--sfm-muted);font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;position:relative;z-index:1}
        .sfm-under-card h1{margin:0;color:var(--sfm-foreground);font-size:25px;font-weight:900;line-height:1.25;position:relative;z-index:1}
        .sfm-under-message{margin:12px 0 0;color:var(--sfm-muted);font-size:15px;font-weight:800;line-height:1.7;position:relative;z-index:1}
        .sfm-under-description{margin:8px auto 0;color:var(--sfm-muted);font-size:13px;line-height:1.75;max-width:360px;position:relative;z-index:1}
        .sfm-under-status{margin:24px auto 0;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(167,243,240,.12);color:var(--sfm-muted);border:1px solid rgba(167,243,240,.18);font-size:12px;font-weight:900;position:relative;z-index:1}
        .sfm-under-status span{width:8px;height:8px;border-radius:50%;background:var(--sfm-soft-cyan);animation:sfmPulse 1.4s infinite}
        .sfm-under-footer{margin-top:26px;padding-top:22px;border-top:1px solid rgba(167,243,240,.12);position:relative;z-index:1}
        .sfm-under-link{display:inline-flex;align-items:center;gap:7px;color:var(--sfm-muted);text-decoration:none;font-size:13px;font-weight:800;transition:color .18s ease}
        .sfm-under-link:hover{color:var(--sfm-muted)}
        .rtl-arrow{transform:rotate(180deg)}
        @keyframes sfmPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.82)}}
        @media(max-width:1024px){.sfm-under-main{margin:0;padding:20px}.sfm-under-card{padding:28px 22px}}
      `}</style>
    </div>
  );
}

export default UnderDevelopment;
