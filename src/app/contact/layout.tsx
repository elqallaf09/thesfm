import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export function generateMetadata() {
  return pageMetadata({
    title: 'تواصل معنا | THE SFM',
    description: 'تواصل مع فريق THE SFM لأسئلة الدعم العامة حول الحساب، الخصوصية، واستخدام المنصة المالية الذكية.',
    path: '/contact',
  });
}

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children;
}
