import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'مركز الأسواق العالمية | THE SFM',
  description: 'تابع الأسواق العالمية والأسهم والفوركس والسلع والعملات الرقمية مع أخبار وبيانات سوق منظمة داخل THE SFM.',
  path: '/global-markets',
});

export default function GlobalMarketsLayout({ children }: { children: ReactNode }) {
  return children;
}
