import Link from 'next/link';

export default function Custom500() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'sans-serif', textAlign: 'center' }}>
      <section>
        <p style={{ fontWeight: 800 }}>500</p>
        <h1>Something went wrong</h1>
        <p>We could not complete this request. Please try again shortly.</p>
        <Link href="/">Back to home</Link>
      </section>
    </main>
  );
}
