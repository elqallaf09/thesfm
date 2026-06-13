// Helper functions for RouteDashboardPage
import { Printer, Download, Plus, Send } from 'lucide-react';
import type {
  PageKind, GoalItem, GoalRow, EntryKind, LangText, TranslateFn, SectionCard,
  IncomeSource, SmartExpense, MoneyItem, EntryRow,
} from '@/lib/routeDashboard/types';
import {
  money, sum, pick, progress, pageMeta, expenseText,
  categoryLabel, monthsBetween, editableKind,
} from '@/lib/routeDashboard/helpers';
import { calculateGoalProgress } from '@/lib/goalProgress';
import { isProjectLinkedExpenseRow, personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';

export function buildCards(kind: PageKind, data: ReturnType<typeof buildDataShape>, lang: string, currency = 'KWD'): SectionCard[] {
  const isAr = lang === 'ar';
  const insufficient = pick({
    ar: 'بيانات غير كافية',
    en: 'Insufficient data',
    fr: 'Données insuffisantes',
  }, lang);
  const common = {
    income: money(data.totalIncome, lang, currency),
    expenses: money(data.totalExpenses, lang, currency),
    savings: money(data.totalSavings, lang, currency),
    investments: money(data.totalInvestments, lang, currency),
    balance: money(data.balance, lang, currency),
  };

  if (kind === 'expenses') {
    const categoryCount = new Set(data.expenses.map(item => item.category || 'other')).size;
    const aiCount = data.expenses.filter(item => item.ai_extracted_data || item.ai_confidence_score).length;
    const receiptCount = data.expenses.filter(item => item.receipt_image_url || item.receipt_file_name).length;
    return [
      { title: { ar: 'إجمالي المصروفات', en: 'Total expenses', fr: 'Total des depenses' }, body: { ar: 'كل المصروفات المسجلة لهذا الحساب.', en: 'All recorded expenses for this account.', fr: 'Toutes les depenses enregistrees.' }, value: common.expenses, tone: '#EF4444' },
      { title: { ar: 'مصروفات بالذكاء الاصطناعي', en: 'AI scanned expenses', fr: 'Depenses scannees IA' }, body: { ar: 'فواتير تمت قراءتها أو اقتراحها بالذكاء الاصطناعي.', en: 'Receipts read or suggested by AI.', fr: 'Factures lues ou suggerees par IA.' }, value: String(aiCount), tone: 'var(--sfm-soft-cyan)' },
      { title: { ar: 'الفواتير المرفقة', en: 'Receipts attached', fr: 'Factures jointes' }, body: { ar: 'مصروفات تحتوي على صورة أو ملف فاتورة.', en: 'Expenses with receipt image or file.', fr: 'Depenses avec facture jointe.' }, value: String(receiptCount), tone: '#3B82F6' },
      { title: { ar: 'التصنيفات النشطة', en: 'Active categories', fr: 'Categories actives' }, body: { ar: 'تصنيفات مستخدمة في سجل المصروفات.', en: 'Categories used in your expense log.', fr: 'Categories utilisees dans le journal.' }, value: String(categoryCount), tone: '#22C55E' },
    ];
  }
  if (kind === 'income') return [
    { title: { ar: 'إجمالي الدخل', en: 'Total income' }, body: { ar: 'راتب، دخل جانبي، وأعمال.', en: 'Salary, side income, and business.' }, value: common.income, tone: '#22C55E' },
    { title: { ar: 'مصادر الدخل', en: 'Income sources' }, body: { ar: 'مصادر شهرية مسجلة فقط.', en: 'Recorded monthly sources only.', fr: 'Sources mensuelles enregistrées uniquement.' }, value: String(data.income.length), tone: 'var(--sfm-soft-cyan)' },
    { title: { ar: 'الصافي المتوقع', en: 'Expected net' }, body: { ar: 'الدخل ناقص المصروفات الحالية.', en: 'Income minus current expenses.' }, value: common.balance, tone: 'var(--sfm-foreground)' },
  ];
  if (kind === 'invest') return [
    { title: { ar: 'قيمة المحفظة', en: 'Portfolio value' }, body: { ar: 'إجمالي الاستثمارات المسجلة.', en: 'Total recorded investments.' }, value: common.investments, tone: '#3B82F6' },
    { title: { ar: 'المساهمة الشهرية', en: 'Monthly contribution', fr: 'Contribution mensuelle' }, body: { ar: 'أضف مساهمات شهرية فعلية لعرض هذا المؤشر.', en: 'Add real monthly contributions to show this metric.', fr: 'Ajoutez des contributions mensuelles réelles pour afficher cet indicateur.' }, value: insufficient, tone: '#22C55E' },
    { title: { ar: 'مستوى المخاطر', en: 'Risk level', fr: 'Niveau de risque' }, body: { ar: 'أضف توزيع الاستثمار لعرض مستوى المخاطر.', en: 'Add investment allocation to show risk level.', fr: 'Ajoutez la répartition des investissements pour afficher le risque.' }, value: insufficient, tone: 'var(--sfm-soft-cyan)' },
  ];
  if (kind === 'savings') return [
    { title: { ar: 'إجمالي المدخرات', en: 'Total savings' }, body: { ar: 'مجموع عمليات الادخار المسجلة.', en: 'Total recorded savings entries.' }, value: common.savings, tone: '#22C55E' },
    { title: { ar: 'عدد السجلات', en: 'Entries count' }, body: { ar: 'سجلات الادخار النشطة.', en: 'Active saving records.' }, value: String(data.savings.length), tone: 'var(--sfm-soft-cyan)' },
    { title: { ar: 'الصافي بعد الادخار', en: 'Net after savings' }, body: { ar: 'الدخل ناقص المصروفات والمدخرات.', en: 'Income minus expenses and savings.' }, value: money(data.balance - data.totalSavings, lang, currency), tone: '#3B82F6' },
  ];
  if (kind === 'goals') return [
    { title: { ar: 'الأهداف النشطة', en: 'Active goals' }, body: { ar: 'أهداف مالية قيد المتابعة.', en: 'Financial goals being tracked.' }, value: String(data.goals.length), tone: 'var(--sfm-soft-cyan)' },
    { title: { ar: 'إجمالي المستهدف', en: 'Target total' }, body: { ar: 'مجموع مبالغ الأهداف.', en: 'Combined target amounts.' }, value: money(data.goals.reduce((total, goal) => total + goal.target_amount, 0), isAr, currency), tone: '#3B82F6' },
    { title: { ar: 'تقدم حالي', en: 'Current progress' }, body: { ar: 'مجموع المبالغ الحالية داخل الأهداف.', en: 'Combined current goal progress.' }, value: money(data.goals.reduce((total, goal) => total + goal.current_amount, 0), isAr, currency), tone: '#22C55E' },
  ];
  if (kind === 'reports') return [
    { title: { ar: 'الدخل مقابل المصروفات', en: 'Income vs expenses' }, body: { ar: 'مؤشر التوازن المالي الحالي.', en: 'Current financial balance signal.' }, value: common.balance, tone: 'var(--sfm-foreground)' },
    { title: { ar: 'تقرير الادخار', en: 'Savings report' }, body: { ar: 'رصيد الادخار المسجل.', en: 'Recorded savings balance.' }, value: common.savings, tone: '#22C55E' },
    { title: { ar: 'تقرير الاستثمار', en: 'Investment report' }, body: { ar: 'إجمالي قيمة الاستثمارات.', en: 'Total investment value.' }, value: common.investments, tone: '#3B82F6' },
  ];
  return [
    { title: { ar: 'الصحة المالية', en: 'Financial health', fr: 'Santé financière' }, body: { ar: 'تحتاج إلى دخل ومصروفات فعلية لعرض النسبة.', en: 'Real income and expenses are required to show the score.', fr: 'Des revenus et dépenses réels sont requis pour afficher le score.' }, value: data.totalIncome > 0 && data.expenses.length > 0 ? `${progress(data.balance, data.totalIncome)}%` : insufficient, tone: '#06B6D4' },
    { title: { ar: 'فرصة ادخار', en: 'Savings opportunity' }, body: { ar: 'الفرق المتاح بعد المصروفات.', en: 'Potential surplus after expenses.' }, value: money(data.balance, lang, currency), tone: '#22C55E' },
    { title: { ar: 'تنبيه ذكي', en: 'Smart alert', fr: 'Alerte intelligente' }, body: { ar: 'أضف بيانات مالية كافية لعرض التنبيهات.', en: 'Add enough financial data to show alerts.', fr: 'Ajoutez suffisamment de données financières pour afficher les alertes.' }, value: insufficient, tone: 'var(--sfm-soft-cyan)' },
  ];
}

export function buildDataShape() {
  return {
    income: [] as IncomeSource[],
    expenses: [] as SmartExpense[],
    savings: [] as MoneyItem[],
    investments: [] as MoneyItem[],
    goals: [] as GoalItem[],
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    totalInvestments: 0,
    charityTotal: 0,
    balance: 0,
  };
}

export function buildRows(kind: PageKind, data: ReturnType<typeof buildDataShape>, lang: string, currency = 'KWD', t?: TranslateFn): EntryRow[] {
  const isAr = lang === 'ar';
  if (kind === 'goals') {
    return data.goals.map(goal => {
      const goalProgress = calculateGoalProgress(goal);
      return {
        id: goal.id,
        title: goal.name,
        subtitle: pick({ ar: `تقدم ${goalProgress.progressPercent}%، المتبقي ${money(goalProgress.remainingAmount, lang, currency)}`, en: `${goalProgress.progressPercent}% complete, remaining ${money(goalProgress.remainingAmount, lang, currency)}`, fr: `${goalProgress.progressPercent}% accompli, reste ${money(goalProgress.remainingAmount, lang, currency)}` }, lang),
        value: money(goalProgress.targetAmount, lang, currency),
      };
    });
  }

  if (kind === 'reports') {
    return [
      { id: 'income-vs-expenses', title: pick({ ar: 'الدخل مقابل المصروفات', en: 'Income vs expenses', fr: 'Revenus vs dépenses' }, lang), subtitle: pick({ ar: 'ملخص التدفق النقدي الحالي', en: 'Current cash flow summary', fr: 'Résumé des flux de trésorerie' }, lang), value: money(data.balance, lang, currency) },
      { id: 'savings-report', title: pick({ ar: 'تقرير الادخار', en: 'Savings report', fr: "Rapport d'épargne" }, lang), subtitle: pick({ ar: 'رصيد الادخار المسجل', en: 'Recorded savings balance', fr: "Solde d'épargne enregistré" }, lang), value: money(data.totalSavings, lang, currency) },
      { id: 'investment-report', title: pick({ ar: 'تقرير الاستثمار', en: 'Investment report', fr: "Rapport d'investissement" }, lang), subtitle: pick({ ar: 'قيمة المحفظة الحالية', en: 'Current portfolio value', fr: 'Valeur actuelle du portefeuille' }, lang), value: money(data.totalInvestments, lang, currency) },
    ];
  }

  if (kind === 'ai') {
    return [
      { id: 'reduce-expenses', title: pick({ ar: 'خفض المصروفات', en: 'Reduce expenses', fr: 'Réduire les dépenses' }, lang), subtitle: pick({ ar: 'راجع أعلى 3 بنود صرف هذا الشهر.', en: 'Review the top 3 spending items this month.', fr: 'Examinez les 3 principales dépenses du mois.' }, lang), value: money(data.totalExpenses, lang, currency) },
      { id: 'increase-savings', title: pick({ ar: 'زيادة الادخار', en: 'Increase savings', fr: "Augmenter l'épargne" }, lang), subtitle: pick({ ar: 'حوّل جزءًا من الصافي إلى هدف واضح.', en: 'Move part of your surplus into a clear goal.', fr: 'Transférez une partie de votre excédent vers un objectif.' }, lang), value: money(Math.max(data.balance * 0.2, 0), lang, currency) },
      { id: 'recurring-investing', title: pick({ ar: 'استثمار منتظم', en: 'Recurring investing', fr: 'Investissement régulier' }, lang), subtitle: pick({ ar: 'مساهمة شهرية صغيرة تحافظ على الاستمرارية.', en: 'A small monthly contribution keeps momentum.', fr: 'Une petite contribution mensuelle maintient la dynamique.' }, lang), value: money(data.totalIncome * 0.1, lang, currency) },
    ];
  }

  const source = kind === 'income' ? data.income : kind === 'invest' ? data.investments : kind === 'savings' ? data.savings : data.expenses;
  return source.map(item => ({
    id: item.id,
    title: item.name.replace(/^خيرية:\d{4}-\d{2}:/, ''),
    subtitle: item.created_at ? new Date(item.created_at).toLocaleDateString() : pick({ ar: 'سجل مالي', en: 'Financial record', fr: 'Relevé financier' }, lang),
    value: money(item.amount, lang, currency),
    item,
  }));
}

export function buildGoalAnalysis(goal: GoalItem, data: ReturnType<typeof buildDataShape>, lang: string, currency = 'KWD', t: TranslateFn) {
  const isAr = lang === 'ar';
  const progress = calculateGoalProgress(goal);
  const targetAmount = progress.targetAmount;
  const currentAmount = progress.currentAmount;
  const monthlyContribution = progress.monthlyContribution;
  const remainingAmount = progress.remainingAmount;
  const monthsRemaining = monthsBetween(new Date(), goal.deadline);
  const missing = [
    targetAmount <= 0 ? t('goal_missing_target') : '',
    !progress.hasCurrentAmount ? t('goal_missing_current') : '',
    monthlyContribution <= 0 ? t('goal_missing_contribution') : '',
    monthsRemaining <= 0 ? t('goal_missing_deadline') : '',
  ].filter(Boolean);
  const requiredMonthlySaving = monthsRemaining > 0
    ? remainingAmount / monthsRemaining
    : monthlyContribution > 0
      ? monthlyContribution
      : 0;
  const contribution = monthlyContribution;
  const adjustment = Math.max(requiredMonthlySaving - contribution, 0);
  const expenseRatio = data.totalIncome > 0 ? data.totalExpenses / data.totalIncome : 0;
  const availableSurplus = Math.max(data.totalIncome - data.totalExpenses - data.totalSavings, 0);
  const estimatedMonths = progress.monthsToGoal ?? 0;
  const estimatedCompletion = monthsRemaining > 0
    ? `${monthsRemaining} ${t('goal_months')}`
    : estimatedMonths > 0
      ? `${estimatedMonths} ${t('goal_months')}`
      : t('goal_unknown_completion');
  const ratio = requiredMonthlySaving > 0 ? contribution / requiredMonthlySaving : 1;
  const riskClass = contribution <= 0 || ratio < 0.55 ? 'high' : ratio < 0.95 ? 'medium' : 'low';
  const riskLabel = riskClass === 'low' ? t('goal_risk_low') : riskClass === 'medium' ? t('goal_risk_medium') : t('goal_risk_high');
  const statusLabel = riskClass === 'low' ? t('goal_status_on_track') : riskClass === 'medium' ? t('goal_status_needs_adjustment') : t('goal_status_high_risk');
  const suggestedExpenseReduction = data.totalExpenses > 0
    ? Math.min(15, Math.max(5, Math.ceil((adjustment / data.totalExpenses) * 100)))
    : 0;
  const suggestedSavingIncrease = availableSurplus > 0 ? Math.min(adjustment, availableSurplus) : adjustment;

  const summary = contribution <= 0
    ? t('goal_ai_no_contribution')
    : riskClass === 'low'
      ? t('goal_ai_on_track')
      : riskClass === 'medium'
        ? t('goal_ai_needs_adjustment')
        : t('goal_ai_high_risk');

  const steps = [
    contribution <= 0
      ? t('goal_step_add_contribution')
      : t('goal_step_raise_contribution').replace('{amount}', money(Math.max(requiredMonthlySaving, contribution), isAr, goal.currency || currency)),
    suggestedExpenseReduction > 0
      ? t('goal_step_reduce_expenses').replace('{percent}', String(suggestedExpenseReduction))
      : t('goal_step_review_spending'),
    t('goal_step_automate'),
    suggestedSavingIncrease > 0
      ? t('goal_step_increase_saving').replace('{amount}', money(suggestedSavingIncrease, lang, goal.currency || currency))
      : t('goal_step_monthly_review'),
  ];

  return {
    targetAmount,
    currentAmount,
    monthlyContribution,
    remainingAmount,
    requiredMonthlySaving,
    estimatedCompletion,
    adjustment,
    monthsToGoal: progress.monthsToGoal,
    progressPercent: progress.progressPercent,
    hasCurrentAmount: progress.hasCurrentAmount,
    hasTargetAmount: progress.hasTargetAmount,
    hasMonthlyContribution: progress.hasMonthlyContribution,
    riskClass,
    riskLabel,
    statusLabel,
    missing,
    summary: summary
      .replace('{remaining}', money(remainingAmount, lang, goal.currency || currency))
      .replace('{required}', money(requiredMonthlySaving, lang, goal.currency || currency))
      .replace('{adjustment}', money(adjustment, lang, goal.currency || currency))
      .replace('{expenseRatio}', String(Math.round(expenseRatio * 100))),
    steps,
  };
}

export function buildInsights(kind: PageKind, data: ReturnType<typeof buildDataShape>, lang: string, currency = 'KWD', t?: TranslateFn) {
  const isAr = lang === 'ar';
  const ratio = data.totalIncome ? Math.round((data.totalExpenses / data.totalIncome) * 100) : 0;
  if (kind === 'expenses') {
    const byCategory = data.expenses.reduce<Record<string, number>>((acc, item) => {
      const key = item.category || 'other';
      acc[key] = (acc[key] || 0) + item.amount;
      return acc;
    }, {});
    const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    const avg = data.expenses.length ? data.totalExpenses / data.expenses.length : 0;
    const unusual = data.expenses.find(item => item.amount > avg * 2 && item.amount > 0);
    const recurring = data.expenses.filter(item => ['subscriptions', 'bills', 'loans'].includes(item.category || '')).reduce((sum, item) => sum + item.amount, 0);
    const saving = Math.max(recurring * 0.15, data.totalExpenses * 0.05);
    const trendLabel = ratio > 100
      ? pick({ ar: 'مصروفاتك أعلى من الدخل هذا الشهر.', en: 'Expenses are higher than income this month.', fr: 'Les depenses depassent les revenus ce mois-ci.' }, lang)
      : pick({ ar: `مصروفاتك تساوي ${ratio}% من الدخل.`, en: `Expenses equal ${ratio}% of income.`, fr: `Les depenses representent ${ratio}% des revenus.` }, lang);
    return [
      {
        title: pick({ ar: 'أعلى تصنيف', en: 'Highest category', fr: 'Categorie principale' }, lang),
        body: top
          ? pick({ ar: `أكثر تصنيف صرفت عليه هذا الشهر هو ${categoryLabel(top[0], lang)} بمبلغ ${money(top[1], lang, currency)}.`, en: `Your highest category is ${categoryLabel(top[0], lang)} at ${money(top[1], lang, currency)}.`, fr: `La categorie la plus elevee est ${categoryLabel(top[0], lang)} avec ${money(top[1], lang, currency)}.` }, lang)
          : pick({ ar: 'أضف مصروفات لعرض تحليل التصنيفات.', en: 'Add expenses to see category analysis.', fr: 'Ajoutez des depenses pour voir l analyse.' }, lang),
      },
      {
        title: pick({ ar: 'اتجاه الصرف', en: 'Spending trend', fr: 'Tendance des depenses' }, lang),
        body: trendLabel,
      },
      {
        title: pick({ ar: 'مراجعة ذكية', en: 'Smart review', fr: 'Revision intelligente' }, lang),
        body: unusual
          ? pick({ ar: `يوجد مصروف غير معتاد يحتاج مراجعة: ${unusual.name} (${money(unusual.amount, lang, currency)}).`, en: `Unusual expense needs review: ${unusual.name} (${money(unusual.amount, lang, currency)}).`, fr: `Depense inhabituelle a verifier: ${unusual.name} (${money(unusual.amount, lang, currency)}).` }, lang)
          : pick({ ar: 'لا توجد مصروفات غير معتادة حسب السجل الحالي.', en: 'No unusual expenses found in the current log.', fr: 'Aucune depense inhabituelle dans le journal actuel.' }, lang),
      },
      {
        title: pick({ ar: 'فرصة توفير', en: 'Saving opportunity', fr: 'Opportunite d economie' }, lang),
        body: pick({ ar: `يمكنك توفير ${money(saving, lang, currency)} إذا خفضت المصروفات المتكررة.`, en: `You could save ${money(saving, lang, currency)} by trimming repeated payments.`, fr: `Vous pourriez economiser ${money(saving, lang, currency)} en reduisant les paiements recurrents.` }, lang),
      },
    ];
  }
  const base = [
    {
      title: pick({ ar: 'نسبة الصرف', en: 'Spend ratio', fr: 'Ratio de dépenses' }, lang),
      body: pick({ ar: `مصروفاتك تساوي ${ratio}% من الدخل.`, en: `Expenses equal ${ratio}% of income.`, fr: `Vos dépenses représentent ${ratio}% des revenus.` }, lang),
    },
    {
      title: pick({ ar: 'مساحة الصافي', en: 'Net runway', fr: 'Marge nette' }, lang),
      body: pick({ ar: `الصافي الحالي ${money(data.balance, lang, currency)}.`, en: `Current net balance is ${money(data.balance, lang, currency)}.`, fr: `Solde net actuel: ${money(data.balance, lang, currency)}.` }, lang),
    },
  ];
  return [
    ...base,
    {
      title: pick({ ar: 'خطوة مقترحة', en: 'Suggested action', fr: 'Action suggérée' }, lang),
      body: suggestion(kind, lang),
    },
  ];
}

export function suggestion(kind: PageKind, lang: string) {
  const isAr = lang === 'ar';
  const text: Record<PageKind, LangText> = {
    expenses: { ar: 'ابدأ بأكبر تصنيف مصروفات وخفّضه 5%.', en: 'Start with your largest expense category and reduce it by 5%.', fr: 'Commencez par votre plus grande catégorie de dépenses et réduisez-la de 5%.' },
    income: { ar: 'قسّم الدخل إلى راتب، دخل جانبي، وأعمال لقراءة أوضح.', en: 'Split income into salary, side income, and business for cleaner tracking.', fr: 'Divisez vos revenus en salaire, revenus annexes et activité pour un suivi plus clair.' },
    invest: { ar: 'حافظ على مساهمة شهرية ثابتة قبل زيادة المخاطر.', en: 'Keep a steady monthly contribution before increasing risk.', fr: 'Maintenez une contribution mensuelle stable avant d\'augmenter le risque.' },
    savings: { ar: 'حدد هدفًا شهريًا للادخار وراقب تقدمك في كل دورة.', en: 'Set a monthly savings target and track your progress each cycle.', fr: 'Fixez un objectif d\'épargne mensuel et suivez votre progression à chaque cycle.' },
    goals: { ar: 'اربط كل هدف بمبلغ شهري صغير قابل للاستمرار.', en: 'Attach every goal to a small sustainable monthly amount.', fr: 'Associez chaque objectif à un montant mensuel modeste et durable.' },
    reports: { ar: 'اطبع التقرير قبل نهاية الشهر لمراجعة قراراتك.', en: 'Print the report before month-end to review decisions.', fr: 'Imprimez le rapport avant la fin du mois pour revoir vos décisions.' },
    ai: { ar: 'اسأل المساعد عن أفضل قرار واحد لهذا الأسبوع.', en: 'Ask the assistant for one best action this week.', fr: 'Demandez à l\'assistant la meilleure action à prendre cette semaine.' },
  };
  return pick(text[kind], lang);
}

export function sectionTitle(kind: PageKind, lang: string) {
  const isAr = lang === 'ar';
  const text: Record<PageKind, LangText> = {
    expenses: { ar: 'آخر المصروفات والتصنيفات', en: 'Recent expenses and categories', fr: 'Dépenses récentes et catégories' },
    income: { ar: 'مصادر الدخل والتوزيع', en: 'Income sources and distribution', fr: 'Sources de revenus et répartition' },
    invest: { ar: 'بطاقات المحفظة وفئات الاستثمار', en: 'Portfolio cards and investment categories', fr: 'Portefeuille et catégories d\'investissement' },
    savings: { ar: 'سجلات الادخار والمبالغ', en: 'Savings records and amounts', fr: 'Relevés d\'épargne et montants' },
    goals: { ar: 'بطاقات تقدم الأهداف', en: 'Goal progress cards', fr: 'Cartes de progression des objectifs' },
    reports: { ar: 'ملخص التقارير المالية', en: 'Financial report summary', fr: 'Résumé des rapports financiers' },
    ai: { ar: 'بطاقات العمل الذكية', en: 'Smart action cards', fr: 'Cartes d\'actions intelligentes' },
  };
  return pick(text[kind], lang);
}

export function summaryTitle(kind: PageKind, lang: string) {
  const isAr = lang === 'ar';
  const text: Record<PageKind, LangText> = {
    expenses: { ar: 'ملخص المصروفات الشهري', en: 'Monthly expense summary', fr: 'Résumé des dépenses mensuelles' },
    income: { ar: 'ملخص توزيع الدخل', en: 'Income distribution summary', fr: 'Résumé de la répartition des revenus' },
    invest: { ar: 'ملخص المساهمة الاستثمارية', en: 'Investment contribution summary', fr: 'Résumé de la contribution investissement' },
    savings: { ar: 'ملخص المدخرات المسجلة', en: 'Recorded savings summary', fr: 'Résumé de l\'épargne enregistrée' },
    goals: { ar: 'ملخص تقدم الادخار', en: 'Savings progress summary', fr: 'Résumé de la progression de l\'épargne' },
    reports: { ar: 'جاهز للتصدير والطباعة', en: 'Ready to export and print', fr: 'Prêt à exporter et imprimer' },
    ai: { ar: 'واجهة المساعد', en: 'Assistant interface', fr: 'Interface de l\'assistant' },
  };
  return pick(text[kind], lang);
}

export function summaryText(kind: PageKind, data: ReturnType<typeof buildDataShape>, lang: string, currency = 'KWD') {
  const isAr = lang === 'ar';
  const values: Record<PageKind, LangText> = {
    expenses: { ar: `إجمالي المصروفات الحالي ${money(data.totalExpenses, lang, currency)} مع ${data.expenses.length} سجل.`, en: `Current expenses total ${money(data.totalExpenses, lang, currency)} across ${data.expenses.length} records.`, fr: `Total des dépenses: ${money(data.totalExpenses, lang, currency)} sur ${data.expenses.length} relevés.` },
    income: { ar: `الدخل الشهري الحالي ${money(data.totalIncome, lang, currency)} موزع على ${data.income.length} مصادر.`, en: `Monthly income is ${money(data.totalIncome, lang, currency)} across ${data.income.length} sources.`, fr: `Revenus mensuels: ${money(data.totalIncome, lang, currency)} sur ${data.income.length} sources.` },
    invest: { ar: `قيمة المحفظة ${money(data.totalInvestments, lang, currency)} مع مساهمة مقترحة ${money(data.totalIncome * 0.15, lang, currency)}.`, en: `Portfolio value is ${money(data.totalInvestments, lang, currency)} with suggested contribution ${money(data.totalIncome * 0.15, lang, currency)}.`, fr: `Valeur du portefeuille: ${money(data.totalInvestments, lang, currency)}, contribution suggérée: ${money(data.totalIncome * 0.15, lang, currency)}.` },
    savings: { ar: `إجمالي المدخرات ${money(data.totalSavings, lang, currency)} موزع على ${data.savings.length} سجلات.`, en: `Total savings are ${money(data.totalSavings, lang, currency)} across ${data.savings.length} entries.`, fr: `Épargne totale: ${money(data.totalSavings, lang, currency)} sur ${data.savings.length} relevés.` },
    goals: { ar: `مدخراتك الحالية ${money(data.totalSavings, lang, currency)} تقيس تقدم ${data.goals.length} أهداف.`, en: `Current savings of ${money(data.totalSavings, lang, currency)} measure progress across ${data.goals.length} goals.`, fr: `Épargne actuelle ${money(data.totalSavings, lang, currency)} pour ${data.goals.length} objectifs.` },
    reports: { ar: 'استخدم أزرار الطباعة والتصدير لحفظ نسخة من ملخصك المالي.', en: 'Use print and export actions to save a copy of your financial summary.', fr: 'Utilisez impression et export pour sauvegarder votre résumé financier.' },
    ai: { ar: 'اكتب سؤالك للحصول على مساعدة مالية موجهة حسب بياناتك.', en: 'Type a prompt to get financial guidance shaped by your data.', fr: 'Posez votre question pour obtenir des conseils financiers personnalisés.' },
  };
  return pick(values[kind], lang);
}

export function buildPrimaryActions(kind: PageKind, lang: string, openEntry: () => void, openGoal: () => void, focusAi: () => void, t?: TranslateFn) {
  const isAr = lang === 'ar';
  if (kind === 'reports') {
    return [
      { label: pick({ ar: 'طباعة', en: 'Print', fr: 'Imprimer' }, lang), icon: Printer, variant: 'print' as const, onClick: () => window.print() },
      { label: pick({ ar: 'تصدير', en: 'Export', fr: 'Exporter' }, lang), icon: Download, variant: 'default' as const, onClick: () => {
        const html = document.querySelector('.sfm-main')?.innerHTML || document.body.innerHTML;
        const blob = new Blob([`<!doctype html><html><head><meta charset="utf-8"><title>SFM Report</title></head><body>${html}</body></html>`], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sfm-report.html';
        a.click();
        URL.revokeObjectURL(url);
      } },
    ];
  }
  if (kind === 'ai') {
    return [
      { label: pick({ ar: 'اسأل الآن', en: 'Ask now', fr: 'Demander maintenant' }, lang), icon: Send, variant: 'default' as const, onClick: focusAi },
    ];
  }

  if (editableKind(kind)) {
    const labels: Record<EntryKind, LangText> = {
      expenses: { ar: 'إضافة مصروف', en: 'Add expense' },
      income: { ar: 'إضافة دخل', en: 'Add income' },
      invest: { ar: 'إضافة استثمار', en: 'Add investment' },
      savings: { ar: 'إضافة مدخرات', en: 'Add saving' },
    };
    return [
      { label: pick(labels[kind], lang), icon: Plus, variant: 'default' as const, onClick: openEntry },
    ];
  }

  const action: { label: LangText; onClick: () => void } = {
    label: { ar: 'إضافة هدف', en: 'Add goal' },
    onClick: openGoal,
  };
  return [
    { label: pick(action.label, lang), icon: Plus, variant: 'default' as const, onClick: action.onClick },
  ];
}

export const baseStyles = `
  .sfm-shell{min-height:100vh;background:var(--sfm-light-card);color:var(--sfm-foreground);display:flex;font-family:Tajawal,Arial,sans-serif}
  .sfm-spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(167,243,240,.2);border-top-color:var(--sfm-soft-cyan);animation:spin 1s linear infinite;margin:auto}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes skeleton-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
  .sfm-sidebar{width:250px;background:var(--sfm-foreground);border-left:1px solid rgba(167,243,240,.22);padding:22px 16px;position:sticky;top:0;height:100vh;color:var(--sfm-card);flex-shrink:0}
  [dir="ltr"] .sfm-sidebar{border-left:0;border-right:1px solid rgba(167,243,240,.22)}
  .brand{display:flex;align-items:center;gap:12px;margin-bottom:28px;cursor:pointer}
  .brand-mark{width:42px;height:42px;border-radius:12px;object-fit:cover;display:block}
  .brand strong{display:block;font-size:15px}.brand span{display:block;font-size:11px;color:rgba(255,255,255,.48);margin-top:2px}
  nav{display:grid;gap:7px}nav button,.mobile-panel button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;color:rgba(255,255,255,.62);padding:11px 12px;border-radius:12px;cursor:pointer;font:700 13px Tajawal,Arial,sans-serif;text-align:start}
  nav button:hover,nav button.active{background:rgba(167,243,240,.13);color:var(--sfm-soft-cyan)}
  .sfm-main{flex:1;padding:22px;max-width:1280px;margin:0 auto;width:100%;margin-inline-start:230px;min-width:0}
  .sfm-main.reports-main{width:calc(100% - 230px);max-width:1320px;padding:22px 24px 60px;margin-inline-start:230px;margin-inline-end:auto;overflow-x:hidden}
  .sfm-header{height:62px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}
  .guest-pill{display:inline-flex;align-items:center;padding:7px 11px;border-radius:999px;border:1px solid rgba(167,243,240,.24);background:rgba(167,243,240,.12);color:var(--sfm-muted);font-size:12px;font-weight:900;white-space:nowrap}
  .title-wrap{display:flex;align-items:center;gap:13px}.title-wrap p{font-size:11px;color:var(--sfm-muted);font-weight:700;margin:0 0 3px}.title-wrap h1{font-size:24px;margin:0;font-weight:900}
  .title-icon{width:44px;height:44px;border-radius:14px;background:color-mix(in srgb,var(--accent) 14%,#fff);color:var(--accent);display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 22%,transparent)}
  .icon-btn{width:40px;height:40px;border-radius:12px;border:1px solid rgba(167,243,240,.22);background:var(--sfm-card);color:var(--sfm-muted);display:grid;place-items:center;cursor:pointer}.menu-btn{display:none}
  .hero{background:linear-gradient(135deg,var(--sfm-foreground) 0%,var(--sfm-primary-dark) 62%,var(--sfm-soft-cyan) 140%);color:var(--sfm-card);border-radius:24px;padding:28px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;box-shadow:0 18px 45px rgba(3,18,37,.16);margin-bottom:18px}
  .eyebrow{display:inline-flex;padding:4px 10px;border-radius:999px;background:rgba(167,243,240,.15);color:var(--sfm-soft-cyan);font-size:11px;font-weight:800;margin-bottom:12px}.hero h2{font-size:34px;line-height:1.05;margin:0 0 9px}.hero p{max-width:640px;margin:0;color:rgba(255,255,255,.68);line-height:1.8;font-size:14px}
  .hero-actions{display:flex;gap:10px;flex-wrap:wrap}.primary-btn,.ghost-btn{height:42px;border-radius:13px;border:0;padding:0 15px;font:800 13px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;gap:8px;cursor:pointer;white-space:nowrap}.primary-btn{background:var(--sfm-soft-cyan);color:var(--sfm-foreground)}.ghost-btn{background:rgba(255,255,255,.08);color:var(--sfm-card);border:1px solid rgba(255,255,255,.12)}
  .notice{padding:12px 15px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);color:#B91C1C;border-radius:14px;margin-bottom:14px;font-size:13px;font-weight:700}
  .data-error-notice{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.data-error-notice strong{font-size:13px}.data-error-notice span{color:#7F1D1D}.data-error-notice small{color:#9A3412;background:rgba(255,255,255,.65);border-radius:999px;padding:4px 8px}.data-error-notice button{margin-inline-start:auto;border:0;border-radius:10px;background:var(--sfm-foreground);color:var(--sfm-soft-cyan);height:34px;padding:0 12px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}
  .kpi-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px}.kpi-card,.panel{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:20px;box-shadow:0 4px 22px rgba(3,18,37,.06)}
  .kpi-card{padding:18px;position:relative;overflow:hidden}.kpi-card>span{position:absolute;inset-inline-start:0;top:0;width:4px;height:100%}.kpi-card p{font-size:12px;color:var(--sfm-muted);font-weight:800;margin:0 0 7px}.kpi-card strong{font-size:23px;font-weight:900;display:block}.kpi-card small{display:block;margin-top:8px;color:var(--sfm-muted);font-size:12px;line-height:1.6}
  .content-grid{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(280px,.8fr);gap:18px}.reports-main .content-grid{grid-template-columns:minmax(0,1.7fr) minmax(300px,.7fr)}.panel{padding:20px;min-width:0}.panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.panel-head p{margin:0 0 4px;font-size:11px;color:var(--sfm-muted);font-weight:800}.panel-head h3{margin:0;font-size:18px}.loading-pill{font-size:11px;font-weight:800;color:var(--sfm-soft-cyan);background:rgba(167,243,240,.11);border-radius:999px;padding:5px 10px}
  .row-controls{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px}.row-search{flex:1;min-width:160px;height:38px;border:1.5px solid rgba(167,243,240,.22);border-radius:12px;padding:0 12px;background:var(--sfm-light-card);font:700 13px Tajawal,Arial,sans-serif;color:var(--sfm-foreground);outline:none}.row-search:focus{border-color:var(--sfm-soft-cyan);background:var(--sfm-card)}.row-select{height:38px;border:1.5px solid rgba(167,243,240,.22);border-radius:12px;padding:0 10px;background:var(--sfm-light-card);font:700 13px Tajawal,Arial,sans-serif;color:var(--sfm-foreground);outline:none;cursor:pointer}.row-select:focus{border-color:var(--sfm-soft-cyan)}.row-count{font-size:12px;font-weight:800;color:var(--sfm-muted);margin-bottom:10px;padding:6px 0;border-bottom:1px solid rgba(167,243,240,.1)}.load-more-btn{width:100%;margin-top:12px;padding:12px;border-radius:14px;border:1.5px dashed rgba(167,243,240,.3);background:transparent;color:var(--sfm-muted);font:800 13px Tajawal,Arial,sans-serif;cursor:pointer;transition:all .2s}.load-more-btn:hover{background:rgba(167,243,240,.08);border-color:var(--sfm-soft-cyan);color:#7a5a2a}
  .row-list{display:grid;gap:10px}.empty-state{padding:22px;border:1px dashed rgba(167,243,240,.25);border-radius:16px;color:var(--sfm-muted);text-align:center;font-size:13px;font-weight:800}.data-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid rgba(167,243,240,.08)}.data-row:last-child{border-bottom:0}.data-row strong{display:block;font-size:14px}.data-row span{display:block;color:#8B7A6D;font-size:12px;margin-top:4px}.money-amount{display:inline-flex;align-items:center;justify-content:center;min-height:38px;border-radius:13px;border:1px solid rgba(14,116,144,.18);background:linear-gradient(180deg,#F8FAFC,#ECFEFF);color:#0F172A;font-size:16px;font-weight:950;line-height:1.2;font-variant-numeric:tabular-nums;padding:7px 12px;white-space:nowrap;box-shadow:0 8px 20px rgba(15,23,42,.06)}.row-actions-wrap{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}.row-actions{display:flex;align-items:center;gap:6px}.row-action{width:34px;height:34px;border-radius:11px;border:1px solid rgba(167,243,240,.16);background:var(--sfm-card);color:var(--sfm-muted);display:grid;place-items:center;cursor:pointer;transition:all .18s ease}.row-action:hover{border-color:rgba(167,243,240,.45);color:var(--sfm-soft-cyan);background:rgba(167,243,240,.08);transform:translateY(-1px)}
.goal-card{background:var(--sfm-card);border:1px solid rgba(167,243,240,.16);border-radius:22px;padding:18px;box-shadow:0 8px 28px rgba(3,18,37,.07);display:grid;gap:15px;transition:all .22s ease}.goal-card:hover{transform:translateY(-2px);box-shadow:0 16px 38px rgba(3,18,37,.11)}.goal-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.goal-title-wrap{display:flex;align-items:center;gap:12px}.goal-icon{width:42px;height:42px;border-radius:14px;background:rgba(167,243,240,.13);display:grid;place-items:center;font-size:20px}.goal-title-wrap strong{display:block;font-size:16px;font-weight:900;color:var(--sfm-foreground)}.goal-title-wrap span{display:block;margin-top:4px;color:var(--sfm-muted);font-size:12px;font-weight:800}.goal-card-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.goal-edit-btn,.goal-delete-btn{height:38px;border-radius:13px;padding:0 12px;font:900 12px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;gap:7px;cursor:pointer;transition:all .2s ease}.goal-edit-btn{border:1px solid rgba(167,243,240,.28);background:linear-gradient(135deg,rgba(167,243,240,.16),rgba(248,251,255,.95));color:var(--sfm-muted);box-shadow:0 6px 18px rgba(167,243,240,.12)}.goal-delete-btn{border:1px solid rgba(239,68,68,.24);background:rgba(239,68,68,.07);color:#B91C1C;box-shadow:0 6px 18px rgba(239,68,68,.08)}.goal-edit-btn:hover{background:var(--sfm-soft-cyan);color:var(--sfm-foreground);transform:translateY(-1px)}.goal-delete-btn:hover{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.38);transform:translateY(-1px)}.confirm-icon.danger{background:rgba(239,68,68,.10);color:#B91C1C}.delete-target-name{display:block;margin:12px 0 2px;color:var(--sfm-foreground);font-size:14px}.goal-progress-row{display:flex;align-items:center;gap:10px}.goal-progress-track{height:10px;border-radius:999px;background:rgba(29,140,255,.10);overflow:hidden;flex:1}.goal-progress-track span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--sfm-primary),var(--sfm-accent))}.goal-progress-row b{color:var(--sfm-muted);font-size:13px}.goal-meta-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.goal-meta-grid div,.goal-ai-metrics div{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:14px;padding:10px}.goal-meta-grid span,.goal-ai-metrics span{display:block;color:var(--sfm-muted);font-size:11px;font-weight:900;margin-bottom:5px}.goal-meta-grid strong,.goal-ai-metrics b{font-size:13px;color:var(--sfm-foreground)}.goal-ai-card,.goal-modal-preview{border:1px solid rgba(167,243,240,.2);background:linear-gradient(180deg,var(--sfm-card),var(--sfm-light-card));border-radius:18px;padding:15px;display:grid;gap:12px}.goal-ai-head{display:flex;align-items:center;gap:9px;color:var(--sfm-muted)}.goal-ai-head svg{color:var(--sfm-soft-cyan)}.goal-ai-head strong{font-size:14px;font-weight:900}.risk-pill{margin-inline-start:auto;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900}.risk-pill.low{background:rgba(34,197,94,.12);color:#15803D}.risk-pill.medium{background:rgba(167,243,240,.16);color:var(--sfm-muted)}.risk-pill.high{background:rgba(239,68,68,.1);color:#B91C1C}.goal-ai-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.goal-ai-card p,.goal-modal-preview p{margin:0;color:var(--sfm-muted);font-size:13px;line-height:1.8;font-weight:700}.goal-ai-plan{background:rgba(255,255,255,.72);border-radius:14px;padding:12px}.goal-ai-plan strong{font-size:13px;color:var(--sfm-foreground)}.goal-ai-plan ol{margin:8px 18px 0;padding:0;color:var(--sfm-muted);font-size:12.5px;line-height:1.8;font-weight:700}.goal-modal{width:min(860px,100%);max-height:min(88vh,980px);overflow:auto}.goal-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.goal-form-grid label:first-child,.goal-form-grid .entry-actions,.goal-notes-field,.goal-ai-toggle,.goal-modal-preview{grid-column:1/-1}.goal-form-grid select,.goal-form-grid textarea{border:1.5px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);padding:0 13px;color:var(--sfm-foreground);font:800 14px Tajawal,Arial,sans-serif;outline:0}.goal-form-grid select{height:50px}.goal-form-grid textarea{min-height:92px;padding-top:12px;resize:vertical}.goal-form-grid select:focus,.goal-form-grid textarea:focus{border-color:var(--sfm-soft-cyan);box-shadow:0 0 0 4px rgba(167,243,240,.12);background:var(--sfm-card)}.currency-input-wrap{position:relative}.currency-input-wrap input{width:100%;padding-inline-start:58px}.currency-symbol{position:absolute;inset-inline-start:10px;top:50%;transform:translateY(-50%);min-width:38px;height:30px;border-radius:10px;background:rgba(167,243,240,.16);color:var(--sfm-muted);display:grid;place-items:center;font-size:12px;font-weight:900;z-index:1}.goal-ai-toggle{display:flex!important;align-items:center;justify-content:space-between;border:1px solid rgba(167,243,240,.14);background:var(--sfm-light-card);border-radius:16px;padding:12px 14px}.switch{width:54px;height:30px;border:0;border-radius:999px;background:rgba(29,140,255,.22);padding:3px;cursor:pointer;transition:.2s}.switch span{display:block;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.18);transition:.2s}.switch.active{background:var(--sfm-soft-cyan)}.switch.active span{transform:translateX(24px)}[dir="rtl"] .switch.active span{transform:translateX(-24px)}.preview-missing{background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.12);border-radius:14px;padding:12px;color:#B91C1C}.preview-missing strong{font-size:13px}.preview-missing ul{margin:8px 18px 0;padding:0;font-size:12.5px;line-height:1.8;font-weight:800}.form-error{grid-column:1/-1;border-radius:13px;padding:11px 13px;background:rgba(239,68,68,.08);color:#B91C1C;font-size:13px;font-weight:900}
  .insight-list{display:grid;gap:12px}.insight-list>div{display:flex;gap:10px;padding:12px;border-radius:14px;background:rgba(167,243,240,.07)}.insight-list svg{color:var(--sfm-soft-cyan);flex-shrink:0}.insight-list strong{display:block;font-size:13px}.insight-list span{display:block;font-size:12px;color:var(--sfm-muted);line-height:1.6;margin-top:3px}
  .summary-band,.ai-panel{margin-top:18px;background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:20px;padding:18px 20px;display:flex;align-items:center;gap:14px}.summary-band svg{color:var(--sfm-soft-cyan)}.summary-band strong,.ai-panel h3{font-size:16px}.summary-band p,.ai-panel p{margin:4px 0 0;color:var(--sfm-muted);line-height:1.7;font-size:13px}
  .savings-shell{min-height:auto}.savings-main{padding-bottom:32px}.savings-main .content-grid{align-items:start}.savings-main .panel{align-self:start}.savings-main .row-list{gap:0}.savings-main .empty-state{padding:18px}.savings-main .summary-band{margin-top:14px;padding:14px 16px;align-items:flex-start}.savings-main .summary-band p{line-height:1.6}.savings-main .data-row:last-child{padding-bottom:0}.savings-main .entry-overlay{position:fixed;min-height:0}
  .savings-main .data-row{padding:14px 0}.savings-main .money-amount{border-color:rgba(8,145,178,.24);background:linear-gradient(180deg,#FFFFFF,#ECFEFF);color:#0C4A6E;font-size:17px}
  .savings-guide{margin-top:18px;border:1px solid rgba(167,243,240,.20);border-radius:24px;background:linear-gradient(180deg,var(--sfm-card) 0%,rgba(236,254,255,.68) 100%);box-shadow:0 16px 44px rgba(3,18,37,.08);padding:22px;overflow:hidden}.savings-guide-head{max-width:820px;margin-bottom:18px}.savings-guide-eyebrow{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:rgba(167,243,240,.16);border:1px solid rgba(167,243,240,.24);color:#0E7490;font-size:12px;font-weight:950;padding:7px 11px;margin-bottom:12px}.savings-guide-eyebrow svg,.savings-guide-icon svg{color:var(--sfm-soft-cyan)}.savings-guide h2{font-size:26px;line-height:1.25;margin:0 0 8px;color:var(--sfm-foreground);font-weight:950}.savings-guide-head p{margin:0;color:var(--sfm-muted);line-height:1.8;font-size:14px;font-weight:800}.savings-guide-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.savings-guide-card{min-width:0;border:1px solid rgba(167,243,240,.18);border-radius:20px;background:rgba(255,255,255,.78);padding:17px;box-shadow:0 8px 24px rgba(3,18,37,.05)}.savings-guide-icon{width:42px;height:42px;border-radius:14px;background:rgba(167,243,240,.16);border:1px solid rgba(167,243,240,.22);display:grid;place-items:center;margin-bottom:11px}.savings-guide-card h3{margin:0 0 7px;font-size:17px;font-weight:950;color:var(--sfm-foreground)}.savings-guide-card p{margin:0;color:var(--sfm-muted);line-height:1.75;font-size:13px;font-weight:800}.savings-guide-card ul{margin:12px 18px 0;padding:0;color:var(--sfm-muted);font-size:12.5px;line-height:1.9;font-weight:800}.savings-guide-card li::marker{color:var(--sfm-soft-cyan);font-weight:900}.savings-guide-plan{margin-top:14px;border-radius:20px;border:1px solid rgba(167,243,240,.18);background:linear-gradient(135deg,rgba(167,243,240,.14),rgba(255,255,255,.70));padding:16px}.savings-guide-plan>strong{display:block;margin-bottom:12px;font-size:15px;font-weight:950;color:var(--sfm-foreground)}.savings-guide-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.savings-guide-step{min-width:0;border-radius:16px;background:var(--sfm-card);border:1px solid rgba(167,243,240,.16);padding:12px;display:grid;gap:8px}.savings-guide-step b{width:34px;height:30px;border-radius:10px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-soft-cyan));color:#061a2e;display:grid;place-items:center;font-size:12px;font-weight:950}.savings-guide-step span{color:var(--sfm-muted);font-size:12.5px;line-height:1.7;font-weight:850}
  .ai-panel{align-items:stretch;justify-content:space-between}.chat-history{display:grid;gap:8px;min-width:min(460px,100%);max-height:190px;overflow:auto;margin-bottom:10px}.chat-history>div{padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.6}.chat-history .user{background:var(--sfm-foreground);color:var(--sfm-card)}.chat-history .assistant{background:rgba(167,243,240,.11);color:var(--sfm-muted)}.chat-box{display:flex;gap:10px;min-width:min(460px,100%)}.chat-box input{height:46px;border:1.5px solid rgba(167,243,240,.22);border-radius:14px;padding:0 14px;background:var(--sfm-light-card);min-width:0;flex:1;font:600 14px Tajawal,Arial,sans-serif;color:var(--sfm-foreground)}.chat-box button{width:46px;border-radius:14px;border:0;background:var(--sfm-foreground);color:var(--sfm-soft-cyan);display:grid;place-items:center;cursor:pointer}.chat-box button:disabled{opacity:.55;cursor:wait}
  .mobile-panel{position:fixed;inset:12px;z-index:50;background:var(--sfm-foreground);border-radius:22px;padding:16px;color:var(--sfm-card);box-shadow:0 24px 80px rgba(0,0,0,.35)}.mobile-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.mobile-brand{display:flex;align-items:center;gap:10px}.mobile-brand img{border-radius:10px;object-fit:cover}
  .entry-overlay{position:fixed;inset:0;background:rgba(17,17,17,.42);backdrop-filter:blur(8px);z-index:80;display:grid;place-items:center;padding:18px}.entry-modal,.confirm-modal{width:min(480px,100%);background:var(--sfm-card);border:1px solid rgba(167,243,240,.2);border-radius:22px;box-shadow:0 26px 80px rgba(3,18,37,.26);padding:20px}.entry-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.entry-modal-head p{margin:0 0 4px;color:var(--sfm-muted);font-size:12px;font-weight:900}.entry-modal-head h3,.confirm-modal h3{margin:0;font-size:21px;font-weight:900}.entry-form{display:grid;gap:14px}.entry-form label{display:grid;gap:7px;font-weight:900;color:var(--sfm-muted);font-size:13px}.entry-form input{height:50px;border:1.5px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);padding:0 14px;color:var(--sfm-foreground);font:800 14px Tajawal,Arial,sans-serif;outline:0}.entry-form input:focus{border-color:var(--sfm-soft-cyan);box-shadow:0 0 0 4px rgba(167,243,240,.12);background:var(--sfm-card)}.entry-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}.primary-form-btn,.ghost-form-btn,.danger-form-btn{height:44px;border-radius:13px;padding:0 18px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer}.primary-form-btn{border:0;background:linear-gradient(135deg,var(--sfm-foreground),var(--sfm-primary-dark),var(--sfm-soft-cyan));color:#fff}.ghost-form-btn{border:1px solid rgba(167,243,240,.22);background:var(--sfm-card);color:var(--sfm-muted)}.danger-form-btn{border:0;background:#B91C1C;color:#fff}.primary-form-btn:disabled,.ghost-form-btn:disabled,.danger-form-btn:disabled{opacity:.58;cursor:wait}.confirm-modal{text-align:center}.confirm-icon{width:58px;height:58px;border-radius:18px;background:rgba(239,68,68,.10);color:#B91C1C;display:grid;place-items:center;margin:0 auto 12px}.confirm-modal p{margin:8px 0 4px;color:var(--sfm-muted);font-weight:800}.confirm-modal small{display:block;color:var(--sfm-muted);line-height:1.6;margin-bottom:14px}.confirm-modal .entry-actions{justify-content:center}.entry-toast{position:fixed;z-index:90;inset-inline-end:22px;bottom:22px;max-width:min(360px,calc(100vw - 32px));padding:13px 16px;border-radius:15px;font:900 13px Tajawal,Arial,sans-serif;box-shadow:0 18px 45px rgba(3,18,37,.18);animation:slideUp .22s ease}.entry-toast.ok{background:#ECFDF5;color:#047857;border:1px solid rgba(34,197,94,.2)}.entry-toast.err{background:#FEF2F2;color:#B91C1C;border:1px solid rgba(239,68,68,.2)}@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .savings-modal{width:min(780px,calc(100vw - 36px));max-height:90vh;overflow:auto;border-radius:24px;padding:22px;background:var(--sfm-card)}.savings-modal .entry-modal-head{align-items:flex-start}.savings-modal .entry-modal-head p{max-width:620px;line-height:1.6}.savings-form-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.savings-form-grid label{min-width:0}.savings-form-grid input,.savings-form-grid select,.savings-form-grid textarea{width:100%;min-width:0;min-height:50px;border:1.5px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);color:var(--sfm-foreground);padding:0 14px;font:800 14px Tajawal,Arial,sans-serif;outline:0}.savings-form-grid textarea{min-height:92px;resize:vertical;padding-top:12px;line-height:1.7}.savings-form-grid input:focus,.savings-form-grid select:focus,.savings-form-grid textarea:focus{border-color:var(--sfm-soft-cyan);box-shadow:0 0 0 4px rgba(167,243,240,.12);background:var(--sfm-card)}.savings-form-grid .currency-input-wrap input{padding-inline-start:58px}.savings-note-field,.savings-form-grid .form-error,.savings-form-grid .entry-actions{grid-column:1/-1}.savings-form-grid .entry-actions{margin-top:2px}.dark .savings-modal{background:#0f1d31;border-color:#1d3050;color:#e8eef6}.dark .savings-form-grid input,.dark .savings-form-grid select,.dark .savings-form-grid textarea{background:#13243a;border-color:#1d3050;color:#e8eef6}.dark .savings-form-grid input:focus,.dark .savings-form-grid select:focus,.dark .savings-form-grid textarea:focus{background:#0f1d31;border-color:#2fd6c0;box-shadow:0 0 0 4px rgba(47,214,192,.16)}.dark .savings-form-grid label,.dark .savings-modal .entry-modal-head p{color:#b8c7d9}
  .dark .sfm-main,.dark .expense-smart-main{--sfm-background:#0a1422;--sfm-light-card:#13243a;--sfm-card:#0f1d31;--sfm-card-elevated:#13243a;--sfm-input-bg:#0f1d31;--sfm-foreground:#e8eef6;--sfm-heading:#e8eef6;--sfm-body:#b8c7d9;--sfm-muted:#8ea6c3;--sfm-muted-readable:#b8c7d9;--sfm-border:#1d3050;--sfm-border-strong:rgba(47,214,192,.42);background:#0a1422;color:#e8eef6}
  .dark .expense-smart-main :is(.expense-card-row,.expense-empty,.monthly-grid div,.expense-modal-tabs,.receipt-drop,.receipt-attach-card,.receipt-preview-grid>div,.receipt-selected-count,.receipt-review-card,.receipt-review-card.review,.ai-result-card,.receipt-candidate-panel,.receipt-candidate-panel button,.receipt-detail-grid div,.receipt-items span),.dark .sfm-main :is(.kpi-card,.summary-card,.content-grid .panel,.data-row,.row-controls,.empty-state,.summary-band,.goal-card,.goal-meta-grid div,.goal-ai-card,.goal-ai-plan,.goal-ai-metrics div,.goal-modal-preview,.goal-ai-toggle,.entry-modal,.confirm-modal,.savings-modal){background:#0f1d31!important;border-color:#1d3050!important;color:#e8eef6!important;box-shadow:0 18px 46px rgba(0,0,0,.28)}
  .dark .expense-smart-main :is(.expense-card-row,.monthly-grid div,.receipt-preview-grid>div,.receipt-selected-count,.receipt-review-card.review,.receipt-detail-grid div,.receipt-items span),.dark .sfm-main :is(.data-row,.row-controls,.summary-band,.goal-meta-grid div,.goal-ai-metrics div,.goal-ai-toggle){background:#13243a!important}
  .dark .sfm-main :is(h1,h2,h3,h4,strong,b,.title-wrap h1,.kpi-card strong,.data-row strong,.goal-title-wrap strong,.goal-meta-grid strong,.goal-ai-metrics b),.dark .expense-smart-main :is(h1,h2,h3,h4,strong,b,.expense-row-main strong,.expense-row-amount>b,.monthly-grid b,.receipt-drop-copy strong,.receipt-attach-copy strong,.ai-result-card dd){color:#e8eef6!important}
  .dark .sfm-main .money-amount{background:rgba(47,214,192,.12)!important;border-color:rgba(47,214,192,.26)!important;color:#CFFAFE!important;box-shadow:0 10px 24px rgba(0,0,0,.18)!important}
  .dark .sfm-main :is(p,span,small,em,li,dd,label,.kpi-card span,.data-row span,.summary-band p,.goal-title-wrap span,.goal-ai-card p,.goal-modal-preview p,.goal-ai-plan ol),.dark .expense-smart-main :is(p,span,small,em,li,dd,label,.expense-row-main span,.expense-empty p,.monthly-grid span,.receipt-drop small,.receipt-attach-copy small,.ai-result-card p,.ai-result-card dt,.receipt-detail-grid span,.receipt-items span){color:#b8c7d9!important}
  .dark .sfm-main :is(input,select,textarea),.dark .expense-smart-main :is(input,select,textarea,.receipt-review-fields input,.receipt-review-fields select){background:#0f1d31!important;border-color:#1d3050!important;color:#e8eef6!important;-webkit-text-fill-color:#e8eef6}
  .dark .sfm-main :is(input,select,textarea):focus,.dark .expense-smart-main :is(input,select,textarea,.receipt-review-fields input,.receipt-review-fields select):focus{background:#13243a!important;border-color:#2fd6c0!important;box-shadow:0 0 0 4px rgba(47,214,192,.16)!important}
  .dark .sfm-main :is(input,textarea)::placeholder,.dark .expense-smart-main :is(input,textarea)::placeholder{color:#8ea6c3!important;-webkit-text-fill-color:#8ea6c3}
  .dark .sfm-main :is(.ghost-btn,.ghost-form-btn,.goal-edit-btn,.tab-chip,.filter-chip),.dark .expense-smart-main :is(.ghost-btn,.ghost-form-btn,.expense-modal-tabs button,.receipt-candidate-panel button){background:#13243a!important;border-color:#1d3050!important;color:#e8eef6!important}
  .dark .sfm-main :is(.primary-btn,.primary-form-btn),.dark .expense-smart-main :is(.primary-btn,.primary-form-btn){background:linear-gradient(135deg,#1d8cff,#18d4d4)!important;color:#061a2e!important;border-color:rgba(47,214,192,.38)!important}
  .dark .sfm-main :is(.empty-state,.expense-empty),.dark .expense-smart-main .expense-empty{border-style:dashed!important;background:#13243a!important}
  .dark .sfm-main :is(.risk-pill.low,.entry-toast.ok),.dark .expense-smart-main :is(.expense-badges em.ok,.extracted-field-badge){background:rgba(16,185,129,.16)!important;color:#86efac!important;border-color:rgba(16,185,129,.28)!important}
  .dark .sfm-main :is(.risk-pill.high,.preview-missing,.form-error,.entry-toast.err),.dark .expense-smart-main :is(.receipt-review-card.failed,.ghost-form-btn.danger-soft,.receipt-error){background:rgba(239,68,68,.14)!important;color:#fca5a5!important;border-color:rgba(239,68,68,.28)!important}
  .dark .sfm-main :is(.risk-pill.medium,.currency-symbol),.dark .expense-smart-main :is(.expense-badges em,.expense-badges em.ai,.receipt-attach-copy em,.receipt-debug-panel span){background:rgba(47,214,192,.10)!important;color:#b8c7d9!important;border-color:rgba(47,214,192,.24)!important}
  .dark .savings-main .savings-guide{background:linear-gradient(180deg,#0f1d31 0%,#13243a 100%)!important;border-color:#1d3050!important;box-shadow:0 18px 46px rgba(0,0,0,.28)!important;color:#e8eef6!important}.dark .savings-main .savings-guide-card,.dark .savings-main .savings-guide-plan,.dark .savings-main .savings-guide-step{background:#13243a!important;border-color:#1d3050!important;color:#e8eef6!important;box-shadow:none!important}.dark .savings-main .savings-guide-eyebrow,.dark .savings-main .savings-guide-icon{background:rgba(47,214,192,.12)!important;border-color:rgba(47,214,192,.28)!important;color:#2fd6c0!important}.dark .savings-main .savings-guide h2,.dark .savings-main .savings-guide h3,.dark .savings-main .savings-guide-plan>strong{color:#e8eef6!important}.dark .savings-main .savings-guide :is(p,li,span){color:#b8c7d9!important}.dark .savings-main .savings-guide-step b{background:linear-gradient(135deg,#1d8cff,#18d4d4)!important;color:#061a2e!important}
  .dark .goals-main{--sfm-background:#0a1422;--sfm-light-card:#13243a;--sfm-card:#0f1d31;--sfm-card-elevated:#13243a;--sfm-input-bg:#0f1d31;--sfm-foreground:#e8eef6;--sfm-heading:#e8eef6;--sfm-body:#b8c7d9;--sfm-muted:#8ea6c3;--sfm-muted-readable:#b8c7d9;--sfm-border:#1d3050;--sfm-border-strong:rgba(47,214,192,.42);background:#0a1422!important;color:#e8eef6!important}
  .dark .goals-main :is(.hero){background:radial-gradient(circle at 12% 10%,rgba(47,214,192,.22),transparent 32%),linear-gradient(135deg,#061a2e 0%,#0b2a4a 58%,#0f766e 140%)!important;border:1px solid rgba(47,214,192,.22);color:#e8eef6!important;box-shadow:0 24px 58px rgba(0,0,0,.34)}
  .dark .goals-main :is(.kpi-card,.panel,.goal-card,.goal-ai-card,.goal-modal-preview,.entry-modal,.confirm-modal){background:#0f1d31!important;border-color:#1d3050!important;color:#e8eef6!important;box-shadow:0 18px 46px rgba(0,0,0,.28)!important}
  .dark .goals-main :is(.goal-meta-grid div,.goal-ai-metrics div,.goal-ai-plan,.goal-ai-toggle,.summary-band,.empty-state,.row-controls){background:#13243a!important;border:1px solid #1d3050!important;color:#b8c7d9!important;box-shadow:none!important}
  .dark .goals-main :is(.goal-title-wrap strong,.goal-card strong,.goal-ai-head strong,.goal-ai-plan strong,.goal-meta-grid strong,.goal-ai-metrics b,.goal-progress-row b,.panel-head h3,.kpi-card strong,.summary-band strong,.entry-modal-head h3,.confirm-modal h3){color:#e8eef6!important}
  .dark .goals-main :is(.goal-title-wrap span,.goal-ai-card p,.goal-modal-preview p,.goal-ai-plan ol,.goal-meta-grid span,.goal-ai-metrics span,.panel-head p,.kpi-card p,.kpi-card small,.summary-band p,.entry-modal-head p,.confirm-modal p,.confirm-modal small,.empty-state){color:#b8c7d9!important}
  .dark .goals-main :is(.goal-card,.goal-ai-card,.goal-ai-plan,.goal-modal-preview,.panel) :is(p,span,small,li,label){color:#b8c7d9!important}.dark .goals-main :is(.goal-card,.goal-ai-card,.goal-ai-plan,.goal-modal-preview,.panel) :is(strong,b,h3){color:#e8eef6!important}
  .dark .goals-main :is(.goal-ai-card,.goal-modal-preview) .goal-ai-plan{background:linear-gradient(180deg,#13243a,#0f1d31)!important;border:1px solid #1d3050!important;color:#e8eef6!important;box-shadow:inset 0 1px 0 rgba(232,238,246,.04),inset 3px 0 0 rgba(47,214,192,.42)!important}.dark[dir="rtl"] .goals-main :is(.goal-ai-card,.goal-modal-preview) .goal-ai-plan{box-shadow:inset 0 1px 0 rgba(232,238,246,.04),inset -3px 0 0 rgba(47,214,192,.42)!important}
  .dark .goals-main :is(.goal-meta-grid div,.goal-ai-metrics div){background:#13243a!important;border:1px solid #1d3050!important}.dark .goals-main :is(.goal-meta-grid span,.goal-ai-metrics span){color:#b8c7d9!important}.dark .goals-main :is(.goal-meta-grid strong,.goal-ai-metrics b){color:#e8eef6!important;font-weight:900!important}
  .dark .goals-main .goal-ai-plan{box-shadow:inset 3px 0 0 rgba(47,214,192,.42)!important}.dark[dir="rtl"] .goals-main .goal-ai-plan{box-shadow:inset -3px 0 0 rgba(47,214,192,.42)!important}
  .dark .goals-main .goal-ai-plan li{color:#b8c7d9!important}.dark .goals-main .goal-ai-plan li::marker{color:#2fd6c0!important;font-weight:900}
  .dark .goals-main .insight-list>div{background:#13243a!important;border:1px solid #1d3050!important;color:#e8eef6!important}.dark .goals-main .insight-list svg{color:#2fd6c0!important}.dark .goals-main .insight-list strong{color:#e8eef6!important}.dark .goals-main .insight-list span{color:#b8c7d9!important}
  .dark .goals-main :is(.overview-link-btn,.strategic-doc-card,a[role="button"],.quick-grid button,.future-actions button){background:#13243a!important;border:1px solid #1d3050!important;color:#e8eef6!important}.dark .goals-main :is(.overview-link-btn,.strategic-doc-card,a[role="button"],.quick-grid button,.future-actions button):hover{background:rgba(47,214,192,.12)!important;border-color:rgba(47,214,192,.40)!important;color:#2fd6c0!important}
  .dark .goals-main :is(button:disabled,[aria-disabled="true"],.disabled-btn){opacity:.72!important;background:rgba(142,166,195,.12)!important;border-color:rgba(142,166,195,.22)!important;color:#8ea6c3!important;cursor:not-allowed!important}
  .dark .goals-main :is(.row-count,.data-row span,.goal-ai-head,.delete-target-name){color:#b8c7d9!important}
  .dark .goals-main .goal-progress-track{background:rgba(142,166,195,.20)!important;border:1px solid rgba(29,48,80,.85)}.dark .goals-main .goal-progress-track span{background:linear-gradient(90deg,#1d8cff,#2fd6c0)!important}
  .dark .goals-main .goal-icon,.dark .goals-main .currency-symbol{background:rgba(47,214,192,.12)!important;border:1px solid rgba(47,214,192,.25)!important;color:#2fd6c0!important}
  .dark .goals-main .risk-pill.low{background:rgba(16,185,129,.16)!important;border:1px solid rgba(16,185,129,.28)!important;color:#86efac!important}.dark .goals-main .risk-pill.medium{background:rgba(245,185,66,.14)!important;border:1px solid rgba(245,185,66,.28)!important;color:#f5b942!important}.dark .goals-main .risk-pill.high,.dark .goals-main .preview-missing{background:rgba(255,91,110,.12)!important;border:1px solid rgba(255,91,110,.25)!important;color:#ff8a98!important}
  .dark .goals-main .goal-edit-btn{background:linear-gradient(135deg,#1d8cff,#18d4d4)!important;border-color:rgba(47,214,192,.38)!important;color:#061a2e!important;box-shadow:0 12px 26px rgba(24,212,212,.18)!important}.dark .goals-main .goal-edit-btn:hover{filter:brightness(1.06);transform:translateY(-1px)}
  .dark .goals-main :is(.ghost-btn,.ghost-form-btn,.row-action){background:#13243a!important;border-color:#1d3050!important;color:#e8eef6!important}.dark .goals-main :is(.ghost-btn,.ghost-form-btn,.row-action):hover{background:rgba(47,214,192,.12)!important;border-color:rgba(47,214,192,.40)!important;color:#2fd6c0!important}.dark .goals-main .goal-delete-btn,.dark .goals-main .danger-form-btn{background:rgba(255,91,110,.12)!important;border:1px solid rgba(255,91,110,.30)!important;color:#ff8a98!important}.dark .goals-main :is(.goal-delete-btn,.danger-form-btn):hover{background:rgba(255,91,110,.18)!important;border-color:rgba(255,91,110,.42)!important;color:#ffc2c9!important}
  .dark .goals-main :is(input,select,textarea){background:#0f1d31!important;border-color:#1d3050!important;color:#e8eef6!important;-webkit-text-fill-color:#e8eef6}.dark .goals-main :is(input,select,textarea):focus{background:#13243a!important;border-color:#2fd6c0!important;box-shadow:0 0 0 4px rgba(47,214,192,.16)!important}
  .finance-header-lang{display:block}
  @media(max-width:1180px){.reports-main .content-grid{grid-template-columns:1fr}.reports-main .kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:920px){.sfm-sidebar{display:none}.menu-btn{display:grid}.sfm-main{padding:16px;margin-inline-start:0}.sfm-main.savings-main{padding-bottom:24px}.sfm-main.reports-main{width:100%;max-width:100%;margin-inline-start:0;margin-inline-end:0;padding:calc(84px + env(safe-area-inset-top)) 16px 24px}.hero{display:block}.hero-actions{margin-top:18px}.content-grid{grid-template-columns:1fr}.ai-panel{display:grid}.chat-box{min-width:0}.savings-guide-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:640px){.kpi-grid{grid-template-columns:1fr}.sfm-header{height:auto}.title-wrap h1{font-size:20px}.hero{padding:22px}.hero h2{font-size:27px}.data-row{align-items:flex-start;flex-direction:column}.row-actions-wrap{width:100%;justify-content:space-between}.money-amount{min-height:40px;font-size:16px}.summary-band{align-items:flex-start}.savings-main .summary-band{margin-top:12px;padding:14px}.savings-guide{padding:16px;border-radius:20px}.savings-guide h2{font-size:22px}.savings-guide-grid,.savings-guide-steps{grid-template-columns:1fr}.savings-guide-card,.savings-guide-plan{padding:14px}.primary-btn,.ghost-btn{width:100%;justify-content:center}.entry-actions{display:grid;grid-template-columns:1fr 1fr}.primary-form-btn,.ghost-form-btn,.danger-form-btn{width:100%}.savings-modal{width:calc(100% - 24px);max-height:90vh;padding:18px}.savings-form-grid{grid-template-columns:1fr}.savings-form-grid label,.savings-note-field,.savings-form-grid .form-error,.savings-form-grid .entry-actions{grid-column:auto}.savings-form-grid .entry-actions{grid-template-columns:1fr}.goal-card-head{display:grid}.goal-card-actions{display:grid;grid-template-columns:1fr;justify-content:stretch}.goal-edit-btn,.goal-delete-btn{width:100%;justify-content:center}.goal-meta-grid,.goal-ai-metrics,.goal-form-grid{grid-template-columns:1fr}.goal-form-grid label:first-child{grid-column:auto}}
`;

export const expenseSmartStyles = `
  .expense-smart-main{width:auto!important;max-width:none!important;margin:0!important;margin-inline-start:var(--sidebar-w)!important;margin-inline-end:0!important;padding:22px 24px 36px!important;overflow-x:clip!important}
  .expense-smart-content{display:grid;gap:16px;width:100%;max-width:none!important;max-inline-size:none!important;min-width:0;margin:0}
  .expense-hero{background:linear-gradient(135deg,var(--sfm-foreground) 0%,var(--sfm-primary-dark) 60%,var(--sfm-soft-cyan) 150%);color:var(--sfm-card);border-radius:26px;padding:28px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;box-shadow:0 20px 50px rgba(3,18,37,.18);margin-bottom:16px}
  .expense-hero .eyebrow{display:inline-flex;align-items:center;gap:7px}
  .expense-hero h1{font-size:34px;line-height:1.08;margin:0 0 9px;font-weight:900}
  .expense-hero p{max-width:720px;margin:0;color:rgba(255,255,255,.7);font-size:14px;line-height:1.8;font-weight:700}
  .expense-hero-actions{display:flex;gap:10px;flex-wrap:wrap}
  .expense-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:0;min-width:0;max-width:100%}
  .expense-dashboard-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,360px);gap:16px;align-items:start;min-width:0;max-width:100%}
  .expense-side-stack{display:grid;gap:16px;min-width:0;max-width:100%}
  .expense-list-panel{min-width:0;max-width:100%;overflow:hidden}
  .expense-list-panel .row-controls{min-width:0;max-width:100%;overflow:hidden}
  .expense-list-panel .row-search{flex:1 1 220px;min-width:0;max-width:100%}
  .expense-list-panel .row-select{flex:0 1 180px;min-width:0;max-width:100%}
  .expense-list-panel .row-count{overflow-wrap:anywhere}
  .expense-period-panel{display:grid;gap:12px;margin-bottom:12px;border:1px solid rgba(167,243,240,.16);border-radius:20px;background:linear-gradient(180deg,var(--sfm-card),var(--sfm-light-card));padding:14px;box-shadow:0 8px 24px rgba(3,18,37,.05);min-width:0;max-width:100%;overflow:hidden}
  .expense-period-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;min-width:0}
  .expense-period-head div{display:grid;gap:4px;min-width:0}
  .expense-period-head span,.expense-custom-period span{color:var(--sfm-muted);font-size:12px;font-weight:900}
  .expense-period-head strong{color:var(--sfm-foreground);font-size:15px;font-weight:950;overflow-wrap:anywhere}
  .expense-period-head small{max-width:340px;color:var(--sfm-muted);font-size:12px;font-weight:800;line-height:1.65;text-align:start}
  .expense-period-options{display:flex;gap:8px;overflow-x:auto;scrollbar-width:thin;padding-bottom:2px}
  .expense-period-options button{flex:0 0 auto;min-height:38px;border:1px solid rgba(167,243,240,.20);border-radius:999px;background:var(--sfm-card);color:var(--sfm-muted);padding:0 13px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer;transition:all .18s ease;white-space:nowrap}
  .expense-period-options button:hover,.expense-period-options button:focus-visible{border-color:rgba(24,212,212,.50);background:rgba(167,243,240,.10);color:var(--sfm-foreground);outline:none}
  .expense-period-options button.active{border-color:rgba(24,212,212,.65);background:linear-gradient(135deg,rgba(29,140,255,.14),rgba(24,212,212,.18));color:var(--sfm-foreground);box-shadow:0 8px 18px rgba(24,212,212,.10)}
  .expense-custom-period{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-width:0}
  .expense-custom-period label{display:grid;gap:6px;min-width:0}
  .expense-custom-period select{height:40px;border:1.5px solid rgba(167,243,240,.22);border-radius:12px;background:var(--sfm-card);padding:0 10px;color:var(--sfm-foreground);font:800 13px Tajawal,Arial,sans-serif;outline:none;min-width:0}
  .expense-period-badge{width:max-content;max-width:100%;margin:-2px 0 12px;border:1px solid rgba(29,140,255,.18);border-radius:999px;background:rgba(29,140,255,.08);color:var(--sfm-primary);padding:7px 11px;font-size:12px;font-weight:900;overflow-wrap:anywhere}
  .expense-list-skeleton{display:grid;gap:10px}
  .expense-list-skeleton span{height:76px;border-radius:18px;background:linear-gradient(90deg,rgba(167,243,240,.10),rgba(167,243,240,.22),rgba(167,243,240,.10));background-size:220% 100%;animation:skeleton-shimmer 1.25s ease-in-out infinite}
  .expense-card-list{display:grid;gap:10px;min-width:0;max-width:100%}
  .expense-card-row{display:flex;justify-content:space-between;gap:14px;min-width:0;max-width:100%;overflow:hidden;padding:15px;border:1px solid rgba(167,243,240,.13);border-radius:18px;background:linear-gradient(180deg,var(--sfm-card),#FFF9EF);box-shadow:0 8px 26px rgba(3,18,37,.06)}
  .expense-row-main{display:flex;align-items:flex-start;gap:12px;min-width:0;max-width:100%}
  .expense-row-icon{width:42px;height:42px;flex:0 0 42px;border-radius:14px;background:rgba(167,243,240,.13);color:var(--sfm-muted);display:grid;place-items:center}
  .expense-row-main>div:last-child{min-width:0;max-width:100%}
  .expense-row-main strong{display:block;max-width:100%;overflow-wrap:anywhere;word-break:break-word;font-size:15px;font-weight:900;color:var(--sfm-foreground);line-height:1.35}
  .expense-row-main span{display:block;max-width:100%;overflow-wrap:anywhere;margin-top:4px;color:var(--sfm-muted);font-size:12px;font-weight:800}
  .expense-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px;min-width:0;max-width:100%}
  .expense-badges em{max-width:100%;overflow-wrap:anywhere;font-style:normal;border-radius:999px;padding:5px 9px;background:#F2EBDD;color:var(--sfm-muted);border:1px solid rgba(167,243,240,.14);font-size:11px;font-weight:900}
  .expense-badges em.project{background:rgba(29,140,255,.12);color:var(--sfm-primary);border-color:rgba(29,140,255,.22)}
  .expense-badges em.ok{background:rgba(34,197,94,.1);color:#15803D;border-color:rgba(34,197,94,.18)}
  .expense-badges em.ai{background:rgba(167,243,240,.16);color:var(--sfm-muted);border-color:rgba(167,243,240,.25)}
  .expense-row-actions{display:flex;align-items:center;justify-content:flex-end;gap:12px;flex:0 1 auto;min-width:0;max-width:100%;flex-wrap:wrap}
  .expense-row-amount{display:grid;justify-items:end;gap:3px;min-width:0;max-width:100%}
  .expense-row-amount>b{max-width:100%;font-size:16px;color:var(--sfm-foreground);font-weight:900;white-space:nowrap}
  .expense-row-amount small{max-width:100%;color:var(--sfm-muted);font-size:11px;font-weight:850;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .expense-row-actions>div{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
  .expense-empty{text-align:center;border:1.5px dashed rgba(167,243,240,.26);border-radius:22px;padding:34px 20px;background:var(--sfm-card)}
  .expense-empty>div:first-child{width:66px;height:66px;margin:0 auto 14px;border-radius:20px;background:rgba(167,243,240,.13);color:var(--sfm-muted);display:grid;place-items:center}
  .expense-empty h3{margin:0 0 8px;font-size:20px;font-weight:900}
  .expense-empty p{max-width:520px;margin:0 auto 18px;color:var(--sfm-muted);line-height:1.8;font-weight:700}
  .expense-empty>div:last-child{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
  .monthly-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
  .monthly-grid div{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:15px;padding:12px}
  .monthly-grid span{display:block;color:var(--sfm-muted);font-size:11px;font-weight:900;margin-bottom:5px}
  .monthly-grid b{font-size:16px;color:var(--sfm-foreground)}
  .expense-floating-add{display:none}
  .expense-smart-modal{width:min(920px,100%);max-height:min(92vh,980px);overflow:auto;padding:22px}
  .expense-modal-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14);border-radius:16px;padding:5px;margin-bottom:16px}
  .expense-modal-tabs button{min-height:42px;border:0;border-radius:12px;background:transparent;color:var(--sfm-muted);font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;white-space:normal;line-height:1.35;padding:8px 10px}
  .expense-modal-tabs button.active{background:var(--sfm-foreground);color:var(--sfm-soft-cyan);box-shadow:0 8px 22px rgba(3,18,37,.14)}
  .expense-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .expense-form-grid select,.expense-form-grid textarea{border:1.5px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);padding:0 13px;color:var(--sfm-foreground);font:800 14px Tajawal,Arial,sans-serif;outline:0}
  .expense-form-grid select{height:50px}
  .expense-form-grid textarea{min-height:92px;padding-top:12px;resize:vertical}
  .expense-form-grid select:focus,.expense-form-grid textarea:focus{border-color:var(--sfm-soft-cyan);box-shadow:0 0 0 4px rgba(167,243,240,.12);background:var(--sfm-card)}
  .receipt-scan-area,.expense-notes,.expense-actions{grid-column:1/-1}
  .receipt-drop{position:relative;min-height:220px;border:1.5px dashed rgba(167,243,240,.34);border-radius:20px;background:linear-gradient(180deg,var(--sfm-card),var(--sfm-light-card));display:grid!important;place-items:center;text-align:center;cursor:pointer;overflow:visible;padding:18px;transition:all .18s ease}
  .receipt-drop:hover{border-color:rgba(24,212,212,.55);background:rgba(167,243,240,.08);box-shadow:0 14px 34px rgba(3,18,37,.08)}
  .receipt-drop:focus-within{border-color:var(--sfm-soft-cyan);box-shadow:0 0 0 4px rgba(167,243,240,.16)}
  .receipt-drop input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:2}
  .receipt-drop img{width:100%;max-height:320px;object-fit:contain;border-radius:16px}
  .receipt-drop span{display:grid;place-items:center;gap:8px;color:var(--sfm-muted);font-weight:900}
  .receipt-drop .receipt-drop-copy{max-width:min(640px,100%);color:var(--sfm-foreground)}
  .receipt-drop-copy svg{color:var(--sfm-soft-cyan)}
  .receipt-drop-copy strong{display:block;font-size:17px;font-weight:900;color:var(--sfm-foreground);white-space:normal;overflow-wrap:anywhere}
  .receipt-drop small{display:block;color:var(--sfm-muted);font-size:12px;font-weight:800}
  .receipt-drop-copy small{max-width:560px;line-height:1.7;white-space:normal;overflow-wrap:anywhere}
  .receipt-attach-card{grid-column:1/-1;position:relative;display:flex!important;align-items:center;gap:14px;min-width:0;min-height:104px;border:1.5px solid rgba(167,243,240,.28);border-radius:18px;background:linear-gradient(135deg,var(--sfm-card),var(--sfm-light-card));padding:16px 18px!important;cursor:pointer;color:var(--sfm-foreground);box-shadow:0 8px 24px rgba(3,18,37,.06);transition:all .18s ease}
  .receipt-attach-card:hover{border-color:rgba(24,212,212,.55);background:rgba(167,243,240,.08);box-shadow:0 14px 32px rgba(3,18,37,.09);transform:translateY(-1px)}
  .receipt-attach-card:focus-within{border-color:var(--sfm-soft-cyan);box-shadow:0 0 0 4px rgba(167,243,240,.16)}
  .receipt-attach-card input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:2}
  .receipt-attach-icon{width:46px;height:46px;flex:0 0 46px;border-radius:15px;background:rgba(167,243,240,.16);color:var(--sfm-soft-cyan);display:grid;place-items:center}
  .receipt-attach-copy{display:grid!important;gap:5px;min-width:0;color:var(--sfm-muted)}
  .receipt-attach-copy strong{font-size:15px;font-weight:900;color:var(--sfm-foreground);line-height:1.35;white-space:normal;overflow-wrap:anywhere}
  .receipt-attach-copy small{font-size:12px;line-height:1.7;color:var(--sfm-muted);font-weight:800;white-space:normal;overflow-wrap:anywhere}
  .receipt-attach-copy em{width:fit-content;max-width:100%;font-style:normal;border-radius:999px;background:rgba(167,243,240,.14);border:1px solid rgba(167,243,240,.22);padding:5px 9px;color:var(--sfm-foreground);font-size:11px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .receipt-preview-grid{width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;padding:12px}
  .receipt-preview-grid>div{min-width:0;background:var(--sfm-card);border:1px solid rgba(167,243,240,.16);border-radius:16px;padding:8px;display:grid;gap:7px;place-items:center}
  .receipt-preview-grid img{width:100%;height:112px;max-height:112px;object-fit:contain;border-radius:12px}
  .receipt-preview-grid small{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .receipt-selected-count{margin-top:9px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.18);border-radius:13px;padding:9px 11px;color:var(--sfm-muted);font-size:12px;font-weight:900}
  .receipt-scan-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end;margin-top:10px}
  .receipt-error{display:grid;gap:5px;border:1px solid rgba(245,158,11,.26);background:rgba(245,158,11,.10);color:#92400E;border-radius:15px;padding:12px 14px;font-size:13px;font-weight:850;margin-top:10px;line-height:1.65}
  .receipt-error strong{display:block;color:var(--sfm-foreground);font-size:14px;font-weight:950}
  .receipt-error span,.receipt-error small{display:block;color:inherit}
  .receipt-error.provider-unavailable{border-color:rgba(29,140,255,.24);background:rgba(29,140,255,.08);color:var(--sfm-muted)}
  .ghost-form-btn.danger-soft{color:#B91C1C;border-color:rgba(239,68,68,.22);background:rgba(239,68,68,.06)}
  .receipt-debug-panel{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;border:1px solid rgba(29,140,255,.18);background:rgba(29,140,255,.08);border-radius:13px;padding:10px 12px;color:var(--sfm-muted);font-size:12px;font-weight:800}
  .receipt-debug-panel strong{color:var(--sfm-foreground);font-size:12px}
  .receipt-debug-panel span{border-radius:999px;background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);padding:4px 7px;max-width:100%;overflow-wrap:anywhere}
  .receipt-batch-review{display:grid;gap:12px;margin-top:12px}
  .receipt-batch-head{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
  .receipt-review-card{border:1px solid rgba(167,243,240,.18);background:var(--sfm-card);border-radius:18px;padding:12px;display:grid;gap:10px}
  .receipt-review-card.failed{border-color:rgba(239,68,68,.25);background:rgba(239,68,68,.04)}
  .receipt-review-card.review{border-color:rgba(167,243,240,.35);background:var(--sfm-light-card)}
  .receipt-review-select{display:flex!important;align-items:center!important;justify-content:space-between;gap:10px;color:var(--sfm-muted);font-weight:900}
  .receipt-review-select input{width:18px;height:18px}
  .receipt-review-body{display:grid;grid-template-columns:100px 1fr;gap:12px;align-items:start}
  .receipt-review-body>img{width:100px;height:110px;object-fit:contain;border-radius:13px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12)}
  .receipt-review-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .receipt-review-fields input,.receipt-review-fields select{width:100%;min-width:0;border:1px solid rgba(167,243,240,.22);border-radius:11px;padding:9px;background:#fff;color:var(--sfm-foreground);font-family:Tajawal,Arial,sans-serif}
  .receipt-review-meta{display:flex;gap:8px;flex-wrap:wrap;color:var(--sfm-muted);font-size:12px;font-weight:900}
  .ai-result-card{margin-top:12px;border:1px solid rgba(167,243,240,.24);border-radius:18px;background:linear-gradient(180deg,var(--sfm-card),var(--sfm-light-card));padding:15px}
  .ai-result-card>div:first-child{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:#15803D}
  .extracted-field-badge{border-radius:999px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.2);color:#15803D;padding:4px 8px;font-size:11px;font-weight:900}
  .ai-result-card p{margin:8px 0 12px;color:var(--sfm-muted);font-weight:800}
  .receipt-candidate-panel{display:grid;gap:9px;margin:12px 0;padding:12px;border:1px solid rgba(167,243,240,.2);border-radius:15px;background:rgba(167,243,240,.08)}
  .receipt-candidate-panel>strong{font-size:13px;color:var(--sfm-foreground)}
  .receipt-candidate-panel>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
  .receipt-candidate-panel button{min-width:0;border:1px solid rgba(167,243,240,.2);border-radius:13px;background:var(--sfm-card);padding:9px 10px;display:grid;gap:4px;text-align:start;cursor:pointer;color:var(--sfm-foreground);font-family:Tajawal,Arial,sans-serif;transition:all .18s ease}
  .receipt-candidate-panel button:hover,.receipt-candidate-panel button:focus-visible{border-color:rgba(24,212,212,.55);box-shadow:0 0 0 3px rgba(167,243,240,.14);outline:none}
  .receipt-candidate-panel button.active{background:rgba(167,243,240,.18);border-color:rgba(24,212,212,.65)}
  .receipt-candidate-panel button span{font-size:11px;color:var(--sfm-muted);font-weight:900}
  .receipt-candidate-panel button b{font-size:14px;color:var(--sfm-foreground);overflow-wrap:anywhere}
  .ai-result-card dl{display:grid;grid-template-columns:150px 1fr;gap:8px 12px;margin:0}
  .ai-result-card dt{color:var(--sfm-muted);font-weight:900;font-size:12px}
  .ai-result-card dd{margin:0;color:var(--sfm-foreground);font-weight:900}
  .spin-icon{animation:spin 1s linear infinite}
  .receipt-details-modal{width:min(760px,100%);max-height:90vh;overflow:auto}
  .receipt-detail-image{width:100%;max-height:360px;object-fit:contain;border-radius:18px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14);margin-bottom:14px}
  .receipt-detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px}
  .receipt-detail-grid div{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:14px;padding:11px}
  .receipt-detail-grid span{display:block;color:var(--sfm-muted);font-size:11px;font-weight:900;margin-bottom:5px}
  .receipt-detail-grid b{color:var(--sfm-foreground);font-size:13px}
  .receipt-items{display:grid;gap:8px;margin-bottom:12px}
  .receipt-items>strong{color:var(--sfm-foreground);font-size:14px}
  .receipt-items span{display:flex;justify-content:space-between;gap:10px;background:var(--sfm-light-card);border-radius:12px;padding:9px 11px;color:var(--sfm-muted);font-weight:800}
  .dark .expense-smart-main{--sfm-background:#0a1422;--sfm-light-card:#13243a;--sfm-card:#0f1d31;--sfm-card-elevated:#13243a;--sfm-input-bg:#0f1d31;--sfm-foreground:#e8eef6;--sfm-heading:#e8eef6;--sfm-body:#b8c7d9;--sfm-muted:#8ea6c3;--sfm-muted-readable:#b8c7d9;--sfm-border:#1d3050;--sfm-border-strong:rgba(47,214,192,.42);background:#0a1422!important;color:#e8eef6!important}
  .dark .expense-hero{background:radial-gradient(circle at 12% 10%,rgba(47,214,192,.22),transparent 32%),linear-gradient(135deg,#061a2e 0%,#0b2a4a 58%,#0f766e 140%)!important;border:1px solid rgba(47,214,192,.22);color:#e8eef6!important;box-shadow:0 24px 58px rgba(0,0,0,.34)}
  .dark .expense-hero h1,.dark .expense-hero .eyebrow{color:#e8eef6!important}.dark .expense-hero p{color:#b8c7d9!important}
  .dark .expense-kpi-grid .kpi-card,.dark .expense-dashboard-grid .panel,.dark .expense-list-panel,.dark .expense-side-stack .panel,.dark .expense-smart-modal{background:#0f1d31!important;border-color:#1d3050!important;color:#e8eef6!important;box-shadow:0 18px 46px rgba(0,0,0,.28)!important}
  .dark .expense-kpi-grid .kpi-card p,.dark .expense-kpi-grid .kpi-card small,.dark .expense-dashboard-grid .panel p,.dark .expense-dashboard-grid .panel small{color:#b8c7d9!important}.dark .expense-kpi-grid .kpi-card strong,.dark .expense-dashboard-grid .panel h2,.dark .expense-dashboard-grid .panel h3{color:#e8eef6!important}
  .dark .expense-card-row{background:#0f1d31!important;border-color:#1d3050!important;color:#e8eef6!important;box-shadow:0 12px 30px rgba(0,0,0,.24)!important}
  .dark .expense-card-row:hover{background:#13243a!important;border-color:rgba(47,214,192,.36)!important}
  .dark .expense-row-icon{background:rgba(47,214,192,.12)!important;color:#2fd6c0!important;border:1px solid rgba(47,214,192,.20)}
  .dark .expense-row-main strong,.dark .expense-row-amount>b{color:#e8eef6!important}.dark .expense-row-main span,.dark .expense-row-amount small{color:#b8c7d9!important}
  .dark .expense-badges em{background:rgba(47,214,192,.12)!important;border-color:rgba(47,214,192,.25)!important;color:#2fd6c0!important}
  .dark .expense-badges em.project{background:rgba(29,140,255,.16)!important;border-color:rgba(29,140,255,.30)!important;color:#93c5fd!important}
  .dark .expense-badges em.ok{background:rgba(16,185,129,.16)!important;border-color:rgba(16,185,129,.28)!important;color:#86efac!important}
  .dark .expense-badges em.ai{background:rgba(47,214,192,.10)!important;border-color:rgba(47,214,192,.25)!important;color:#b8c7d9!important}
  .dark .expense-row-actions .row-action{background:#13243a!important;border-color:#1d3050!important;color:#b8c7d9!important}.dark .expense-row-actions .row-action:hover,.dark .expense-row-actions .row-action:focus-visible{background:rgba(47,214,192,.12)!important;border-color:rgba(47,214,192,.40)!important;color:#2fd6c0!important;outline:none}.dark .expense-row-actions .row-action:last-child:hover,.dark .expense-row-actions .row-action:last-child:focus-visible{background:rgba(255,91,110,.12)!important;border-color:rgba(255,91,110,.28)!important;color:#ff5b6e!important}
  .dark .expense-empty,.dark .expense-period-panel,.dark .monthly-grid div,.dark .expense-modal-tabs,.dark .receipt-drop,.dark .receipt-attach-card,.dark .receipt-preview-grid>div,.dark .receipt-selected-count,.dark .receipt-review-card,.dark .receipt-review-card.review,.dark .ai-result-card,.dark .receipt-candidate-panel,.dark .receipt-detail-grid div,.dark .receipt-items span{background:#13243a!important;border-color:#1d3050!important;color:#b8c7d9!important;box-shadow:none!important}
  .dark .expense-period-options button,.dark .expense-custom-period select{background:#0f1d31!important;border-color:#1d3050!important;color:#b8c7d9!important}.dark .expense-period-options button.active{background:rgba(47,214,192,.14)!important;border-color:rgba(47,214,192,.38)!important;color:#e8eef6!important}.dark .expense-period-badge{background:rgba(47,214,192,.12)!important;border-color:rgba(47,214,192,.25)!important;color:#2fd6c0!important}
  .dark .expense-empty h3,.dark .expense-period-head strong,.dark .monthly-grid b,.dark .receipt-drop-copy strong,.dark .receipt-attach-copy strong,.dark .receipt-candidate-panel>strong,.dark .receipt-candidate-panel button b,.dark .receipt-detail-grid b,.dark .receipt-items>strong,.dark .ai-result-card dd{color:#e8eef6!important}
  .dark .expense-empty p,.dark .expense-period-head span,.dark .expense-period-head small,.dark .expense-custom-period span,.dark .monthly-grid span,.dark .receipt-drop small,.dark .receipt-attach-copy small,.dark .receipt-candidate-panel button span,.dark .receipt-detail-grid span,.dark .ai-result-card p,.dark .ai-result-card dt{color:#b8c7d9!important}
  .dark .expense-modal-tabs button{background:transparent!important;color:#b8c7d9!important}.dark .expense-modal-tabs button.active{background:rgba(47,214,192,.14)!important;color:#2fd6c0!important;border:1px solid rgba(47,214,192,.25)!important;box-shadow:none!important}
  .dark .expense-form-grid select,.dark .expense-form-grid textarea,.dark .receipt-review-fields input,.dark .receipt-review-fields select{background:#0f1d31!important;border-color:#1d3050!important;color:#e8eef6!important;-webkit-text-fill-color:#e8eef6}.dark .expense-form-grid select:focus,.dark .expense-form-grid textarea:focus,.dark .receipt-review-fields input:focus,.dark .receipt-review-fields select:focus{background:#13243a!important;border-color:#2fd6c0!important;box-shadow:0 0 0 4px rgba(47,214,192,.16)!important}
  .dark .expense-smart-main .primary-btn,.dark .expense-smart-main .primary-form-btn{background:linear-gradient(135deg,#1d8cff,#18d4d4)!important;color:#061a2e!important}.dark .expense-smart-main .ghost-btn,.dark .expense-smart-main .ghost-form-btn,.dark .load-more-btn{background:#13243a!important;border-color:#1d3050!important;color:#e8eef6!important}
  .dark .receipt-error{background:rgba(245,158,11,.14)!important;border-color:rgba(245,158,11,.28)!important;color:#fcd34d!important}.dark .receipt-review-card.failed,.dark .ghost-form-btn.danger-soft{background:rgba(255,91,110,.12)!important;border-color:rgba(255,91,110,.25)!important;color:#ff5b6e!important}.dark .extracted-field-badge{background:rgba(16,185,129,.16)!important;border-color:rgba(16,185,129,.28)!important;color:#86efac!important}
  @media(max-width:1180px){.expense-dashboard-grid{grid-template-columns:1fr}.expense-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:920px){.expense-smart-main{width:100%!important;margin-inline-start:0!important;margin-inline-end:0!important;padding:calc(78px + env(safe-area-inset-top)) 16px 52px!important}.expense-smart-content{gap:14px}.expense-hero{display:grid}.expense-hero-actions .primary-btn,.expense-hero-actions .ghost-btn{width:auto}.expense-side-stack{grid-template-columns:1fr}.expense-floating-add{position:fixed;display:grid;place-items:center;z-index:70;inset-inline-end:18px;bottom:18px;width:56px;height:56px;border-radius:18px;border:0;background:var(--sfm-soft-cyan);color:var(--sfm-foreground);box-shadow:0 18px 40px rgba(3,18,37,.28)}}
  @media(max-width:640px){.expense-hero{padding:22px}.expense-hero h1{font-size:27px}.expense-kpi-grid,.expense-form-grid,.receipt-detail-grid,.monthly-grid,.expense-custom-period{grid-template-columns:1fr}.expense-period-head{display:grid}.expense-period-options{margin-inline:-4px;padding-inline:4px}.expense-list-panel .row-controls{display:grid;grid-template-columns:1fr}.expense-list-panel .row-select{width:100%}.expense-card-row{display:grid}.expense-row-actions{justify-content:space-between}.expense-row-amount{justify-items:start}.expense-row-amount>b,.expense-row-amount small{white-space:normal;overflow-wrap:anywhere}.expense-row-actions>div{flex-wrap:wrap;justify-content:flex-end}.expense-modal-overlay{align-items:end;padding:10px}.expense-smart-modal{border-radius:22px 22px 0 0;max-height:94dvh;overflow-y:auto;max-width:100%;overflow-x:hidden}.expense-modal-tabs{grid-template-columns:1fr}.receipt-scan-actions,.expense-actions,.receipt-batch-head{display:grid;grid-template-columns:1fr}.ai-result-card dl{grid-template-columns:1fr}.expense-hero-actions{display:grid}.expense-hero-actions .primary-btn,.expense-hero-actions .ghost-btn{width:100%;justify-content:center}.receipt-preview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.receipt-review-body{grid-template-columns:1fr}.receipt-review-body>img{width:100%;height:150px}.receipt-review-fields{grid-template-columns:1fr}}
`;
