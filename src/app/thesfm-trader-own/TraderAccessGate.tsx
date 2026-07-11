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
  .trader-gate { min-height:100vh;display:grid;place-items:center;padding:24px;color:#f8fafc;background:radial-gradient(circle at 18% 12%,rgba(34,211,238,.14),transparent 34%),radial-gradient(circle at 82% 18%,rgba(20,184,166,.12),transparent 30%),linear-gradient(135deg,#06111F,#0A1728 52%,#06111F) }
  .trader-gate-card { width:min(620px,100%);border:1px solid #24486F;border-radius:var(--r-2xl);padding:34px;background:linear-gradient(180deg,rgba(15,34,56,.96),rgba(10,23,40,.94));box-shadow:0 24px 64px rgba(0,0,0,.34);text-align:start }
  .trader-gate-eyebrow { display:inline-flex;margin-bottom:14px;color:#22D3EE;font-size:12px;font-weight:900;letter-spacing:.08em }
  .trader-gate-card h1 { margin:0 0 12px;font-size:clamp(28px,4vw,44px);line-height:1.15 }
  .trader-gate-card p { margin:0;color:#a9b6c8;font-size:16px;line-height:1.9 }
  .trader-gate-actions { display:flex;flex-wrap:wrap;gap:12px;margin-top:26px }
  .trader-gate-actions a { border:1px solid rgba(45,212,191,.35);border-radius:999px;padding:10px 16px;color:#f8fafc;text-decoration:none;font-weight:900;background:rgba(59,130,246,.16) }
`;
