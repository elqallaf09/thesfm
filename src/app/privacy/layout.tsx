import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export function generateMetadata() {
  return pageMetadata({
    title: 'سياسة الخصوصية | THE SFM',
    description: 'سياسة خصوصية THE SFM توضّح البيانات التي تُجمع وكيفية تخزينها وحمايتها وحقوق المستخدم في التصدير والحذف.',
    path: '/privacy',
  });
}

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}
