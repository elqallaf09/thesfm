import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

const privateRoutes = [
  '/api',
  '/ai',
  '/alerts',
  '/dashboard',
  '/command-center',
  '/decisions',
  '/today',
  '/tasks',
  '/notifications',
  '/notif',
  '/reports-center',
  '/reports',
  '/business-hub',
  '/business-operations',
  '/zakat',
  '/charity',
  '/charity-projects',
  '/documents',
  '/setup',
  '/profile',
  '/expenses',
  '/income',
  '/goals',
  '/projects',
  '/invest',
  '/savings',
  '/investment-offers',
  '/market-alerts',
  '/market-analysis',
  '/market-watchlist',
  '/watchlist',
  '/employees',
  '/sales',
  '/education',
  '/services',
  '/settings',
  '/security',
  '/site-map',
  '/zoer_proxy',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/about', '/contact', '/financial-theories', '/ebooks', '/privacy', '/terms'],
      disallow: privateRoutes,
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
