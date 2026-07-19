import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'وكيل تحليل الأسواق | THE SFM',
  description: 'تحليل آلي للأسهم والفوركس والمعادن والعملات الرقمية للقراءة فقط وليس كتوصية مالية.',
  alternates: {
    canonical: '/ai-analyst/agent',
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: 'وكيل تحليل الأسواق | THE SFM',
    description: 'قراءة آلية للأسواق مع اتجاه السوق، مستويات المخاطرة، الدعوم والمقاومات والتنبيه بأنها ليست توصية مالية.',
    url: 'https://www.the-sfm.com/ai-analyst/agent',
    siteName: 'THE SFM',
    locale: 'ar_KW',
    type: 'website',
  },
};

export default function MarketAgentLayout({ children }: { children: ReactNode }) {
  return children;
}
