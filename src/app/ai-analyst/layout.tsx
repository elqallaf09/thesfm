import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'إس إف إم المحلل الذكي | THE SFM',
  description: 'مركز ذكاء مالي موحد يعرض فقط تحليلات منظمة مبنية على الأدلة والبيانات المتاحة فعلياً.',
  path: '/ai-analyst/overview',
});

export default function AiAnalystLayout({ children }: { children: ReactNode }) {
  return children;
}
