import type { Metadata } from 'next';

const siteUrl = 'https://www.the-sfm.com';

export const baseDescription = 'THE SFM منصة مالية ذكية تجمع إدارة الدخل والمصروفات والمدخرات والاستثمارات والزكاة والمشاريع والتقارير في مكان واحد، مبنية على بياناتك الحقيقية.';

export function absoluteUrl(path = '/') {
  return new URL(path, siteUrl).toString();
}

export function languageAlternates(path = '/') {
  return {
    ar: path,
    en: path,
    fr: path,
    'x-default': path,
  };
}

export function pageMetadata({
  title,
  description = baseDescription,
  path = '/',
}: {
  title: string;
  description?: string;
  path?: string;
}): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: path,
      languages: languageAlternates(path),
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: 'THE SFM',
      type: 'website',
      locale: 'ar',
      alternateLocale: ['en', 'fr'],
      images: [{ url: '/icons/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/icons/og-image.png'],
    },
  };
}

export const publicRoutes = [
  '/',
  '/about',
  '/contact',
  '/financial-theories',
  '/privacy',
  '/terms',
] as const;
