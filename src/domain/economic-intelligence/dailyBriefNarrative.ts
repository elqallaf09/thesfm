import type { CrossWorkspaceBrief, CrossWorkspaceBriefItem } from './crossWorkspaceBrain';
import { highestDailyPriority } from './dailyPriority';
import type { EconomicIntelligenceReadiness } from './readiness';

export type EconomicNarrativeLocale = 'ar' | 'en' | 'fr';

export type DailyBriefNarrative = {
  headline: string;
  whatChanged: string;
  whyItMatters: string;
  nextAction: string;
  actionUrl: string;
  severity: 'info' | 'warning' | 'danger';
  sources: CrossWorkspaceBriefItem['sources'];
  evidence: Record<string, number | string | null>;
  confidence: number;
  confidenceNote: string | null;
};

const COPY = {
  ar: {
    lowConfidence: 'الثقة محدودة لأن بعض مصادر Finance أو Trader أو Business غير مكتملة.',
    partialConfidence: 'الثقة متوسطة؛ أكمل المصادر الناقصة لرفع دقة الموجز.',
    clear: { headline: 'وضعك الاقتصادي متوازن من البيانات الحالية', changed: 'لم يظهر تعارض جوهري جديد بين السيولة الشخصية، اهتمامك بالسوق، واحتياجات المشاريع.', matters: 'هذا لا يعني غياب المخاطر، لكنه يعني أن البيانات الحالية لا تفرض أولوية تصحيحية بين المساحات الثلاث.', action: 'راجع مركز الذكاء الاقتصادي إذا كنت تخطط لقرار جديد.' },
    market_attention_vs_low_liquidity: { headline: 'السيولة أولاً قبل زيادة التعرض للسوق', changed: 'اهتمامك بالسوق موجود بينما احتياطي السيولة أو الفائض الشهري تحت مستوى مريح.', matters: 'زيادة التعرض الاستثماري قد تضغط قدرتك على تغطية الالتزامات القريبة.', action: 'راجع السيولة والفائض قبل أي زيادة جديدة في الاستثمار.' },
    market_attention_vs_debt_pressure: { headline: 'ضغط الدين أعلى أولوية من زيادة المخاطرة السوقية', changed: 'يوجد اهتمام أو تنبيه سوقي بالتزامن مع نسبة خدمة دين مرتفعة.', matters: 'رفع المخاطرة الاستثمارية أثناء ضغط السداد قد يقلل مرونتك المالية.', action: 'راجع الديون وقدرة السداد قبل إضافة تعرض استثماري جديد.' },
    business_funding_vs_personal_liquidity: { headline: 'تمويل المشروع يحتاج فصل واضح عن سيولتك الشخصية', changed: 'هناك احتياج تمويلي للمشاريع بينما هامش السيولة الشخصية محدود.', matters: 'تمويل المشروع من سيولتك مباشرة قد يضعف احتياطي الطوارئ أو يخلق ضغطاً شهرياً إضافياً.', action: 'راجع احتياج التمويل ومصدره قبل تخصيص سيولة شخصية للمشروع.' },
    business_and_market_compete_for_surplus: { headline: 'المشروع والسوق يتنافسان على نفس الفائض', changed: 'يوجد فائض مالي، وفي نفس الوقت هناك اهتمام بالسوق واحتياج تمويلي للأعمال.', matters: 'استخدام نفس الفائض في اتجاهين بدون تخصيص واضح قد يرفع المخاطر أو يعطل هدفاً أهم.', action: 'قارن البدائل في Decision Lab وحدد توزيع رأس المال قبل التنفيذ.' },
  },
  en: {
    lowConfidence: 'Confidence is limited because some Finance, Trader, or Business evidence is incomplete.',
    partialConfidence: 'Confidence is moderate; complete missing evidence to improve the brief.',
    clear: { headline: 'Your current economic position is balanced from available data', changed: 'No material new conflict is visible between personal liquidity, market attention, and business funding needs.', matters: 'This does not mean risk is absent; it means current evidence does not force a corrective priority across the three workspaces.', action: 'Review the Economic Intelligence Center before making a new major decision.' },
    market_attention_vs_low_liquidity: { headline: 'Liquidity comes before increasing market exposure', changed: 'Market attention is active while liquidity reserves or monthly surplus are below a comfortable level.', matters: 'Increasing investment exposure can reduce your ability to cover near-term obligations.', action: 'Review liquidity and monthly surplus before adding new investment exposure.' },
    market_attention_vs_debt_pressure: { headline: 'Debt pressure takes priority over adding market risk', changed: 'Market attention or alerts are active while debt-service pressure is elevated.', matters: 'Adding investment risk during repayment pressure can reduce financial flexibility.', action: 'Review debt and repayment capacity before increasing investment exposure.' },
    business_funding_vs_personal_liquidity: { headline: 'Business funding needs a clear boundary from personal liquidity', changed: 'Business funding needs are present while personal liquidity headroom is limited.', matters: 'Funding the business directly from personal cash can weaken emergency reserves or increase monthly pressure.', action: 'Review the funding need and funding source before committing personal liquidity.' },
    business_and_market_compete_for_surplus: { headline: 'Business and markets are competing for the same surplus', changed: 'You have financial surplus while market interest and business funding needs are both active.', matters: 'Using the same surplus in two directions without explicit allocation can raise risk or delay a higher-priority goal.', action: 'Compare alternatives in Decision Lab and allocate capital before acting.' },
  },
  fr: {
    lowConfidence: 'La confiance est limitée car certaines données Finance, Trader ou Business sont incomplètes.',
    partialConfidence: 'La confiance est moyenne ; complétez les données manquantes pour améliorer le brief.',
    clear: { headline: 'Votre situation économique est équilibrée selon les données disponibles', changed: 'Aucun nouveau conflit important n’apparaît entre liquidité personnelle, intérêt marché et besoins de financement des projets.', matters: 'Cela ne signifie pas l’absence de risque, mais aucune priorité corrective ne s’impose actuellement entre les trois espaces.', action: 'Consultez le centre Economic Intelligence avant une nouvelle décision importante.' },
    market_attention_vs_low_liquidity: { headline: 'La liquidité passe avant une exposition accrue au marché', changed: 'L’intérêt marché est actif alors que la liquidité ou le surplus mensuel reste limité.', matters: 'Augmenter l’exposition d’investissement peut réduire votre capacité à couvrir les obligations proches.', action: 'Revoyez la liquidité et le surplus mensuel avant d’augmenter l’exposition.' },
    market_attention_vs_debt_pressure: { headline: 'La pression de dette est prioritaire sur l’ajout de risque marché', changed: 'L’intérêt ou les alertes marché sont actifs alors que le service de la dette est élevé.', matters: 'Ajouter du risque d’investissement pendant une forte pression de remboursement réduit la flexibilité financière.', action: 'Revoyez la dette et la capacité de remboursement avant d’augmenter l’exposition.' },
    business_funding_vs_personal_liquidity: { headline: 'Le financement du projet doit rester distinct de votre liquidité personnelle', changed: 'Des besoins de financement existent alors que la marge de liquidité personnelle est limitée.', matters: 'Financer directement le projet avec votre trésorerie personnelle peut affaiblir la réserve d’urgence.', action: 'Revoyez le besoin et la source de financement avant d’engager votre liquidité personnelle.' },
    business_and_market_compete_for_surplus: { headline: 'Le business et le marché se disputent le même surplus', changed: 'Vous disposez d’un surplus alors que l’intérêt marché et les besoins de financement business sont actifs.', matters: 'Utiliser le même surplus dans deux directions sans allocation explicite peut augmenter le risque.', action: 'Comparez les options dans Decision Lab et allouez le capital avant d’agir.' },
  },
} as const;

export function buildDailyBriefNarrative(brief: CrossWorkspaceBrief, locale: EconomicNarrativeLocale, readiness?: EconomicIntelligenceReadiness | null): DailyBriefNarrative {
  const priority = highestDailyPriority(brief);
  const item = brief.items[0] ?? null;
  const code = priority?.code ?? 'no_cross_workspace_conflict_detected';
  const copySet = COPY[locale];
  const candidate = Object.hasOwn(copySet, code) ? copySet[code as keyof typeof copySet] : null;
  const copy = candidate && typeof candidate === 'object' ? candidate : copySet.clear;
  const confidence = readiness ? readiness.overallScore / 100 : 1;
  const confidenceNote = confidence < 0.5 ? copySet.lowConfidence : confidence < 0.8 ? copySet.partialConfidence : null;

  return {
    headline: copy.headline,
    whatChanged: copy.changed,
    whyItMatters: copy.matters,
    nextAction: copy.action,
    actionUrl: priority?.actionUrl ?? '/economic-intelligence',
    severity: priority?.severity ?? 'info',
    sources: priority?.sources ?? item?.sources ?? ['finance', 'trader', 'business'],
    evidence: item?.evidence ?? {},
    confidence,
    confidenceNote,
  };
}
