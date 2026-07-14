'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

export default function GuestPage() {
  const { continueAsGuest, session } = useAuth();
  const { t, dir } = useLanguage();
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      if (!session) continueAsGuest();
      window.location.replace('/dashboard');
    } catch {
      setError(t('guest_error'));
    }
  }, [continueAsGuest, session, t]);

  return (
    <main className="guest-page" dir={dir} aria-live="polite">
      <div className="guest-status">
        {!error ? (
          <>
            <div className="guest-spinner" aria-hidden="true" />
            <p>{t('guest_loading')}</p>
          </>
        ) : (
          <p className="guest-error" role="alert">{error}</p>
        )}
      </div>
      <style jsx>{`
        .guest-page{min-height:100vh;display:grid;place-items:center;padding:20px;background:var(--background);color:var(--foreground);font-family:var(--font-ui)}
        .guest-status{text-align:center}
        .guest-spinner{width:48px;height:48px;margin:0 auto 16px;border:4px solid var(--border-strong);border-block-start-color:var(--primary);border-radius:var(--radius-pill);animation:guest-spin .8s linear infinite}
        .guest-status p{margin:0;color:var(--foreground-secondary);font-weight:400}
        .guest-status .guest-error{color:var(--danger);font-weight:500}
        @keyframes guest-spin{to{transform:rotate(360deg)}}
        @media(prefers-reduced-motion:reduce){.guest-spinner{animation-duration:1.8s}}
      `}</style>
    </main>
  );
}
