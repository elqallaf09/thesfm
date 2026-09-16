import type { MetadataRoute } from 'next';
import { absoluteUrl, publicLandingLanguagePaths, publicRoutes } from '@/lib/seo';

const localizedLandingRoutes = new Set<string>(['/', '/ar', '/en', '/fr']);
const localizedLandingAlternates = Object.fromEntries(
  Object.entries(publicLandingLanguagePaths).map(([language, path]) => [language, absoluteUrl(path)]),
);

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map(route => {
    const isLocalizedLanding = localizedLandingRoutes.has(route);
    return {
      url: absoluteUrl(route),
      changeFrequency: isLocalizedLanding ? 'weekly' : 'monthly',
      priority: route === '/' ? 1 : isLocalizedLanding ? 0.9 : 0.7,
      ...(isLocalizedLanding ? {
        alternates: {
          languages: localizedLandingAlternates,
        },
      } : {}),
    } satisfies MetadataRoute.Sitemap[number];
  });
}
