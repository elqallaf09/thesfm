import { isCurrentRiskSnapshot, type CurrentRiskSnapshot, type RiskLocale } from './current';

/** Only an explicit latest personal-risk question triggers private portfolio access. */
export function isPortfolioRiskQuestion(messages: ReadonlyArray<{ role: string; content: string }>): boolean {
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user') return false;
  const text = last.content.normalize('NFKD').replace(/\p{M}/gu, '').replace(/ـ/g, '').replace(/[أإآ]/g, 'ا').toLowerCase().trim().replace(/[.!?؟]+$/g, '').replace(/\s+/g, ' ');
  return /^(?:قيم|حلل|تقييم|تحليل) مخاطر محفظتي(?: الاستثمارية)?$/.test(text) ||
    /^(?:assess|evaluate|analy[sz]e) (?:the )?risk(?:s)? (?:of |in )?my portfolio$/.test(text) ||
    /^(?:assess|evaluate|analy[sz]e) my portfolio(?:'s)? risk(?:s)?$/.test(text) ||
    /^(?:evalue|evaluez|analyse|analysez) (?:les )?risques de mon portefeuille$/.test(text);
}

export function currentRiskText(snapshot: CurrentRiskSnapshot, locale: RiskLocale): string {
  if (!isCurrentRiskSnapshot(snapshot)) return riskUnavailableText('INVALID_RISK_RESPONSE', locale);
  const pct = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 });
  const money = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(snapshot.totalValue);
  const share = pct.format(snapshot.concentration.largestWeight);
  const hhi = snapshot.concentration.hhi.toFixed(3);
  const at = snapshot.asOf;
  if (locale === 'ar') return `هذا تحليل جزئي للمراكز المسجلة، وليس تقييماً كاملاً للمخاطر.\nقيمة المراكز: ${money} ${snapshot.currency}. عدد السجلات: ${snapshot.holdingsCount}، وعدد الأصول بعد جمع المراكز المتكررة: ${snapshot.assetsCount}.\nأكبر أصل يمثل ${share}، ومؤشر التركّز HHI هو ${hhi}. ارتفاع التركّز يعني اعتماداً أكبر على عدد أقل من الأصول، وليس تنبؤاً بالخسارة.\nأقدم تقييم أو سعر صرف مستخدم: ${at}.\nلا يمكن حساب التقلب أو VaR أو CVaR أو أقصى تراجع أو درجة مخاطر نهائية دون سجل تاريخي موثق وتدفقات نقدية صحيحة. الديون والرافعة المالية والتداخل داخل الصناديق غير مشمولة. لا تُنفذ أي صفقة من هذا التحليل.`;
  if (locale === 'fr') return `Analyse partielle des positions enregistrées, et non évaluation complète du risque.\nValeur : ${money} ${snapshot.currency}. ${snapshot.holdingsCount} positions, ${snapshot.assetsCount} actifs après regroupement.\nLe plus grand actif représente ${share} ; indice de concentration HHI : ${hhi}. La concentration ne prédit pas une perte.\nValorisation ou taux de change le plus ancien : ${at}.\nLa volatilité, la VaR, la CVaR, le recul maximal et un score global nécessitent un historique vérifié et des flux fiables. Les dettes, le levier et les participations sous-jacentes des fonds ne sont pas couverts. Aucune transaction n’est exécutée.`;
  return `Partial analysis of recorded holdings, not a complete risk assessment.\nRecorded value: ${money} ${snapshot.currency}. ${snapshot.holdingsCount} positions and ${snapshot.assetsCount} assets after grouping repeated holdings.\nThe largest asset is ${share}; concentration HHI is ${hhi}. Concentration is not a loss forecast.\nOldest valuation or FX observation: ${at}.\nVolatility, VaR, CVaR, maximum drawdown and an overall risk score require verified history and cash flows. Debt, leverage and fund look-through are not covered. No trade is executed.`;
}

export function riskUnavailableText(code: string, locale: RiskLocale): string {
  const auth = code === 'UNAUTHENTICATED';
  const mfa = code === 'MFA_REQUIRED';
  const disabled = code === 'RISK_FEATURE_DISABLED';
  if (locale === 'ar') return auth ? 'سجّل الدخول لتحليل محفظتك.' : mfa ? 'أكمل التحقق الثنائي قبل قراءة بيانات المحفظة.' : disabled ? 'تحليل مخاطر المحفظة غير مفعّل حالياً؛ لن أقدّم تقييماً دون بيانات موثقة.' : 'تعذر إصدار تقييم موثوق. تحتاج المراكز وقيمها وأسعار الصرف إلى التحقق، كما يلزم سجل تاريخي وتدفقات نقدية لحساب المخاطر الكاملة. هذا لا يعني أن المحفظة منخفضة المخاطر.';
  if (locale === 'fr') return auth ? 'Connectez-vous pour analyser votre portefeuille.' : mfa ? 'Terminez la vérification à deux facteurs avant de consulter le portefeuille.' : disabled ? 'L’analyse du risque est désactivée. Aucun résultat ne sera inventé.' : 'Évaluation fiable indisponible : les positions, valorisations et taux de change doivent être vérifiés. Un historique et des flux fiables sont nécessaires. Cela ne signifie pas un risque faible.';
  return auth ? 'Sign in to analyze your portfolio.' : mfa ? 'Complete two-factor verification before accessing portfolio data.' : disabled ? 'Portfolio risk analysis is not enabled. No assessment will be invented.' : 'A reliable assessment is unavailable. Holdings, valuations and FX need verification; historical metrics also require verified history and cash flows. This does not mean the portfolio is low-risk.';
}
