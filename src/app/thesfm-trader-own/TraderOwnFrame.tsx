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
    <section className="trader-shell-page" aria-label="SFM Smart Analyzer">
      <iframe
        title="SFM Smart Analyzer"
        src={src}
        allow="microphone; clipboard-write"
        className="trader-shell-frame"
      />
      <style>{`
        .trader-shell-page {
          position: relative;
          min-width: 0;
          width: 100%;
          height: calc(
            100dvh - var(--sfm-global-header-height, 64px) -
            var(--workspace-page-padding-block, 24px) -
            var(--workspace-page-padding-block, 24px)
          );
          min-height: 520px;
          border: 1px solid var(--border);
          border-radius: var(--radius-panel, 16px);
          background: var(--background);
          overflow: hidden;
          color-scheme: light dark;
        }
        .trader-shell-frame {
          display: block;
          width: 100%;
          height: 100%;
          min-height: inherit;
          border: 0;
          background: var(--background);
        }
        @media (max-width: 767px) {
          .trader-shell-page {
            height: calc(
              100dvh - var(--sfm-global-header-height, 108px) -
              var(--workspace-page-padding-block, 16px) -
              var(--workspace-page-padding-block, 16px)
            );
            min-height: 480px;
            border-radius: var(--radius-control, 10px);
          }
        }
      `}</style>
    </section>
  );
}

function resolvePublicRoute(appRoute: string) {
  if (!appRoute || appRoute === 'home') return '/thesfm-trader-own';
  return `/thesfm-trader-own/${appRoute}`;
}
