import { redirect } from 'next/navigation';
import { getTraderAccess } from '@/lib/server/traderAccess';
import TraderAccessGate from './TraderAccessGate';

type TraderOwnFrameProps = {
  appRoute?: string;
};

export default async function TraderOwnFrame({ appRoute = 'home' }: TraderOwnFrameProps) {
  const access = await getTraderAccess();

  if (access.reason === 'unauthenticated') {
    redirect(`/login?next=${encodeURIComponent(resolvePublicRoute(appRoute))}`);
  }

  if (!access.allowed) {
    const reason = access.reason === 'expired' || access.reason === 'database_unavailable' ? access.reason : 'not_approved';
    return <TraderAccessGate reason={reason} />;
  }

  const src = `/thesfm-trader-own/app/index.html?route=${encodeURIComponent(appRoute)}`;

  return (
    <main className="trader-shell-page" dir="ltr">
      <iframe
        title="SFM Smart Analyzer"
        src={src}
        allow="microphone; clipboard-write"
        className="trader-shell-frame"
      />
      <style>{`
        html,
        body {
          margin: 0;
          background: #06111F;
          overflow: hidden;
        }
        .trader-shell-page {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          min-height: 100vh;
          width: 100%;
          background: #06111F;
          overflow: hidden;
        }
        .trader-shell-frame {
          display: block;
          width: 100%;
          min-height: 100vh;
          height: 100dvh;
          border: 0;
          background: #06111F;
        }
      `}</style>
    </main>
  );
}

function resolvePublicRoute(appRoute: string) {
  if (!appRoute || appRoute === 'home') return '/thesfm-trader-own';
  return `/thesfm-trader-own/${appRoute}`;
}
