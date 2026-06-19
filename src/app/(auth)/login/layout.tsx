import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'تسجيل الدخول | THE SFM',
  description: 'سجل الدخول إلى THE SFM لإدارة أموالك ومشاريعك وتحليلاتك المالية من لوحة واحدة.',
  alternates: {
    canonical: '/login',
  },
  openGraph: {
    title: 'تسجيل الدخول | THE SFM',
    description: 'دخول آمن إلى منصة THE SFM لإدارة المال الشخصي، المشاريع، الاستثمارات والتقارير.',
    url: 'https://www.the-sfm.com/login',
    siteName: 'THE SFM',
    locale: 'ar_KW',
    type: 'website',
  },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
