'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
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
        .savings-data-page{min-height:100vh;background:#F7F3EA;color:#24160E;font-family:Tajawal,Arial,sans-serif;padding:22px}
        .savings-wrap{width:min(1120px,100%);margin:0 auto;display:grid;gap:18px}
        .savings-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
        .savings-back{border:1px solid rgba(186,117,23,.18);border-radius:14px;background:#FFFDF8;color:#2B1A0F;padding:10px 15px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer}
        .savings-hero{background:linear-gradient(135deg,#2B1A0F,#3D2914);border-radius:28px;padding:clamp(24px,5vw,54px);color:#FFFDF8;box-shadow:0 24px 70px rgba(43,26,15,.20)}
        .savings-hero h1{margin:0 0 10px;font-size:clamp(32px,7vw,64px);line-height:1;font-weight:900;letter-spacing:0}
        .savings-hero p{margin:0;max-width:720px;color:rgba(255,253,248,.78);font-size:clamp(15px,2.2vw,19px);line-height:1.8;font-weight:700}
        .savings-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}
        .savings-actions button,.savings-card button{border:0;border-radius:15px;padding:12px 18px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer}
        .savings-primary{background:linear-gradient(135deg,#BA7517,#EF9F27);color:#211207}
        .savings-secondary{background:rgba(255,253,248,.10);color:#FFFDF8;border:1px solid rgba(255,253,248,.18)!important}
        .savings-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .savings-card{background:#FFFDF8;border:1px solid rgba(186,117,23,.15);border-radius:22px;padding:20px;display:grid;gap:12px;box-shadow:0 12px 34px rgba(43,26,15,.07)}
        .savings-card h2{margin:0;color:#2B1A0F;font-size:19px;font-weight:900}
        .savings-card p{margin:0;color:#6D5647;line-height:1.75;font-size:14px;font-weight:700}
        .savings-card button{justify-self:start;background:#2B1A0F;color:#FFFDF8}
        .savings-note{background:#FFFDF8;border:1px dashed rgba(186,117,23,.28);border-radius:20px;padding:18px;color:#8A5A20;font-weight:900;line-height:1.7;text-align:center}
        @media(max-width:820px){.savings-data-page{padding:14px}.savings-grid{grid-template-columns:1fr}.savings-hero{border-radius:22px}.savings-actions button,.savings-card button{width:100%}}
      `}</style>

      <div className="savings-wrap">
        <header className="savings-top">
          <button type="button" className="savings-back" onClick={() => router.push('/')}>
            {L('العودة للرئيسية', 'Back Home', 'Retour accueil')}
          </button>
          <LanguageSwitcher variant="gold" compact />
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
