import type { Metadata } from 'next';
import { LocalizedSeoLandingPage } from '@/components/public/LocalizedSeoLandingPage';
import { pageMetadata } from '@/lib/seo';

const base = pageMetadata({
  title: 'THE SFM — Money, Zakat, Investments & Projects',
  description: 'A financial and economic platform for personal finance, investments, zakat, projects, and reporting in one place.',
  path: '/en',
});

export const metadata: Metadata = {
  ...base,
  alternates: {
    canonical: '/en',
    languages: {
      ar: '/ar',
      en: '/en',
      fr: '/fr',
      'x-default': '/',
    },
  },
  openGraph: {
    ...base.openGraph,
    locale: 'en_US',
  },
};

export default function EnglishLandingPage() {
  return <LocalizedSeoLandingPage locale="en" />;
}
