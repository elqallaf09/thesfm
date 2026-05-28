'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Home, SearchX } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

const TEXT = {
  ar: {
    title: 'الصفحة غير موجودة',
    body: 'الرابط الذي فتحته غير متاح أو تم نقله. يمكنك العودة إلى الصفحة الرئيسية ومتابعة استخدام THE SFM.',
    action: 'العودة إلى الرئيسية',
  },
  en: {
    title: 'Page not found',
    body: 'The link you opened is unavailable or has moved. Return home and continue using THE SFM.',
    action: 'Back to home',
  },
  fr: {
    title: 'Page introuvable',
    body: 'Le lien ouvert est indisponible ou a été déplacé. Revenez à l’accueil pour continuer à utiliser THE SFM.',
    action: 'Retour à l’accueil',
  },
} as const;

export default function NotFound() {
  const { lang, dir } = useLanguage();
  const text = TEXT[lang];

  return (
    <main className="not-found-page" dir={dir}>
      <section className="not-found-card">
        <Image src="/sfm-logo.png" alt="THE SFM" width={58} height={58} className="not-found-logo" />
        <span><SearchX size={18} />404</span>
        <h1>{text.title}</h1>
        <p>{text.body}</p>
        <Link href="/"><Home size={18} />{text.action}</Link>
      </section>
      <style jsx>{`
        .not-found-page{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 18% 12%,rgba(24,212,212,.18),transparent 28%),linear-gradient(180deg,#EEF6FF,#FFFFFF);font-family:Tajawal,Arial,sans-serif;color:#061B33}
        .not-found-card{width:min(100%,620px);text-align:center;border:1px solid rgba(29,140,255,.16);border-radius:32px;background:#fff;box-shadow:0 24px 70px rgba(3,18,37,.12);padding:clamp(26px,6vw,48px);display:grid;justify-items:center;gap:14px}
        .not-found-logo{border-radius:16px;box-shadow:0 12px 28px rgba(3,18,37,.14)}
        span{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:rgba(24,212,212,.10);border:1px solid rgba(24,212,212,.24);color:#0B2748;padding:8px 12px;font-weight:950}
        h1{margin:0;font-size:clamp(34px,6vw,54px);font-weight:950}
        p{margin:0;max-width:460px;color:#475569;line-height:1.85;font-weight:800}
        a{min-height:48px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:999px;background:linear-gradient(135deg,#1D8CFF,#18D4D4);color:#fff;text-decoration:none;font-weight:950;padding:0 20px;box-shadow:0 14px 34px rgba(29,140,255,.24)}
        a:focus-visible{outline:3px solid rgba(24,212,212,.55);outline-offset:4px}
      `}</style>
    </main>
  );
}
