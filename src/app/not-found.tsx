'use client';

import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

export default function NotFound() {
  const { t, dir, lang } = useLanguage();
  return (
    <main className="not-found-page" dir={dir} lang={lang}>
      <section className="not-found-card">
        <span className="not-found-logo" aria-hidden="true">SFM</span>
        <span className="not-found-code" aria-label="404">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="m8.5 8.5 4 4m0-4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          404
        </span>
        <h1>{t('not_found_title')}</h1>
        <p>{t('not_found_body')}</p>
        <Link href="/" className="not-found-link">{t('not_found_home')}</Link>
      </section>
    </main>
  );
}
