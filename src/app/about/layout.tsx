import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export function generateMetadata() {
  return pageMetadata({
    title: 'من نحن | THE SFM',
    description: 'تعرف على THE SFM، منصة مالية ذكية تنظم المال الشخصي والمشاريع والزكاة والتقارير اعتماداً على بياناتك الحقيقية.',
    path: '/about',
  });
}

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children;
}
