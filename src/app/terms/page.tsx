'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

const TEXT = {
  ar: {
    title: 'الشروط',
    subtitle: 'شروط استخدام مختصرة توضح أن THE SFM أداة للتنظيم والتخطيط وليست بديلاً عن الاستشارة المتخصصة.',
    points: [
      'استخدم المنصة لتنظيم بياناتك المالية ومشاريعك بناءً على المعلومات التي تضيفها أنت.',
      'لا تعتبر المخرجات استشارة مالية أو قانونية أو ضريبية أو شرعية رسمية.',
      'أنت مسؤول عن دقة البيانات التي تدخلها وعن مراجعة المختصين قبل القرارات المهمة.',
      'لا تشارك كلمة المرور أو بيانات حساسة خارج صفحات THE SFM الرسمية.',
    ],
    back: 'العودة إلى تسجيل الدخول',
  },
  en: {
    title: 'Terms',
    subtitle: 'Short terms explaining that THE SFM is for organization and planning, not a replacement for qualified advice.',
    points: [
      'Use the platform to organize your financial and project data based on information you add.',
      'Outputs are not official financial, legal, tax, or religious advice.',
      'You are responsible for data accuracy and for consulting qualified professionals before important decisions.',
      'Do not share passwords or sensitive data outside official THE SFM pages.',
    ],
    back: 'Back to login',
  },
  fr: {
    title: 'Conditions',
    subtitle: 'Conditions courtes indiquant que THE SFM sert à organiser et planifier, sans remplacer un conseil qualifié.',
    points: [
      'Utilisez la plateforme pour organiser vos données financières et vos projets selon les informations que vous ajoutez.',
      'Les résultats ne constituent pas un conseil financier, juridique, fiscal ou religieux officiel.',
      'Vous êtes responsable de l’exactitude des données et devez consulter des professionnels avant les décisions importantes.',
      'Ne partagez pas de mots de passe ni de données sensibles hors des pages officielles THE SFM.',
    ],
    back: 'Retour à la connexion',
  },
} as const;

export default function TermsPage() {
  const { lang, dir } = useLanguage();
  const text = TEXT[lang];
  return (
    <main className="legal-page" dir={dir}>
      <section className="legal-card">
        <span><ShieldCheck size={18} />THE SFM</span>
        <h1>{text.title}</h1>
        <p>{text.subtitle}</p>
        <ul>{text.points.map(point => <li key={point}>{point}</li>)}</ul>
        <Link href="/login">{text.back}</Link>
      </section>
      <style jsx>{`
        .legal-page{min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(180deg,#EEF6FF,#FFFFFF);font-family:Tajawal,Arial,sans-serif;color:#061B33}
        .legal-card{width:min(100%,760px);background:#FFFFFF;border:1px solid rgba(29,140,255,.16);border-radius:28px;padding:clamp(24px,5vw,42px);box-shadow:0 22px 64px rgba(3,18,37,.10)}
        span{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(24,212,212,.22);background:rgba(24,212,212,.08);border-radius:999px;padding:8px 12px;color:#0B2748;font-weight:950}
        h1{margin:18px 0 10px;font-size:clamp(32px,5vw,48px)}p,li{color:#334155;line-height:1.85;font-weight:800}ul{display:grid;gap:10px;margin:18px 0 24px;padding-inline-start:22px}a{display:inline-flex;min-height:46px;align-items:center;border-radius:14px;background:linear-gradient(135deg,#1D8CFF,#18D4D4);color:#FFFFFF;text-decoration:none;font-weight:950;padding:0 18px}
      `}</style>
    </main>
  );
}
