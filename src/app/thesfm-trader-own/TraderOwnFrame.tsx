import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTraderAccess } from '@/lib/server/traderAccess';

const accessCopy = {
  not_approved: {
    title: 'Private THE-SFM Trader',
    body: 'This page is currently available to admins only. Later, approved subscribers can be granted access from the admin control panel.',
  },
  expired: {
    title: 'Trader access expired',
    body: 'Your trader subscription or approval has expired. Please contact the admin to renew access.',
  },
  database_unavailable: {
    title: 'Access check unavailable',
    body: 'The database configuration is not complete yet. Configure the Supabase server keys before enabling subscriber approvals.',
  },
};

type TraderOwnFrameProps = {
  appRoute?: string;
};

export default async function TraderOwnFrame({ appRoute = 'home' }: TraderOwnFrameProps) {
  const access = await getTraderAccess();

  if (access.reason === 'unauthenticated') {
    redirect(`/login?next=${encodeURIComponent(resolvePublicRoute(appRoute))}`);
  }

  if (!access.allowed) {
    const copy = accessCopy[access.reason ?? 'not_approved'];
    return (
      <main className="trader-gate" dir="ltr">
        <section className="trader-gate-card">
          <span className="trader-gate-eyebrow">PRIVATE TRADER ACCESS</span>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
          <div className="trader-gate-actions">
            <Link href="/dashboard">Back to dashboard</Link>
            <Link href="/sfm-admin-control">Admin control</Link>
          </div>
        </section>
        <GateStyles />
      </main>
    );
  }

  const src = `/thesfm-trader-own/app/index.html?route=${encodeURIComponent(appRoute)}`;

  return (
    <main className="trader-shell-page" dir="ltr">
      <iframe
        title="THE-SFM Trader"
        src={src}
        allow="microphone; clipboard-write"
        className="trader-shell-frame"
      />
      <style>{`
        html,
        body {
          margin: 0;
          background: #020617;
          overflow: hidden;
        }
        .trader-shell-page {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          min-height: 100vh;
          width: 100%;
          background: #020617;
          overflow: hidden;
        }
        .trader-shell-frame {
          display: block;
          width: 100%;
          min-height: 100vh;
          height: 100dvh;
          border: 0;
          background: #020617;
        }
      `}</style>
    </main>
  );
}

function resolvePublicRoute(appRoute: string) {
  if (!appRoute || appRoute === 'home') return '/thesfm-trader-own';
  return `/thesfm-trader-own/${appRoute}`;
}

function GateStyles() {
  return (
    <style>{`
      .trader-gate {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        color: #f8fafc;
        background:
          radial-gradient(circle at 18% 12%, rgba(16, 185, 129, .20), transparent 34%),
          radial-gradient(circle at 82% 18%, rgba(212, 175, 55, .18), transparent 30%),
          linear-gradient(135deg, #020617, #071414 52%, #050816);
      }
      .trader-gate-card {
        width: min(620px, 100%);
        border: 1px solid rgba(212, 175, 55, .30);
        border-radius: 28px;
        padding: 34px;
        background: linear-gradient(180deg, rgba(8, 17, 28, .92), rgba(4, 12, 20, .86));
        box-shadow: 0 30px 90px rgba(0, 0, 0, .42);
      }
      .trader-gate-eyebrow {
        display: inline-flex;
        margin-bottom: 14px;
        color: #d4af37;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .08em;
      }
      .trader-gate-card h1 {
        margin: 0 0 12px;
        font-size: clamp(28px, 4vw, 44px);
        line-height: 1.15;
      }
      .trader-gate-card p {
        margin: 0;
        color: #a9b6c8;
        font-size: 16px;
        line-height: 1.9;
      }
      .trader-gate-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 26px;
      }
      .trader-gate-actions a {
        border: 1px solid rgba(45, 212, 191, .35);
        border-radius: 999px;
        padding: 10px 16px;
        color: #f8fafc;
        text-decoration: none;
        font-weight: 900;
        background: rgba(45, 212, 191, .10);
      }
    `}</style>
  );
}
