'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, CircleDot, Clock3, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/formatters';
import { loginHrefForCurrentLocation } from '@/lib/auth/redirects';

type Lang = 'ar' | 'en' | 'fr';
type DecisionRow = { id: string; decision_title?: string | null; status?: string | null; risk_score?: number | null; created_at?: string | null; updated_at?: string | null; analysis?: any };
type EventRow = { id: string; event_key?: string | null; status?: string | null; created_at?: string | null; opened_at?: string | null; actioned_at?: string | null; resolved_at?: string | null; resolution_code?: string | null; metadata?: any };

const TEXT = {
  ar: { title: 'مسار القرار', subtitle: 'سجل زمني يوضح التحليل والتنبيه والتفاعل والحل المسجل. هذا السجل لا يثبت أن SFM تسبب بالنتيجة.', analyzed: 'تم تحليل القرار', alert: 'ظهر تنبيه', opened: 'تم فتح التنبيه', actioned: 'تم اتخاذ إجراء', resolved: 'تم تسجيل الحل', unresolved: 'غير محلول', markResolved: 'تم حل المشكلة', resolving: 'جاري الحفظ...', back: 'العودة لمركز القرارات', noDecision: 'تعذر العثور على القرار.', noEvents: 'لا توجد أحداث ذكاء اقتصادي مرتبطة بهذا القرار بعد.', risk: 'درجة المخاطرة', status: 'الحالة', causal: 'النتيجة ملاحظة فقط وليست إثبات علاقة سببية.' },
  en: { title: 'Decision Timeline', subtitle: 'A chronological record of analysis, alerts, interaction, and recorded resolution. This history does not prove SFM caused an outcome.', analyzed: 'Decision analyzed', alert: 'Alert created', opened: 'Alert opened', actioned: 'Action recorded', resolved: 'Resolution recorded', unresolved: 'Unresolved', markResolved: 'Mark as resolved', resolving: 'Saving...', back: 'Back to Decisions Center', noDecision: 'Decision could not be found.', noEvents: 'No Economic Intelligence events are linked to this decision yet.', risk: 'Risk score', status: 'Status', causal: 'Outcome history is observational and does not imply causality.' },
  fr: { title: 'Chronologie de la décision', subtitle: 'Historique chronologique de l’analyse, des alertes, des interactions et de la résolution enregistrée. Il ne prouve pas que SFM a causé le résultat.', analyzed: 'Décision analysée', alert: 'Alerte créée', opened: 'Alerte ouverte', actioned: 'Action enregistrée', resolved: 'Résolution enregistrée', unresolved: 'Non résolue', markResolved: 'Marquer comme résolue', resolving: 'Enregistrement...', back: 'Retour au centre de décisions', noDecision: 'Décision introuvable.', noEvents: 'Aucun événement Economic Intelligence lié à cette décision.', risk: 'Score de risque', status: 'Statut', causal: 'Cet historique est observationnel et n’implique aucune causalité.' },
} as const;

function asDate(value?: string | null) { return value ? new Date(value).getTime() || 0 : 0; }

export default function DecisionTimelinePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = (lang === 'en' || lang === 'fr' ? lang : 'ar') as Lang;
  const text = TEXT[locale];
  const decisionId = params?.get('decision') ?? '';
  const [decision, setDecision] = useState<DecisionRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState('');

  useEffect(() => { if (!authLoading && !user) router.replace(loginHrefForCurrentLocation(`/decisions/timeline?decision=${encodeURIComponent(decisionId)}`)); }, [authLoading, decisionId, router, user]);

  const load = useCallback(async () => {
    if (!user?.id || !decisionId) { setLoading(false); return; }
    setLoading(true);
    const db = supabase as any;
    const [decisionResult, eventResult] = await Promise.all([
      db.from('user_decisions').select('id,decision_title,status,risk_score,created_at,updated_at,analysis').eq('id', decisionId).eq('user_id', user.id).maybeSingle(),
      db.from('notifications').select('id,event_key,status,created_at,opened_at,actioned_at,resolved_at,resolution_code,metadata').eq('user_id', user.id).eq('source_module', 'economic_intelligence').eq('source_id', decisionId).order('created_at', { ascending: true }),
    ]);
    setDecision(decisionResult.data ?? null);
    setEvents(eventResult.error ? [] : (eventResult.data ?? []));
    setLoading(false);
    const unopened = (eventResult.data ?? []).filter((row: EventRow) => !row.opened_at);
    await Promise.all(unopened.map((row: EventRow) => fetch('/api/economic-intelligence/event-outcome', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ notificationId: row.id, action: 'opened' }) }).catch(() => null)));
  }, [decisionId, user?.id]);

  useEffect(() => { void load(); }, [load]);

  async function resolveEvent(id: string) {
    setResolving(id);
    try {
      const response = await fetch('/api/economic-intelligence/event-outcome', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ notificationId: id, action: 'resolved', resolutionCode: 'user_confirmed_resolved' }) });
      if (response.ok) await load();
    } finally { setResolving(''); }
  }

  const timeline = useMemo(() => {
    const items: Array<{ key: string; label: string; date?: string | null; tone: 'base' | 'active' | 'done' }> = [];
    if (decision) items.push({ key: 'analysis', label: text.analyzed, date: decision.created_at ?? decision.updated_at, tone: 'base' });
    for (const event of events) {
      items.push({ key: `${event.id}:created`, label: text.alert, date: event.created_at, tone: 'active' });
      if (event.opened_at) items.push({ key: `${event.id}:opened`, label: text.opened, date: event.opened_at, tone: 'base' });
      if (event.actioned_at) items.push({ key: `${event.id}:actioned`, label: text.actioned, date: event.actioned_at, tone: 'base' });
      if (event.resolved_at) items.push({ key: `${event.id}:resolved`, label: text.resolved, date: event.resolved_at, tone: 'done' });
    }
    return items.sort((a, b) => asDate(a.date) - asDate(b.date));
  }, [decision, events, text]);

  if (authLoading || loading) return <DashboardPageShell ariaLabel={text.title}><div className="timeline-loading"><Loader2 className="spin" size={22} />{text.resolving}</div><style>{styles}</style></DashboardPageShell>;

  return <DashboardPageShell ariaLabel={text.title} contentClassName="timeline-page">
    <section className="timeline-hero" dir={dir}>
      <div><span>Economic Intelligence</span><h1>{text.title}</h1><p>{text.subtitle}</p></div>
      <button type="button" onClick={() => router.push('/decisions')}>{text.back}<ExternalLink size={15} /></button>
    </section>
    {!decision ? <section className="timeline-card">{text.noDecision}</section> : <>
      <section className="timeline-card decision-summary" dir={dir}><div><strong>{decision.decision_title || '—'}</strong><span>{text.status}: {decision.status || '—'}</span></div><div><span>{text.risk}</span><strong>{Number.isFinite(Number(decision.risk_score)) ? `${Math.round(Number(decision.risk_score))}%` : '—'}</strong></div></section>
      <section className="timeline-card" dir={dir}>
        <div className="timeline-list">{timeline.map(item => <article key={item.key} className={item.tone}><span className="dot">{item.tone === 'done' ? <CheckCircle2 size={15} /> : item.tone === 'active' ? <CircleDot size={15} /> : <Clock3 size={15} />}</span><div><strong>{item.label}</strong>{item.date ? <small>{formatDate(item.date, locale)}</small> : null}</div></article>)}</div>
        {events.length === 0 ? <p className="empty">{text.noEvents}</p> : null}
      </section>
      <section className="timeline-card" dir={dir}>
        <div className="resolution-list">{events.filter(event => !event.resolved_at).map(event => <article key={event.id}><div><ShieldCheck size={18} /><span>{event.event_key || text.unresolved}</span></div><button type="button" disabled={resolving === event.id} onClick={() => void resolveEvent(event.id)}>{resolving === event.id ? text.resolving : text.markResolved}</button></article>)}</div>
        <p className="causal-note">{text.causal}</p>
      </section>
    </>}
    <style>{styles}</style>
  </DashboardPageShell>;
}

const styles = `
.timeline-page{display:grid;gap:16px}.timeline-hero,.timeline-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-panel);padding:18px;box-shadow:var(--shadow-card)}.timeline-hero{display:flex;justify-content:space-between;align-items:end;gap:16px}.timeline-hero span{color:var(--primary);font-size:12px;font-weight:700;text-transform:uppercase}.timeline-hero h1{margin:6px 0;font-size:28px}.timeline-hero p,.causal-note,.empty{margin:0;color:var(--foreground-muted);line-height:1.7}.timeline-hero button,.resolution-list button{min-height:42px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground);padding:0 12px;display:inline-flex;align-items:center;gap:7px;cursor:pointer}.decision-summary{display:flex;justify-content:space-between;gap:18px;align-items:center}.decision-summary div{display:grid;gap:5px}.decision-summary>div:last-child{text-align:center}.decision-summary>div:last-child strong{font:600 26px var(--font-data);color:var(--primary)}.decision-summary span{color:var(--foreground-muted);font-size:12px}.timeline-list{display:grid;gap:10px}.timeline-list article{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start}.timeline-list .dot{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--surface-muted);color:var(--foreground-muted)}.timeline-list article.active .dot{background:var(--warning-soft);color:var(--warning)}.timeline-list article.done .dot{background:var(--success-soft);color:var(--success)}.timeline-list article div{display:grid;gap:3px;padding-top:3px}.timeline-list small{color:var(--foreground-muted)}.resolution-list{display:grid;gap:8px}.resolution-list article{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.resolution-list article>div{display:flex;align-items:center;gap:8px;min-width:0}.resolution-list span{overflow-wrap:anywhere}.causal-note{margin-top:12px;font-size:12px}.timeline-loading{min-height:220px;display:grid;place-items:center;color:var(--foreground-muted)}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:720px){.timeline-hero,.decision-summary,.resolution-list article{align-items:stretch;flex-direction:column}.timeline-hero{display:grid}.timeline-hero button,.resolution-list button{width:100%;justify-content:center}}
`;
