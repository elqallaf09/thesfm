import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'THE SFM',
    short_name: 'THE SFM',
    description: 'Smart financial management for income, expenses, savings, and investments.',
    start_url: '/',
    display: 'standalone',
    background_color: '#031225',
    theme_color: '#061B33',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
