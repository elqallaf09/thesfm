'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, BriefcaseBusiness, CircleDollarSign, LineChart, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

type Lang = 'ar' | 'en' | 'fr';
type BriefItem = { code: string; severity: 'info' | 'warning' | 'danger'; sources: Array<'finance' | 'trader' | 'business'>; evidence: Record<string, number | string | null> };
type Brief = { state: 'clear' | 'attention' | 'critical'; items: BriefItem[]; compatibleFundingNeed: number | null; fundingCurrency: string | null };

const TEXT = {
  ar: {
    title: 'الموجز الاقتصادي اليومي', subtitle: 'صورة موحدة من Finance وTrader وBusiness. قيود السيولة والديون لها أولوية على فرص السوق.',
    finance: 'المال الشخصي', trader: 'الأسواق', business: 'الأعمال', clear: 'لا يوجد تعارض مهم ظاهر', attention: 'توجد نقاط تحتاج انتباه', critical: 'يوجد تعارض عالي الأولوية',
    market_attention_vs_low_liquidity: 'هناك اهتمام بالسوق بينما السيولة الشخصية منخفضة. راجع قدرة الاستثمار قبل زيادة التعرض.',
    market_attention_vs_debt_pressure: 'اهتمام السوق يتزامن مع ضغط دين مرتفع. معالجة قدرة السداد أولوية قبل زيادة المخاطر.',
    business_funding_vs_personal_liquidity: 'المشاريع تحتاج تمويلاً بينما هامش السيولة الشخصية محدود.',
    business_and_market_compete_for_surplus: 'المشاريع وفرص السوق قد تتنافس على نفس الفائض المالي. خصص رأس المال قبل اتخاذ قرار جديد.',
    no_cross_workspace_conflict_detected: 'لم يظهر تعارض جوهري بين المال الشخصي والأسواق والأعمال من البيانات الحالية.',
    loading: 'جاري بناء الموجز الاقتصادي...', unavailable: 'الموجز الاقتصادي غير متاح حالياً.',
  },
  en: {
    title: 'Daily Economic Brief', subtitle: 'A unified view across Finance, Trader, and Business. Liquidity and debt constraints take priority over market opportunities.',
    finance: 'Personal finance', trader: 'Markets', business: 'Business', clear: 'No material conflict detected', attention: 'Items need attention', critical: 'High-priority conflict detected',
    market_attention_vs_low_liquidity: 'Market attention is active while personal liquidity is weak. Review investment capacity before increasing exposure.',
    market_attention_vs_debt_pressure: 'Market attention coincides with elevated debt pressure. Debt capacity takes priority before adding risk.',
    business_funding_vs_personal_liquidity: 'Business projects need funding while personal liquidity headroom is limited.',
    business_and_market_compete_for_surplus: 'Business funding and market opportunities may compete for the same surplus. Allocate capital explicitly before acting.',
    no_cross_workspace_conflict_detected: 'No material conflict is visible across personal finance, markets, and business from current data.',
    loading: 'Building daily economic brief...', unavailable: 'Daily economic brief is currently unavailable.',
  },
  fr: {
    title: 'Brief économique quotidien', subtitle: 'Vue unifiée Finance, Trader et Business. Les contraintes de liquidité et de dette priment sur les opportunités de marché.',
    finance: 'Finances personnelles', trader: 'Marchés', business: 'Business', clear: 'Aucun conflit important détecté', attention: 'Des points nécessitent une attention', critical: 'Conflit prioritaire détecté',
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
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = (lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : 'ar') as Lang;
  const text = TEXT[locale];
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError(false);
    void fetch('/api/economic-intelligence/daily-brief', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async response => response.ok ? response.json() : Promise.reject(new Error('brief_failed')))
      .then(payload => { if (!cancelled) { setBrief(payload.brief ?? null); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [authLoading, user]);

  if (authLoading || !user) return null;
  if (loading) return <aside className="cross-brief loading" dir={dir}><Loader2 className="spin" size={17} />{text.loading}<style jsx>{styles}</style></aside>;
  if (error || !brief) return <aside className="cross-brief unavailable" dir={dir}>{text.unavailable}<style jsx>{styles}</style></aside>;

  return <aside className={`cross-brief ${brief.state}`} dir={dir} aria-label={text.title}>
    <div className="head"><div><span>Cross-Workspace Intelligence</span><h2>{text.title}</h2><p>{text.subtitle}</p></div><div className="state">{brief.state === 'critical' ? <AlertTriangle size={17} /> : <ShieldCheck size={17} />}<strong>{text[brief.state]}</strong></div></div>
    <div className="items">{brief.items.map(item => <article key={item.code} className={item.severity}><div className="sources">{item.sources.map(source => { const Icon = SOURCE_ICON[source]; return <span key={source}><Icon size={14} />{text[source]}</span>; })}</div><p>{text[item.code as keyof typeof text] ?? item.code}</p></article>)}</div>
    <style jsx>{styles}</style>
  </aside>;
}

const styles = `
.cross-brief{display:grid;gap:14px;margin:0 auto 18px;max-width:1440px;padding:18px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card);color:var(--foreground)}.cross-brief.loading,.cross-brief.unavailable{display:flex;align-items:center;gap:8px;color:var(--foreground-muted)}.head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.head>div:first-child>span{color:var(--primary);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.head h2{margin:5px 0 4px;font-size:21px}.head p{margin:0;color:var(--foreground-muted);line-height:1.6}.state{display:flex;align-items:center;gap:7px;padding:9px 11px;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface-muted);font-size:12px}.critical .state{color:var(--danger);background:var(--danger-soft)}.attention .state{color:var(--warning);background:var(--warning-soft)}.clear .state{color:var(--success);background:var(--success-soft)}.items{display:grid;gap:9px}.items article{display:grid;gap:8px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.items article.danger{border-color:color-mix(in srgb,var(--danger) 45%,var(--border))}.items article.warning{border-color:color-mix(in srgb,var(--warning) 45%,var(--border))}.items p{margin:0;line-height:1.6;color:var(--foreground-secondary)}.sources{display:flex;gap:7px;flex-wrap:wrap}.sources span{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:var(--radius-pill);background:var(--surface);border:1px solid var(--border);font-size:11px;color:var(--foreground-muted)}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:760px){.head{display:grid}.state{width:max-content;max-width:100%}}
`;
