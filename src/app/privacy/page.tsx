'use client';

import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

const TEXT = {
  ar: {
    title: 'سياسة الخصوصية',
    subtitle: 'ملخص واضح لطريقة تعامل THE SFM مع بياناتك داخل التطبيق.',
    points: [
      'بياناتك المالية خاصة بحسابك ويجب ألا تظهر لمستخدمين آخرين.',
      'تعتمد التحليلات والتقارير على البيانات التي تدخلها أنت فقط.',
      'لا نستخدم بيانات وهمية داخل حسابات المستخدمين الحقيقية.',
      'لا تشارك كلمات المرور أو بيانات مالية حساسة في رسائل الدعم.',
    ],
    back: 'العودة إلى تسجيل الدخول',
  },
  en: {
    title: 'Privacy Policy',
    subtitle: 'A clear summary of how THE SFM treats your data inside the app.',
    points: [
      'Your financial data belongs to your account and should not appear to other users.',
      'Analysis and reports rely on the data you enter.',
      'We do not show fake data inside real user accounts.',
      'Do not share passwords or sensitive financial data in support messages.',
    ],
    back: 'Back to login',
  },
  fr: {
    title: 'Politique de confidentialité',
    subtitle: 'Un résumé clair de la manière dont THE SFM traite vos données dans l’application.',
    points: [
      'Vos données financières appartiennent à votre compte et ne doivent pas apparaître à d’autres utilisateurs.',
      'Les analyses et rapports reposent sur les données que vous saisissez.',
      'Nous n’affichons pas de données fictives dans les comptes réels.',
      'Ne partagez pas de mots de passe ni de données financières sensibles dans les messages de support.',
    ],
    back: 'Retour à la connexion',
  },
} as const;

export default function PrivacyPage() {
  const { lang, dir } = useLanguage();
  const text = TEXT[lang];
  return (
    <main className="legal-page" dir={dir}>
      <section className="legal-card">
        <span><LockKeyhole size={18} />THE SFM</span>
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
