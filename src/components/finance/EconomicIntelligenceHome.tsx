'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, BrainCircuit, Lightbulb, Scale, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/lib/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { loadUserDataTables } from '@/lib/data/financeData';
import { summarizeGoal } from '@/lib/dashboard/executiveOverview';
import { buildEconomicHomeSummary } from '@/lib/dashboard/economicHomeSummary';
import {
  ECONOMIC_INTELLIGENCE_TABLES,
  buildFinancialTwinSnapshot,
  financialTwinSourceFromRecords,
} from '@/domain/economic-intelligence';

type Locale = 'ar' | 'en' | 'fr';

const TEXT = {
  ar: {
    eyebrow: 'SFM Economic Intelligence', title: 'صورتك الاقتصادية اليوم',
    strong: 'قوي', stable: 'مستقر', watch: 'يحتاج متابعة', critical: 'يحتاج تدخل',
    risk: 'أهم خطر الآن', opportunity: 'أفضل فرصة الآن', decision: 'قرار يحتاج انتباهك',
    noRisk: 'لا يظهر خطر مالي رئيسي من البيانات الحالية.', noOpportunity: 'لا توجد فرصة واضحة كفاية الآن.', noDecision: 'لا يوجد قرار معلّق يحتاج تدخلاً حالياً.',
    monthly_deficit: 'التزاماتك الشهرية تتجاوز دخلك الحالي.', low_liquidity: 'احتياطي السيولة أقل من المستوى المريح.', high_debt: 'خدمة الدين تستهلك نسبة مرتفعة من الدخل.', goal_off_track: 'يوجد هدف مالي متأخر عن مساره.', incomplete_data: 'بعض البيانات ناقصة، لذلك الثقة أقل.',
    build_liquidity: 'استخدم جزءاً من الفائض لبناء احتياطي سيولة أقوى.', accelerate_goal: 'يمكن توجيه جزء من الفائض لتسريع هدف متأخر.', reduce_debt: 'يوجد مجال لاستخدام الفائض لتقليل ضغط الدين.', invest_surplus: 'لديك فائض وسيولة مريحة؛ راجع فرصة استثمار مناسبة لمخاطرتك.', improve_data: 'إكمال البيانات سيحسن دقة القرارات والتوقعات.',
    openDecisions: 'فتح مركز القرارات', simulate: 'محاكاة قرار', loading: 'جاري بناء صورتك الاقتصادية...',
  },
  en: {
    eyebrow: 'SFM Economic Intelligence', title: 'Your economic picture today',
    strong: 'Strong', stable: 'Stable', watch: 'Needs attention', critical: 'Action needed',
    risk: 'Top risk now', opportunity: 'Best opportunity now', decision: 'Decision needing attention',
    noRisk: 'No primary financial risk is visible in the current data.', noOpportunity: 'No sufficiently clear opportunity is visible yet.', noDecision: 'No unresolved decision currently needs attention.',
    monthly_deficit: 'Monthly obligations exceed current income.', low_liquidity: 'Liquidity reserves are below a comfortable level.', high_debt: 'Debt service consumes a high share of income.', goal_off_track: 'At least one financial goal is behind trajectory.', incomplete_data: 'Some data is missing, so confidence is lower.',
    build_liquidity: 'Use part of the surplus to build a stronger liquidity reserve.', accelerate_goal: 'Part of the surplus can accelerate a goal that is behind.', reduce_debt: 'There is room to use surplus to reduce debt pressure.', invest_surplus: 'You have surplus and comfortable liquidity; review an investment suited to your risk.', improve_data: 'Completing your data will improve decision and forecast accuracy.',
    openDecisions: 'Open decisions center', simulate: 'Simulate a decision', loading: 'Building your economic picture...',
  },
  fr: {
    eyebrow: 'SFM Economic Intelligence', title: 'Votre situation économique aujourd’hui',
    strong: 'Solide', stable: 'Stable', watch: 'À surveiller', critical: 'Action requise',
    risk: 'Risque principal', opportunity: 'Meilleure opportunité', decision: 'Décision à surveiller',
    noRisk: 'Aucun risque financier principal visible dans les données actuelles.', noOpportunity: 'Aucune opportunité suffisamment claire pour le moment.', noDecision: 'Aucune décision en attente ne nécessite une attention immédiate.',
    monthly_deficit: 'Les engagements mensuels dépassent le revenu actuel.', low_liquidity: 'Les réserves de liquidité sont sous un niveau confortable.', high_debt: 'Le service de la dette représente une part élevée du revenu.', goal_off_track: 'Au moins un objectif financier est en retard.', incomplete_data: 'Certaines données manquent, la confiance est donc réduite.',
    build_liquidity: 'Utilisez une partie du surplus pour renforcer la réserve de liquidité.', accelerate_goal: 'Une partie du surplus peut accélérer un objectif en retard.', reduce_debt: 'Le surplus peut servir à réduire la pression de la dette.', invest_surplus: 'Vous avez un surplus et une liquidité confortable ; examinez un investissement adapté à votre risque.', improve_data: 'Compléter les données améliorera la précision des décisions et prévisions.',
    openDecisions: 'Ouvrir le centre de décisions', simulate: 'Simuler une décision', loading: 'Construction de votre situation économique...',
  },
} as const;

export function EconomicIntelligenceHome() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const { currency } = useCurrency();
  const locale = (lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : 'ar') as Locale;
  const text = TEXT[locale];
  const [state, setState] = useState<{ loading: boolean; snapshot: any; goals: any[]; decisions: any[] }>({ loading: true, snapshot: null, goals: [], decisions: [] });

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) { setState({ loading: false, snapshot: null, goals: [], decisions: [] }); return; }
    let cancelled = false;
    void (async () => {
      const [finance, saved] = await Promise.all([
        loadUserDataTables(supabase as any, user.id, ECONOMIC_INTELLIGENCE_TABLES),
        (supabase as any).from('user_decisions').select('id,decision_title,status,risk_score,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(12),
      ]);
      if (cancelled) return;
      const records = finance.records as Record<string, any[]>;
      const snapshot = buildFinancialTwinSnapshot(financialTwinSourceFromRecords(records), currency || 'KWD');
      const goals = (records.goals ?? []).map((row) => summarizeGoal(row, currency || 'KWD')).filter((goal) => goal.title);
      const decisions = (saved.data ?? []).map((row: any) => ({ id: row.id, title: row.decision_title || '', status: row.status, riskScore: Number(row.risk_score ?? 0), updatedAt: row.updated_at }));
      setState({ loading: false, snapshot, goals, decisions });
    })().catch(() => { if (!cancelled) setState({ loading: false, snapshot: null, goals: [], decisions: [] }); });
    return () => { cancelled = true; };
  }, [authLoading, currency, user?.id]);

  const summary = useMemo(() => state.snapshot ? buildEconomicHomeSummary(state.snapshot, state.goals, state.decisions) : null, [state.decisions, state.goals, state.snapshot]);
  if (authLoading || state.loading) return <section className="sfm-eih" dir={dir}><div className="sfm-eih-loading"><BrainCircuit size={18} />{text.loading}</div></section>;
  if (!summary) return null;

  const riskText = summary.riskCode === 'none' ? text.noRisk : text[summary.riskCode];
  const opportunityText = summary.opportunityCode === 'none' ? text.noOpportunity : text[summary.opportunityCode];

  return (
    <section className={`sfm-eih is-${summary.health}`} dir={dir} aria-label={text.title}>
      <div className="sfm-eih-head">
        <div><span><BrainCircuit size={16} />{text.eyebrow}</span><h1>{text.title}</h1></div>
        <strong>{text[summary.health]}</strong>
      </div>
      <div className="sfm-eih-grid">
        <article><div className="sfm-eih-label"><AlertTriangle size={16} />{text.risk}</div><p>{riskText}</p></article>
        <article><div className="sfm-eih-label"><Lightbulb size={16} />{text.opportunity}</div><p>{opportunityText}</p></article>
        <article><div className="sfm-eih-label"><Scale size={16} />{text.decision}</div><p>{summary.attentionDecision?.title || text.noDecision}</p></article>
      </div>
      <div className="sfm-eih-actions">
        <Link href="/decisions"><ShieldCheck size={15} />{text.openDecisions}</Link>
        <Link href="/decisions/simulator"><ArrowUpRight size={15} />{text.simulate}</Link>
      </div>
      <style jsx>{`
        .sfm-eih{display:grid;gap:14px;margin:0 auto 14px;max-width:1440px;padding:18px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card);color:var(--foreground)}
        .sfm-eih-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.sfm-eih-head span{display:flex;align-items:center;gap:7px;color:var(--primary);font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.sfm-eih-head h1{margin:5px 0 0;font-size:22px}.sfm-eih-head>strong{padding:7px 10px;border-radius:999px;background:var(--surface-muted);font-size:12px}.is-critical .sfm-eih-head>strong,.is-watch .sfm-eih-head>strong{background:var(--warning-soft)}.is-strong .sfm-eih-head>strong{background:var(--success-soft);color:var(--success)}
        .sfm-eih-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.sfm-eih-grid article{min-width:0;padding:13px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.sfm-eih-label{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:800}.sfm-eih-grid p{margin:8px 0 0;color:var(--foreground-muted);line-height:1.65;font-size:13px}.sfm-eih-actions{display:flex;gap:8px;flex-wrap:wrap}.sfm-eih-actions :global(a){display:inline-flex;align-items:center;gap:6px;padding:9px 12px;border:1px solid var(--border);border-radius:var(--radius-control);text-decoration:none;color:var(--foreground);font-weight:700;font-size:12px}.sfm-eih-actions :global(a:last-child){background:var(--primary);color:var(--primary-foreground);border-color:var(--primary)}.sfm-eih-loading{display:flex;align-items:center;justify-content:center;gap:8px;min-height:70px;color:var(--foreground-muted)}
        @media(max-width:820px){.sfm-eih-grid{grid-template-columns:1fr}.sfm-eih-head{align-items:center}.sfm-eih-head h1{font-size:19px}}
      `}</style>
    </section>
  );
}
