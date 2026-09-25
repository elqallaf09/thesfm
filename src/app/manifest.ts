import type { MetadataRoute } from 'next';
import { STATIC_LIGHT_VISUAL_TOKENS } from '@/styles/static-tokens';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'THE SFM',
    short_name: 'THE SFM',
    description: 'Smart financial management for income, expenses, savings, and investments.',
    id: '/sfm-app',
    start_url: '/today',
    scope: '/',
    shortcuts: [
      { name: 'SFM Finance', url: '/today' },
      { name: 'SFM Trader', url: '/ai-analyst/overview' },
      { name: 'SFM Business', url: '/business-hub' },
    ],
    display: 'standalone',
    background_color: STATIC_LIGHT_VISUAL_TOKENS.background,
    theme_color: STATIC_LIGHT_VISUAL_TOKENS.foreground,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
