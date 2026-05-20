'use client';

import { BookOpen, Coins, GraduationCap, LineChart, ReceiptText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const cards = [
  { href: '/education/expenses', icon: ReceiptText, title: 'تعليم المصروفات', body: 'افهم أين يذهب المال وكيف تضبط الصرف.' },
  { href: '/education/savings', icon: Coins, title: 'تعليم الادخار', body: 'خطط لصندوق الطوارئ والأهداف القريبة.' },
  { href: '/education/investments', icon: LineChart, title: 'تعليم الاستثمار', body: 'تعلم أساسيات المخاطر والمساهمة الشهرية.' },
];

export default function EducationPage() {
  const router = useRouter();

  return (
    <main className="edu-shell" dir="rtl">
      <section className="edu-page">
        <header>
          <button onClick={() => router.push('/')}>← الرئيسية</button>
          <LanguageSwitcher variant="gold" compact />
        </header>
        <section className="hero">
          <GraduationCap size={42} />
          <h1>التعليم المالي</h1>
          <p>اختر مسارًا تعليميًا لمراجعة المصروفات، الادخار، أو الاستثمار بتجربة متوافقة مع THE SFM.</p>
        </section>
        <section className="cards">
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <button key={card.href} onClick={() => router.push(card.href)}>
                <Icon size={25} />
                <strong>{card.title}</strong>
                <span>{card.body}</span>
              </button>
            );
          })}
        </section>
      </section>
      <style>{`
        .edu-shell{min-height:100vh;background:#F7F3EA;color:#111;font-family:Tajawal,Arial,sans-serif}.edu-page{max-width:980px;margin:0 auto;padding:24px 20px 60px}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}header button{height:40px;border-radius:13px;border:1.5px solid rgba(216,174,99,.22);background:#FFFDFC;color:#5B4332;padding:0 14px;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer}.hero{background:linear-gradient(135deg,#111,#2B1A0D 62%,#D8AE63 140%);color:#FFFDFC;border-radius:24px;padding:32px;margin-bottom:18px}.hero svg{color:#D8AE63}.hero h1{font-size:34px;margin:12px 0 8px}.hero p{margin:0;color:rgba(255,255,255,.68);line-height:1.8;max-width:620px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.cards button{text-align:right;background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:20px;padding:20px;box-shadow:0 4px 22px rgba(90,67,51,.06);cursor:pointer;color:#111}.cards svg{color:#D8AE63;margin-bottom:12px}.cards strong{display:block;font-size:17px}.cards span{display:block;margin-top:8px;color:#7C6A5D;line-height:1.7;font-size:13px}@media(max-width:760px){.cards{grid-template-columns:1fr}.hero h1{font-size:28px}}
      `}</style>
    </main>
  );
}
