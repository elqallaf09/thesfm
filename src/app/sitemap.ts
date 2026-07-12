import type { MetadataRoute } from 'next';
import { absoluteUrl, publicRoutes } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map(route => ({
    url: absoluteUrl(route),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
