import 'server-only';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import type { SmartNotification, NotificationLang } from '@/lib/notifications/generateNotifications';
import { buildFinancialTwinSnapshot } from './digitalTwin';
import { buildEconomicHomeSummary } from '@/lib/dashboard/economicHomeSummary';

const COPY = {
  ar: {
    deficitTitle: 'تنبيه ذكاء اقتصادي: عجز شهري', deficitMessage: 'التوأم المالي يظهر أن الالتزامات الشهرية تتجاوز الدخل الحالي.',
    liquidityTitle: 'تنبيه ذكاء اقتصادي: السيولة منخفضة', liquidityMessage: 'احتياطي السيولة الحالي أقل من 3 أشهر من الالتزامات.',
    debtTitle: 'تنبيه ذكاء اقتصادي: ضغط الدين مرتفع', debtMessage: 'نسبة خدمة الدين الحالية تتجاوز 35% من الدخل الشهري.',
    opportunityTitle: 'فرصة مالية من SFM', buildLiquidity: 'يوجد فائض شهري يمكن استخدام جزء منه لبناء احتياطي سيولة أقوى.', reduceDebt: 'يوجد فائض يمكن استخدام جزء منه لتقليل ضغط الدين.', investSurplus: 'الفائض والسيولة الحالية يسمحان بمراجعة فرصة استثمار تناسب مستوى المخاطرة.', improveData: 'إكمال البيانات المالية سيرفع دقة التوقعات والقرارات.',
    decisionTitle: 'قرار يحتاج مراجعة', decisionMessage: (title: string) => `القرار «${title}» هو أعلى قرار غير محسوم من حيث المخاطر الحالية.`,
  },
  en: {
    deficitTitle: 'Economic intelligence alert: monthly deficit', deficitMessage: 'Your financial twin shows monthly obligations above current income.',
    liquidityTitle: 'Economic intelligence alert: low liquidity', liquidityMessage: 'Current liquidity reserves cover less than three months of obligations.',
    debtTitle: 'Economic intelligence alert: high debt pressure', debtMessage: 'Current debt service exceeds 35% of monthly income.',
    opportunityTitle: 'SFM financial opportunity', buildLiquidity: 'Part of the monthly surplus can strengthen your liquidity reserve.', reduceDebt: 'Part of the surplus can be used to reduce debt pressure.', investSurplus: 'Current surplus and liquidity support reviewing an investment suited to your risk.', improveData: 'Completing your financial data will improve forecast and decision accuracy.',
    decisionTitle: 'Decision needs review', decisionMessage: (title: string) => `“${title}” is currently your highest-risk unresolved decision.`,
  },
  fr: {
    deficitTitle: 'Alerte intelligence économique : déficit mensuel', deficitMessage: 'Votre jumeau financier montre des engagements mensuels supérieurs au revenu actuel.',
    liquidityTitle: 'Alerte intelligence économique : liquidité faible', liquidityMessage: 'Les réserves actuelles couvrent moins de trois mois d’engagements.',
    debtTitle: 'Alerte intelligence économique : pression de dette élevée', debtMessage: 'Le service de la dette dépasse 35 % du revenu mensuel.',
    opportunityTitle: 'Opportunité financière SFM', buildLiquidity: 'Une partie du surplus mensuel peut renforcer votre réserve de liquidité.', reduceDebt: 'Une partie du surplus peut réduire la pression de la dette.', investSurplus: 'Le surplus et la liquidité actuels permettent d’examiner un investissement adapté à votre risque.', improveData: 'Compléter vos données financières améliorera la précision des prévisions et décisions.',
    decisionTitle: 'Décision à revoir', decisionMessage: (title: string) => `« ${title} » est actuellement votre décision non résolue la plus risquée.`,
  },
} as const;

function currencyFromProfile(profile: Record<string, unknown> | null) {
  for (const value of [profile?.default_currency, profile?.preferred_currency, profile?.currency]) {
    const currency = String(value ?? '').trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(currency)) return currency;
  }
  return 'KWD';
}

export async function loadProactiveEconomicEvents(userId: string, lang: NotificationLang): Promise<SmartNotification[]> {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED');

  const tableNames = {
    income: 'monthly_income_sources', expenses: 'expense_items', debts: 'debts', savings: 'savings_items', investments: 'investment_items',
  } as const;

  const [financeEntries, profileResult, decisionsResult] = await Promise.all([
    Promise.all(Object.entries(tableNames).map(async ([key, table]) => {
      const { data, error } = await admin.from(table).select('*').eq('user_id', userId).limit(2000);
      if (error) throw error;
      return [key, data ?? []] as const;
    })),
    admin.from('profiles').select('default_currency,preferred_currency,currency').eq('id', userId).maybeSingle(),
    admin.from('user_decisions').select('id,decision_title,status,risk_score,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(20),
  ]);

  const rows = Object.fromEntries(financeEntries) as Record<string, Record<string, unknown>[]>;
  const twin = buildFinancialTwinSnapshot({
    income: rows.income ?? [], expenses: rows.expenses ?? [], debts: rows.debts ?? [], savings: rows.savings ?? [], investments: rows.investments ?? [],
  }, currencyFromProfile((profileResult.data ?? null) as Record<string, unknown> | null));

  const decisions = (decisionsResult.data ?? []).map((row: any) => ({
    id: row.id, title: String(row.decision_title ?? ''), status: row.status, riskScore: Number(row.risk_score ?? 0), updatedAt: row.updated_at,
  }));
  const summary = buildEconomicHomeSummary(twin, [], decisions);
  const copy = COPY[lang];
  const now = new Date().toISOString();
  const events: SmartNotification[] = [];
  const add = (event: Omit<SmartNotification, 'status' | 'createdAt' | 'isDynamic'>) => events.push({ ...event, status: 'unread', createdAt: now, isDynamic: true });

  if (summary.riskCode === 'monthly_deficit') add({ id: 'economic:risk:monthly-deficit', title: copy.deficitTitle, message: copy.deficitMessage, type: 'expense', severity: 'danger', sourceModule: 'economic_intelligence', actionUrl: '/dashboard' });
  else if (summary.riskCode === 'low_liquidity') add({ id: 'economic:risk:low-liquidity', title: copy.liquidityTitle, message: copy.liquidityMessage, type: 'general', severity: 'warning', sourceModule: 'economic_intelligence', actionUrl: '/dashboard' });
  else if (summary.riskCode === 'high_debt') add({ id: 'economic:risk:high-debt', title: copy.debtTitle, message: copy.debtMessage, type: 'general', severity: 'warning', sourceModule: 'economic_intelligence', actionUrl: '/debts' });

  const opportunityMessage = summary.opportunityCode === 'build_liquidity' ? copy.buildLiquidity
    : summary.opportunityCode === 'reduce_debt' ? copy.reduceDebt
      : summary.opportunityCode === 'invest_surplus' ? copy.investSurplus
        : summary.opportunityCode === 'improve_data' ? copy.improveData
          : null;
  if (opportunityMessage && twin.dataQuality.completeness >= 0.8) add({ id: `economic:opportunity:${summary.opportunityCode}`, title: copy.opportunityTitle, message: opportunityMessage, type: 'general', severity: 'info', sourceModule: 'economic_intelligence', actionUrl: summary.opportunityCode === 'invest_surplus' ? '/decisions/simulator' : '/dashboard' });

  if (summary.attentionDecision?.id) add({ id: `economic:decision:${summary.attentionDecision.id}`, title: copy.decisionTitle, message: copy.decisionMessage(summary.attentionDecision.title), type: 'general', severity: summary.attentionDecision.status === 'high_risk' ? 'danger' : 'warning', sourceModule: 'economic_intelligence', sourceId: summary.attentionDecision.id, actionUrl: `/decisions?decision=${encodeURIComponent(summary.attentionDecision.id)}` });

  return events;
}
