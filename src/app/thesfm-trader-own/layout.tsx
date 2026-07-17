import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTraderAccess } from '@/lib/server/traderAccess';
import { TRADER_PUBLIC_BASE_PATH } from '@/lib/trader/routeBridge';
import TraderAccessGate from './TraderAccessGate';
import TraderShellPage from './TraderShellPage';

export const dynamic = 'force-dynamic';

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

/**
 * The Smart Analyzer stage lives in the segment layout so the terminal
 * iframe persists while the shared shell sidebar navigates between
 * /thesfm-trader-own routes; the pages under this segment only give each
 * terminal view a real URL. Route changes reach the terminal through
 * TraderShellPage's message bridge instead of a frame reload.
 */
export default async function TheSfmTraderOwnLayout({ children }: { children: React.ReactNode }) {
  const access = await getTraderAccess();

  if (access.reason === 'unauthenticated') {
    redirect(`/login?next=${encodeURIComponent(TRADER_PUBLIC_BASE_PATH)}`);
  }

  if (!access.allowed) {
    const reason = access.reason === 'expired' || access.reason === 'database_unavailable' ? access.reason : 'not_approved';
    return <TraderAccessGate reason={reason} />;
  }

  return (
    <>
      <TraderShellPage />
      {children}
    </>
  );
}
