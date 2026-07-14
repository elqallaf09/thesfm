'use client';

import Link from 'next/link';
import { Bot, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

const COPY = {
  ar: {
    eyebrow: 'حالة الخدمة',
    title: 'وكيل غير متاح مؤقتاً',
    body: 'تم إيقاف النسخة القديمة لأنها كانت تعتمد على بيانات تجريبية. ستعود الخدمة بعد ربطها ببياناتك الحقيقية مع عزل وصلاحيات مناسبة.',
    action: 'فتح المساعد المالي',
  },
  en: {
    eyebrow: 'Service status',
    title: 'Wakeel is temporarily unavailable',
    body: 'The legacy version was disabled because it relied on demo data. It will return after real, user-isolated data and authorization are connected.',
    action: 'Open financial assistant',
  },
  fr: {
    eyebrow: 'État du service',
    title: 'Wakeel est temporairement indisponible',
    body: 'L’ancienne version a été désactivée car elle utilisait des données de démonstration. Le service reviendra avec des données réelles isolées et des autorisations adaptées.',
    action: 'Ouvrir l’assistant financier',
  },
} as const;

export default function Wakeel() {
  const { lang, dir } = useLanguage();
  const copy = COPY[lang] ?? COPY.ar;

  return (
    <main className="wakeel-page" dir={dir} lang={lang}>
      <section className="wakeel-card" role="status" aria-live="polite">
        <div className="wakeel-icon" aria-hidden="true">
          <ShieldAlert size={24} />
        </div>
        <p className="wakeel-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="wakeel-body">{copy.body}</p>
        <Link href="/ai" className="wakeel-action">
          <Bot size={18} aria-hidden="true" />
          {copy.action}
        </Link>
      </section>
      <style jsx>{`
        .wakeel-page{width:100%;max-width:56rem;min-height:65vh;margin:0 auto;display:flex;align-items:center;padding:40px 16px;font-family:var(--font-ui);color:var(--foreground)}
        .wakeel-card{width:100%;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);padding:32px;box-shadow:var(--shadow-card)}
        .wakeel-icon{width:48px;height:48px;margin-bottom:20px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-card);background:var(--warning-soft);color:var(--warning)}
        .wakeel-eyebrow{margin:0 0 8px;color:var(--foreground-secondary);font-size:14px;font-weight:500}
        h1{margin:0;color:var(--foreground);font-size:clamp(24px,4vw,30px);line-height:1.35;font-weight:600}
        .wakeel-body{max-width:42rem;margin:12px 0 0;color:var(--foreground-secondary);font-size:16px;line-height:1.75;font-weight:400}
        .wakeel-action{min-height:44px;margin-top:24px;display:inline-flex;align-items:center;gap:8px;border:1px solid var(--primary);border-radius:var(--radius-card);background:var(--primary);color:var(--primary-foreground);padding:10px 20px;font-weight:600;text-decoration:none;transition:background .18s ease,border-color .18s ease}
        .wakeel-action:hover{background:var(--primary-hover);border-color:var(--primary-hover)}
        .wakeel-action:focus-visible{outline:2px solid var(--focus-ring);outline-offset:3px;box-shadow:var(--focus-shadow)}
        @media(max-width:640px){.wakeel-card{padding:24px}}
      `}</style>
    </main>
  );
}
