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
import { formatDate } from '@/lib/locale';
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
      { title: { ar: 'إجمالي المصروفات', en: 'Total expenses', fr: 'Total des depenses' }, body: { ar: 'كل المصروفات المسجلة لهذا الحساب.', en: 'All recorded expenses for this account.', fr: 'Toutes les depenses enregistrees.' }, value: common.expenses, tone: 'var(--danger)' },
      { title: { ar: 'مصروفات بالذكاء الاصطناعي', en: 'AI scanned expenses', fr: 'Depenses scannees IA' }, body: { ar: 'فواتير تمت قراءتها أو اقتراحها بالذكاء الاصطناعي.', en: 'Receipts read or suggested by AI.', fr: 'Factures lues ou suggerees par IA.' }, value: String(aiCount), tone: 'var(--accent)' },
      { title: { ar: 'الفواتير المرفقة', en: 'Receipts attached', fr: 'Factures jointes' }, body: { ar: 'مصروفات تحتوي على صورة أو ملف فاتورة.', en: 'Expenses with receipt image or file.', fr: 'Depenses avec facture jointe.' }, value: String(receiptCount), tone: 'var(--primary)' },
      { title: { ar: 'التصنيفات النشطة', en: 'Active categories', fr: 'Categories actives' }, body: { ar: 'تصنيفات مستخدمة في سجل المصروفات.', en: 'Categories used in your expense log.', fr: 'Categories utilisees dans le journal.' }, value: String(categoryCount), tone: 'var(--success)' },
    ];
  }
  if (kind === 'income') return [
    { title: { ar: 'إجمالي الدخل', en: 'Total income' }, body: { ar: 'راتب، دخل جانبي، وأعمال.', en: 'Salary, side income, and business.' }, value: common.income, tone: 'var(--success)' },
    { title: { ar: 'مصادر الدخل', en: 'Income sources' }, body: { ar: 'مصادر شهرية مسجلة فقط.', en: 'Recorded monthly sources only.', fr: 'Sources mensuelles enregistrées uniquement.' }, value: String(data.income.length), tone: 'var(--accent)' },
    { title: { ar: 'الصافي المتوقع', en: 'Expected net' }, body: { ar: 'الدخل ناقص المصروفات الحالية.', en: 'Income minus current expenses.' }, value: common.balance, tone: 'var(--foreground)' },
  ];
  if (kind === 'invest') return [
    { title: { ar: 'قيمة المحفظة', en: 'Portfolio value' }, body: { ar: 'إجمالي الاستثمارات المسجلة.', en: 'Total recorded investments.' }, value: common.investments, tone: 'var(--primary)' },
    { title: { ar: 'المساهمة الشهرية', en: 'Monthly contribution', fr: 'Contribution mensuelle' }, body: { ar: 'أضف مساهمات شهرية فعلية لعرض هذا المؤشر.', en: 'Add real monthly contributions to show this metric.', fr: 'Ajoutez des contributions mensuelles réelles pour afficher cet indicateur.' }, value: insufficient, tone: 'var(--success)' },
    { title: { ar: 'مستوى المخاطر', en: 'Risk level', fr: 'Niveau de risque' }, body: { ar: 'أضف توزيع الاستثمار لعرض مستوى المخاطر.', en: 'Add investment allocation to show risk level.', fr: 'Ajoutez la répartition des investissements pour afficher le risque.' }, value: insufficient, tone: 'var(--accent)' },
  ];
  if (kind === 'savings') return [
    { title: { ar: 'إجمالي المدخرات', en: 'Total savings' }, body: { ar: 'مجموع عمليات الادخار المسجلة.', en: 'Total recorded savings entries.' }, value: common.savings, tone: 'var(--success)' },
    { title: { ar: 'عدد السجلات', en: 'Entries count' }, body: { ar: 'سجلات الادخار النشطة.', en: 'Active saving records.' }, value: String(data.savings.length), tone: 'var(--accent)' },
    { title: { ar: 'الصافي بعد الادخار', en: 'Net after savings' }, body: { ar: 'الدخل ناقص المصروفات والمدخرات.', en: 'Income minus expenses and savings.' }, value: money(data.balance - data.totalSavings, lang, currency), tone: 'var(--primary)' },
  ];
  if (kind === 'goals') return [
    { title: { ar: 'الأهداف النشطة', en: 'Active goals' }, body: { ar: 'أهداف مالية قيد المتابعة.', en: 'Financial goals being tracked.' }, value: String(data.goals.length), tone: 'var(--accent)' },
    { title: { ar: 'إجمالي المستهدف', en: 'Target total' }, body: { ar: 'مجموع مبالغ الأهداف.', en: 'Combined target amounts.' }, value: money(data.goals.reduce((total, goal) => total + goal.target_amount, 0), isAr, currency), tone: 'var(--primary)' },
    { title: { ar: 'تقدم حالي', en: 'Current progress' }, body: { ar: 'مجموع المبالغ الحالية داخل الأهداف.', en: 'Combined current goal progress.' }, value: money(data.goals.reduce((total, goal) => total + goal.current_amount, 0), isAr, currency), tone: 'var(--success)' },
  ];
  if (kind === 'reports') return [
    { title: { ar: 'الدخل مقابل المصروفات', en: 'Income vs expenses' }, body: { ar: 'مؤشر التوازن المالي الحالي.', en: 'Current financial balance signal.' }, value: common.balance, tone: 'var(--foreground)' },
    { title: { ar: 'تقرير الادخار', en: 'Savings report' }, body: { ar: 'رصيد الادخار المسجل.', en: 'Recorded savings balance.' }, value: common.savings, tone: 'var(--success)' },
    { title: { ar: 'تقرير الاستثمار', en: 'Investment report' }, body: { ar: 'إجمالي قيمة الاستثمارات.', en: 'Total investment value.' }, value: common.investments, tone: 'var(--primary)' },
  ];
  return [
    { title: { ar: 'الصحة المالية', en: 'Financial health', fr: 'Santé financière' }, body: { ar: 'تحتاج إلى دخل ومصروفات فعلية لعرض النسبة.', en: 'Real income and expenses are required to show the score.', fr: 'Des revenus et dépenses réels sont requis pour afficher le score.' }, value: data.totalIncome > 0 && data.expenses.length > 0 ? `${progress(data.balance, data.totalIncome)}%` : insufficient, tone: 'var(--info)' },
    { title: { ar: 'فرصة ادخار', en: 'Savings opportunity' }, body: { ar: 'الفرق المتاح بعد المصروفات.', en: 'Potential surplus after expenses.' }, value: money(data.balance, lang, currency), tone: 'var(--success)' },
    { title: { ar: 'تنبيه ذكي', en: 'Smart alert', fr: 'Alerte intelligente' }, body: { ar: 'أضف بيانات مالية كافية لعرض التنبيهات.', en: 'Add enough financial data to show alerts.', fr: 'Ajoutez suffisamment de données financières pour afficher les alertes.' }, value: insufficient, tone: 'var(--accent)' },
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
    subtitle: item.created_at ? formatDate(item.created_at, lang, { year: 'numeric', month: 'short', day: 'numeric' }) : pick({ ar: 'سجل مالي', en: 'Financial record', fr: 'Relevé financier' }, lang),
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
  .sfm-shell{min-height:100%;width:100%;min-width:0;background:var(--background);color:var(--foreground);display:flex;font-family:var(--font-ui)}
  .sfm-spinner{width:44px;height:44px;border-radius:var(--radius-pill);border:3px solid var(--border);border-top-color:var(--accent);animation:spin 1s linear infinite;margin:auto}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes skeleton-shimmer{0%,100%{opacity:.72}50%{opacity:1}}
  .sfm-sidebar{width:250px;background:var(--sidebar-background);border-inline-end:1px solid var(--sidebar-border);padding:22px 16px;position:sticky;top:0;height:100vh;color:var(--sidebar-foreground);flex-shrink:0}
  [dir="ltr"] .sfm-sidebar{border-inline-end:1px solid var(--sidebar-border)}
  .brand{display:flex;align-items:center;gap:12px;margin-bottom:28px;cursor:pointer}
  .brand-mark{width:42px;height:42px;border-radius:var(--radius-control);object-fit:cover;display:block}
  .brand strong{display:block;font-size:15px}.brand span{display:block;font-size:11px;color:var(--sidebar-muted);margin-top:2px}
  nav{display:grid;gap:7px}nav button,.mobile-panel button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;color:var(--sidebar-muted);padding:11px 12px;border-radius:var(--radius-control);cursor:pointer;font:500 13px var(--font-ui);text-align:start}
  nav button:hover{background:var(--sidebar-hover);color:var(--sidebar-foreground)}nav button.active{background:var(--sidebar-active);color:var(--sidebar-active-foreground)}
  .sfm-main{flex:1;width:100%;max-width:100%;min-width:0;margin:0;padding:var(--workspace-page-padding-block) var(--workspace-page-padding-inline)}
  .sfm-main.reports-main{width:100%;max-width:100%;min-width:0;margin:0;padding:var(--workspace-page-padding-block) var(--workspace-page-padding-inline) 60px;overflow-x:clip}
  .sfm-header{height:62px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}
  .guest-pill{display:inline-flex;align-items:center;padding:7px 11px;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--accent-soft);color:var(--foreground-muted);font-size:12px;font-weight:600;white-space:nowrap}
  .title-wrap{display:flex;align-items:center;gap:13px}.title-wrap p{font-size:11px;color:var(--foreground-muted);font-weight:500;margin:0 0 3px}.title-wrap h1{font-size:24px;margin:0;font-weight:600}
  .title-icon{width:44px;height:44px;border-radius:var(--radius-card);background:color-mix(in srgb,var(--accent) 14%,var(--surface));color:var(--accent);display:grid;place-items:center;border:1px solid var(--border)}
  .icon-btn{width:40px;height:40px;border-radius:var(--radius-control);border:1px solid var(--border);background:var(--surface);color:var(--foreground-muted);display:grid;place-items:center;cursor:pointer}.menu-btn{display:none}
  .hero{background:var(--hero-gradient);color:var(--hero-foreground);border-radius:var(--radius-panel);padding:28px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;box-shadow:var(--shadow-md);margin-bottom:18px}
  .eyebrow{display:inline-flex;padding:4px 10px;border-radius:var(--radius-pill);background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent);font-size:11px;font-weight:600;margin-bottom:12px}.hero h2{font-size:34px;line-height:1.05;margin:0 0 9px}.hero p{max-width:640px;margin:0;color:var(--hero-foreground-muted);line-height:1.8;font-size:14px}
  .hero-actions{display:flex;gap:10px;flex-wrap:wrap}.primary-btn,.ghost-btn{height:42px;border-radius:var(--radius-control);border:0;padding:0 15px;font:600 13px var(--font-ui);display:inline-flex;align-items:center;gap:8px;cursor:pointer;white-space:nowrap}.primary-btn{background:var(--accent);color:var(--accent-foreground)}.ghost-btn{background:color-mix(in srgb,var(--hero-foreground) 8%,transparent);color:var(--hero-foreground);border:1px solid color-mix(in srgb,var(--hero-foreground) 24%,transparent)}
  .notice{padding:12px 15px;background:var(--danger-soft);border:1px solid color-mix(in srgb,var(--danger) 18%,transparent);color:var(--danger);border-radius:var(--radius-card);margin-bottom:14px;font-size:13px;font-weight:500}
  .data-error-notice{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.data-error-notice strong{font-size:13px}.data-error-notice span{color:var(--danger)}.data-error-notice small{color:var(--warning);background:var(--surface);border-radius:var(--radius-pill);padding:4px 8px}.data-error-notice button{margin-inline-start:auto;border:0;border-radius:var(--radius-control);background:var(--primary);color:var(--primary-foreground);height:34px;padding:0 12px;font:600 12px var(--font-ui);cursor:pointer}.data-error-notice button:hover:not(:disabled){background:var(--primary-hover)}
  .kpi-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px}.kpi-card,.panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-panel);box-shadow:var(--shadow-card)}
  .kpi-card{padding:18px;position:relative;overflow:hidden}.kpi-card>span{position:absolute;inset-inline-start:0;top:0;width:4px;height:100%}.kpi-card p{font-size:12px;color:var(--foreground-muted);font-weight:600;margin:0 0 7px}.kpi-card strong{font-size:23px;font-weight:600;display:block}.kpi-card small{display:block;margin-top:8px;color:var(--foreground-muted);font-size:12px;line-height:1.6}
  .content-grid{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(280px,.8fr);gap:18px}.reports-main .content-grid{grid-template-columns:minmax(0,1.7fr) minmax(300px,.7fr)}.panel{padding:20px;min-width:0}.panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.panel-head p{margin:0 0 4px;font-size:11px;color:var(--foreground-muted);font-weight:600}.panel-head h3{margin:0;font-size:18px}.loading-pill{font-size:11px;font-weight:600;color:var(--accent);background:var(--accent-soft);border-radius:var(--radius-pill);padding:5px 10px}
  .row-controls{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px}.row-search{flex:1;min-width:160px;height:38px;border:1.5px solid var(--border-strong);border-radius:var(--radius-control);padding:0 12px;background:var(--surface-muted);font:500 13px var(--font-ui);color:var(--foreground);outline:none}.row-search:focus{border-color:var(--accent);background:var(--surface)}.row-select{height:38px;border:1.5px solid var(--border-strong);border-radius:var(--radius-control);padding:0 10px;background:var(--surface-muted);font:500 13px var(--font-ui);color:var(--foreground);outline:none;cursor:pointer}.row-select:focus{border-color:var(--accent)}.row-count{font-size:12px;font-weight:600;color:var(--foreground-muted);margin-bottom:10px;padding:6px 0;border-bottom:1px solid var(--border)}.load-more-btn{width:100%;margin-top:12px;padding:12px;border-radius:var(--radius-card);border:1.5px dashed var(--border-strong);background:transparent;color:var(--foreground-muted);font:600 13px var(--font-ui);cursor:pointer;transition:all .2s}.load-more-btn:hover{background:var(--surface-hover);border-color:var(--accent);color:var(--foreground-secondary)}
  .row-list{display:grid;gap:10px}.empty-state{padding:22px;border:1px dashed var(--border);border-radius:var(--radius-card);color:var(--foreground-muted);text-align:center;font-size:13px;font-weight:600}.data-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid var(--border)}.data-row:last-child{border-bottom:0}.data-row strong{display:block;font-size:14px}.data-row span{display:block;color:var(--foreground-muted);font-size:12px;margin-top:4px}.money-amount{font-family:var(--font-data);display:inline-flex;align-items:center;justify-content:center;min-height:38px;border-radius:var(--radius-control);border:1px solid color-mix(in srgb,var(--info) 18%,transparent);background:var(--surface-muted);color:var(--foreground);font-size:16px;font-weight:600;line-height:1.2;font-variant-numeric:tabular-nums;padding:7px 12px;white-space:nowrap;box-shadow:var(--shadow-card)}.row-actions-wrap{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}.row-actions{display:flex;align-items:center;gap:6px}.row-action{width:34px;height:34px;border-radius:var(--radius-control);border:1px solid var(--border);background:var(--surface);color:var(--foreground-muted);display:grid;place-items:center;cursor:pointer;transition:all .18s ease}.row-action:hover{border-color:var(--accent);color:var(--accent);background:var(--surface-hover);transform:translateY(-1px)}
.goal-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-panel);padding:18px;box-shadow:var(--shadow-card);display:grid;gap:15px;transition:all .22s ease}.goal-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-card)}.goal-card.is-expanded{grid-column:1/-1}.goal-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.goal-title-wrap{display:flex;align-items:center;gap:12px;min-width:0}.goal-icon{width:42px;height:42px;border-radius:var(--radius-card);background:var(--accent-soft);display:grid;place-items:center;font-size:20px;flex:0 0 auto}.goal-title-wrap strong{display:block;font-size:16px;font-weight:600;color:var(--foreground);overflow-wrap:anywhere}.goal-title-wrap span{display:block;margin-top:4px;color:var(--foreground-muted);font-size:12px;font-weight:600}.goal-summary-actions,.goal-card-actions,.goal-details-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.goal-expand-btn{width:44px;height:44px;border-radius:var(--radius-card);border:1px solid var(--border);background:var(--surface);color:var(--primary);display:grid;place-items:center;cursor:pointer;transition:all .18s ease;box-shadow:var(--shadow-card)}.goal-expand-btn:hover{border-color:color-mix(in srgb,var(--info) 42%,transparent);background:var(--accent-soft);transform:translateY(-1px)}.goal-expand-btn:focus-visible{outline:2px solid var(--focus-ring);outline-offset:3px}.goal-edit-btn,.goal-delete-btn{height:38px;border-radius:var(--radius-control);padding:0 12px;font:600 12px var(--font-ui);display:inline-flex;align-items:center;gap:7px;cursor:pointer;transition:all .2s ease}.goal-edit-btn{border:1px solid var(--border);background:var(--surface);color:var(--foreground-muted);box-shadow:var(--shadow-card)}.goal-delete-btn{border:1px solid color-mix(in srgb,var(--danger) 24%,transparent);background:var(--danger-soft);color:var(--danger);box-shadow:var(--shadow-card)}.goal-edit-btn:hover{background:var(--accent);color:var(--accent-foreground);transform:translateY(-1px)}.goal-delete-btn:hover{background:var(--danger-soft);border-color:color-mix(in srgb,var(--danger) 38%,transparent);transform:translateY(-1px)}.confirm-icon.danger{background:var(--danger-soft);color:var(--danger)}.delete-target-name{display:block;margin:12px 0 2px;color:var(--foreground);font-size:14px}.goal-progress-row{display:flex;align-items:center;gap:10px}.goal-progress-track{height:10px;border-radius:var(--radius-pill);background:color-mix(in srgb,var(--primary) 10%,transparent);overflow:hidden;flex:1}.goal-progress-track span{display:block;height:100%;border-radius:var(--radius-pill);background:var(--primary)}.goal-progress-row b{font-family:var(--font-data);color:var(--foreground-muted);font-size:13px}.goal-meta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.goal-detail-grid,.goal-ai-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:9px}.goal-expanded-panel{display:grid;gap:12px;animation:goalDetailsIn .18s ease}.goal-meta-grid div,.goal-ai-metrics div,.goal-detail-grid div{background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-card);padding:10px}.goal-meta-grid span,.goal-ai-metrics span,.goal-detail-grid span{display:block;color:var(--foreground-muted);font-size:11px;font-weight:600;margin-bottom:5px}.goal-meta-grid strong,.goal-ai-metrics b,.goal-detail-grid strong{font-size:13px;color:var(--foreground)}@keyframes goalDetailsIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}.goal-ai-card,.goal-modal-preview{border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-card);padding:15px;display:grid;gap:12px}.goal-ai-head{display:flex;align-items:center;gap:9px;color:var(--foreground-muted)}.goal-ai-head svg{color:var(--accent)}.goal-ai-head strong{font-size:14px;font-weight:600}.risk-pill{margin-inline-start:auto;border-radius:var(--radius-pill);padding:5px 9px;font-size:11px;font-weight:600}.risk-pill.low{background:var(--success-soft);color:var(--success)}.risk-pill.medium{background:var(--accent-soft);color:var(--foreground-muted)}.risk-pill.high{background:var(--danger-soft);color:var(--danger)}.goal-ai-card p,.goal-modal-preview p{margin:0;color:var(--foreground-muted);font-size:13px;line-height:1.8;font-weight:500}.goal-ai-plan{background:var(--surface-muted);border-radius:var(--radius-card);padding:12px}.goal-ai-plan strong{font-size:13px;color:var(--foreground)}.goal-ai-plan ol{margin:8px 18px 0;padding:0;color:var(--foreground-muted);font-size:12.5px;line-height:1.8;font-weight:500}.goal-modal{width:min(860px,100%);max-height:min(88vh,980px);overflow:auto}.goal-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.goal-form-grid label:first-child,.goal-form-grid .entry-actions,.goal-notes-field,.goal-ai-toggle,.goal-modal-preview{grid-column:1/-1}.goal-form-grid select,.goal-form-grid textarea{border:1.5px solid var(--border-strong);border-radius:var(--radius-card);background:var(--surface-muted);padding:0 13px;color:var(--foreground);font:600 14px var(--font-ui);outline:0}.goal-form-grid select{height:50px}.goal-form-grid textarea{min-height:92px;padding-top:12px;resize:vertical}.goal-form-grid select:focus,.goal-form-grid textarea:focus{border-color:var(--accent);box-shadow:var(--focus-shadow);background:var(--surface)}.currency-input-wrap{position:relative;min-width:0}.currency-input-wrap input{width:100%;box-sizing:border-box;padding-inline-start:76px!important;padding-inline-end:14px!important}.currency-symbol{position:absolute;inset-inline-start:10px;top:50%;transform:translateY(-50%);min-inline-size:48px;max-inline-size:62px;height:30px;border-radius:var(--radius-control);background:var(--accent-soft);color:var(--foreground-muted);display:grid;place-items:center;padding-inline:8px;font-size:12px;font-weight:600;line-height:1;white-space:nowrap;z-index:1;pointer-events:none}.goal-ai-toggle{display:flex!important;align-items:center;justify-content:space-between;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-card);padding:12px 14px}.switch{width:54px;height:30px;border:0;border-radius:var(--radius-pill);background:color-mix(in srgb,var(--primary) 22%,transparent);padding:3px;cursor:pointer;transition:.2s}.switch span{display:block;width:24px;height:24px;border-radius:var(--radius-pill);background:var(--surface);box-shadow:var(--shadow-card);transition:.2s}.switch.active{background:var(--accent)}.switch.active span{transform:translateX(24px)}[dir="rtl"] .switch.active span{transform:translateX(-24px)}.preview-missing{background:var(--danger-soft);border:1px solid color-mix(in srgb,var(--danger) 12%,transparent);border-radius:var(--radius-card);padding:12px;color:var(--danger)}.preview-missing strong{font-size:13px}.preview-missing ul{margin:8px 18px 0;padding:0;font-size:12.5px;line-height:1.8;font-weight:600}.form-error{grid-column:1/-1;border-radius:var(--radius-control);padding:11px 13px;background:var(--danger-soft);color:var(--danger);font-size:13px;font-weight:600}
  .insight-list{display:grid;gap:12px}.insight-list>div{display:flex;gap:10px;padding:12px;border-radius:var(--radius-card);background:var(--surface-hover)}.insight-list svg{color:var(--accent);flex-shrink:0}.insight-list strong{display:block;font-size:13px}.insight-list span{display:block;font-size:12px;color:var(--foreground-muted);line-height:1.6;margin-top:3px}
  .summary-band,.ai-panel{margin-top:18px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-panel);padding:18px 20px;display:flex;align-items:center;gap:14px}.summary-band svg{color:var(--accent)}.summary-band strong,.ai-panel h3{font-size:16px}.summary-band p,.ai-panel p{margin:4px 0 0;color:var(--foreground-muted);line-height:1.7;font-size:13px}
  .savings-shell{min-height:auto}.savings-main{padding-bottom:32px}.savings-main .content-grid{align-items:start}.savings-main .panel{align-self:start}.savings-main .row-list{gap:0}.savings-main .empty-state{padding:18px}.savings-main .summary-band{margin-top:14px;padding:14px 16px;align-items:flex-start}.savings-main .summary-band p{line-height:1.6}.savings-main .data-row:last-child{padding-bottom:0}.savings-main .entry-overlay{position:fixed;min-height:0}
  .savings-main .data-row{padding:14px 0}.savings-main .money-amount{border-color:color-mix(in srgb,var(--info) 24%,transparent);background:var(--surface-muted);color:var(--info);font-size:17px}
  .savings-guide{margin-top:18px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card);padding:22px;overflow:hidden}.savings-guide-head{max-width:820px;margin-bottom:18px}.savings-guide-eyebrow{display:inline-flex;align-items:center;gap:8px;border-radius:var(--radius-pill);background:var(--accent-soft);border:1px solid var(--border);color:var(--info);font-size:12px;font-weight:600;padding:7px 11px;margin-bottom:12px}.savings-guide-eyebrow svg,.savings-guide-icon svg{color:var(--accent)}.savings-guide h2{font-size:26px;line-height:1.25;margin:0 0 8px;color:var(--foreground);font-weight:600}.savings-guide-head p{margin:0;color:var(--foreground-muted);line-height:1.8;font-size:14px;font-weight:600}.savings-guide-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.savings-guide-card{min-width:0;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);padding:17px;box-shadow:var(--shadow-card)}.savings-guide-icon{width:42px;height:42px;border-radius:var(--radius-card);background:var(--accent-soft);border:1px solid var(--border);display:grid;place-items:center;margin-bottom:11px}.savings-guide-card h3{margin:0 0 7px;font-size:17px;font-weight:600;color:var(--foreground)}.savings-guide-card p{margin:0;color:var(--foreground-muted);line-height:1.75;font-size:13px;font-weight:600}.savings-guide-card ul{margin:12px 18px 0;padding:0;color:var(--foreground-muted);font-size:12.5px;line-height:1.9;font-weight:600}.savings-guide-card li::marker{color:var(--accent);font-weight:600}.savings-guide-plan{margin-top:14px;border-radius:var(--radius-panel);border:1px solid var(--border);background:var(--accent-soft);padding:16px}.savings-guide-plan>strong{display:block;margin-bottom:12px;font-size:15px;font-weight:600;color:var(--foreground)}.savings-guide-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.savings-guide-step{min-width:0;border-radius:var(--radius-card);background:var(--surface);border:1px solid var(--border);padding:12px;display:grid;gap:8px}.savings-guide-step b{width:34px;height:30px;border-radius:var(--radius-control);background:var(--primary);color:var(--primary-foreground);display:grid;place-items:center;font-size:12px;font-weight:600}.savings-guide-step span{color:var(--foreground-muted);font-size:12.5px;line-height:1.7;font-weight:600}
  .ai-panel{align-items:stretch;justify-content:space-between}.chat-history{display:grid;gap:8px;min-width:min(460px,100%);max-height:190px;overflow:auto;margin-bottom:10px}.chat-history>div{padding:10px 12px;border-radius:var(--radius-card);font-size:13px;line-height:1.6}.chat-history .user{background:var(--foreground);color:var(--foreground-inverse)}.chat-history .assistant{background:var(--accent-soft);color:var(--foreground-muted)}.chat-box{display:flex;gap:10px;min-width:min(460px,100%)}.chat-box input{height:46px;border:1.5px solid var(--border-strong);border-radius:var(--radius-card);padding:0 14px;background:var(--surface-muted);min-width:0;flex:1;font:600 14px var(--font-ui);color:var(--foreground)}.chat-box button{width:46px;border-radius:var(--radius-card);border:0;background:var(--primary);color:var(--primary-foreground);display:grid;place-items:center;cursor:pointer;transition:background-color .18s ease}.chat-box button:hover:not(:disabled){background:var(--primary-hover)}.chat-box button:disabled{opacity:.55;cursor:wait}
  .mobile-panel{position:fixed;inset:12px;z-index:50;background:var(--foreground);border-radius:var(--radius-panel);padding:16px;color:var(--surface);box-shadow:var(--shadow-card)}.mobile-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.mobile-brand{display:flex;align-items:center;gap:10px}.mobile-brand img{border-radius:var(--radius-control);object-fit:cover}
  .entry-overlay{position:fixed;inset:0;background:var(--background-overlay);backdrop-filter:blur(8px);z-index:80;display:grid;place-items:center;padding:18px}.entry-modal,.confirm-modal{width:min(480px,100%);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-panel);box-shadow:var(--shadow-popover);padding:20px}.entry-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.entry-modal-head p{margin:0 0 4px;color:var(--foreground-muted);font-size:12px;font-weight:600}.entry-modal-head h3,.confirm-modal h3{margin:0;font-size:21px;font-weight:600}.entry-form{display:grid;gap:14px}.entry-form label{display:grid;gap:7px;font-weight:600;color:var(--foreground-muted);font-size:13px}.entry-form input{height:50px;border:1.5px solid var(--border-strong);border-radius:var(--radius-card);background:var(--surface-muted);padding:0 14px;color:var(--foreground);font:600 14px var(--font-ui);outline:0}.entry-form input:focus{border-color:var(--accent);box-shadow:var(--focus-shadow);background:var(--surface)}.entry-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}.primary-form-btn,.ghost-form-btn,.danger-form-btn{height:44px;border-radius:var(--radius-control);padding:0 18px;font:600 13px var(--font-ui);cursor:pointer}.primary-form-btn{border:0;background:var(--primary);color:var(--primary-foreground)}.ghost-form-btn{border:1px solid var(--border);background:var(--surface);color:var(--foreground-muted)}.danger-form-btn{border:0;background:var(--danger);color:var(--primary-foreground)}.primary-form-btn:disabled,.ghost-form-btn:disabled,.danger-form-btn:disabled{opacity:.58;cursor:wait}.confirm-modal{text-align:center}.confirm-icon{width:58px;height:58px;border-radius:var(--radius-card);background:var(--danger-soft);color:var(--danger);display:grid;place-items:center;margin:0 auto 12px}.confirm-modal p{margin:8px 0 4px;color:var(--foreground-muted);font-weight:600}.confirm-modal small{display:block;color:var(--foreground-muted);line-height:1.6;margin-bottom:14px}.confirm-modal .entry-actions{justify-content:center}.entry-toast{position:fixed;z-index:90;inset-inline-end:22px;bottom:22px;max-inline-size:min(360px,calc(100% - 32px));padding:13px 16px;border-radius:var(--radius-card);font:600 13px var(--font-ui);box-shadow:var(--shadow-card);animation:slideUp .22s ease}.entry-toast.ok{background:var(--success-soft);color:var(--success);border:1px solid color-mix(in srgb,var(--success) 20%,transparent)}.entry-toast.err{background:var(--danger-soft);color:var(--danger);border:1px solid color-mix(in srgb,var(--danger) 20%,transparent)}@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .savings-modal{width:min(780px,100%);max-height:90vh;overflow:auto;border-radius:var(--radius-panel);padding:22px;background:var(--surface)}.savings-modal .entry-modal-head{align-items:flex-start}.savings-modal .entry-modal-head p{max-width:620px;line-height:1.6}.savings-form-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.savings-form-grid label{min-width:0}.savings-form-grid input,.savings-form-grid select,.savings-form-grid textarea{width:100%;min-width:0;min-height:50px;border:1.5px solid var(--border-strong);border-radius:var(--radius-card);background:var(--surface-muted);color:var(--foreground);padding:0 14px;font:600 14px var(--font-ui);outline:0}.savings-form-grid textarea{min-height:92px;resize:vertical;padding-top:12px;line-height:1.7}.savings-form-grid input:focus,.savings-form-grid select:focus,.savings-form-grid textarea:focus{border-color:var(--accent);box-shadow:var(--focus-shadow);background:var(--surface)}.savings-form-grid .currency-input-wrap input{padding-inline-start:58px}.savings-note-field,.savings-form-grid .form-error,.savings-form-grid .entry-actions{grid-column:1/-1}.savings-form-grid .entry-actions{margin-top:2px}

  .sfm-main :is(button,a,input,select,textarea):focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}
  .sfm-main :is(button,[aria-disabled="true"]):disabled{background:var(--control-disabled);color:var(--foreground-subtle);cursor:not-allowed;opacity:.72}
  .finance-header-lang{display:block}
  @media(max-width:1180px){.reports-main .content-grid{grid-template-columns:1fr}.reports-main .kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:920px){.sfm-sidebar{display:none}.menu-btn{display:grid}.sfm-main{padding:16px;margin-inline-start:0}.sfm-main.savings-main{padding-bottom:24px}.sfm-main.reports-main{width:100%;max-width:100%;margin-inline-start:0;margin-inline-end:0;padding:16px 16px 24px}.hero{display:block}.hero-actions{margin-top:18px}.content-grid{grid-template-columns:1fr}.ai-panel{display:grid}.chat-box{min-width:0}.savings-guide-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:640px){.kpi-grid{grid-template-columns:1fr}.sfm-header{height:auto}.title-wrap h1{font-size:20px}.hero{padding:22px}.hero h2{font-size:27px}.data-row{align-items:flex-start;flex-direction:column}.row-actions-wrap{width:100%;justify-content:space-between}.money-amount{min-height:40px;font-size:16px}.summary-band{align-items:flex-start}.savings-main .summary-band{margin-top:12px;padding:14px}.savings-guide{padding:16px;border-radius:var(--radius-panel)}.savings-guide h2{font-size:22px}.savings-guide-grid,.savings-guide-steps{grid-template-columns:1fr}.savings-guide-card,.savings-guide-plan{padding:14px}.primary-btn,.ghost-btn{width:100%;justify-content:center}.entry-actions{display:grid;grid-template-columns:1fr 1fr}.primary-form-btn,.ghost-form-btn,.danger-form-btn{width:100%}.savings-modal{width:calc(100% - 24px);max-height:90vh;padding:18px}.savings-form-grid{grid-template-columns:1fr}.savings-form-grid label,.savings-note-field,.savings-form-grid .form-error,.savings-form-grid .entry-actions{grid-column:auto}.savings-form-grid .entry-actions{grid-template-columns:1fr}.goal-card-head{display:flex;align-items:center}.goal-summary-actions{flex:0 0 auto}.goal-details-actions{display:grid;grid-template-columns:1fr;justify-content:stretch}.goal-edit-btn,.goal-delete-btn{width:100%;justify-content:center}.goal-meta-grid,.goal-ai-metrics,.goal-detail-grid,.goal-form-grid{grid-template-columns:1fr}.goal-form-grid label:first-child{grid-column:auto}}
  @media(prefers-reduced-motion:reduce){.sfm-shell *,.expense-smart-main *{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
`;

export const expenseSmartStyles = `
  .expense-smart-main{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:var(--workspace-page-padding-block) var(--workspace-page-padding-inline) 36px!important;overflow-x:clip!important}
  .expense-smart-content{display:grid;gap:16px;width:100%;max-width:none!important;max-inline-size:none!important;min-width:0;margin:0}
  .expense-hero{background:var(--hero-gradient);color:var(--hero-foreground);border-radius:var(--radius-panel);padding:28px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;box-shadow:var(--shadow-md);margin-bottom:16px}
  .expense-hero .eyebrow{display:inline-flex;align-items:center;gap:7px}
  .expense-hero h1{font-size:34px;line-height:1.08;margin:0 0 9px;font-weight:600}
  .expense-hero p{max-width:720px;margin:0;color:var(--hero-foreground-muted);font-size:14px;line-height:1.8;font-weight:500}
  .expense-hero-actions{display:flex;gap:10px;flex-wrap:wrap}
  .expense-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:0;min-width:0;max-width:100%}
  .expense-obligations-card strong{font-size:20px}
  .expense-obligation-lines{display:grid!important;gap:7px;margin-top:10px!important}
  .expense-obligation-lines span{display:flex!important;align-items:flex-start;justify-content:space-between;gap:10px;color:var(--foreground-muted);font-size:12px;font-weight:600;line-height:1.45}
  .expense-obligation-lines b{font-family:var(--font-data);flex:0 1 auto;min-width:max-content;color:var(--foreground);font-size:12px;font-weight:600;text-align:end;overflow-wrap:anywhere}
  .expense-dashboard-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,360px);gap:16px;align-items:start;min-width:0;max-width:100%}
  .expense-side-stack{display:grid;gap:16px;min-width:0;max-width:100%}
  .expense-list-panel{min-width:0;max-width:100%;overflow:hidden}
  .expense-list-panel .row-controls{min-width:0;max-width:100%;overflow:hidden}
  .expense-list-panel .row-search{flex:1 1 220px;min-width:0;max-width:100%}
  .expense-list-panel .row-select{flex:0 1 180px;min-width:0;max-width:100%}
  .expense-list-panel .row-count{overflow-wrap:anywhere}
  .expense-period-panel{display:grid;gap:12px;margin-bottom:12px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);padding:14px;box-shadow:var(--shadow-card);min-width:0;max-width:100%;overflow:hidden}
  .expense-period-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;min-width:0}
  .expense-period-head div{display:grid;gap:4px;min-width:0}
  .expense-period-head span,.expense-custom-period span{color:var(--foreground-muted);font-size:12px;font-weight:600}
  .expense-period-head strong{color:var(--foreground);font-size:15px;font-weight:600;overflow-wrap:anywhere}
  .expense-period-head small{max-width:340px;color:var(--foreground-muted);font-size:12px;font-weight:600;line-height:1.65;text-align:start}
  .expense-period-options{display:flex;gap:8px;overflow-x:auto;scrollbar-width:thin;padding-bottom:2px}
  .expense-period-options button{flex:0 0 auto;min-height:38px;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--foreground-muted);padding:0 13px;font:600 12px var(--font-ui);cursor:pointer;transition:all .18s ease;white-space:nowrap}
  .expense-period-options button:hover,.expense-period-options button:focus-visible{border-color:color-mix(in srgb,var(--accent) 50%,transparent);background:var(--accent-soft);color:var(--foreground);outline:none}
  .expense-period-options button.active{border-color:color-mix(in srgb,var(--accent) 65%,transparent);background:var(--primary-soft);color:var(--foreground);box-shadow:var(--shadow-card)}
  .expense-custom-period{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-width:0}
  .expense-custom-period label{display:grid;gap:6px;min-width:0}
  .expense-custom-period select{height:40px;border:1.5px solid var(--border-strong);border-radius:var(--radius-control);background:var(--surface);padding:0 10px;color:var(--foreground);font:600 13px var(--font-ui);outline:none;min-width:0}
  .expense-period-badge{width:max-content;max-width:100%;margin:-2px 0 12px;border:1px solid color-mix(in srgb,var(--primary) 18%,transparent);border-radius:var(--radius-pill);background:color-mix(in srgb,var(--primary) 8%,transparent);color:var(--primary);padding:7px 11px;font-size:12px;font-weight:600;overflow-wrap:anywhere}
  .expense-list-skeleton{display:grid;gap:10px}
  .expense-list-skeleton span{height:76px;border-radius:var(--radius-card);background:var(--skeleton-base);animation:skeleton-shimmer 1.25s ease-in-out infinite}
  .expense-card-list{display:grid;gap:10px;min-width:0;max-width:100%}
  .expense-card-row{display:flex;justify-content:space-between;gap:14px;min-width:0;max-width:100%;overflow:hidden;padding:15px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface);box-shadow:var(--shadow-card)}
  .expense-row-main{display:flex;align-items:flex-start;gap:12px;min-width:0;max-width:100%}
  .expense-row-icon{width:42px;height:42px;flex:0 0 42px;border-radius:var(--radius-card);background:var(--accent-soft);color:var(--foreground-muted);display:grid;place-items:center}
  .expense-row-main>div:last-child{min-width:0;max-width:100%}
  .expense-row-main strong{display:block;max-width:100%;overflow-wrap:anywhere;word-break:break-word;font-size:15px;font-weight:600;color:var(--foreground);line-height:1.35}
  .expense-row-main span{display:block;max-width:100%;overflow-wrap:anywhere;margin-top:4px;color:var(--foreground-muted);font-size:12px;font-weight:600}
  .expense-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px;min-width:0;max-width:100%}
  .expense-badges em{max-width:100%;overflow-wrap:anywhere;font-style:normal;border-radius:var(--radius-pill);padding:5px 9px;background:var(--surface-muted);color:var(--foreground-muted);border:1px solid var(--border);font-size:11px;font-weight:600}
  .expense-badges em.project{background:color-mix(in srgb,var(--primary) 12%,transparent);color:var(--primary);border-color:color-mix(in srgb,var(--primary) 22%,transparent)}
  .expense-badges em.ok{background:color-mix(in srgb,var(--success) 10%,transparent);color:var(--success);border-color:color-mix(in srgb,var(--success) 18%,transparent)}
  .expense-badges em.ai{background:var(--accent-soft);color:var(--foreground-muted);border-color:var(--accent)}
  .expense-row-actions{display:flex;align-items:center;justify-content:flex-end;gap:12px;flex:0 1 auto;min-width:0;max-width:100%;flex-wrap:wrap}
  .expense-row-amount{display:grid;justify-items:end;gap:3px;min-width:0;max-width:100%}
  .expense-row-amount>b{font-family:var(--font-data);max-width:100%;font-size:16px;color:var(--foreground);font-weight:600;white-space:nowrap}
  .expense-row-amount small{max-width:100%;color:var(--foreground-muted);font-size:11px;font-weight:600;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .expense-row-actions>div{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
  .expense-empty{text-align:center;border:1.5px dashed var(--border-strong);border-radius:var(--radius-panel);padding:34px 20px;background:var(--surface)}
  .expense-empty>div:first-child{width:66px;height:66px;margin:0 auto 14px;border-radius:var(--radius-panel);background:var(--accent-soft);color:var(--foreground-muted);display:grid;place-items:center}
  .expense-empty h3{margin:0 0 8px;font-size:20px;font-weight:600}
  .expense-empty p{max-width:520px;margin:0 auto 18px;color:var(--foreground-muted);line-height:1.8;font-weight:500}
  .expense-empty>div:last-child{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
  .monthly-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
  .monthly-grid div{background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-card);padding:12px}
  .monthly-grid span{display:block;color:var(--foreground-muted);font-size:11px;font-weight:600;margin-bottom:5px}
  .monthly-grid b{font-family:var(--font-data);font-size:16px;color:var(--foreground)}
  .expense-floating-add{display:none}
  .expense-smart-modal{width:min(920px,100%);max-height:min(92vh,980px);overflow:auto;padding:22px}
  .expense-modal-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-card);padding:5px;margin-bottom:16px}
  .expense-modal-tabs button{min-height:42px;border:0;border-radius:var(--radius-control);background:transparent;color:var(--foreground-muted);font:600 13px var(--font-ui);cursor:pointer;white-space:normal;line-height:1.35;padding:8px 10px}
  .expense-modal-tabs button.active{background:var(--primary-soft);color:var(--foreground);box-shadow:var(--shadow-card)}
  .expense-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .expense-form-grid select,.expense-form-grid textarea{border:1.5px solid var(--border-strong);border-radius:var(--radius-card);background:var(--surface-muted);padding:0 13px;color:var(--foreground);font:600 14px var(--font-ui);outline:0}
  .expense-form-grid select{height:50px}
  .expense-form-grid textarea{min-height:92px;padding-top:12px;resize:vertical}
  .expense-form-grid select:focus,.expense-form-grid textarea:focus{border-color:var(--accent);box-shadow:var(--focus-shadow);background:var(--surface)}
  .receipt-scan-area,.expense-notes,.expense-actions{grid-column:1/-1}
  .receipt-drop{position:relative;min-height:220px;border:1.5px dashed var(--border-strong);border-radius:var(--radius-panel);background:var(--surface);display:grid!important;place-items:center;text-align:center;cursor:pointer;overflow:visible;padding:18px;transition:all .18s ease}
  .receipt-drop:hover{border-color:color-mix(in srgb,var(--accent) 55%,transparent);background:var(--surface-hover);box-shadow:var(--shadow-card)}
  .receipt-drop:focus-within{border-color:var(--accent);box-shadow:var(--focus-shadow)}
  .receipt-drop input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:2}
  .receipt-drop img{width:100%;max-height:320px;object-fit:contain;border-radius:var(--radius-card)}
  .receipt-drop span{display:grid;place-items:center;gap:8px;color:var(--foreground-muted);font-weight:600}
  .receipt-drop .receipt-drop-copy{max-width:min(640px,100%);color:var(--foreground)}
  .receipt-drop-copy svg{color:var(--accent)}
  .receipt-drop-copy strong{display:block;font-size:17px;font-weight:600;color:var(--foreground);white-space:normal;overflow-wrap:anywhere}
  .receipt-drop small{display:block;color:var(--foreground-muted);font-size:12px;font-weight:600}
  .receipt-drop-copy small{max-width:560px;line-height:1.7;white-space:normal;overflow-wrap:anywhere}
  .receipt-attach-card{grid-column:1/-1;position:relative;display:flex!important;align-items:center;gap:14px;min-width:0;min-height:104px;border:1.5px solid var(--border-strong);border-radius:var(--radius-card);background:var(--surface);padding:16px 18px!important;cursor:pointer;color:var(--foreground);box-shadow:var(--shadow-card);transition:all .18s ease}
  .receipt-attach-card:hover{border-color:color-mix(in srgb,var(--accent) 55%,transparent);background:var(--surface-hover);box-shadow:var(--shadow-card);transform:translateY(-1px)}
  .receipt-attach-card:focus-within{border-color:var(--accent);box-shadow:var(--focus-shadow)}
  .receipt-attach-card input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:2}
  .receipt-attach-icon{width:46px;height:46px;flex:0 0 46px;border-radius:var(--radius-card);background:var(--accent-soft);color:var(--accent);display:grid;place-items:center}
  .receipt-attach-copy{display:grid!important;gap:5px;min-width:0;color:var(--foreground-muted)}
  .receipt-attach-copy strong{font-size:15px;font-weight:600;color:var(--foreground);line-height:1.35;white-space:normal;overflow-wrap:anywhere}
  .receipt-attach-copy small{font-size:12px;line-height:1.7;color:var(--foreground-muted);font-weight:600;white-space:normal;overflow-wrap:anywhere}
  .receipt-attach-copy em{width:fit-content;max-width:100%;font-style:normal;border-radius:var(--radius-pill);background:var(--accent-soft);border:1px solid var(--border);padding:5px 9px;color:var(--foreground);font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .receipt-preview-grid{width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;padding:12px}
  .receipt-preview-grid>div{min-width:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);padding:8px;display:grid;gap:7px;place-items:center}
  .receipt-preview-grid img{width:100%;height:112px;max-height:112px;object-fit:contain;border-radius:var(--radius-control)}
  .receipt-preview-grid small{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .receipt-selected-count{margin-top:9px;background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-control);padding:9px 11px;color:var(--foreground-muted);font-size:12px;font-weight:600}
  .receipt-scan-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end;margin-top:10px}
  .receipt-error{display:grid;gap:5px;border:1px solid color-mix(in srgb,var(--warning) 26%,transparent);background:var(--warning-soft);color:var(--warning);border-radius:var(--radius-card);padding:12px 14px;font-size:13px;font-weight:600;margin-top:10px;line-height:1.65}
  .receipt-error strong{display:block;color:var(--foreground);font-size:14px;font-weight:600}
  .receipt-error span,.receipt-error small{display:block;color:inherit}
  .receipt-error.provider-unavailable{border-color:color-mix(in srgb,var(--info) 24%,transparent);background:var(--info-soft);color:var(--info)}
  .ghost-form-btn.danger-soft{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 22%,transparent);background:var(--danger-soft)}
  .receipt-debug-panel{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;border:1px solid color-mix(in srgb,var(--primary) 18%,transparent);background:color-mix(in srgb,var(--primary) 8%,transparent);border-radius:var(--radius-control);padding:10px 12px;color:var(--foreground-muted);font-size:12px;font-weight:600}
  .receipt-debug-panel strong{color:var(--foreground);font-size:12px}
  .receipt-debug-panel span{border-radius:var(--radius-pill);background:var(--surface);border:1px solid var(--border);padding:4px 7px;max-width:100%;overflow-wrap:anywhere}
  .receipt-batch-review{display:grid;gap:12px;margin-top:12px}
  .receipt-batch-head{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
  .receipt-review-card{border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-card);padding:12px;display:grid;gap:10px}
  .receipt-review-card.failed{border-color:color-mix(in srgb,var(--danger) 25%,transparent);background:color-mix(in srgb,var(--danger) 4%,transparent)}
  .receipt-review-card.review{border-color:var(--accent);background:var(--surface-muted)}
  .receipt-review-select{display:flex!important;align-items:center!important;justify-content:space-between;gap:10px;color:var(--foreground-muted);font-weight:600}
  .receipt-review-select input{width:18px;height:18px}
  .receipt-review-body{display:grid;grid-template-columns:100px 1fr;gap:12px;align-items:start}
  .receipt-review-body>img{width:100px;height:110px;object-fit:contain;border-radius:var(--radius-control);background:var(--surface-muted);border:1px solid var(--border)}
  .receipt-review-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .receipt-review-fields input,.receipt-review-fields select{width:100%;min-width:0;border:1px solid var(--border);border-radius:var(--radius-control);padding:9px;background:var(--surface);color:var(--foreground);font-family:var(--font-ui)}
  .receipt-review-meta{display:flex;gap:8px;flex-wrap:wrap;color:var(--foreground-muted);font-size:12px;font-weight:600}
  .ai-result-card{margin-top:12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface);padding:15px}
  .ai-result-card>div:first-child{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:var(--success)}
  .extracted-field-badge{border-radius:var(--radius-pill);background:var(--success-soft);border:1px solid color-mix(in srgb,var(--success) 20%,transparent);color:var(--success);padding:4px 8px;font-size:11px;font-weight:600}
  .ai-result-card p{margin:8px 0 12px;color:var(--foreground-muted);font-weight:600}
  .receipt-candidate-panel{display:grid;gap:9px;margin:12px 0;padding:12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-hover)}
  .receipt-candidate-panel>strong{font-size:13px;color:var(--foreground)}
  .receipt-candidate-panel>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
  .receipt-candidate-panel button{min-width:0;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface);padding:9px 10px;display:grid;gap:4px;text-align:start;cursor:pointer;color:var(--foreground);font-family:var(--font-ui);transition:all .18s ease}
  .receipt-candidate-panel button:hover,.receipt-candidate-panel button:focus-visible{border-color:color-mix(in srgb,var(--accent) 55%,transparent);box-shadow:var(--focus-shadow);outline:none}
  .receipt-candidate-panel button.active{background:color-mix(in srgb,var(--accent) 18%,transparent);border-color:color-mix(in srgb,var(--accent) 65%,transparent)}
  .receipt-candidate-panel button span{font-size:11px;color:var(--foreground-muted);font-weight:600}
  .receipt-candidate-panel button b{font-size:14px;color:var(--foreground);overflow-wrap:anywhere}
  .ai-result-card dl{display:grid;grid-template-columns:150px 1fr;gap:8px 12px;margin:0}
  .ai-result-card dt{color:var(--foreground-muted);font-weight:600;font-size:12px}
  .ai-result-card dd{margin:0;color:var(--foreground);font-weight:600}
  .spin-icon{animation:spin 1s linear infinite}
  .receipt-details-modal{width:min(760px,100%);max-height:90vh;overflow:auto}
  .receipt-detail-image{width:100%;max-height:360px;object-fit:contain;border-radius:var(--radius-card);background:var(--surface-muted);border:1px solid var(--border);margin-bottom:14px}
  .receipt-detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px}
  .receipt-detail-grid div{background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-card);padding:11px}
  .receipt-detail-grid span{display:block;color:var(--foreground-muted);font-size:11px;font-weight:600;margin-bottom:5px}
  .receipt-detail-grid b{color:var(--foreground);font-size:13px}
  .receipt-items{display:grid;gap:8px;margin-bottom:12px}
  .receipt-items>strong{color:var(--foreground);font-size:14px}
  .receipt-items span{display:flex;justify-content:space-between;gap:10px;background:var(--surface-muted);border-radius:var(--radius-control);padding:9px 11px;color:var(--foreground-muted);font-weight:600}

  .expense-smart-main :is(button,a,input,select,textarea):focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}
  @media(max-width:1180px){.expense-dashboard-grid{grid-template-columns:1fr}.expense-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:920px){.expense-smart-main{width:100%!important;margin-inline-start:0!important;margin-inline-end:0!important;padding:16px 16px 52px!important}.expense-smart-content{gap:14px}.expense-hero{display:grid}.expense-hero-actions .primary-btn,.expense-hero-actions .ghost-btn{width:auto}.expense-side-stack{grid-template-columns:1fr}.expense-floating-add{position:fixed;display:grid;place-items:center;z-index:70;inset-inline-end:18px;bottom:18px;width:56px;height:56px;border-radius:var(--radius-card);border:0;background:var(--accent);color:var(--accent-foreground);box-shadow:var(--shadow-card)}}
  @media(max-width:640px){.expense-hero{padding:22px}.expense-hero h1{font-size:27px}.expense-kpi-grid,.expense-form-grid,.receipt-detail-grid,.monthly-grid,.expense-custom-period{grid-template-columns:1fr}.expense-period-head{display:grid}.expense-period-options{margin-inline:-4px;padding-inline:4px}.expense-list-panel .row-controls{display:grid;grid-template-columns:1fr}.expense-list-panel .row-select{width:100%}.expense-card-row{display:grid}.expense-row-actions{justify-content:space-between}.expense-row-amount{justify-items:start}.expense-row-amount>b,.expense-row-amount small{white-space:normal;overflow-wrap:anywhere}.expense-row-actions>div{flex-wrap:wrap;justify-content:flex-end}.expense-modal-overlay{align-items:end;padding:10px}.expense-smart-modal{border-radius:var(--radius-panel) var(--radius-panel) 0 0;max-height:94dvh;overflow-y:auto;max-width:100%;overflow-x:hidden}.expense-modal-tabs{grid-template-columns:1fr}.receipt-scan-actions,.expense-actions,.receipt-batch-head{display:grid;grid-template-columns:1fr}.ai-result-card dl{grid-template-columns:1fr}.expense-hero-actions{display:grid}.expense-hero-actions .primary-btn,.expense-hero-actions .ghost-btn{width:100%;justify-content:center}.receipt-preview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.receipt-review-body{grid-template-columns:1fr}.receipt-review-body>img{width:100%;height:150px}.receipt-review-fields{grid-template-columns:1fr}}
  @media(max-width:640px){.expense-obligation-lines span{display:grid!important;gap:3px}.expense-obligation-lines b{min-width:0;text-align:start}}
  @media(prefers-reduced-motion:reduce){.sfm-shell *,.expense-smart-main *{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
`;
