import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export function generateMetadata() {
  return pageMetadata({
    title: 'كتب إلكترونية | THE SFM',
    description: 'مكتبة تعليمية من THE SFM تضم أدلة عملية في إدارة الأموال، التداول، ودراسة الجدوى.',
    path: '/ebooks',
  });
}

export default function EbooksLayout({ children }: { children: ReactNode }) {
  return children;
}

