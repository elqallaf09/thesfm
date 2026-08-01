import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export function generateMetadata() {
  return pageMetadata({
    title: 'النظريات المالية | THE SFM',
    description: 'مكتبة تعليمية من THE SFM تشرح قواعد إدارة المال والادخار والاستثمار والديون والحرية المالية مع أدوات عملية.',
    path: '/financial-theories',
  });
}

export default function FinancialTheoriesLayout({ children }: { children: ReactNode }) {
  return children;
}
