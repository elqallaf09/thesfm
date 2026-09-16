import type { Metadata } from 'next';
import { LocalizedSeoLandingPage } from '@/components/public/LocalizedSeoLandingPage';
import { pageMetadata } from '@/lib/seo';

const base = pageMetadata({
  title: 'THE SFM — Argent, Zakat, Investissements et Projets',
  description: 'Une plateforme financière et économique pour gérer finances personnelles, investissements, zakat, projets et rapports au même endroit.',
  path: '/fr',
});

export const metadata: Metadata = {
  ...base,
  alternates: {
    canonical: '/fr',
    languages: {
      ar: '/ar',
      en: '/en',
      fr: '/fr',
      'x-default': '/',
    },
  },
  openGraph: {
    ...base.openGraph,
    locale: 'fr_FR',
  },
};

export default function FrenchLandingPage() {
  return <LocalizedSeoLandingPage locale="fr" />;
}
