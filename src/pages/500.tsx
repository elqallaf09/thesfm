import type { ReactElement } from 'react';
import Link from 'next/link';

export default function Custom500(): ReactElement {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background: '#f7fbff',
      color: '#0f2747',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      textAlign: 'center',
    }}>
      <section style={{ maxWidth: 560 }}>
        <p style={{ margin: 0, color: '#b45309', fontWeight: 800 }}>500</p>
        <h1 style={{ margin: '12px 0', fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>Something went wrong</h1>
        <p style={{ margin: '0 0 24px', color: '#516276', lineHeight: 1.7 }}>
          We could not complete this request. Please try again shortly.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            background: '#0f766e',
            color: 'white',
            padding: '0 18px',
            textDecoration: 'none',
            fontWeight: 800,
          }}
        >
          Back to home
        </Link>
      </section>
    </main>
  );
}
