import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import ZakatCalculatorClient from './ZakatCalculatorClient';

export const metadata: Metadata = pageMetadata({
  title: 'حاسبة الزكاة المجانية | THE SFM',
  description: 'احسب زكاتك تقديرياً بدون تسجيل دخول. أدخل الأصول الزكوية والالتزامات قصيرة الأجل للحصول على تقدير واضح وقابل للمراجعة.',
  path: '/zakat-calculator',
});

export default function ZakatCalculatorPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'THE SFM Zakat Calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: 'https://www.the-sfm.com/zakat-calculator',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ZakatCalculatorClient />
    </main>
  );
}
