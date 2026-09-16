import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import CompoundInterestCalculatorClient from './CompoundInterestCalculatorClient';

export const metadata: Metadata = pageMetadata({
  title: 'حاسبة الفائدة المركبة المجانية | THE SFM',
  description: 'احسب نمو مدخراتك أو استثمارك مع المساهمات الدورية والفائدة المركبة بدون تسجيل دخول.',
  path: '/compound-interest-calculator',
});

export default function CompoundInterestCalculatorPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'THE SFM Compound Interest Calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: 'https://www.the-sfm.com/compound-interest-calculator',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <CompoundInterestCalculatorClient />
    </main>
  );
}
