'use client';

import { BookOpen, Coins, GraduationCap, LineChart, ReceiptText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
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
          <LanguageSwitcher variant="gold" compact />
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
        .edu-shell{min-height:100vh;background:var(--sfm-light-card);color:var(--sfm-foreground);font-family:Tajawal,Arial,sans-serif}.edu-page{max-width:980px;margin:0 auto;padding:24px 20px 60px}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}header button{height:var(--control-h);border-radius:var(--r-md);border:1.5px solid rgba(167,243,240,.22);background:var(--sfm-card);color:var(--sfm-muted);padding:0 14px;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer}.hero{background:linear-gradient(135deg,var(--sfm-foreground),var(--sfm-primary-dark) 62%,var(--sfm-soft-cyan) 140%);color:var(--sfm-card);border-radius:var(--r-2xl);padding:32px;margin-bottom:18px}.hero svg{color:var(--sfm-soft-cyan)}.hero h1{font-size:34px;margin:12px 0 8px}.hero p{margin:0;color:rgba(255,255,255,.68);line-height:1.8;max-width:620px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.cards button{text-align:start;background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:var(--r-xl);padding:20px;box-shadow:0 4px 22px rgba(3,18,37,.06);cursor:pointer;color:var(--sfm-foreground)}.cards svg{color:var(--sfm-soft-cyan);margin-bottom:12px}.cards strong{display:block;font-size:17px}.cards span{display:block;margin-top:8px;color:var(--sfm-muted);line-height:1.7;font-size:13px}@media(max-width:760px){.cards{grid-template-columns:1fr}.hero h1{font-size:28px}}
      `}</style>
    </main>
  );
}
