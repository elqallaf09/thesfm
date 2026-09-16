import type { Metadata } from 'next';
import { LocalizedSeoLandingPage } from '@/components/public/LocalizedSeoLandingPage';
import { pageMetadata } from '@/lib/seo';

const base = pageMetadata({
  title: 'THE SFM — إدارة الأموال والزكاة والاستثمارات والمشاريع',
  description: 'منصة مالية واقتصادية عربية لإدارة المال الشخصي والاستثمارات والزكاة والمشاريع والتقارير في مكان واحد.',
  path: '/ar',
});

export const metadata: Metadata = {
  ...base,
  alternates: {
    canonical: '/ar',
    languages: {
      ar: '/ar',
      en: '/en',
      fr: '/fr',
      'x-default': '/',
    },
  },
  openGraph: {
    ...base.openGraph,
    locale: 'ar_KW',
  },
};

export default function ArabicLandingPage() {
  return <LocalizedSeoLandingPage locale="ar" />;
}
