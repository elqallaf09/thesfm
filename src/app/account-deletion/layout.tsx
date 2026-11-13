import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export function generateMetadata() {
  return pageMetadata({
    title: 'حذف الحساب والبيانات | THE SFM · SFM TV',
    description: 'طريقة طلب حذف حساب THE SFM وبيانات SFM TV عبر الملف الشخصي أو بريد الدعم، مع توضيح الفرق بين حذف الحساب وإلغاء ربط التلفزيون.',
    path: '/account-deletion',
  });
}

export default function AccountDeletionLayout({ children }: { children: ReactNode }) {
  return children;
}
