'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { AppCard } from '@/components/layout/AppCard';
import { useLanguage } from '@/hooks/useLanguage';
import styles from './EconomicCommandCenter.module.css';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type Priority = {
  id: string;
  advisor: 'finance' | 'investment' | 'business';
  severity: Severity;
  score: number;
  code: string;
  evidence: string[];
  confidence: number;
};
type Payload = {
  ok?: boolean;
  commandCenter?: {
    confidence: number;
    priorities: Priority[];
    missing: string[];
  };
};

const COPY = {
  ar: {
    eyebrow: 'الذكاء الاقتصادي', title: 'أهم أولوياتك الآن', subtitle: 'ترتيب موحّد من وضعك المالي والاستثماري والأعمال، مبني على البيانات المتاحة فقط.',
    confidence: 'ثقة السياق', noPriorities: 'لا توجد ضغوط اقتصادية ذات أولوية مرتفعة الآن.', unavailable: 'تعذر تحميل مركز الذكاء الاقتصادي حالياً.',
    finance: 'المالية', investment: 'الاستثمار', business: 'الأعمال',
    restore_positive_cash_flow: 'أعد التدفق النقدي الشهري إلى الموجب', build_monthly_surplus: 'كوّن فائضاً شهرياً ثابتاً',
    rebuild_emergency_liquidity: 'أعد بناء سيولة الطوارئ فوراً', strengthen_liquidity_buffer: 'قوِّ احتياطي السيولة',
    reduce_debt_service_pressure: 'خفّض ضغط أقساط الديون', review_debt_capacity: 'راجع قدرتك على تحمّل الدين',
    refresh_market_evidence: 'حدّث أدلة السوق قبل قرار استثماري', complete_business_evidence: 'أكمل بيانات الأعمال قبل قرار كبير',
    refresh_economic_context: 'حدّث السياق الاقتصادي لرفع دقة القرار',
  },
  en: {
    eyebrow: 'Economic intelligence', title: 'Your highest priorities now', subtitle: 'One ranked view across finance, investing and business, using available evidence only.',
    confidence: 'Context confidence', noPriorities: 'No high-priority economic pressure is detected right now.', unavailable: 'Economic Command Center is unavailable right now.',
    finance: 'Finance', investment: 'Investment', business: 'Business',
    restore_positive_cash_flow: 'Restore positive monthly cash flow', build_monthly_surplus: 'Build a consistent monthly surplus',
    rebuild_emergency_liquidity: 'Rebuild emergency liquidity now', strengthen_liquidity_buffer: 'Strengthen your liquidity buffer',
    reduce_debt_service_pressure: 'Reduce debt-service pressure', review_debt_capacity: 'Review debt capacity',
    refresh_market_evidence: 'Refresh market evidence before investing', complete_business_evidence: 'Complete business evidence before a major decision',
    refresh_economic_context: 'Refresh economic context to improve decision quality',
  },
  fr: {
    eyebrow: 'Intelligence économique', title: 'Vos priorités principales', subtitle: 'Une vue classée de vos finances, investissements et activités, fondée uniquement sur les preuves disponibles.',
    confidence: 'Confiance du contexte', noPriorities: 'Aucune pression économique prioritaire détectée actuellement.', unavailable: 'Le centre d’intelligence économique est indisponible.',
    finance: 'Finances', investment: 'Investissement', business: 'Entreprise',
    restore_positive_cash_flow: 'Rétablir un flux de trésorerie mensuel positif', build_monthly_surplus: 'Créer un excédent mensuel régulier',
    rebuild_emergency_liquidity: 'Reconstruire immédiatement la liquidité de secours', strengthen_liquidity_buffer: 'Renforcer la réserve de liquidité',
    reduce_debt_service_pressure: 'Réduire la pression du service de la dette', review_debt_capacity: 'Réexaminer la capacité d’endettement',
    refresh_market_evidence: 'Actualiser les données de marché avant d’investir', complete_business_evidence: 'Compléter les données d’entreprise avant une décision importante',
    refresh_economic_context: 'Actualiser le contexte économique pour améliorer la décision',
  },
} as const;

export function EconomicCommandCenter() {
  const { lang } = useLanguage();
  const locale = lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : 'ar';
  const copy = COPY[locale];
  const [payload, setPayload] = useState<Payload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/economic-intelligence/command-center', { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error('command_center_unavailable');
        return response.json() as Promise<Payload>;
      })
      .then((value) => { if (active) setPayload(value); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  const priorities = useMemo(() => payload?.commandCenter?.priorities ?? [], [payload]);
  if (!payload && !failed) return null;
  if (failed) return null;
  if (!payload?.ok || !payload.commandCenter) return null;

  const confidence = Math.round(payload.commandCenter.confidence * 100);

  return (
    <AppCard className={styles.panel} data-testid="economic-command-center">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}><BrainCircuit size={16} aria-hidden="true" />{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </div>
        <div className={styles.confidence}>{copy.confidence} <strong>{confidence}%</strong></div>
      </header>

      {priorities.length ? (
        <div className={styles.list}>
          {priorities.map((priority, index) => {
            const label = copy[priority.code as keyof typeof copy] ?? priority.code;
            const advisorLabel = copy[priority.advisor];
            return (
              <article key={priority.id} className={styles.item} data-severity={priority.severity}>
                <div className={styles.rank}>{index + 1}</div>
                <div className={styles.body}>
                  <div className={styles.itemHeader}>
                    <h3>{label}</h3>
                    <span>{advisorLabel}</span>
                  </div>
                  <div className={styles.meta}>
                    <span>{priority.score}/100</span>
                    <span>{Math.round(priority.confidence * 100)}%</span>
                  </div>
                </div>
                {priority.severity === 'critical' || priority.severity === 'high'
                  ? <AlertTriangle size={18} aria-hidden="true" />
                  : <CheckCircle2 size={18} aria-hidden="true" />}
              </article>
            );
          })}
        </div>
      ) : <p className={styles.empty}>{copy.noPriorities}</p>}
    </AppCard>
  );
}
