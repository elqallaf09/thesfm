import type { ReactElement } from 'react';
import Link from 'next/link';

export default function Custom404(): ReactElement {
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
      <section style={{ maxWidth: 520 }}>
        <p style={{ margin: 0, color: '#0f766e', fontWeight: 800 }}>404</p>
        <h1 style={{ margin: '12px 0', fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>Page not found</h1>
        <p style={{ margin: '0 0 24px', color: '#516276', lineHeight: 1.7 }}>
          The page you are looking for could not be found.
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
