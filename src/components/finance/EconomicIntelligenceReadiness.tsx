'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrainCircuit, CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

type Lang = 'ar' | 'en' | 'fr';
type ConfirmationKey = 'no_debts' | 'no_investments' | 'no_business_projects';
type WorkspaceKey = 'finance' | 'trader' | 'business';
type Issue = { code: string; workspace: WorkspaceKey; actionUrl: string; weight: number };
type Freshness = { asOf: string | null; ageDays: number | null; stale: boolean; veryStale: boolean };
type Readiness = {
  overallScore: number;
  level: 'low' | 'medium' | 'high';
  finance: { score: number; ready: boolean; issues: Issue[] };
  trader: { score: number; ready: boolean; issues: Issue[] };
  business: { score: number; ready: boolean; issues: Issue[] };
  freshness: Record<WorkspaceKey, Freshness>;
  nextActions: Issue[];
  confirmations: ConfirmationKey[];
};

const CONFIRMATION_FOR_ISSUE: Partial<Record<string, ConfirmationKey>> = {
  'finance:debts_missing': 'no_debts',
  'finance:investments_missing': 'no_investments',
  'trader:portfolio_missing': 'no_investments',
  'business:projects_missing': 'no_business_projects',
};

const TEXT = {
  ar: {
    title: 'جاهزية الذكاء الاقتصادي', subtitle: 'كلما اكتملت وحدُثت بيانات Finance وTrader وBusiness ارتفعت دقة التحليل.',
    overall: 'الجاهزية العامة', finance: 'Finance', trader: 'Trader', business: 'Business', next: 'ما الذي يحتاج انتباهك؟', loading: 'جاري قياس الجاهزية...', unavailable: 'تعذر قياس الجاهزية حالياً.',
    high: 'جاهزية مرتفعة', medium: 'جاهزية متوسطة', low: 'جاهزية منخفضة', open: 'فتح وتحديث', saving: 'جاري الحفظ...', daysAgo: 'يوم منذ آخر تحديث', noFreshness: 'لا يوجد تحديث موثوق بعد',
    no_debts: 'تأكيد: ما عندي ديون', no_investments: 'تأكيد: ما عندي استثمارات', no_business_projects: 'تأكيد: ما عندي مشاريع أعمال',
    'finance:income_missing': 'أضف مصدر دخل واحداً على الأقل.', 'finance:expenses_missing': 'أضف مصروفاتك الشهرية.', 'finance:debts_missing': 'أكمل بيانات الديون، أو أكد عدم وجود ديون.', 'finance:savings_missing': 'أضف المدخرات والسيولة المتاحة.', 'finance:investments_missing': 'أضف الاستثمارات الحالية، أو أكد عدم وجود استثمارات.', 'finance:stale': 'بيانات Finance قديمة؛ راجع الأرصدة والدخل والمصروفات.',
    'trader:watchlist_missing': 'أضف أصولاً إلى قائمة المتابعة.', 'trader:alerts_missing': 'أضف تنبيهات سوقية حتى يفهم SFM ما تراقبه.', 'trader:portfolio_missing': 'أضف محفظتك الاستثمارية، أو أكد عدم وجود استثمارات.', 'trader:stale': 'بيانات Trader قديمة؛ حدّث ما تتابعه وتنبيهاتك السوقية.',
    'business:projects_missing': 'أضف مشروعاً واحداً على الأقل لتفعيل ذكاء الأعمال، أو أكد أنك لا تدير مشاريع حالياً.', 'business:funding_readiness_missing': 'أكمل بيانات جاهزية التمويل للمشاريع النشطة.', 'business:stale': 'بيانات Business قديمة؛ راجع المشاريع واحتياجات التمويل.',
  },
  en: {
    title: 'Economic Intelligence Readiness', subtitle: 'More complete and fresher Finance, Trader, and Business evidence increases intelligence confidence.',
    overall: 'Overall readiness', finance: 'Finance', trader: 'Trader', business: 'Business', next: 'What needs attention?', loading: 'Measuring readiness...', unavailable: 'Readiness is currently unavailable.',
    high: 'High readiness', medium: 'Medium readiness', low: 'Low readiness', open: 'Open and refresh', saving: 'Saving...', daysAgo: 'days since last update', noFreshness: 'No reliable update recorded yet',
    no_debts: 'Confirm: I have no debt', no_investments: 'Confirm: I have no investments', no_business_projects: 'Confirm: I have no business projects',
    'finance:income_missing': 'Add at least one income source.', 'finance:expenses_missing': 'Add your monthly expenses.', 'finance:debts_missing': 'Complete debt data, or confirm that you have no debt.', 'finance:savings_missing': 'Add savings and available liquidity.', 'finance:investments_missing': 'Add current investments, or confirm that you have none.', 'finance:stale': 'Finance evidence is stale; review balances, income, and expenses.',
    'trader:watchlist_missing': 'Add assets to your market watchlist.', 'trader:alerts_missing': 'Add market alerts so SFM knows what you actively monitor.', 'trader:portfolio_missing': 'Add your investment portfolio, or confirm that you have no investments.', 'trader:stale': 'Trader evidence is stale; refresh watched assets and market alerts.',
    'business:projects_missing': 'Add at least one project to activate Business intelligence, or confirm that you currently run no business projects.', 'business:funding_readiness_missing': 'Complete funding-readiness data for active projects.', 'business:stale': 'Business evidence is stale; review active projects and funding needs.',
  },
  fr: {
    title: 'Préparation de l’intelligence économique', subtitle: 'Des données Finance, Trader et Business plus complètes et plus récentes améliorent la confiance des analyses.',
    overall: 'Préparation globale', finance: 'Finance', trader: 'Trader', business: 'Business', next: 'Que faut-il vérifier ?', loading: 'Mesure de la préparation...', unavailable: 'La préparation est indisponible actuellement.',
    high: 'Préparation élevée', medium: 'Préparation moyenne', low: 'Préparation faible', open: 'Ouvrir et actualiser', saving: 'Enregistrement...', daysAgo: 'jours depuis la dernière mise à jour', noFreshness: 'Aucune mise à jour fiable enregistrée',
    no_debts: 'Confirmer : je n’ai pas de dettes', no_investments: 'Confirmer : je n’ai pas d’investissements', no_business_projects: 'Confirmer : je n’ai pas de projets Business',
    'finance:income_missing': 'Ajoutez au moins une source de revenu.', 'finance:expenses_missing': 'Ajoutez vos dépenses mensuelles.', 'finance:debts_missing': 'Complétez les dettes, ou confirmez que vous n’en avez pas.', 'finance:savings_missing': 'Ajoutez l’épargne et la liquidité disponible.', 'finance:investments_missing': 'Ajoutez vos investissements, ou confirmez que vous n’en avez pas.', 'finance:stale': 'Les données Finance sont anciennes ; vérifiez soldes, revenus et dépenses.',
    'trader:watchlist_missing': 'Ajoutez des actifs à votre liste de suivi.', 'trader:alerts_missing': 'Ajoutez des alertes marché.', 'trader:portfolio_missing': 'Ajoutez votre portefeuille, ou confirmez que vous n’avez pas d’investissements.', 'trader:stale': 'Les données Trader sont anciennes ; actualisez les actifs suivis et les alertes.',
    'business:projects_missing': 'Ajoutez au moins un projet, ou confirmez que vous ne gérez actuellement aucun projet Business.', 'business:funding_readiness_missing': 'Complétez les données de préparation au financement.', 'business:stale': 'Les données Business sont anciennes ; vérifiez projets et besoins de financement.',
  },
} as const;

function issueText(code: string, text: any) { return text[code] ?? code; }
function freshnessText(value: Freshness | undefined, text: any) {
  if (!value || value.ageDays === null) return text.noFreshness;
  return `${value.ageDays} ${text.daysAgo}`;
}

export function EconomicIntelligenceReadiness() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = (lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : 'ar') as Lang;
  const text = TEXT[locale];
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [savingKey, setSavingKey] = useState<ConfirmationKey | null>(null);

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

  async function confirmZeroState(key: ConfirmationKey) {
    if (savingKey) return;
    setSavingKey(key); setError(false);
    try {
      const response = await fetch('/api/economic-intelligence/readiness', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key }),
      });
      if (!response.ok) throw new Error('confirmation_failed');
      const payload = await response.json();
      setReadiness(payload.readiness ?? null);
    } catch { setError(true); }
    finally { setSavingKey(null); }
  }

  if (authLoading || !user) return null;
  if (loading) return <section className="ei-readiness loading" dir={dir}><Loader2 className="spin" size={17} />{text.loading}<style jsx>{styles}</style></section>;
  if (error && !readiness) return <section className="ei-readiness" dir={dir}>{text.unavailable}<style jsx>{styles}</style></section>;
  if (!readiness) return null;

  return <section className={`ei-readiness level-${readiness.level}`} dir={dir} aria-label={text.title}>
    <div className="head"><div><span><BrainCircuit size={15} />Readiness</span><h2>{text.title}</h2><p>{text.subtitle}</p></div><div className="overall"><strong>{readiness.overallScore}%</strong><small>{text[readiness.level]}</small></div></div>
    <div className="scores">
      {(['finance','trader','business'] as const).map(key => <article key={key}><div><span>{text[key]}</span>{readiness[key].ready ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}</div><strong>{readiness[key].score}%</strong><small className={readiness.freshness?.[key]?.stale ? 'stale' : ''}>{freshnessText(readiness.freshness?.[key], text)}</small><div className="bar"><i style={{ width: `${readiness[key].score}%` }} /></div></article>)}
    </div>
    {readiness.nextActions.length > 0 && <div className="actions"><h3>{text.next}</h3>{readiness.nextActions.map(issue => {
      const confirmationKey = CONFIRMATION_FOR_ISSUE[issue.code];
      return <article key={`${issue.workspace}:${issue.code}`}><span>{issueText(issue.code, text)}</span><div className="action-buttons"><Link href={issue.actionUrl}>{text.open}</Link>{confirmationKey ? <button type="button" disabled={savingKey === confirmationKey} onClick={() => void confirmZeroState(confirmationKey)}>{savingKey === confirmationKey ? text.saving : text[confirmationKey]}</button> : null}</div></article>;
    })}</div>}
    <style jsx>{styles}</style>
  </section>;
}

const styles = `
.ei-readiness{display:grid;gap:14px;margin:0 auto 18px;max-width:1440px;padding:18px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card);color:var(--foreground)}.ei-readiness.loading{display:flex;align-items:center;gap:8px;color:var(--foreground-muted)}.head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.head>div:first-child>span{display:flex;align-items:center;gap:6px;color:var(--primary);font-size:12px;font-weight:700;text-transform:uppercase}.head h2{margin:5px 0 4px;font-size:21px}.head p{margin:0;color:var(--foreground-muted);line-height:1.6}.overall{display:grid;text-align:center;min-width:120px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.overall strong{font:700 28px var(--font-data);color:var(--primary)}.overall small{color:var(--foreground-muted)}.scores{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.scores article{display:grid;gap:8px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.scores article>div:first-child{display:flex;justify-content:space-between;align-items:center}.scores strong{font:700 22px var(--font-data)}.scores small{color:var(--foreground-muted);font-size:11px}.scores small.stale{color:var(--warning);font-weight:700}.bar{height:7px;border-radius:var(--radius-pill);background:var(--surface);overflow:hidden}.bar i{display:block;height:100%;background:var(--primary);border-radius:var(--radius-pill)}.actions{display:grid;gap:8px;padding-top:10px;border-top:1px solid var(--border)}.actions h3{margin:0 0 2px;font-size:14px}.actions article{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.actions span{color:var(--foreground-secondary);font-size:13px}.action-buttons{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.actions :global(a),.actions button{white-space:nowrap;padding:7px 10px;border-radius:var(--radius-control);font-size:12px;font-weight:700;cursor:pointer}.actions :global(a){background:var(--primary);color:var(--primary-foreground);text-decoration:none}.actions button{border:1px solid var(--border);background:var(--surface);color:var(--foreground)}.actions button:disabled{opacity:.6;cursor:not-allowed}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:760px){.head{display:grid}.overall{width:100%;text-align:start}.scores{grid-template-columns:1fr}.actions article{align-items:stretch;flex-direction:column}.action-buttons{justify-content:stretch}.action-buttons :global(a),.action-buttons button{flex:1;text-align:center}}
`;
