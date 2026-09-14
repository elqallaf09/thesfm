'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrainCircuit, CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

type Lang = 'ar' | 'en' | 'fr';
type Issue = { code: string; workspace: 'finance' | 'trader' | 'business'; actionUrl: string; weight: number };
type Readiness = {
  overallScore: number;
  level: 'low' | 'medium' | 'high';
  finance: { score: number; ready: boolean; issues: Issue[] };
  trader: { score: number; ready: boolean; issues: Issue[] };
  business: { score: number; ready: boolean; issues: Issue[] };
  nextActions: Issue[];
};

const TEXT = {
  ar: {
    title: 'جاهزية الذكاء الاقتصادي', subtitle: 'كلما اكتملت بيانات Finance وTrader وBusiness ارتفعت دقة التحليل.',
    overall: 'الجاهزية العامة', finance: 'Finance', trader: 'Trader', business: 'Business', next: 'ما الذي ينقصك؟', loading: 'جاري قياس الجاهزية...', unavailable: 'تعذر قياس الجاهزية حالياً.',
    high: 'جاهزية مرتفعة', medium: 'جاهزية متوسطة', low: 'جاهزية منخفضة', open: 'إكمال البيانات',
    'trader:watchlist_missing': 'أضف أصولاً إلى قائمة المتابعة.', 'trader:alerts_missing': 'أضف تنبيهات سوقية حتى يفهم SFM ما تراقبه.', 'trader:portfolio_missing': 'أضف محفظتك الاستثمارية.',
    'business:projects_missing': 'أضف مشروعاً واحداً على الأقل لتفعيل ذكاء الأعمال.', 'business:funding_readiness_missing': 'أكمل بيانات جاهزية التمويل للمشاريع النشطة.',
  },
  en: {
    title: 'Economic Intelligence Readiness', subtitle: 'Better Finance, Trader, and Business evidence increases intelligence confidence.',
    overall: 'Overall readiness', finance: 'Finance', trader: 'Trader', business: 'Business', next: 'What is missing?', loading: 'Measuring readiness...', unavailable: 'Readiness is currently unavailable.',
    high: 'High readiness', medium: 'Medium readiness', low: 'Low readiness', open: 'Complete data',
    'trader:watchlist_missing': 'Add assets to your market watchlist.', 'trader:alerts_missing': 'Add market alerts so SFM knows what you actively monitor.', 'trader:portfolio_missing': 'Add your investment portfolio.',
    'business:projects_missing': 'Add at least one project to activate Business intelligence.', 'business:funding_readiness_missing': 'Complete funding-readiness data for active projects.',
  },
  fr: {
    title: 'Préparation de l’intelligence économique', subtitle: 'Des données Finance, Trader et Business plus complètes améliorent la confiance des analyses.',
    overall: 'Préparation globale', finance: 'Finance', trader: 'Trader', business: 'Business', next: 'Que manque-t-il ?', loading: 'Mesure de la préparation...', unavailable: 'La préparation est indisponible actuellement.',
    high: 'Préparation élevée', medium: 'Préparation moyenne', low: 'Préparation faible', open: 'Compléter les données',
    'trader:watchlist_missing': 'Ajoutez des actifs à votre liste de suivi.', 'trader:alerts_missing': 'Ajoutez des alertes marché.', 'trader:portfolio_missing': 'Ajoutez votre portefeuille d’investissement.',
    'business:projects_missing': 'Ajoutez au moins un projet pour activer l’intelligence Business.', 'business:funding_readiness_missing': 'Complétez les données de préparation au financement.',
  },
} as const;

function issueText(code: string, text: any) {
  if (text[code]) return text[code];
  const raw = code.replace(/^finance:/, '').replaceAll('_', ' ');
  return raw ? `Finance: ${raw}` : code;
}

export function EconomicIntelligenceReadiness() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = (lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : 'ar') as Lang;
  const text = TEXT[locale];
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError(false);
    void fetch('/api/economic-intelligence/readiness', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async response => response.ok ? response.json() : Promise.reject(new Error('readiness_failed')))
      .then(payload => { if (!cancelled) { setReadiness(payload.readiness ?? null); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [authLoading, user]);

  if (authLoading || !user) return null;
  if (loading) return <section className="ei-readiness loading" dir={dir}><Loader2 className="spin" size={17} />{text.loading}<style jsx>{styles}</style></section>;
  if (error || !readiness) return <section className="ei-readiness" dir={dir}>{text.unavailable}<style jsx>{styles}</style></section>;

  return <section className={`ei-readiness level-${readiness.level}`} dir={dir} aria-label={text.title}>
    <div className="head"><div><span><BrainCircuit size={15} />Readiness</span><h2>{text.title}</h2><p>{text.subtitle}</p></div><div className="overall"><strong>{readiness.overallScore}%</strong><small>{text[readiness.level]}</small></div></div>
    <div className="scores">
      {(['finance','trader','business'] as const).map(key => <article key={key}><div><span>{text[key]}</span>{readiness[key].ready ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}</div><strong>{readiness[key].score}%</strong><div className="bar"><i style={{ width: `${readiness[key].score}%` }} /></div></article>)}
    </div>
    {readiness.nextActions.length > 0 && <div className="actions"><h3>{text.next}</h3>{readiness.nextActions.map(issue => <article key={`${issue.workspace}:${issue.code}`}><span>{issueText(issue.code, text)}</span><Link href={issue.actionUrl}>{text.open}</Link></article>)}</div>}
    <style jsx>{styles}</style>
  </section>;
}

const styles = `
.ei-readiness{display:grid;gap:14px;margin:0 auto 18px;max-width:1440px;padding:18px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card);color:var(--foreground)}.ei-readiness.loading{display:flex;align-items:center;gap:8px;color:var(--foreground-muted)}.head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.head>div:first-child>span{display:flex;align-items:center;gap:6px;color:var(--primary);font-size:12px;font-weight:700;text-transform:uppercase}.head h2{margin:5px 0 4px;font-size:21px}.head p{margin:0;color:var(--foreground-muted);line-height:1.6}.overall{display:grid;text-align:center;min-width:120px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.overall strong{font:700 28px var(--font-data);color:var(--primary)}.overall small{color:var(--foreground-muted)}.scores{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.scores article{display:grid;gap:8px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.scores article>div:first-child{display:flex;justify-content:space-between;align-items:center}.scores strong{font:700 22px var(--font-data)}.bar{height:7px;border-radius:999px;background:var(--surface);overflow:hidden}.bar i{display:block;height:100%;background:var(--primary);border-radius:999px}.actions{display:grid;gap:8px;padding-top:10px;border-top:1px solid var(--border)}.actions h3{margin:0 0 2px;font-size:14px}.actions article{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.actions span{color:var(--foreground-secondary);font-size:13px}.actions :global(a){white-space:nowrap;padding:7px 10px;border-radius:var(--radius-control);background:var(--primary);color:var(--primary-foreground);text-decoration:none;font-size:12px;font-weight:700}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:760px){.head{display:grid}.overall{width:100%;text-align:start}.scores{grid-template-columns:1fr}.actions article{align-items:stretch;flex-direction:column}.actions :global(a){text-align:center}}
`;
