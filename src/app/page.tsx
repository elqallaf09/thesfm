import type { Metadata } from 'next';
import PublicLandingPage from '@/components/public/PublicLandingPage';
import { pageMetadata } from '@/lib/seo';

const base = pageMetadata({
  title: 'THE SFM — منصة مالية ذكية لإدارة أموالك ومشاريعك',
  path: '/',
});

export const metadata: Metadata = {
  ...base,
  alternates: {
    canonical: '/',
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

export default function HomePage() {
  return <PublicLandingPage />;
}
