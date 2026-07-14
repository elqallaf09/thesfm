'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';

export default function InvestmentEducationPage() {
  const router = useRouter();
  const { dir, isAr, isFr } = useLanguage();
  const L = useCallback((ar: string, en: string, fr: string) => (isAr ? ar : isFr ? fr : en), [isAr, isFr]);

  const cards = [
    {
      title: L('محفظة الاستثمارات', 'Investment Portfolio', 'Portefeuille d’investissement'),
      body: L(
        'أضف أصولك وقيمها ومساهماتك الشهرية لعرض التحليل من بياناتك المسجلة فقط.',
        'Add assets, values, and monthly contributions to view analysis from your recorded data only.',
        'Ajoutez vos actifs, valeurs et contributions mensuelles pour afficher une analyse basée uniquement sur vos données enregistrées.',
      ),
      action: L('فتح المحفظة', 'Open Portfolio', 'Ouvrir le portefeuille'),
      href: '/invest',
    },
    {
      title: L('بيانات السوق', 'Market Data', 'Données de marché'),
      body: L(
        'تعرض صفحة السوق بيانات المصدر المتاح، أو حالة عدم توفر البيانات عند فشل المصدر.',
        'The market page shows available source data, or an unavailable state when the source fails.',
        'La page marché affiche les données de source disponibles, ou un état indisponible si la source échoue.',
      ),
      action: L('فتح تحليل السوق', 'Open Market Analysis', 'Ouvrir l’analyse de marché'),
      href: '/market-analysis',
    },
    {
      title: L('الأهداف المالية', 'Financial Goals', 'Objectifs financiers'),
      body: L(
        'اربط قراراتك الاستثمارية بأهداف مالية مسجلة حتى تظهر المتابعة دون أرقام عامة.',
        'Connect investment decisions to recorded goals so tracking appears without generic numbers.',
        'Reliez vos décisions d’investissement à des objectifs enregistrés afin que le suivi s’affiche sans chiffres génériques.',
      ),
      action: L('فتح الأهداف', 'Open Goals', 'Ouvrir les objectifs'),
      href: '/goals',
    },
  ];

  return (
    <main className="investment-data-page" dir={dir}>
      <style>{`
        .investment-data-page{min-height:100vh;background:var(--background);color:var(--foreground);font-family:var(--font-ui);padding:22px}
        .investment-wrap{width:min(1120px,100%);margin:0 auto;display:grid;gap:18px}
        .investment-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
        .investment-hero{background:var(--hero-gradient);border-radius:var(--radius-panel);padding:clamp(24px,5vw,54px);color:var(--hero-foreground);box-shadow:var(--shadow-md);overflow:hidden;position:relative}
        .investment-hero:after{content:'';position:absolute;inset:auto -80px -110px auto;width:260px;height:260px;border-radius:var(--radius-pill);background:color-mix(in srgb,var(--accent) 18%,transparent);pointer-events:none}
        .investment-hero h1{margin:0 0 10px;font-size:clamp(32px,7vw,56px);line-height:1.15;font-weight:600;letter-spacing:0}
        .investment-hero p{margin:0;max-width:720px;color:var(--hero-foreground-muted);font-size:clamp(15px,2.2vw,19px);line-height:1.8;font-weight:400}
        .investment-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}
        .investment-actions button,.investment-card button{min-height:44px;border:0;border-radius:var(--radius-control);padding:12px 18px;font:600 13px/1.5 var(--font-ui);cursor:pointer}
        .investment-primary{background:var(--primary);color:var(--primary-foreground)}
        .investment-primary:hover{background:var(--primary-hover)}
        .investment-secondary{background:color-mix(in srgb,var(--hero-foreground) 10%,transparent);color:var(--hero-foreground);border:1px solid color-mix(in srgb,var(--hero-foreground) 22%,transparent)!important}
        .investment-actions button:focus-visible,.investment-card button:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
        .investment-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .investment-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);padding:20px;display:grid;gap:12px;box-shadow:var(--shadow-card)}
        .investment-card h2{margin:0;color:var(--foreground);font-size:19px;font-weight:600}
        .investment-card p{margin:0;color:var(--foreground-secondary);line-height:1.75;font-size:14px;font-weight:400}
        .investment-card button{justify-self:start;background:var(--primary);color:var(--primary-foreground)}
        .investment-card button:hover{background:var(--primary-hover)}
        .investment-note{background:var(--surface-muted);border:1px dashed var(--border-strong);border-radius:var(--radius-card);padding:18px;color:var(--foreground-secondary);font-weight:500;line-height:1.7;text-align:center}
        @media(max-width:820px){.investment-data-page{padding:14px}.investment-grid{grid-template-columns:1fr}.investment-hero{border-radius:var(--radius-panel)}.investment-actions button{width:100%}.investment-card button{width:100%}}
      `}</style>

      <div className="investment-wrap">
        <header className="investment-top">
          <button type="button" className="investment-secondary" onClick={() => router.push('/dashboard')} style={{ color: 'var(--foreground)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {L('العودة للرئيسية', 'Back Home', 'Retour accueil')}
          </button>
        </header>

        <section className="investment-hero">
          <h1>{L('الاستثمار', 'Investing', 'Investissement')}</h1>
          <p>
            {L(
              'تعرض THE SFM الاستثمار من بياناتك المسجلة فقط. عند عدم وجود بيانات كافية، ستظهر حالة واضحة بدلاً من أرقام عامة.',
              'THE SFM shows investing analysis from your recorded data only. When data is insufficient, it shows a clear state instead of generic numbers.',
              'THE SFM affiche l’analyse d’investissement uniquement à partir de vos données enregistrées. Lorsque les données sont insuffisantes, un état clair s’affiche au lieu de chiffres génériques.',
            )}
          </p>
          <div className="investment-actions">
            <button type="button" className="investment-primary" onClick={() => router.push('/invest')}>
              {L('فتح محفظة الاستثمارات', 'Open Investment Portfolio', 'Ouvrir le portefeuille')}
            </button>
            <button type="button" className="investment-secondary" onClick={() => router.push('/market-analysis')}>
              {L('تحليل السوق', 'Market Analysis', 'Analyse de marché')}
            </button>
          </div>
        </section>

        <section className="investment-grid" aria-label={L('مسارات الاستثمار', 'Investment paths', 'Parcours d’investissement')}>
          {cards.map(card => (
            <article key={card.href} className="investment-card">
              <h2>{card.title}</h2>
              <p>{card.body}</p>
              <button type="button" onClick={() => router.push(card.href)}>{card.action}</button>
            </article>
          ))}
        </section>

        <div className="investment-note">
          {L(
            'لا تظهر توقعات أو نسب أو رسوم بيانية مالية قبل توفر بيانات مسجلة كافية.',
            'Financial projections, ratios, and charts do not appear until enough recorded data is available.',
            'Les projections, ratios et graphiques financiers ne s’affichent pas tant que les données enregistrées ne sont pas suffisantes.',
          )}
        </div>
      </div>
    </main>
  );
}
