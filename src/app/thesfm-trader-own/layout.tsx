import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'THE-SFM Trader',
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
