'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';

export default function SavingsEducationPage() {
  const router = useRouter();
  const { dir, isAr, isFr } = useLanguage();
  const L = useCallback((ar: string, en: string, fr: string) => (isAr ? ar : isFr ? fr : en), [isAr, isFr]);

  const cards = [
    {
      title: L('المدخرات المسجلة', 'Recorded Savings', 'Épargne enregistrée'),
      body: L(
        'أضف حساباتك وأرصدتك الفعلية حتى تعرض الصفحة إجمالي المدخرات والتقدم من بياناتك فقط.',
        'Add your accounts and real balances so the page shows savings totals and progress from your data only.',
        'Ajoutez vos comptes et soldes réels afin que la page affiche les totaux et la progression uniquement à partir de vos données.',
      ),
      action: L('فتح المدخرات', 'Open Savings', 'Ouvrir l’épargne'),
      href: '/savings',
    },
    {
      title: L('الأهداف المالية', 'Financial Goals', 'Objectifs financiers'),
      body: L(
        'اربط المدخرات بأهدافك المسجلة بدلاً من عرض مسارات عامة أو أرقام غير مرتبطة بحسابك.',
        'Connect savings to recorded goals instead of showing generic paths or numbers unrelated to your account.',
        'Reliez l’épargne aux objectifs enregistrés au lieu d’afficher des parcours ou chiffres génériques.',
      ),
      action: L('فتح الأهداف', 'Open Goals', 'Ouvrir les objectifs'),
      href: '/goals',
    },
    {
      title: L('الدخل والمصروفات', 'Income and Expenses', 'Revenus et dépenses'),
      body: L(
        'أضف الدخل والمصروفات لحساب قدرة الادخار من بياناتك، أو ستظهر حالة بيانات غير كافية.',
        'Add income and expenses to calculate saving capacity from your data, otherwise an insufficient-data state appears.',
        'Ajoutez revenus et dépenses pour calculer votre capacité d’épargne à partir de vos données, sinon un état de données insuffisantes s’affiche.',
      ),
      action: L('فتح الدخل', 'Open Income', 'Ouvrir les revenus'),
      href: '/income',
    },
  ];

  return (
    <main className="savings-data-page" dir={dir}>
      <style>{`
        .savings-data-page{min-height:100vh;background:var(--background);color:var(--foreground);font-family:var(--font-ui)}
        .savings-wrap{width:100%;max-width:none;min-width:0;margin:0;display:grid;gap:18px}
        .savings-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
        .savings-back{min-height:44px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface);color:var(--foreground);padding:10px 15px;font:600 13px/1.5 var(--font-ui);cursor:pointer}
        .savings-back:hover{background:var(--surface-hover);border-color:var(--border-strong)}
        .savings-back:focus-visible,.savings-actions button:focus-visible,.savings-card button:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
        .savings-hero{background:var(--hero-gradient);border-radius:var(--radius-panel);padding:clamp(24px,5vw,54px);color:var(--hero-foreground);box-shadow:var(--shadow-md)}
        .savings-hero h1{margin:0 0 10px;font-size:clamp(32px,7vw,56px);line-height:1.15;font-weight:600;letter-spacing:0}
        .savings-hero p{margin:0;max-width:720px;color:var(--hero-foreground-muted);font-size:clamp(15px,2.2vw,19px);line-height:1.8;font-weight:400}
        .savings-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}
        .savings-actions button,.savings-card button{min-height:44px;border:0;border-radius:var(--radius-control);padding:12px 18px;font:600 13px/1.5 var(--font-ui);cursor:pointer}
        .savings-primary{background:var(--primary);color:var(--primary-foreground)}
        .savings-primary:hover{background:var(--primary-hover)}
        .savings-secondary{background:color-mix(in srgb,var(--hero-foreground) 10%,transparent);color:var(--hero-foreground);border:1px solid color-mix(in srgb,var(--hero-foreground) 22%,transparent)!important}
        .savings-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .savings-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);padding:20px;display:grid;gap:12px;box-shadow:var(--shadow-card)}
        .savings-card h2{margin:0;color:var(--foreground);font-size:19px;font-weight:600}
        .savings-card p{margin:0;color:var(--foreground-secondary);line-height:1.75;font-size:14px;font-weight:400}
        .savings-card button{justify-self:start;background:var(--primary);color:var(--primary-foreground)}
        .savings-card button:hover{background:var(--primary-hover)}
        .savings-note{background:var(--surface-muted);border:1px dashed var(--border-strong);border-radius:var(--radius-card);padding:18px;color:var(--foreground-secondary);font-weight:500;line-height:1.7;text-align:center}
        @media(max-width:820px){.savings-grid{grid-template-columns:1fr}.savings-hero{border-radius:var(--radius-panel)}.savings-actions button,.savings-card button{width:100%}}
      `}</style>

      <div className="savings-wrap">
        <header className="savings-top">
          <button type="button" className="savings-back" onClick={() => router.push('/dashboard')}>
            {L('العودة للرئيسية', 'Back Home', 'Retour accueil')}
          </button>
        </header>

        <section className="savings-hero">
          <h1>{L('الادخار', 'Savings', 'Épargne')}</h1>
          <p>
            {L(
              'تعرض THE SFM الادخار من بياناتك المسجلة فقط. إذا لم تكن البيانات كافية، ستظهر رسالة واضحة بدلاً من نسب أو أرقام عامة.',
              'THE SFM shows savings analysis from your recorded data only. If data is insufficient, a clear message appears instead of generic ratios or numbers.',
              'THE SFM affiche l’analyse d’épargne uniquement à partir de vos données enregistrées. Si les données sont insuffisantes, un message clair remplace les ratios ou chiffres génériques.',
            )}
          </p>
          <div className="savings-actions">
            <button type="button" className="savings-primary" onClick={() => router.push('/savings')}>
              {L('فتح صفحة المدخرات', 'Open Savings Page', 'Ouvrir la page épargne')}
            </button>
            <button type="button" className="savings-secondary" onClick={() => router.push('/goals')}>
              {L('الأهداف المالية', 'Financial Goals', 'Objectifs financiers')}
            </button>
          </div>
        </section>

        <section className="savings-grid" aria-label={L('مسارات الادخار', 'Savings paths', 'Parcours d’épargne')}>
          {cards.map(card => (
            <article key={card.href} className="savings-card">
              <h2>{card.title}</h2>
              <p>{card.body}</p>
              <button type="button" onClick={() => router.push(card.href)}>{card.action}</button>
            </article>
          ))}
        </section>

        <div className="savings-note">
          {L(
            'لا تظهر سيناريوهات أو توقعات أو رسوم بيانية مالية قبل توفر بيانات مسجلة كافية.',
            'Simulations, projections, and financial charts do not appear until enough recorded data is available.',
            'Les simulations, projections et graphiques financiers ne s’affichent pas tant que les données enregistrées ne sont pas suffisantes.',
          )}
        </div>
      </div>
    </main>
  );
}
