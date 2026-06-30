'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function GuestPage() {
  const { continueAsGuest, session } = useAuth();

  useEffect(() => {
    if (!session) continueAsGuest();
    window.location.assign('/dashboard');
  }, [continueAsGuest, session]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--sfm-soft-cyan)] border-t-transparent mx-auto mb-4" />
        <p className="text-[var(--sfm-muted)]">جاري الدخول كضيف...</p>
      </div>
    </div>
  );
}
