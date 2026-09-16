import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import LoanCalculatorClient from './LoanCalculatorClient';

export const metadata: Metadata = pageMetadata({
  title: 'حاسبة القرض والقسط الشهري | THE SFM',
  description: 'احسب القسط الشهري وإجمالي تكلفة القرض والفائدة التقديرية بدون تسجيل دخول.',
  path: '/loan-calculator',
});

export default function LoanCalculatorPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'THE SFM Loan Calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: 'https://www.the-sfm.com/loan-calculator',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <LoanCalculatorClient />
    </main>
  );
}
