import Link from 'next/link';

export default function Custom404() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'sans-serif', textAlign: 'center' }}>
      <section>
        <p style={{ fontWeight: 800 }}>404</p>
        <h1>Page not found</h1>
        <p>The page you are looking for could not be found.</p>
        <Link href="/">Back to home</Link>
      </section>
    </main>
  );
}
