import type { RiskLocale } from '@/lib/portfolio-risk/current';

export const RISK_CONNECTION_COPY = {
  ar: {
    refresh: 'إعادة فحص السجل التاريخي', source: 'مصدر التقييم', calendar: 'تقويم التقييم', annualization: 'فترات السنوية', verified: 'تاريخ التحقق',
    notImported: 'لم يصل سجل تاريخي معتمد بعد. لقطات الموصل العادية لا تكفي لإثبات اكتمال المحفظة.',
    positions: 'لا يمكن إثبات اكتمال المراكز أو مطابقة نطاق السجل مع استثماراتك المسجلة.',
    calendarMissing: 'تقويم التقييم المستقل غير معتمد، أو توجد أيام أو أوقات تقييم غير متطابقة.',
    coverage: 'السجل لا يثبت اكتمال المراكز عبر الزمن والنقد والتدفقات والإجراءات المؤسسية. هذه النسخة لا تدعم الديون أو البيع على المكشوف.',
    fx: 'توثيق تحويل العملات أو سياسة التقييم غير مكتمل. لن نستخدم سعر صرف اليوم للماضي.',
    scope: 'نطاق الحساب أو عملة السجل لا يطابقان المحفظة الحالية.',
    values: 'القيم التاريخية غير صالحة أو لا تتطابق المراكز والنقد مع صافي قيمة المحفظة.',
    auth: 'سجّل الدخول لقراءة تاريخ محفظتك.', mfa: 'أكمل التحقق الثنائي لعرض بيانات المحفظة.',
    disabled: 'التحليل التاريخي غير مفعّل في هذه البيئة.', rate: 'وصلت إلى حد إعادة الفحص. أعد المحاولة لاحقاً.',
    unavailable: 'تعذّر التحقق من السجل التاريخي. لم تُعرض أرقام بديلة.',
    limitation: 'النطاق: الاستثمارات المسجلة والنقد، دون ديون أو مراكز مكشوفة. التدفقات الخارجية محسوبة في نهاية الفترة؛ المراكز الحالية لا تُستخدم لإعادة بناء عوائد الماضي.',
  },
  en: {
    refresh: 'Check historical evidence again', source: 'Valuation source', calendar: 'Valuation calendar', annualization: 'Periods per year', verified: 'Verified at',
    notImported: 'No approved historical record has arrived. Ordinary connector snapshots do not establish complete portfolio coverage.',
    positions: 'Complete positions and the historical record scope cannot be reconciled with your recorded investments.',
    calendarMissing: 'The independent valuation calendar is not verified, or valuation days and cutoffs do not match.',
    coverage: 'Complete time-aware positions, cash, external flows and corporate actions are not established. Debt and short positions are not supported in this version.',
    fx: 'FX conversion evidence or the valuation policy is incomplete. Today’s FX rate will not be applied to history.',
    scope: 'The account scope or reporting currency does not match the current portfolio.',
    values: 'Historical values are invalid, or end positions plus cash do not reconcile to portfolio NAV.',
    auth: 'Sign in to read your portfolio history.', mfa: 'Complete two-factor verification to view portfolio data.',
    disabled: 'Historical analysis is not enabled in this environment.', rate: 'The check limit was reached. Try again later.',
    unavailable: 'Historical evidence could not be verified. No substitute figures are displayed.',
    limitation: 'Scope: recorded investments and cash, without debt or short positions. External flows are end-of-period; current positions are not used to reconstruct past returns.',
  },
  fr: {
    refresh: 'Vérifier à nouveau l’historique', source: 'Source de valorisation', calendar: 'Calendrier de valorisation', annualization: 'Périodes par an', verified: 'Vérifié le',
    notImported: 'Aucun historique approuvé reçu. Les instantanés ordinaires du connecteur ne prouvent pas la couverture complète du portefeuille.',
    positions: 'Les positions complètes et le périmètre historique ne peuvent pas être rapprochés des investissements enregistrés.',
    calendarMissing: 'Le calendrier indépendant n’est pas vérifié, ou les dates et heures de valorisation ne correspondent pas.',
    coverage: 'Les positions dans le temps, liquidités, flux externes et opérations sur titres ne sont pas entièrement établis. Dettes et positions courtes non prises en charge.',
    fx: 'La preuve des conversions de devises ou la politique de valorisation est incomplète. Le change actuel ne sera pas appliqué au passé.',
    scope: 'Le périmètre du compte ou la devise ne correspond pas au portefeuille actuel.',
    values: 'Les valeurs historiques sont invalides, ou positions finales et liquidités ne correspondent pas à la valeur liquidative.',
    auth: 'Connectez-vous pour consulter votre historique.', mfa: 'Terminez la vérification à deux facteurs pour consulter les données.',
    disabled: 'L’analyse historique n’est pas activée dans cet environnement.', rate: 'Limite de vérification atteinte. Réessayez plus tard.',
    unavailable: 'L’historique n’a pas pu être vérifié. Aucun chiffre de remplacement n’est affiché.',
    limitation: 'Périmètre : investissements et liquidités enregistrés, sans dettes ni positions courtes. Flux externes en fin de période ; les positions actuelles ne servent pas à reconstruire les rendements passés.',
  },
} as const;

export function historicalRiskErrorText(code: string, locale: RiskLocale) {
  const copy = RISK_CONNECTION_COPY[locale];
  switch (code) {
    case 'HISTORY_NOT_IMPORTED': case 'HISTORY_UNVERIFIED_SOURCE': return copy.notImported;
    case 'CANONICAL_INVESTMENTS_NOT_READY': case 'HISTORY_POSITION_COVERAGE_MISMATCH': case 'HISTORY_POSITION_IDENTITY_MISMATCH': return copy.positions;
    case 'HISTORY_INVALID_CALENDAR': case 'HISTORY_INCOMPLETE_DATES': case 'HISTORY_INVALID_TIMESTAMPS': return copy.calendarMissing;
    case 'HISTORY_INCOMPLETE_COVERAGE': return copy.coverage;
    case 'HISTORY_FX_OR_CALENDAR_UNVERIFIED': return copy.fx;
    case 'HISTORY_SCOPE_MISMATCH': return copy.scope;
    case 'HISTORY_NAV_RECONCILIATION_FAILED': case 'HISTORY_INVALID_VALUES': return copy.values;
    case 'UNAUTHENTICATED': return copy.auth;
    case 'MFA_REQUIRED': return copy.mfa;
    case 'RISK_FEATURE_DISABLED': return copy.disabled;
    case 'RATE_LIMITED': return copy.rate;
    default: return copy.unavailable;
  }
}
