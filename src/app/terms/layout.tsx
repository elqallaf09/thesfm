import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export function generateMetadata() {
  return pageMetadata({
    title: 'الشروط والأحكام | THE SFM',
    description: 'شروط استخدام THE SFM وإخلاء المسؤولية للمنصة المالية الذكية المخصصة للتنظيم والتحليل وليست بديلاً عن الاستشارة المتخصصة.',
    path: '/terms',
  });
}

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}
