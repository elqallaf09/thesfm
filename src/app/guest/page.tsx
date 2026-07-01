'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function GuestPage() {
  const { continueAsGuest, session } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      if (!session) continueAsGuest();
      window.location.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start guest mode.');
    }
  }, [continueAsGuest, session]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {!error ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--sfm-soft-cyan)] border-t-transparent mx-auto mb-4" />
            <p className="text-[var(--sfm-muted)]">جاري الدخول كضيف...</p>
          </>
        ) : (
          <p className="text-red-600" role="alert">{error}</p>
        )}
      </div>
    </div>
  );
}
