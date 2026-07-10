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
    <div className="min-h-screen flex items-center justify-center" dir={dir}>
      <div className="text-center">
        {!error ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--sfm-soft-cyan)] border-t-transparent mx-auto mb-4" />
            <p className="text-[var(--sfm-muted)]">{t('guest_loading')}</p>
          </>
        ) : (
          <p className="text-red-600" role="alert">{error}</p>
        )}
      </div>
    </div>
  );
}
