import { summarizeWorkflowReportReadiness } from '@/lib/reports/reportReadiness';

export type NotificationLang = 'ar' | 'en' | 'fr';
export type SmartNotificationSeverity = 'info' | 'success' | 'warning' | 'danger';
export type SmartNotificationType =
  | 'income'
  | 'expense'
  | 'goal'
  | 'market'
  | 'project'
  | 'task'
  | 'report'
  | 'charity'
  | 'zakat'
  | 'system'
  | 'general';

export type SmartNotification = {
  id: string;
  title: string;
  message: string;
  type: SmartNotificationType;
  severity: SmartNotificationSeverity;
  sourceModule: string;
  sourceId?: string | null;
  actionUrl: string;
  status: 'unread' | 'read' | 'archived';
  dueDate?: string | null;
  createdAt?: string | null;
  isDynamic: boolean;
};

export type NotificationSourceData = {
  income?: any[];
  expenses?: any[];
  goals?: any[];
  marketPriceAlerts?: any[];
  projects?: any[];
  feasibilityStudies?: any[];
  financialModels?: any[];
  projectTasks?: any[];
  projectMilestones?: any[];
  projectDocuments?: any[];
  zakatAssets?: any[];
  charityProjects?: any[];
  charityReminders?: any[];
  charityBeneficiaries?: any[];
  charityContributors?: any[];
};

const DAY_MS = 86400000;

const COPY = {
  ar: {
    incomeLateTitle: 'دخل متأخر يحتاج تأكيد',
    incomeLateMessage: (name: string) => `الدخل "${name}" متأخر ولم يتم تأكيده بعد.`,
    incomeDueTitle: 'دخل مستحق اليوم',
    incomeDueMessage: (name: string) => `الدخل "${name}" مستحق اليوم ويحتاج متابعة.`,
    incomePendingTitle: 'دخل بانتظار التأكيد',
    incomePendingMessage: (name: string) => `الدخل "${name}" مسجل بانتظار التأكيد.`,
    expenseOverIncomeTitle: 'المصروفات تتجاوز الدخل هذا الشهر',
    expenseOverIncomeMessage: 'حسب بيانات هذا الشهر، إجمالي المصروفات المسجلة أعلى من إجمالي الدخل المسجل.',
    goalCompletedTitle: 'هدف مالي مكتمل',
    goalCompletedMessage: (name: string) => `الهدف "${name}" وصل إلى المبلغ المستهدف حسب بياناتك المسجلة.`,
    goalDueTitle: 'موعد هدف مالي يقترب',
    goalDueMessage: (name: string) => `موعد الهدف "${name}" خلال 30 يوماً ولم يكتمل بعد.`,
    goalBehindTitle: 'تقدم الهدف أقل من المخطط',
    goalBehindMessage: (name: string) => `الهدف "${name}" أقل من المسار الزمني المتوقع بناءً على تاريخ الهدف والمبلغ الحالي.`,
    marketTriggeredTitle: 'تنبيه سوق محفوظ تم تفعيله',
    marketTriggeredMessage: (symbol: string) => `تنبيه السعر للرمز ${symbol} يحتاج مراجعة بناءً على حالته المحفوظة.`,
    taskOverdueTitle: 'مهمة مشروع متأخرة',
    taskOverdueMessage: (name: string) => `المهمة "${name}" تجاوزت تاريخ الاستحقاق ولم تكتمل.`,
    milestoneUpcomingTitle: 'معلم مشروع قادم',
    milestoneUpcomingMessage: (name: string) => `المعلم "${name}" مستحق خلال 7 أيام.`,
    projectEndedTitle: 'تاريخ نهاية المشروع تجاوز اليوم',
    projectEndedMessage: (name: string) => `المشروع "${name}" تجاوز تاريخ النهاية ولم يظهر كمكتمل.`,
    feasibilityMissingTitle: 'دراسة الجدوى غير مكتملة',
    feasibilityMissingMessage: (name: string) => `المشروع "${name}" لا يحتوي على دراسة جدوى محفوظة.`,
    financialMissingTitle: 'النموذج المالي غير مكتمل',
    financialMissingMessage: (name: string) => `المشروع "${name}" لا يحتوي على نموذج مالي محفوظ.`,
    zakatDueSoonTitle: 'موعد زكاة قريب',
    zakatDueSoonMessage: (name: string) => `الأصل "${name}" موعد زكاته خلال 7 أيام.`,
    zakatUpcomingTitle: 'تذكير حول قادم',
    zakatUpcomingMessage: (name: string) => `الأصل "${name}" موعد زكاته خلال 30 يوماً.`,
    charityReminderTitle: 'تذكير خيري مستحق',
    charityReminderMessage: (name: string) => `التذكير "${name}" ضمن فترة التنبيه المحددة.`,
    beneficiaryRenewalTitle: 'تجديد كفالة قريب',
    beneficiaryRenewalMessage: (name: string) => `تجديد "${name}" خلال 30 يوماً.`,
    contributorLateTitle: 'مساهمة مساهم متأخرة',
    contributorLateMessage: (name: string) => `مساهمة "${name}" متأخرة ولم تسجل كمدفوعة بالكامل.`,
    charityProjectDueTitle: 'موعد مشروع خيري يقترب',
    charityProjectDueMessage: (name: string) => `المشروع الخيري "${name}" ينتهي خلال 30 يوماً.`,
    reportReadyTitle: 'تقرير جاهز من بياناتك',
    reportReadyMessage: (name: string) => `تقرير "${name}" جاهز لأن بياناته المطلوبة متوفرة.`,
    financialReport: 'التقرير المالي',
    projectReport: 'تقرير المشاريع',
    zakatReport: 'تقرير الزكاة',
    charityReport: 'تقرير الأعمال الخيرية',
  },
  en: {
    incomeLateTitle: 'Late income needs confirmation',
    incomeLateMessage: (name: string) => `"${name}" is overdue and has not been confirmed yet.`,
    incomeDueTitle: 'Income due today',
    incomeDueMessage: (name: string) => `"${name}" is due today and needs follow-up.`,
    incomePendingTitle: 'Income pending confirmation',
    incomePendingMessage: (name: string) => `"${name}" is recorded as pending confirmation.`,
    expenseOverIncomeTitle: 'Expenses exceed income this month',
    expenseOverIncomeMessage: 'Based on this month’s records, total expenses are higher than total recorded income.',
    goalCompletedTitle: 'Financial goal completed',
    goalCompletedMessage: (name: string) => `"${name}" reached its target amount based on your records.`,
    goalDueTitle: 'Financial goal date approaching',
    goalDueMessage: (name: string) => `"${name}" is due within 30 days and is not complete yet.`,
    goalBehindTitle: 'Goal progress is behind schedule',
    goalBehindMessage: (name: string) => `"${name}" is behind its expected timeline based on target date and current amount.`,
    marketTriggeredTitle: 'Saved market alert triggered',
    marketTriggeredMessage: (symbol: string) => `The price alert for ${symbol} needs review based on its saved status.`,
    taskOverdueTitle: 'Project task overdue',
    taskOverdueMessage: (name: string) => `"${name}" passed its due date and is not complete.`,
    milestoneUpcomingTitle: 'Upcoming project milestone',
    milestoneUpcomingMessage: (name: string) => `"${name}" is due within 7 days.`,
    projectEndedTitle: 'Project end date has passed',
    projectEndedMessage: (name: string) => `"${name}" passed its end date and is not marked completed.`,
    feasibilityMissingTitle: 'Feasibility study missing',
    feasibilityMissingMessage: (name: string) => `"${name}" does not have a saved feasibility study.`,
    financialMissingTitle: 'Financial model missing',
    financialMissingMessage: (name: string) => `"${name}" does not have a saved financial model.`,
    zakatDueSoonTitle: 'Zakat date approaching',
    zakatDueSoonMessage: (name: string) => `"${name}" is due for zakat within 7 days.`,
    zakatUpcomingTitle: 'Upcoming hawl reminder',
    zakatUpcomingMessage: (name: string) => `"${name}" is due for zakat within 30 days.`,
    charityReminderTitle: 'Charity reminder due',
    charityReminderMessage: (name: string) => `"${name}" is inside its configured reminder window.`,
    beneficiaryRenewalTitle: 'Sponsorship renewal approaching',
    beneficiaryRenewalMessage: (name: string) => `"${name}" renews within 30 days.`,
    contributorLateTitle: 'Contributor payment late',
    contributorLateMessage: (name: string) => `"${name}" is overdue and not fully paid.`,
    charityProjectDueTitle: 'Charity project deadline approaching',
    charityProjectDueMessage: (name: string) => `"${name}" ends within 30 days.`,
    reportReadyTitle: 'Report ready from your data',
    reportReadyMessage: (name: string) => `"${name}" is ready because its required data exists.`,
    financialReport: 'Financial report',
    projectReport: 'Project report',
    zakatReport: 'Zakat report',
    charityReport: 'Charity report',
  },
  fr: {
    incomeLateTitle: 'Revenu en retard à confirmer',
    incomeLateMessage: (name: string) => `"${name}" est en retard et n’a pas encore été confirmé.`,
    incomeDueTitle: 'Revenu dû aujourd’hui',
    incomeDueMessage: (name: string) => `"${name}" est dû aujourd’hui et nécessite un suivi.`,
    incomePendingTitle: 'Revenu en attente de confirmation',
    incomePendingMessage: (name: string) => `"${name}" est enregistré en attente de confirmation.`,
    expenseOverIncomeTitle: 'Les dépenses dépassent les revenus ce mois-ci',
    expenseOverIncomeMessage: 'Selon les données du mois, les dépenses totales dépassent les revenus enregistrés.',
    goalCompletedTitle: 'Objectif financier terminé',
    goalCompletedMessage: (name: string) => `"${name}" a atteint son montant cible selon vos données.`,
    goalDueTitle: 'Date d’objectif financier proche',
    goalDueMessage: (name: string) => `"${name}" arrive à échéance dans 30 jours et n’est pas encore terminé.`,
    goalBehindTitle: 'La progression de l’objectif est en retard',
    goalBehindMessage: (name: string) => `"${name}" est en retard par rapport au calendrier prévu selon la date cible et le montant actuel.`,
    marketTriggeredTitle: 'Alerte de marché enregistrée déclenchée',
    marketTriggeredMessage: (symbol: string) => `L’alerte de prix pour ${symbol} nécessite une vérification selon son statut enregistré.`,
    taskOverdueTitle: 'Tâche de projet en retard',
    taskOverdueMessage: (name: string) => `"${name}" a dépassé son échéance et n’est pas terminée.`,
    milestoneUpcomingTitle: 'Jalon de projet à venir',
    milestoneUpcomingMessage: (name: string) => `"${name}" est dû dans les 7 jours.`,
    projectEndedTitle: 'La date de fin du projet est dépassée',
    projectEndedMessage: (name: string) => `"${name}" a dépassé sa date de fin et n’est pas marqué comme terminé.`,
    feasibilityMissingTitle: 'Étude de faisabilité manquante',
    feasibilityMissingMessage: (name: string) => `"${name}" n’a pas d’étude de faisabilité enregistrée.`,
    financialMissingTitle: 'Modèle financier manquant',
    financialMissingMessage: (name: string) => `"${name}" n’a pas de modèle financier enregistré.`,
    zakatDueSoonTitle: 'Date de zakat proche',
    zakatDueSoonMessage: (name: string) => `"${name}" est dû pour la zakat dans les 7 jours.`,
    zakatUpcomingTitle: 'Rappel hawl à venir',
    zakatUpcomingMessage: (name: string) => `"${name}" est dû pour la zakat dans les 30 jours.`,
    charityReminderTitle: 'Rappel caritatif dû',
    charityReminderMessage: (name: string) => `"${name}" est dans sa période de rappel configurée.`,
    beneficiaryRenewalTitle: 'Renouvellement de parrainage proche',
    beneficiaryRenewalMessage: (name: string) => `"${name}" est à renouveler dans 30 jours.`,
    contributorLateTitle: 'Paiement contributeur en retard',
    contributorLateMessage: (name: string) => `"${name}" est en retard et pas entièrement payé.`,
    charityProjectDueTitle: 'Échéance de projet caritatif proche',
    charityProjectDueMessage: (name: string) => `"${name}" se termine dans 30 jours.`,
    reportReadyTitle: 'Rapport prêt à partir de vos données',
    reportReadyMessage: (name: string) => `"${name}" est prêt car les données requises existent.`,
    financialReport: 'Rapport financier',
    projectReport: 'Rapport des projets',
    zakatReport: 'Rapport zakat',
    charityReport: 'Rapport caritatif',
  },
} as const;

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

function daysUntil(value: unknown, today = new Date()) {
  const date = parseDate(value);
  if (!date) return null;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((target - base) / DAY_MS);
}

function amount(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function firstText(row: any, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return fallback;
}

function makeId(parts: Array<string | null | undefined>) {
  return `dynamic:${parts.filter(Boolean).join(':')}`;
}

function currentMonthRows(rows: any[], dateKeys: string[]) {
  const now = new Date();
  return rows.filter(row => {
    const date = parseDate(firstText(row, dateKeys, ''));
    return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
}

export function generateSmartNotifications(data: NotificationSourceData, lang: NotificationLang): SmartNotification[] {
  const copy = COPY[lang];
  const now = new Date();
  const today = dateOnly(now);
  const notifications: SmartNotification[] = [];
  const add = (notice: Omit<SmartNotification, 'isDynamic' | 'status' | 'createdAt'> & { createdAt?: string | null }) => {
    notifications.push({ ...notice, isDynamic: true, status: 'unread', createdAt: notice.createdAt ?? new Date().toISOString() });
  };

  (data.income ?? []).forEach(row => {
    const name = firstText(row, ['source_name', 'name', 'description', 'income_type'], lang === 'ar' ? 'دخل' : lang === 'fr' ? 'Revenu' : 'Income');
    const status = String(row.status ?? row.workflowStatus ?? '').toLowerCase();
    const due = row.generated_for_date || row.received_date || row.expected_date || row.due_date;
    const diff = daysUntil(due, now);
    if (status === 'received' || row.confirmed_at) return;
    if (diff !== null && diff < 0) {
      add({ id: makeId(['income-late', row.id, String(due)]), title: copy.incomeLateTitle, message: copy.incomeLateMessage(name), type: 'income', severity: 'danger', sourceModule: 'income', sourceId: row.id, actionUrl: '/income', dueDate: String(due) });
    } else if (diff === 0) {
      add({ id: makeId(['income-due', row.id, String(due)]), title: copy.incomeDueTitle, message: copy.incomeDueMessage(name), type: 'income', severity: 'warning', sourceModule: 'income', sourceId: row.id, actionUrl: '/income', dueDate: String(due) });
    } else if (status === 'pending') {
      add({ id: makeId(['income-pending', row.id]), title: copy.incomePendingTitle, message: copy.incomePendingMessage(name), type: 'income', severity: 'info', sourceModule: 'income', sourceId: row.id, actionUrl: '/income', dueDate: due ? String(due) : null });
    }
  });

  const monthIncome = currentMonthRows(data.income ?? [], ['received_date', 'generated_for_date', 'created_at']).reduce((sum, row) => sum + amount(row.amount), 0);
  const monthExpenses = currentMonthRows(data.expenses ?? [], ['expense_date', 'created_at']).reduce((sum, row) => sum + amount(row.amount), 0);
  if (monthIncome > 0 && monthExpenses > monthIncome) {
    add({ id: makeId(['expenses-over-income', today]), title: copy.expenseOverIncomeTitle, message: copy.expenseOverIncomeMessage, type: 'expense', severity: 'warning', sourceModule: 'expenses', actionUrl: '/expenses', dueDate: today });
  }

  (data.goals ?? []).forEach(row => {
    const name = firstText(row, ['name', 'goal', 'title'], lang === 'ar' ? 'هدف مالي' : lang === 'fr' ? 'Objectif financier' : 'Financial goal');
    const target = amount(row.target_amount ?? row.amount);
    const current = amount(row.current_amount ?? row.saved_amount);
    const targetDate = row.target_date || row.deadline || row.due_date;
    const diff = daysUntil(targetDate, now);
    if (target > 0 && current >= target) {
      add({ id: makeId(['goal-complete', row.id]), title: copy.goalCompletedTitle, message: copy.goalCompletedMessage(name), type: 'goal', severity: 'success', sourceModule: 'goals', sourceId: row.id, actionUrl: '/goals', dueDate: targetDate ? String(targetDate) : null });
      return;
    }
    if (diff !== null && diff >= 0 && diff <= 30 && target > 0) {
      add({ id: makeId(['goal-due', row.id, String(targetDate)]), title: copy.goalDueTitle, message: copy.goalDueMessage(name), type: 'goal', severity: 'warning', sourceModule: 'goals', sourceId: row.id, actionUrl: '/goals', dueDate: String(targetDate) });
    }
    const created = parseDate(row.created_at);
    const end = parseDate(targetDate);
    if (created && end && target > 0) {
      const total = end.getTime() - created.getTime();
      const elapsed = now.getTime() - created.getTime();
      const expectedProgress = total > 0 ? Math.max(0, Math.min(1, elapsed / total)) : 0;
      const actualProgress = current / target;
      if (expectedProgress > 0.35 && actualProgress + 0.15 < expectedProgress) {
        add({ id: makeId(['goal-behind', row.id]), title: copy.goalBehindTitle, message: copy.goalBehindMessage(name), type: 'goal', severity: 'warning', sourceModule: 'goals', sourceId: row.id, actionUrl: '/goals', dueDate: targetDate ? String(targetDate) : null });
      }
    }
  });

  (data.marketPriceAlerts ?? []).forEach(row => {
    const status = String(row.status ?? '').toLowerCase();
    if (!['triggered', 'active_triggered', 'met'].includes(status)) return;
    const symbol = firstText(row, ['symbol'], '');
    if (!symbol) return;
    add({ id: makeId(['market-alert', row.id, status]), title: copy.marketTriggeredTitle, message: copy.marketTriggeredMessage(symbol), type: 'market', severity: 'warning', sourceModule: 'market', sourceId: row.id, actionUrl: '/ai-analyst/overview?legacy=market&tab=alerts', createdAt: row.created_at });
  });

  const feasibilityProjectIds = new Set((data.feasibilityStudies ?? []).map(row => row.project_id));
  const financialProjectIds = new Set((data.financialModels ?? []).map(row => row.project_id));

  (data.projectTasks ?? []).forEach(row => {
    const status = String(row.status ?? '').toLowerCase();
    const due = row.due_date;
    const diff = daysUntil(due, now);
    if (diff !== null && diff < 0 && !['done', 'completed', 'cancelled'].includes(status)) {
      const name = firstText(row, ['title', 'name'], lang === 'ar' ? 'مهمة' : lang === 'fr' ? 'Tâche' : 'Task');
      add({ id: makeId(['task-overdue', row.id, String(due)]), title: copy.taskOverdueTitle, message: copy.taskOverdueMessage(name), type: 'task', severity: 'danger', sourceModule: 'project_tasks', sourceId: row.id, actionUrl: row.project_id ? `/projects/${row.project_id}` : '/projects', dueDate: String(due) });
    }
  });

  (data.projectMilestones ?? []).forEach(row => {
    const status = String(row.status ?? '').toLowerCase();
    const due = row.target_date;
    const diff = daysUntil(due, now);
    if (diff !== null && diff >= 0 && diff <= 7 && !['done', 'completed', 'cancelled'].includes(status)) {
      const name = firstText(row, ['title', 'name'], lang === 'ar' ? 'معلم' : lang === 'fr' ? 'Jalon' : 'Milestone');
      add({ id: makeId(['milestone-upcoming', row.id, String(due)]), title: copy.milestoneUpcomingTitle, message: copy.milestoneUpcomingMessage(name), type: 'project', severity: 'warning', sourceModule: 'project_milestones', sourceId: row.id, actionUrl: row.project_id ? `/projects/${row.project_id}` : '/projects', dueDate: String(due) });
    }
  });

  (data.projects ?? []).forEach(row => {
    const name = firstText(row, ['name', 'project_name', 'title'], lang === 'ar' ? 'مشروع' : lang === 'fr' ? 'Projet' : 'Project');
    const projectStatus = String(row.status ?? '').toLowerCase();
    const endDiff = daysUntil(row.end_date, now);
    if (endDiff !== null && endDiff < 0 && !['completed', 'done', 'closed'].includes(projectStatus)) {
      add({ id: makeId(['project-ended', row.id, String(row.end_date)]), title: copy.projectEndedTitle, message: copy.projectEndedMessage(name), type: 'project', severity: 'danger', sourceModule: 'projects', sourceId: row.id, actionUrl: `/projects/${row.id}`, dueDate: String(row.end_date) });
    }
    if (row.id && !feasibilityProjectIds.has(row.id)) {
      add({ id: makeId(['project-feasibility-missing', row.id]), title: copy.feasibilityMissingTitle, message: copy.feasibilityMissingMessage(name), type: 'project', severity: 'warning', sourceModule: 'projects', sourceId: row.id, actionUrl: `/projects/${row.id}` });
    }
    if (row.id && !financialProjectIds.has(row.id)) {
      add({ id: makeId(['project-financial-missing', row.id]), title: copy.financialMissingTitle, message: copy.financialMissingMessage(name), type: 'project', severity: 'warning', sourceModule: 'projects', sourceId: row.id, actionUrl: `/projects/${row.id}` });
    }
  });

  (data.zakatAssets ?? []).forEach(row => {
    if (row.is_zakatable === false) return;
    const due = row.zakat_due_date;
    const diff = daysUntil(due, now);
    if (diff === null || diff < 0 || diff > 30) return;
    const name = firstText(row, ['asset_name', 'name'], lang === 'ar' ? 'أصل زكوي' : lang === 'fr' ? 'Actif zakat' : 'Zakat asset');
    add({ id: makeId(['zakat-due', row.id, String(due)]), title: diff <= 7 ? copy.zakatDueSoonTitle : copy.zakatUpcomingTitle, message: diff <= 7 ? copy.zakatDueSoonMessage(name) : copy.zakatUpcomingMessage(name), type: 'zakat', severity: diff <= 7 ? 'danger' : 'warning', sourceModule: 'zakat_assets', sourceId: row.id, actionUrl: '/zakat', dueDate: String(due) });
  });

  (data.charityReminders ?? []).forEach(row => {
    if (String(row.status ?? 'active').toLowerCase() !== 'active') return;
    const due = row.due_date;
    const diff = daysUntil(due, now);
    const remindBefore = amount(row.remind_before_days || 30);
    if (diff === null || diff < 0 || diff > remindBefore) return;
    const name = firstText(row, ['title'], lang === 'ar' ? 'تذكير خيري' : lang === 'fr' ? 'Rappel caritatif' : 'Charity reminder');
    add({ id: makeId(['charity-reminder', row.id, String(due)]), title: copy.charityReminderTitle, message: copy.charityReminderMessage(name), type: row.reminder_type === 'zakat' ? 'zakat' : 'charity', severity: diff <= 7 ? 'danger' : 'warning', sourceModule: 'charity_reminders', sourceId: row.id, actionUrl: row.reminder_type === 'zakat' ? '/zakat' : '/charity-projects', dueDate: String(due) });
  });

  (data.charityBeneficiaries ?? []).forEach(row => {
    const due = row.next_renewal_date;
    const diff = daysUntil(due, now);
    if (diff === null || diff < 0 || diff > 30) return;
    const name = firstText(row, ['display_name', 'reference_code'], lang === 'ar' ? 'مستفيد' : lang === 'fr' ? 'Bénéficiaire' : 'Beneficiary');
    add({ id: makeId(['beneficiary-renewal', row.id, String(due)]), title: copy.beneficiaryRenewalTitle, message: copy.beneficiaryRenewalMessage(name), type: 'charity', severity: diff <= 7 ? 'danger' : 'warning', sourceModule: 'charity_beneficiaries', sourceId: row.id, actionUrl: '/charity-projects', dueDate: String(due) });
  });

  (data.charityContributors ?? []).forEach(row => {
    const due = row.due_date;
    const diff = daysUntil(due, now);
    const status = String(row.payment_status ?? '').toLowerCase();
    if (diff !== null && diff < 0 && ['pending', 'partial'].includes(status)) {
      const name = firstText(row, ['contributor_name'], lang === 'ar' ? 'مساهم' : lang === 'fr' ? 'Contributeur' : 'Contributor');
      add({ id: makeId(['contributor-late', row.id, String(due)]), title: copy.contributorLateTitle, message: copy.contributorLateMessage(name), type: 'charity', severity: 'danger', sourceModule: 'charity_project_contributors', sourceId: row.id, actionUrl: '/charity-projects', dueDate: String(due) });
    }
  });

  (data.charityProjects ?? []).forEach(row => {
    const due = row.end_date;
    const diff = daysUntil(due, now);
    const status = String(row.status ?? '').toLowerCase();
    if (diff !== null && diff >= 0 && diff <= 30 && !['completed', 'done', 'cancelled'].includes(status)) {
      const name = firstText(row, ['name', 'project_name', 'title'], lang === 'ar' ? 'مشروع خيري' : lang === 'fr' ? 'Projet caritatif' : 'Charity project');
      add({ id: makeId(['charity-project-due', row.id, String(due)]), title: copy.charityProjectDueTitle, message: copy.charityProjectDueMessage(name), type: 'charity', severity: diff <= 7 ? 'danger' : 'warning', sourceModule: 'charity_projects', sourceId: row.id, actionUrl: '/charity-projects', dueDate: String(due) });
    }
  });

  const reportReadiness = summarizeWorkflowReportReadiness({
    income: data.income,
    expenses: data.expenses,
    projects: data.projects,
    zakatAssets: data.zakatAssets,
    charityProjects: data.charityProjects,
    charityBeneficiaries: data.charityBeneficiaries,
  });
  if (reportReadiness.financial === 'ready') {
    add({ id: makeId(['report-ready', 'financial', today]), title: copy.reportReadyTitle, message: copy.reportReadyMessage(copy.financialReport), type: 'report', severity: 'info', sourceModule: 'reports', actionUrl: '/reports-center', dueDate: today });
  }
  if (reportReadiness.projects === 'ready') {
    add({ id: makeId(['report-ready', 'projects', today]), title: copy.reportReadyTitle, message: copy.reportReadyMessage(copy.projectReport), type: 'report', severity: 'info', sourceModule: 'reports', actionUrl: '/reports-center', dueDate: today });
  }
  if (reportReadiness.zakat === 'ready') {
    add({ id: makeId(['report-ready', 'zakat', today]), title: copy.reportReadyTitle, message: copy.reportReadyMessage(copy.zakatReport), type: 'report', severity: 'info', sourceModule: 'reports', actionUrl: '/reports-center', dueDate: today });
  }
  if (reportReadiness.charity === 'ready') {
    add({ id: makeId(['report-ready', 'charity', today]), title: copy.reportReadyTitle, message: copy.reportReadyMessage(copy.charityReport), type: 'report', severity: 'info', sourceModule: 'reports', actionUrl: '/reports-center', dueDate: today });
  }

  return Array.from(new Map(notifications.map(item => [item.id, item])).values());
}
