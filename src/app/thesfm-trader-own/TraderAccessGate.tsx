'use client';

import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

type GateReason = 'not_approved' | 'expired' | 'database_unavailable';

const COPY_KEYS = {
  not_approved: {
    title: 'trader_access_not_approved_title',
    body: 'trader_access_not_approved_body',
  },
  expired: {
    title: 'trader_access_expired_title',
    body: 'trader_access_expired_body',
  },
  database_unavailable: {
    title: 'trader_access_database_unavailable_title',
    body: 'trader_access_database_unavailable_body',
  },
} as const;

export default function TraderAccessGate({ reason }: { reason: GateReason }) {
  const { t, dir } = useLanguage();
  const copy = COPY_KEYS[reason];

  return (
    <main className="trader-gate" dir={dir}>
      <section className="trader-gate-card">
        <span className="trader-gate-eyebrow">{t('trader_access_eyebrow')}</span>
        <h1>{t(copy.title)}</h1>
        <p>{t(copy.body)}</p>
        <div className="trader-gate-actions">
          <Link href="/dashboard">{t('trader_access_back_dashboard')}</Link>
          <Link href="/sfm-admin-control">{t('trader_access_admin_control')}</Link>
        </div>
      </section>
      <style>{gateStyles}</style>
    </main>
  );
}

const gateStyles = `
  .trader-gate {
    min-height:calc(100dvh - var(--global-header-height) - var(--workspace-page-padding-block) - var(--workspace-page-padding-block));
    display:grid;
    place-items:center;
    padding:24px;
    color:var(--foreground);
    background:var(--background);
  }
  .trader-gate-card {
    width:min(620px,100%);
    border:1px solid var(--border);
    border-radius:var(--radius-panel,var(--radius-card));
    padding:clamp(24px,4vw,34px);
    background:var(--surface-elevated);
    box-shadow:var(--shadow-card);
    text-align:start;
  }
  .trader-gate-eyebrow {
    display:inline-flex;
    margin-bottom:14px;
    color:var(--info);
    font-size:12px;
    font-weight:600;
    letter-spacing:.04em;
  }
  .trader-gate-card h1 {
    margin:0 0 12px;
    color:var(--foreground);
    font-size:clamp(28px,4vw,40px);
    line-height:1.2;
    font-weight:700;
  }
  .trader-gate-card p {
    margin:0;
    color:var(--foreground-secondary);
    font-size:16px;
    line-height:1.8;
  }
  .trader-gate-actions { display:flex;flex-wrap:wrap;gap:12px;margin-top:26px }
  .trader-gate-actions a {
    min-height:44px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    border:1px solid var(--border-strong);
    border-radius:var(--radius-control,var(--radius-control));
    padding:8px 16px;
    color:var(--foreground);
    text-decoration:none;
    font-weight:600;
    background:var(--surface);
    transition:background-color var(--duration-fast) ease-out,border-color var(--duration-fast) ease-out,color var(--duration-fast) ease-out;
  }
  .trader-gate-actions a:first-child {
    border-color:var(--primary);
    background:var(--primary);
    color:var(--primary-foreground);
  }
  .trader-gate-actions a:hover { border-color:color-mix(in srgb,var(--primary) 36%,var(--border));background:var(--surface-hover);color:var(--primary-hover) }
  .trader-gate-actions a:first-child:hover { border-color:var(--primary-hover);background:var(--primary-hover);color:var(--primary-foreground) }
  .trader-gate-actions a:focus-visible { outline:2px solid var(--focus-ring);outline-offset:2px }
  @media (max-width:520px) { .trader-gate{padding:16px}.trader-gate-actions a{width:100%} }
`;
