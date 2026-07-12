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
    <main className="mx-auto flex min-h-[65vh] w-full max-w-3xl items-center px-4 py-10" dir={dir} lang={lang}>
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-9" role="status" aria-live="polite">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200" aria-hidden="true">
          <ShieldAlert size={24} />
        </div>
        <p className="mb-2 text-sm font-semibold text-teal-700 dark:text-teal-300">{copy.eyebrow}</p>
        <h1 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white sm:text-3xl">{copy.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">{copy.body}</p>
        <Link href="/ai" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white outline-none transition hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-500">
          <Bot size={18} aria-hidden="true" />
          {copy.action}
        </Link>
      </section>
    </main>
  );
}
