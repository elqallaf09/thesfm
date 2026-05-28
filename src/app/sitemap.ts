import type { MetadataRoute } from 'next';
import { absoluteUrl, publicRoutes } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map(route => ({
    url: absoluteUrl(route),
    lastModified: now,
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : 0.7,
    alternates: {
      languages: {
        ar: absoluteUrl(route),
        en: absoluteUrl(route),
        fr: absoluteUrl(route),
      },
    },
  }));
}
