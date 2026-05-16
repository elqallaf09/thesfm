'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function GuestPage() {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is already logged in, redirect to home
    if (session) {
      router.push('/');
      return;
    }

    // Set guest session in localStorage and redirect
    localStorage.setItem('guest_session', 'true');
    router.push('/');
  }, [session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-300">جار التحميل...</p>
      </div>
    </div>
  );
}
