'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function GuestPage() {
  const { continueAsGuest, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!session) continueAsGuest();
    router.push('/');
  }, [continueAsGuest, router, session]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D8AE63] border-t-transparent mx-auto mb-4" />
        <p className="text-[#9A6C3C]">جاري الدخول كضيف...</p>
      </div>
    </div>
  );
}
