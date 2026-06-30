import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="not-found-page" dir="rtl" lang="ar">
      <section className="not-found-card">
        <span className="not-found-logo" aria-hidden="true">SFM</span>
        <span className="not-found-code" aria-label="404">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="m8.5 8.5 4 4m0-4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          404
        </span>
        <h1>الصفحة غير موجودة</h1>
        <p>الرابط الذي فتحته غير متاح أو تم نقله. يمكنك العودة إلى الصفحة الرئيسية ومتابعة استخدام THE SFM.</p>
        <Link href="/" className="not-found-link">العودة إلى الرئيسية</Link>
      </section>
    </main>
  );
}
