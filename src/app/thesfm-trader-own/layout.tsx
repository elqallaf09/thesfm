import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SFM Smart Analyzer',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function TheSfmTraderOwnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
