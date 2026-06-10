'use client';

import { FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RouteDashboardPage } from '@/components/finance/RouteDashboardPage';
import { useLanguage } from '@/hooks/useLanguage';

const shortcutCopy = {
  ar: {
    title: 'مركز التقارير',
    description: 'افتح مركز التقارير لإنشاء تقارير مالية ومشاريع وزكاة واستثمار من بياناتك الفعلية فقط.',
    action: 'فتح مركز التقارير',
  },
  en: {
    title: 'Reports Center',
    description: 'Open the Reports Center to generate financial, project, zakat, and investment reports from your real data only.',
    action: 'Open Reports Center',
  },
  fr: {
    title: 'Centre des rapports',
    description: 'Ouvrez le Centre des rapports pour générer vos rapports financiers, projets, zakat et investissements à partir de vos données réelles uniquement.',
    action: 'Ouvrir le Centre des rapports',
  },
} as const;

function ReportsCenterShortcut() {
  const router = useRouter();
  const { lang: language } = useLanguage();
  const lang = (['ar', 'en', 'fr'].includes(language) ? language : 'ar') as keyof typeof shortcutCopy;
  const copy = shortcutCopy[lang];

  return (
    <aside className="reports-center-shortcut no-print" dir={lang === 'ar' ? 'rtl' : 'ltr'} aria-label={copy.title}>
      <div className="shortcut-icon" aria-hidden="true">
        <FileText size={20} />
      </div>
      <div className="shortcut-text">
        <strong>{copy.title}</strong>
        <span>{copy.description}</span>
      </div>
      <button type="button" onClick={() => router.push('/reports-center')} aria-label={copy.action}>
        {copy.action}
      </button>
      <style>{`
        .reports-center-shortcut{
          position:fixed;
          inset-block-end:22px;
          left:max(24px, env(safe-area-inset-left));
          right:auto;
          z-index:40;
          width:min(520px, calc(100vw - 48px));
          max-width:calc(100vw - 48px);
          display:grid;
          grid-template-columns:auto minmax(0, 1fr);
          align-items:start;
          gap:12px;
          padding:14px;
          border-radius:18px;
          border:1px solid rgba(29,140,255,.22);
          background:rgba(234,246,255,.96);
          box-shadow:0 16px 36px rgba(3,18,37,.16);
          color:var(--sfm-primary-dark);
          backdrop-filter:blur(12px);
          overflow:visible;
        }
        .shortcut-icon{
          width:42px;
          height:42px;
          border-radius:14px;
          display:grid;
          place-items:center;
          color:var(--sfm-card);
          background:linear-gradient(135deg,var(--sfm-primary-dark),var(--sfm-primary));
        }
        .shortcut-text{
          display:grid;
          gap:4px;
          min-width:0;
          white-space:normal;
          overflow:visible;
        }
        .shortcut-text strong{
          font-size:.95rem;
          line-height:1.35;
          white-space:normal;
          overflow-wrap:anywhere;
        }
        .shortcut-text span{
          font-size:.8rem;
          line-height:1.65;
          color:#7A5A36;
          white-space:normal;
          overflow:visible;
          overflow-wrap:anywhere;
          text-overflow:clip;
        }
        .reports-center-shortcut button{
          grid-column:2;
          justify-self:start;
          border:0;
          border-radius:12px;
          padding:10px 12px;
          color:var(--sfm-card);
          background:var(--sfm-primary);
          font-weight:800;
          cursor:pointer;
          white-space:nowrap;
          max-width:100%;
        }
        .reports-center-shortcut button:focus-visible{
          outline:3px solid rgba(24,212,212,.38);
          outline-offset:2px;
        }
        .dark .reports-center-shortcut{
          background:rgba(15,29,49,.96);
          border-color:#1d3050;
          color:#e8eef6;
          box-shadow:0 18px 46px rgba(0,0,0,.28);
        }
        .dark .shortcut-text span{
          color:#b8c7d9;
        }
        .dark .reports-center-shortcut button{
          color:#061a2e;
          background:linear-gradient(135deg,#1d8cff,#18d4d4);
        }
        @media(max-width:720px){
          .reports-center-shortcut{
            position:fixed;
            inset-inline:16px;
            inset-block-end:16px;
            left:16px;
            right:16px;
            width:auto;
            max-width:none;
            margin:0;
            grid-template-columns:auto 1fr;
          }
          .reports-center-shortcut button{grid-column:1/-1;width:100%}
        }
        @media print{.reports-center-shortcut{display:none!important}}
      `}</style>
    </aside>
  );
}

export default function ReportsPage() {
  return (
    <>
      <RouteDashboardPage kind="reports" />
      <ReportsCenterShortcut />
    </>
  );
}
