'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowUpRight, BriefcaseBusiness, CircleDollarSign, History, LineChart, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

type Lang = 'ar' | 'en' | 'fr';
type BriefItem = { code: string; severity: 'info' | 'warning' | 'danger'; sources: Array<'finance' | 'trader' | 'business'>; evidence: Record<string, number | string | null> };
type Brief = { state: 'clear' | 'attention' | 'critical'; items: BriefItem[]; compatibleFundingNeed: number | null; fundingCurrency: string | null };
type Action = { code: string; severity: 'info' | 'warning' | 'danger'; actionUrl: string; sources: Array<'finance' | 'trader' | 'business'>; fingerprint: string };
type Narrative = { headline: string; whatChanged: string; whyItMatters: string; nextAction: string; actionUrl: string; severity: 'info' | 'warning' | 'danger'; sources: Array<'finance' | 'trader' | 'business'>; evidence: Record<string, number | string | null> };
type Change = { changed: boolean; previousCode: string | null; previousSeverity: string | null; previousCreatedAt: string | null };

const TEXT = {
  ar: {
    title: 'الموجز الاقتصادي اليومي', subtitle: 'صورة موحدة من Finance وTrader وBusiness. قيود السيولة والديون لها أولوية على فرص السوق.',
    finance: 'المال الشخصي', trader: 'الأسواق', business: 'الأعمال', clear: 'لا يوجد تعارض مهم ظاهر', attention: 'توجد نقاط تحتاج انتباه', critical: 'يوجد تعارض عالي الأولوية', nextAction: 'الإجراء الأعلى أولوية', act: 'افتح الإجراء',
    whatChanged: 'شنو تغير؟', whyItMatters: 'ليش يهمك؟', whatToDo: 'شنو تسوي الآن؟', changedSinceLast: 'تغير مهم عن آخر موجز', changedFrom: 'الأولوية السابقة',
    market_attention_vs_low_liquidity: 'هناك اهتمام بالسوق بينما السيولة الشخصية منخفضة. راجع قدرة الاستثمار قبل زيادة التعرض.',
    market_attention_vs_debt_pressure: 'اهتمام السوق يتزامن مع ضغط دين مرتفع. معالجة قدرة السداد أولوية قبل زيادة المخاطر.',
    business_funding_vs_personal_liquidity: 'المشاريع تحتاج تمويلاً بينما هامش السيولة الشخصية محدود.',
    business_and_market_compete_for_surplus: 'المشاريع وفرص السوق قد تتنافس على نفس الفائض المالي. خصص رأس المال قبل اتخاذ قرار جديد.',
    no_cross_workspace_conflict_detected: 'لم يظهر تعارض جوهري بين المال الشخصي والأسواق والأعمال من البيانات الحالية.',
    loading: 'جاري بناء الموجز الاقتصادي...', unavailable: 'الموجز الاقتصادي غير متاح حالياً.',
  },
  en: {
    title: 'Daily Economic Brief', subtitle: 'A unified view across Finance, Trader, and Business. Liquidity and debt constraints take priority over market opportunities.',
    finance: 'Personal finance', trader: 'Markets', business: 'Business', clear: 'No material conflict detected', attention: 'Items need attention', critical: 'High-priority conflict detected', nextAction: 'Highest-priority action', act: 'Open action',
    whatChanged: 'What changed?', whyItMatters: 'Why it matters', whatToDo: 'What to do now', changedSinceLast: 'Material change since the last brief', changedFrom: 'Previous priority',
    market_attention_vs_low_liquidity: 'Market attention is active while personal liquidity is weak. Review investment capacity before increasing exposure.',
    market_attention_vs_debt_pressure: 'Market attention coincides with elevated debt pressure. Debt capacity takes priority before adding risk.',
    business_funding_vs_personal_liquidity: 'Business projects need funding while personal liquidity headroom is limited.',
    business_and_market_compete_for_surplus: 'Business funding and market opportunities may compete for the same surplus. Allocate capital explicitly before acting.',
    no_cross_workspace_conflict_detected: 'No material conflict is visible across personal finance, markets, and business from current data.',
    loading: 'Building daily economic brief...', unavailable: 'Daily economic brief is currently unavailable.',
  },
  fr: {
    title: 'Brief économique quotidien', subtitle: 'Vue unifiée Finance, Trader et Business. Les contraintes de liquidité et de dette priment sur les opportunités de marché.',
    finance: 'Finances personnelles', trader: 'Marchés', business: 'Business', clear: 'Aucun conflit important détecté', attention: 'Des points nécessitent une attention', critical: 'Conflit prioritaire détecté', nextAction: 'Action prioritaire', act: 'Ouvrir l’action',
    whatChanged: 'Qu’est-ce qui a changé ?', whyItMatters: 'Pourquoi c’est important', whatToDo: 'Que faire maintenant', changedSinceLast: 'Changement important depuis le dernier brief', changedFrom: 'Priorité précédente',
    market_attention_vs_low_liquidity: 'L’intérêt marché est actif alors que la liquidité personnelle est faible. Vérifiez la capacité d’investissement avant d’augmenter l’exposition.',
    market_attention_vs_debt_pressure: 'L’intérêt marché coïncide avec une pression de dette élevée. La capacité de remboursement est prioritaire.',
    business_funding_vs_personal_liquidity: 'Les projets nécessitent un financement alors que la marge de liquidité personnelle est limitée.',
    business_and_market_compete_for_surplus: 'Le financement des projets et les opportunités de marché peuvent se disputer le même surplus. Allouez le capital explicitement.',
    no_cross_workspace_conflict_detected: 'Aucun conflit important n’apparaît entre finances personnelles, marchés et business dans les données actuelles.',
    loading: 'Construction du brief économique...', unavailable: 'Le brief économique est indisponible actuellement.',
  },
} as const;

const SOURCE_ICON = { finance: CircleDollarSign, trader: LineChart, business: BriefcaseBusiness } as const;

export function CrossWorkspaceEconomicBrief() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = (lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : 'ar') as Lang;
  const text = TEXT[locale];
  const [brief, setBrief] = useState<Brief | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [highestPriority, setHighestPriority] = useState<Action | null>(null);
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const [change, setChange] = useState<Change | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError(false);
    void fetch(`/api/economic-intelligence/daily-brief?lang=${encodeURIComponent(locale)}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async response => response.ok ? response.json() : Promise.reject(new Error('brief_failed')))
      .then(payload => { if (!cancelled) { setBrief(payload.brief ?? null); setActions(Array.isArray(payload.actions) ? payload.actions : []); setHighestPriority(payload.highestPriority ?? null); setNarrative(payload.narrative ?? null); setChange(payload.history?.change ?? null); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [authLoading, locale, user]);

  if (authLoading || !user) return null;
  if (loading) return <aside className="cross-brief loading" dir={dir}><Loader2 className="spin" size={17} />{text.loading}<style jsx>{styles}</style></aside>;
  if (error || !brief) return <aside className="cross-brief unavailable" dir={dir}>{text.unavailable}<style jsx>{styles}</style></aside>;

  return <aside className={`cross-brief ${brief.state}`} dir={dir} aria-label={text.title}>
    <div className="head"><div><span>Cross-Workspace Intelligence</span><h2>{text.title}</h2><p>{text.subtitle}</p></div><div className="state">{brief.state === 'critical' ? <AlertTriangle size={17} /> : <ShieldCheck size={17} />}<strong>{text[brief.state]}</strong></div></div>
    {change?.changed && change.previousCode ? <div className="change-banner"><History size={16} /><div><strong>{text.changedSinceLast}</strong><span>{text.changedFrom}: {text[change.previousCode as keyof typeof text] ?? change.previousCode}</span></div></div> : null}
    {narrative ? <section className={`narrative ${narrative.severity}`}><h3>{narrative.headline}</h3><div className="narrative-grid"><article><span>{text.whatChanged}</span><p>{narrative.whatChanged}</p></article><article><span>{text.whyItMatters}</span><p>{narrative.whyItMatters}</p></article><article><span>{text.whatToDo}</span><p>{narrative.nextAction}</p></article></div><div className="sources">{narrative.sources.map(source => { const Icon = SOURCE_ICON[source]; return <span key={source}><Icon size={14} />{text[source]}</span>; })}</div></section> : null}
    {highestPriority ? <div className={`priority ${highestPriority.severity}`}><div><span>{text.nextAction}</span><strong>{text[highestPriority.code as keyof typeof text] ?? highestPriority.code}</strong></div><button type="button" onClick={() => router.push(highestPriority.actionUrl)}>{text.act}<ArrowUpRight size={15} /></button></div> : null}
    <div className="items">{brief.items.map(item => { const action = actions.find(candidate => candidate.code === item.code); return <article key={item.code} className={item.severity}><div className="sources">{item.sources.map(source => { const Icon = SOURCE_ICON[source]; return <span key={source}><Icon size={14} />{text[source]}</span>; })}</div><p>{text[item.code as keyof typeof text] ?? item.code}</p>{action && action.code !== highestPriority?.code ? <button type="button" className="inline-action" onClick={() => router.push(action.actionUrl)}>{text.act}<ArrowUpRight size={14} /></button> : null}</article>; })}</div>
    <style jsx>{styles}</style>
  </aside>;
}

const styles = `
.cross-brief{display:grid;gap:14px;margin:0 auto 18px;max-width:1440px;padding:18px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card);color:var(--foreground)}.cross-brief.loading,.cross-brief.unavailable{display:flex;align-items:center;gap:8px;color:var(--foreground-muted)}.head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.head>div:first-child>span{color:var(--primary);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.head h2{margin:5px 0 4px;font-size:21px}.head p{margin:0;color:var(--foreground-muted);line-height:1.6}.state{display:flex;align-items:center;gap:7px;padding:9px 11px;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface-muted);font-size:12px}.critical .state{color:var(--danger);background:var(--danger-soft)}.attention .state{color:var(--warning);background:var(--warning-soft)}.clear .state{color:var(--success);background:var(--success-soft)}.change-banner{display:flex;align-items:flex-start;gap:9px;padding:10px 12px;border:1px solid var(--primary);border-radius:var(--radius-card);background:var(--primary-soft);color:var(--foreground)}.change-banner>div{display:grid;gap:3px}.change-banner strong{font-size:12px}.change-banner span{font-size:12px;color:var(--foreground-muted);line-height:1.5}.narrative{display:grid;gap:12px;padding:14px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.narrative.danger{border-color:color-mix(in srgb,var(--danger) 45%,var(--border))}.narrative.warning{border-color:color-mix(in srgb,var(--warning) 45%,var(--border))}.narrative h3{margin:0;font-size:18px}.narrative-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.narrative-grid article{padding:10px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface)}.narrative-grid span{display:block;color:var(--foreground-muted);font-size:11px;font-weight:800;text-transform:uppercase}.narrative-grid p{margin:6px 0 0;color:var(--foreground-secondary);line-height:1.6;font-size:13px}.priority{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--primary-soft)}.priority>div{display:grid;gap:4px}.priority span{font-size:11px;color:var(--foreground-muted);font-weight:700;text-transform:uppercase}.priority strong{line-height:1.5}.priority button,.inline-action{min-height:38px;border:1px solid var(--primary);border-radius:var(--radius-control);background:var(--primary);color:var(--primary-foreground);padding:0 11px;display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;font:600 12px var(--font-ui)}.items{display:grid;gap:9px}.items article{display:grid;gap:8px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.items article.danger{border-color:color-mix(in srgb,var(--danger) 45%,var(--border))}.items article.warning{border-color:color-mix(in srgb,var(--warning) 45%,var(--border))}.items p{margin:0;line-height:1.6;color:var(--foreground-secondary)}.sources{display:flex;gap:7px;flex-wrap:wrap}.sources span{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:var(--radius-pill);background:var(--surface);border:1px solid var(--border);font-size:11px;color:var(--foreground-muted)}.inline-action{width:max-content;background:transparent;color:var(--primary)}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:900px){.narrative-grid{grid-template-columns:1fr}}@media(max-width:760px){.head,.priority{display:grid}.state{width:max-content;max-width:100%}.priority button{width:100%}}
`;
