'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, History, RefreshCcw, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { eventFamilyLabel, summarizeResolutionHistory, type ResolutionEventRow } from '@/lib/dashboard/resolutionIntelligence';

const TEXT = {
  ar: {
    title: 'سجل المخاطر والنتائج',
    subtitle: 'تاريخ المخاطر الاقتصادية التي ظهرت، انحلت، أو تكررت. هذا سجل ملاحظات وليس إثباتاً أن SFM سبب النتيجة.',
    active: 'أحداث نشطة', resolved: 'أحداث محلولة', recurring: 'مخاطر متكررة', noRecurring: 'لا توجد مخاطر متكررة مسجلة حالياً.',
    monthly_deficit: 'عجز شهري', low_liquidity: 'سيولة منخفضة', high_debt: 'ضغط دين مرتفع', decision: 'قرار مالي', opportunity: 'فرصة مالية', other: 'حدث اقتصادي',
    occurrences: 'مرات', resolvedOf: 'محلول منها', loading: 'جاري تحميل سجل الذكاء الاقتصادي...',
  },
  en: {
    title: 'Risk & Outcome History',
    subtitle: 'History of economic risks that appeared, resolved, or recurred. This is observational history, not proof that SFM caused an outcome.',
    active: 'Active events', resolved: 'Resolved events', recurring: 'Recurring risks', noRecurring: 'No recurring risks are currently recorded.',
    monthly_deficit: 'Monthly deficit', low_liquidity: 'Low liquidity', high_debt: 'High debt pressure', decision: 'Financial decision', opportunity: 'Financial opportunity', other: 'Economic event',
    occurrences: 'occurrences', resolvedOf: 'resolved', loading: 'Loading economic intelligence history...',
  },
  fr: {
    title: 'Historique des risques et résultats',
    subtitle: 'Historique des risques économiques apparus, résolus ou récurrents. Il s’agit d’un suivi observationnel, pas d’une preuve que SFM a causé le résultat.',
    active: 'Événements actifs', resolved: 'Événements résolus', recurring: 'Risques récurrents', noRecurring: 'Aucun risque récurrent enregistré actuellement.',
    monthly_deficit: 'Déficit mensuel', low_liquidity: 'Liquidité faible', high_debt: 'Pression de dette élevée', decision: 'Décision financière', opportunity: 'Opportunité financière', other: 'Événement économique',
    occurrences: 'occurrences', resolvedOf: 'résolus', loading: 'Chargement de l’historique économique...',
  },
} as const;

export function EconomicResolutionHistory() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : 'ar';
  const text = TEXT[locale];
  const [rows, setRows] = useState<ResolutionEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) { setRows([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const result = await (supabase as any).from('notifications')
        .select('id,event_key,status,created_at,resolved_at,resolution_code')
        .eq('user_id', user.id)
        .eq('source_module', 'economic_intelligence')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!cancelled) {
        setRows(result.error ? [] : (result.data ?? []));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user?.id]);

  const summary = useMemo(() => summarizeResolutionHistory(rows), [rows]);
  if (authLoading || !user) return null;

  return (
    <aside className="sfm-resolution-history" dir={dir} aria-label={text.title}>
      <div className="sfm-resolution-head">
        <div><span><History size={15} />Resolution Intelligence</span><h2>{text.title}</h2><p>{text.subtitle}</p></div>
      </div>
      {loading ? <div className="sfm-resolution-loading"><RefreshCcw size={16} />{text.loading}</div> : <>
        <div className="sfm-resolution-metrics">
          <Metric icon={<ShieldAlert size={17} />} label={text.active} value={summary.activeCount} />
          <Metric icon={<CheckCircle2 size={17} />} label={text.resolved} value={summary.resolvedCount} />
          <Metric icon={<RefreshCcw size={17} />} label={text.recurring} value={summary.recurringFamilies.length} />
        </div>
        <section>
          <h3>{text.recurring}</h3>
          {summary.recurringFamilies.length === 0 ? <p className="empty">{text.noRecurring}</p> : <div className="recurring-list">{summary.recurringFamilies.slice(0, 5).map(item => {
            const labelKey = eventFamilyLabel(item.family) as keyof typeof text;
            return <article key={item.family}><strong>{String(text[labelKey] ?? text.other)}</strong><span>{item.occurrences} {text.occurrences}</span><span>{item.resolved} {text.resolvedOf}</span></article>;
          })}</div>}
        </section>
      </>}
      <style jsx>{`
        .sfm-resolution-history{display:grid;gap:14px;margin:0 auto 18px;max-width:1440px;padding:16px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card);color:var(--foreground)}
        .sfm-resolution-head span{display:flex;align-items:center;gap:6px;color:var(--primary);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.sfm-resolution-head h2{margin:5px 0 4px;font-size:20px}.sfm-resolution-head p{margin:0;color:var(--foreground-muted);line-height:1.6}
        .sfm-resolution-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.metric{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.metric strong{font-family:var(--font-data);font-size:22px}.metric span{display:block;color:var(--foreground-muted);font-size:12px}
        section{padding-top:10px;border-top:1px solid var(--border)}section h3{margin:0 0 8px;font-size:14px}.recurring-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.recurring-list article{display:grid;gap:3px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.recurring-list span,.empty,.sfm-resolution-loading{color:var(--foreground-muted);font-size:12px}.sfm-resolution-loading{display:flex;align-items:center;gap:7px;padding:12px}
        @media(max-width:720px){.sfm-resolution-metrics{grid-template-columns:1fr}.recurring-list{grid-template-columns:1fr}}
      `}</style>
    </aside>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <article className="metric">{icon}<div><strong>{value}</strong><span>{label}</span></div></article>;
}
