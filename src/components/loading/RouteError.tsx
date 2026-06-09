'use client';

import { useEffect } from 'react';

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}

export function RouteError({ error, reset, title = 'حدث خطأ' }: RouteErrorProps) {
  useEffect(() => {
    console.error('[RouteError]', error);
  }, [error]);

  return (
    <main
      dir="rtl"
      className="sfm-route-error"
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.25rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>⚠️</div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{title}</h2>
      <p style={{ color: 'var(--muted-foreground, #888)', margin: 0, maxWidth: '30ch', lineHeight: 1.6 }}>
        {error.message || 'فشل تحميل هذه الصفحة. يرجى المحاولة مجدداً.'}
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: '0.5rem',
          padding: '0.6rem 1.6rem',
          borderRadius: '8px',
          border: '1px solid var(--border, #e2e8f0)',
          background: 'var(--primary, #1d8cff)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: 500,
        }}
      >
        إعادة المحاولة
      </button>
    </main>
  );
}
