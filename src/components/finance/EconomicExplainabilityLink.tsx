'use client';

import Link from 'next/link';
import { SearchCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

type Priority = {
  code: string;
  severity: 'info' | 'warning' | 'danger';
  explainUrl?: string;
  sources: Array<'finance' | 'trader' | 'business'>;
};

export function EconomicExplainabilityLink() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const [priority, setPriority] = useState<Priority | null>(null);
  const text = lang === 'fr'
    ? { title: 'Pourquoi cette priorité ?', body: 'Voir les sources et leur fraîcheur derrière la priorité économique actuelle.', action: 'Voir les preuves' }
    : lang === 'en'
      ? { title: 'Why this priority?', body: 'Inspect the source groups and freshness behind the current economic priority.', action: 'View evidence' }
      : { title: 'ليش هذي الأولوية؟', body: 'شوف المصادر وحداثتها اللي بُنيت عليها الأولوية الاقتصادية الحالية.', action: 'عرض الأدلة' };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setPriority(null); return; }
    let cancelled = false;
    const locale = lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : 'ar';
    void fetch(`/api/economic-intelligence/daily-brief?lang=${locale}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async response => response.ok ? response.json() : null)
      .then(payload => { if (!cancelled) setPriority(payload?.highestPriority ?? null); })
      .catch(() => { if (!cancelled) setPriority(null); });
    return () => { cancelled = true; };
  }, [authLoading, lang, user]);

  if (authLoading || !user || !priority?.explainUrl) return null;

  return <aside className={`explain-link ${priority.severity}`} dir={dir}>
    <div><span><SearchCheck size={15} />Explainability</span><strong>{text.title}</strong><p>{text.body}</p></div>
    <Link href={priority.explainUrl}>{text.action}</Link>
    <style jsx>{`
      .explain-link{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 auto 16px;max-width:1440px;padding:14px 16px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface);color:var(--foreground)}
      .explain-link>div{display:grid;gap:4px}.explain-link span{display:flex;align-items:center;gap:6px;color:var(--primary);font-size:11px;font-weight:800;text-transform:uppercase}.explain-link strong{font-size:14px}.explain-link p{margin:0;color:var(--foreground-muted);font-size:12px;line-height:1.6}.explain-link :global(a){display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:0 12px;border-radius:var(--radius-control);background:var(--primary);color:var(--primary-foreground);text-decoration:none;font-size:12px;font-weight:700;white-space:nowrap}.explain-link.danger{border-color:color-mix(in srgb,var(--danger) 40%,var(--border))}.explain-link.warning{border-color:color-mix(in srgb,var(--warning) 40%,var(--border))}@media(max-width:720px){.explain-link{align-items:stretch;flex-direction:column}.explain-link :global(a){width:100%}}
    `}</style>
  </aside>;
}
