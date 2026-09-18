import 'server-only';
import type { EconomicStoredRow } from './storedRowTypes';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import type { SmartNotification, NotificationLang, SmartNotificationSeverity, SmartNotificationType } from '@/lib/notifications/generateNotifications';
import { buildFinancialTwinSnapshot } from './digitalTwin';
import { buildEconomicHomeSummary } from '@/lib/dashboard/economicHomeSummary';
import { loadCompleteEconomicRows } from './sourceRows.server';

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

type EventDraft = {
  eventKey: string;
  title: string;
  message: string;
  type: SmartNotificationType;
  severity: SmartNotificationSeverity;
  actionUrl: string;
  sourceId?: string | null;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function currencyFromProfile(profile: Record<string, unknown> | null) {
  for (const value of [profile?.default_currency, profile?.preferred_currency, profile?.currency]) {
    const currency = String(value ?? '').trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(currency)) return currency;
  }
  return 'KWD';
}

function riskFingerprint(code: string, twin: ReturnType<typeof buildFinancialTwinSnapshot>) {
  if (code === 'monthly_deficit') {
    const ratio = twin.monthlyIncome > 0 ? Math.abs(twin.monthlySurplus) / twin.monthlyIncome : 1;
    return ratio >= 0.2 ? 'severe' : ratio >= 0.1 ? 'moderate' : 'mild';
  }
  if (code === 'low_liquidity') return twin.runwayMonths !== null && twin.runwayMonths < 1 ? 'under-1m' : '1-3m';
  if (code === 'high_debt') return twin.debtServiceRatio !== null && twin.debtServiceRatio >= 0.5 ? 'over-50' : '35-50';
  return 'base';
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? ''));
}

function isProactiveEventKey(eventKey: string) {
  return eventKey.startsWith('risk:') || eventKey.startsWith('decision:') || eventKey.startsWith('opportunity:');
}

function normalizeStored(row: EconomicStoredRow | undefined, draft: EventDraft): SmartNotification {
  const status = row?.status === 'archived' ? 'archived' : row?.status === 'read' || row?.read === true ? 'read' : 'unread';
  return {
    id: String(row?.id ?? draft.eventKey),
    title: draft.title,
    message: draft.message,
    type: draft.type,
    severity: draft.severity,
    sourceModule: 'economic_intelligence',
    sourceId: draft.sourceId ?? null,
    actionUrl: draft.actionUrl,
    status,
    dueDate: null,
    createdAt: row?.created_at ?? new Date().toISOString(),
    isDynamic: false,
  };
}

function resolutionCodeForEventKey(eventKey: string) {
  if (eventKey.startsWith('risk:')) return 'risk_cleared_or_changed';
  if (eventKey.startsWith('decision:')) return 'decision_no_longer_requires_attention';
  if (eventKey.startsWith('opportunity:')) return 'opportunity_no_longer_current';
  return 'event_no_longer_current';
}

export async function loadProactiveEconomicEvents(userId: string, lang: NotificationLang): Promise<SmartNotification[]> {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('ECONOMIC_INTELLIGENCE_SERVER_NOT_CONFIGURED');

  const tableNames = {
    income: 'monthly_income_sources', expenses: 'expense_items', debts: 'debts', savings: 'savings_items', investments: 'investment_items',
  } as const;

  const [financeEntries, profileResult, decisionsResult] = await Promise.all([
    Promise.all(Object.entries(tableNames).map(async ([key, table]) => {
      return [key, await loadCompleteEconomicRows(admin, table, userId)] as const;
    })),
    admin.from('profiles').select('default_currency,preferred_currency,currency').eq('id', userId).abortSignal(AbortSignal.timeout(8000)).maybeSingle(),
    admin.from('user_decisions').select('id,decision_title,status,risk_score,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(20).abortSignal(AbortSignal.timeout(8000)),
  ]);

  // A failed source must not resolve existing durable warnings as if it were empty.
  if (profileResult.error) throw profileResult.error;
  if (decisionsResult.error) throw decisionsResult.error;

  const rows = Object.fromEntries(financeEntries) as Record<string, Record<string, unknown>[]>;
  const twin = buildFinancialTwinSnapshot({
    income: rows.income ?? [], expenses: rows.expenses ?? [], debts: rows.debts ?? [], savings: rows.savings ?? [], investments: rows.investments ?? [],
  }, currencyFromProfile((profileResult.data ?? null) as Record<string, unknown> | null));

  const decisions = (decisionsResult.data ?? []).map((row: EconomicStoredRow) => ({
    id: row.id, title: String(row.decision_title ?? ''), status: row.status, riskScore: Number(row.risk_score ?? 0), updatedAt: row.updated_at,
  }));
  const summary = buildEconomicHomeSummary(twin, [], decisions);
  const copy = COPY[lang];
  const drafts: EventDraft[] = [];

  if (summary.riskCode === 'monthly_deficit') drafts.push({ eventKey: `risk:monthly-deficit:${riskFingerprint(summary.riskCode, twin)}`, title: copy.deficitTitle, message: copy.deficitMessage, type: 'expense', severity: 'danger', actionUrl: '/dashboard' });
  else if (summary.riskCode === 'low_liquidity') drafts.push({ eventKey: `risk:low-liquidity:${riskFingerprint(summary.riskCode, twin)}`, title: copy.liquidityTitle, message: copy.liquidityMessage, type: 'general', severity: 'warning', actionUrl: '/dashboard' });
  else if (summary.riskCode === 'high_debt') drafts.push({ eventKey: `risk:high-debt:${riskFingerprint(summary.riskCode, twin)}`, title: copy.debtTitle, message: copy.debtMessage, type: 'general', severity: 'warning', actionUrl: '/debts' });

  const opportunityMessage = summary.opportunityCode === 'build_liquidity' ? copy.buildLiquidity
    : summary.opportunityCode === 'reduce_debt' ? copy.reduceDebt
      : summary.opportunityCode === 'invest_surplus' ? copy.investSurplus
        : summary.opportunityCode === 'improve_data' ? copy.improveData
          : null;
  if (opportunityMessage && twin.dataQuality.completeness >= 0.8) drafts.push({
    eventKey: `opportunity:${summary.opportunityCode}`,
    title: copy.opportunityTitle,
    message: opportunityMessage,
    type: 'general',
    severity: 'info',
    actionUrl: summary.opportunityCode === 'invest_surplus' ? '/decisions/simulator' : '/dashboard',
  });

  if (summary.attentionDecision?.id) drafts.push({
    eventKey: `decision:${summary.attentionDecision.id}:${summary.attentionDecision.status ?? 'review'}:${Math.round((summary.attentionDecision.riskScore ?? 0) / 10) * 10}`,
    title: copy.decisionTitle,
    message: copy.decisionMessage(summary.attentionDecision.title),
    type: 'general',
    severity: summary.attentionDecision.status === 'high_risk' ? 'danger' : 'warning',
    sourceId: summary.attentionDecision.id,
    actionUrl: `/decisions?decision=${encodeURIComponent(summary.attentionDecision.id)}`,
  });

  const activeKeys = drafts.map(draft => draft.eventKey);
  const allOpenResult = await admin
    .from('notifications')
    .select('id,event_key,status,read,created_at,resolved_at,metadata')
    .eq('user_id', userId)
    .eq('source_module', 'economic_intelligence')
    .is('resolved_at', null);
  if (allOpenResult.error) throw allOpenResult.error;

  const now = new Date().toISOString();
  const staleRows = (allOpenResult.data ?? []).filter((row: EconomicStoredRow) => {
    const eventKey = String(row.event_key ?? '');
    return isProactiveEventKey(eventKey) && !activeKeys.includes(eventKey);
  });
  for (const row of staleRows) {
    const resolutionCode = resolutionCodeForEventKey(String(row.event_key));
    const previousMetadata = asObject(row.metadata);
    const { error } = await admin.from('notifications').update({
      resolved_at: now,
      resolution_code: resolutionCode,
      status: 'archived',
      read: true,
      read_at: row.read ? undefined : now,
      metadata: {
        ...previousMetadata,
        economic_intelligence: true,
        event_key: row.event_key,
        resolution_code: resolutionCode,
        resolution_observed_at: now,
        causal_claim: false,
      },
    }).eq('id', row.id).eq('user_id', userId).eq('source_module', 'economic_intelligence');
    if (error) throw error;
  }

  if (drafts.length === 0) return [];

  const existingResult = await admin
    .from('notifications')
    .select('id,event_key,status,read,created_at,resolved_at')
    .eq('user_id', userId)
    .eq('source_module', 'economic_intelligence')
    .in('event_key', activeKeys);
  if (existingResult.error) throw existingResult.error;

  const existing = new Map((existingResult.data ?? []).filter((row: EconomicStoredRow) => !row.resolved_at).map((row: EconomicStoredRow) => [String(row.event_key), row]));
  const missing = drafts.filter(draft => !existing.has(draft.eventKey));
  if (missing.length > 0) {
    const insertResult = await admin.from('notifications').insert(missing.map(draft => ({
      user_id: userId,
      type: draft.severity === 'danger' || draft.severity === 'warning' ? 'warning' : 'info',
      title: draft.title,
      message: draft.message,
      read: false,
      link: draft.actionUrl,
      severity: draft.severity,
      source_module: 'economic_intelligence',
      source_id: draft.sourceId && isUuid(draft.sourceId) ? draft.sourceId : null,
      action_url: draft.actionUrl,
      status: 'unread',
      event_key: draft.eventKey,
      metadata: { economic_intelligence: true, event_key: draft.eventKey, causal_claim: false },
    }))).select('id,event_key,status,read,created_at,resolved_at');
    if (insertResult.error && insertResult.error.code !== '23505') throw insertResult.error;
    for (const row of insertResult.data ?? []) existing.set(String(row.event_key), row);
  }

  return drafts.map(draft => normalizeStored(existing.get(draft.eventKey), draft));
}
