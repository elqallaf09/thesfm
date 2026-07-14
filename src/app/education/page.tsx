'use client';

import { BookOpen, Coins, GraduationCap, LineChart, ReceiptText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';

export default function EducationPage() {
  const router = useRouter();
  const { lang, dir } = useLanguage();
  const pick = (copy: { ar: string; en: string; fr: string }) => copy[lang];
  const cards = [
    { href: '/education/expenses', icon: ReceiptText, title: { ar: 'تعليم المصروفات', en: 'Expense education', fr: 'Formation aux dépenses' }, body: { ar: 'افهم أين يذهب المال وكيف تضبط الصرف.', en: 'Understand where your money goes and how to manage spending.', fr: 'Comprenez où va votre argent et comment maîtriser vos dépenses.' } },
    { href: '/education/savings', icon: Coins, title: { ar: 'تعليم الادخار', en: 'Savings education', fr: 'Formation à l’épargne' }, body: { ar: 'خطط لصندوق الطوارئ والأهداف القريبة.', en: 'Plan an emergency fund and short-term goals.', fr: 'Planifiez un fonds d’urgence et vos objectifs à court terme.' } },
    { href: '/education/investments', icon: LineChart, title: { ar: 'تعليم الاستثمار', en: 'Investment education', fr: 'Formation à l’investissement' }, body: { ar: 'تعلم أساسيات المخاطر والمساهمة الشهرية.', en: 'Learn the basics of risk and monthly contributions.', fr: 'Apprenez les principes du risque et des contributions mensuelles.' } },
  ];

  return (
    <main className="edu-shell" dir={dir}>
      <section className="edu-page">
        <header>
          <button onClick={() => router.push('/dashboard')}>{dir === 'rtl' ? '←' : '→'} {pick({ ar: 'الرئيسية', en: 'Home', fr: 'Accueil' })}</button>
        </header>
        <section className="hero">
          <GraduationCap size={42} />
          <h1>{pick({ ar: 'التعليم المالي', en: 'Financial education', fr: 'Formation financière' })}</h1>
          <p>{pick({ ar: 'اختر مسارًا تعليميًا لمراجعة المصروفات، الادخار، أو الاستثمار بتجربة متوافقة مع THE SFM.', en: 'Choose a learning path for expenses, savings, or investing in an experience designed for THE SFM.', fr: 'Choisissez un parcours sur les dépenses, l’épargne ou l’investissement dans une expérience conçue pour THE SFM.' })}</p>
        </section>
        <section className="cards">
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <button key={card.href} onClick={() => router.push(card.href)}>
                <Icon size={25} />
                <strong>{pick(card.title)}</strong>
                <span>{pick(card.body)}</span>
              </button>
            );
          })}
        </section>
      </section>
      <style>{`
        .edu-shell{min-height:100vh;background:var(--background);color:var(--foreground);font-family:var(--font-ui)}
        .edu-page{max-width:var(--workspace-page-max-standard);margin:0 auto;padding:24px 20px 60px}
        header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
        header button{min-height:44px;border-radius:var(--radius-control);border:1px solid var(--border);background:var(--surface);color:var(--foreground-secondary);padding:0 14px;font:600 13px/1.5 var(--font-ui);cursor:pointer}
        header button:hover{background:var(--surface-hover);border-color:var(--border-strong)}
        header button:focus-visible,.cards button:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
        .hero{background:var(--hero-gradient);color:var(--hero-foreground);border-radius:var(--radius-panel);padding:32px;margin-bottom:18px;box-shadow:var(--shadow-card)}
        .hero svg{color:var(--hero-foreground-muted)}
        .hero h1{font-size:34px;font-weight:600;line-height:1.25;margin:12px 0 8px}
        .hero p{margin:0;color:var(--hero-foreground-muted);line-height:1.8;max-width:620px}
        .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
        .cards button{text-align:start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);padding:20px;box-shadow:var(--shadow-card);cursor:pointer;color:var(--foreground);min-width:0;transition:background-color .18s ease,border-color .18s ease,transform .18s ease}
        .cards button:hover{background:var(--surface-hover);border-color:var(--border-strong);transform:translateY(-1px)}
        .cards svg{color:var(--primary);margin-bottom:12px}
        .cards strong{display:block;font-size:17px;font-weight:600;line-height:1.5}
        .cards span{display:block;margin-top:8px;color:var(--foreground-secondary);line-height:1.7;font-size:13px;overflow-wrap:anywhere}
        @media(max-width:760px){.cards{grid-template-columns:1fr}.hero h1{font-size:28px}}
        @media(prefers-reduced-motion:reduce){.cards button{transition:none}.cards button:hover{transform:none}}
      `}</style>
    </main>
  );
}
