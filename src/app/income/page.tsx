'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BarChart3, BriefcaseBusiness, CalendarDays, CheckCircle2, CircleDollarSign, Download, Edit3, ExternalLink, FileDown, FileText, Gauge, LineChart, Paperclip, Plus, ReceiptText, Sparkles, Trash2, TrendingUp, Wallet, X } from 'lucide-react';
import { CurrencySelect } from '@/components/CurrencySelect';
import { PageTabPanel, PageTabs } from '@/components/layout/PageTabs';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUrlTabState } from '@/hooks/useUrlTabState';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';
import { isProjectLinkedIncomeRow, personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';
import { useCurrency } from '@/lib/useCurrency';
import { normalizeNumberInput } from '@/lib/money';
import { trackEvent } from '@/lib/analytics';
import { normalizeDigits, toLatinNumberLocale } from '@/lib/locale';
import { buildSemanticConicGradient } from '@/lib/visual-system/chartStyles';

type IncomeType = 'salary' | 'freelance' | 'project' | 'investment' | 'bonus' | 'gift' | 'rent' | 'other';
type IncomeStatus = 'received' | 'pending' | 'expected' | 'late';
type Frequency = 'monthly' | 'weekly' | 'daily' | 'yearly';
type FrequencyMode = Frequency | 'one-time';
type CalculationMode = 'full_month' | 'prorated_current_month';
type Lang = 'ar' | 'en' | 'fr';
type IncomeFilter = 'all' | IncomeStatus | 'recurring' | 'one-time';
const INCOME_TAB_IDS = ['overview', 'sources', 'recurring', 'analytics', 'reports'] as const;
type IncomePageTab = typeof INCOME_TAB_IDS[number];
const INCOME_TABS_ID = 'income-workspace';

type IncomeRow = {
  id: string;
  user_id?: string;
  label?: string | null;
  name?: string | null;
  category?: string | null;
  amount: number;
  income_type?: string | null;
  status?: string | null;
  received_date?: string | null;
  currency?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  exchange_rate?: number | null;
  amount_kwd?: number | null;
  source_name?: string | null;
  notes?: string | null;
  is_recurring?: boolean | string | null;
  frequency?: string | null;
  recurrence_start_date?: string | null;
  recurrence_end_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean | string | null;
  calculation_mode?: string | null;
  parent_recurring_income_id?: string | null;
  generated_for_date?: string | null;
  confirmed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  project_id?: string | null;
  related_project_id?: string | null;
  project_income_id?: string | null;
  transferred_to_personal_income?: boolean | string | null;
  enhanced?: Record<string, unknown> | null;
};

type IncomeViewRow = IncomeRow & {
  workflowStatus: IncomeStatus;
};

type ExpenseRow = {
  id: string;
  amount?: number | string | null;
  date?: string | null;
  created_at?: string | null;
  category?: string | null;
  project_id?: string | null;
  related_project_id?: string | null;
  project_expense_id?: string | null;
  paid_from_personal_budget?: boolean | string | null;
  enhanced?: Record<string, unknown> | null;
};

type IncomeForm = {
  id?: string;
  name: string;
  amount: string;
  currency: string;
  incomeType: IncomeType;
  receivedDate: string;
  status: IncomeStatus;
  isRecurring: boolean;
  frequency: Frequency;
  recurrenceStartDate: string;
  recurrenceEndDate: string;
  calculationMode: CalculationMode;
  sourceName: string;
  notes: string;
};

type FormErrors = Partial<Record<'name' | 'amount' | 'currency' | 'incomeType' | 'frequency' | 'receivedDate', string>>;

type AttachmentPayload = {
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
};

const TX: Record<string, Record<Lang, string>> = {
  breadcrumb: { ar: 'THE SFM / الدخل', en: 'THE SFM / Income', fr: 'THE SFM / Revenus' },
  title: { ar: 'الدخل', en: 'Income', fr: 'Revenus' },
  monthNow: { ar: 'مايو 2026 • محدّث الآن', en: 'May 2026 • Updated now', fr: 'Mai 2026 • Mis à jour maintenant' },
  export: { ar: 'تصدير', en: 'Export', fr: 'Exporter' },
  exportPdf: { ar: 'تصدير PDF', en: 'Export PDF', fr: 'Exporter PDF' },
  exportExcel: { ar: 'تصدير Excel / CSV', en: 'Export Excel / CSV', fr: 'Exporter Excel / CSV' },
  generatedReport: { ar: 'تقرير الدخل', en: 'Income Report', fr: 'Rapport des revenus' },
  exportSuccess: { ar: 'تم تصدير التقرير بنجاح.', en: 'Report exported successfully.', fr: 'Rapport exporté avec succès.' },
  exportFailed: { ar: 'تعذر تصدير التقرير.', en: 'Could not export report.', fr: 'Impossible d’exporter le rapport.' },
  reportDisclaimer: { ar: 'هذا التقرير تم إنشاؤه من THE SFM لأغراض المتابعة المالية الشخصية.', en: 'This report was generated by THE SFM for personal financial tracking.', fr: 'Ce rapport a été généré par THE SFM pour le suivi financier personnel.' },
  stabilityScore: { ar: 'درجة استقرار الدخل', en: 'Income Stability Score', fr: 'Score de stabilité des revenus' },
  incomeDiversification: { ar: 'تنويع مصادر الدخل', en: 'Income Diversification', fr: 'Diversification des revenus' },
  recurringRatio: { ar: 'نسبة الدخل المتكرر', en: 'Recurring Income Ratio', fr: 'Ratio de revenus récurrents' },
  nextForecast: { ar: 'توقع الشهر القادم', en: 'Next Month Forecast', fr: 'Prévision du mois prochain' },
  smartIncomeView: { ar: 'رؤية الدخل الذكية', en: 'Smart Income View', fr: 'Vue intelligente des revenus' },
  notEnoughData: { ar: 'لا توجد بيانات كافية للتوقع بدقة.', en: 'Not enough data for an accurate forecast.', fr: 'Données insuffisantes pour une prévision précise.' },
  basedOnHistory: { ar: 'بناءً على آخر أشهر مسجلة.', en: 'Based on the latest recorded months.', fr: 'Basé sur les derniers mois enregistrés.' },
  stable: { ar: 'مستقر', en: 'Stable', fr: 'Stable' },
  needsReview: { ar: 'يحتاج مراجعة', en: 'Needs review', fr: 'À revoir' },
  highDependency: { ar: 'يعتمد دخلك بشكل كبير على مصدر واحد.', en: 'Your income depends heavily on one source.', fr: 'Vos revenus dépendent fortement d’une seule source.' },
  diversifiedGood: { ar: 'مصادر دخلك متنوعة بشكل جيد.', en: 'Your income sources are well diversified.', fr: 'Vos sources de revenus sont bien diversifiées.' },
  suggestion: { ar: 'اقتراح', en: 'Suggestion', fr: 'Suggestion' },
  acceptSuggestion: { ar: 'قبول الاقتراح', en: 'Accept suggestion', fr: 'Accepter la suggestion' },
  largestSource: { ar: 'أكبر مصدر دخل لديك', en: 'Your largest income source is', fr: 'Votre principale source de revenus est' },
  recurringStrong: { ar: 'الدخل المتكرر يمثل نسبة قوية من إجمالي الدخل.', en: 'Recurring income represents a strong share of total income.', fr: 'Les revenus récurrents représentent une part solide du total.' },
  pendingExists: { ar: 'يوجد دخل بانتظار التأكيد.', en: 'There is income waiting for confirmation.', fr: 'Des revenus attendent une confirmation.' },
  lateFollowup: { ar: 'حاول متابعة الدخل المتأخر لتحديث الصافي المتوقع.', en: 'Follow up overdue income to keep expected net updated.', fr: 'Suivez les revenus en retard pour actualiser le net prévu.' },
  diversificationHelps: { ar: 'تنويع مصادر الدخل يقلل الاعتماد على مصدر واحد.', en: 'Diversifying income sources reduces reliance on one source.', fr: 'Diversifier les sources réduit la dépendance à une seule source.' },
  addIncome: { ar: '+ إضافة دخل', en: '+ Add Income', fr: '+ Ajouter un revenu' },
  addFirstIncome: { ar: 'إضافة أول دخل', en: 'Add first income', fr: 'Ajouter le premier revenu' },
  savingsRateTitle: { ar: 'معدل الادخار', en: 'Savings rate', fr: 'Taux d’épargne' },
  spendingRatioTitle: { ar: 'نسبة الصرف', en: 'Spending ratio', fr: 'Ratio de dépenses' },
  calculatedFromRealData: { ar: 'محسوب من بياناتك الفعلية', en: 'Calculated from your real data', fr: 'Calculé à partir de vos données réelles' },
  insufficientData: { ar: 'بيانات غير كافية', en: 'Not enough data', fr: 'Données insuffisantes' },
  addIncomeForStability: { ar: 'أضف مصادر دخل لحساب درجة الاستقرار', en: 'Add income sources to calculate stability score', fr: 'Ajoutez des sources de revenus pour calculer le score de stabilité' },
  insufficientIncomeSavings: { ar: 'لا توجد بيانات دخل كافية لحساب معدل الادخار.', en: 'Not enough income data to calculate savings rate.', fr: 'Données de revenus insuffisantes pour calculer le taux d’épargne.' },
  insufficientExpensesSpending: { ar: 'لا توجد بيانات مصروفات كافية لحساب نسبة الصرف.', en: 'Not enough expense data to calculate spending ratio.', fr: 'Données de dépenses insuffisantes pour calculer le ratio de dépenses.' },
  insufficientForecast: { ar: 'لا توجد بيانات كافية لتوقع الشهر القادم.', en: 'Not enough data to forecast next month.', fr: 'Données insuffisantes pour prévoir le mois prochain.' },
  insightUnavailable: { ar: 'تعذر حساب هذه البطاقة حالياً.', en: 'This insight could not be calculated right now.', fr: 'Cette analyse ne peut pas être calculée pour le moment.' },
  viewExpenses: { ar: 'اعرض المصاريف', en: 'View expenses', fr: 'Voir les dépenses' },
  totalIncome: { ar: 'إجمالي الدخل', en: 'Total Income', fr: 'Revenu total' },
  incomeSources: { ar: 'مصادر الدخل', en: 'Income Sources', fr: 'Sources de revenus' },
  active: { ar: 'نشطة', en: 'active', fr: 'actives' },
  expectedNet: { ar: 'الصافي المتوقع', en: 'Expected Net', fr: 'Net prévu' },
  distribution: { ar: 'توزيع الدخل', en: 'Income Distribution', fr: 'Répartition des revenus' },
  trend: { ar: 'اتجاه الدخل الشهري', en: 'Monthly Income Trend', fr: 'Tendance mensuelle des revenus' },
  incomeList: { ar: 'مصادر الدخل', en: 'Income Sources', fr: 'Sources de revenus' },
  projectIncome: { ar: 'دخل مشروع', en: 'Project Income', fr: 'Revenu de projet' },
  noIncome: { ar: 'لا توجد مصادر دخل بعد', en: 'No income sources yet', fr: 'Aucune source de revenu pour le moment' },
  noIncomeDescription: { ar: 'ابدأ بإضافة دخلك الشهري أو أي مصدر دخل آخر ليتم بناء خطتك المالية بدقة.', en: 'Start by adding your salary or any other income source so your financial plan is built accurately.', fr: 'Commencez par ajouter votre salaire ou une autre source de revenu pour construire votre plan financier avec précision.' },
  name: { ar: 'اسم الدخل', en: 'Income name', fr: 'Nom du revenu' },
  incomeNamePlaceholder: { ar: 'مثال: راتب، مشروع، عميل، إيجار', en: 'Example: salary, project, client, rent', fr: 'Exemple : salaire, projet, client, loyer' },
  amount: { ar: 'المبلغ', en: 'Amount', fr: 'Montant' },
  amountPlaceholder: { ar: '0.000', en: '0.000', fr: '0.000' },
  currency: { ar: 'العملة', en: 'Currency', fr: 'Devise' },
  conversionDisabled: { ar: 'التحويل إلى الدينار الكويتي غير مفعّل حالياً.', en: 'Conversion to KWD is not enabled yet.', fr: 'La conversion vers le KWD n’est pas encore activée.' },
  attachFile: { ar: 'إرفاق ملف', en: 'Attach file', fr: 'Joindre un fichier' },
  removeAttachment: { ar: 'إزالة المرفق', en: 'Remove attachment', fr: 'Supprimer la pièce jointe' },
  attachment: { ar: 'يوجد مرفق', en: 'Attachment', fr: 'Pièce jointe' },
  viewAttachment: { ar: 'عرض المرفق', en: 'View attachment', fr: 'Voir la pièce jointe' },
  unsupportedFile: { ar: 'نوع الملف غير مدعوم', en: 'Unsupported file type', fr: 'Type de fichier non pris en charge' },
  fileTooLarge: { ar: 'حجم الملف كبير جداً', en: 'File size is too large', fr: 'Le fichier est trop volumineux' },
  uploadFailed: { ar: 'تعذر رفع الملف', en: 'Could not upload file', fr: 'Impossible de téléverser le fichier' },
  storageSetup: { ar: 'احفظ الدخل بدون المرفق الآن. يحتاج تخزين Supabase إلى تفعيل حاوية income-attachments.', en: 'Income was saved without the attachment. Supabase Storage needs the income-attachments bucket enabled.', fr: 'Le revenu a été enregistré sans pièce jointe. Supabase Storage doit activer le bucket income-attachments.' },
  type: { ar: 'نوع الدخل', en: 'Income type', fr: 'Type de revenu' },
  addIncomeTitle: { ar: 'إضافة دخل جديد', en: 'Add new income', fr: 'Ajouter un nouveau revenu' },
  editIncomeTitle: { ar: 'تعديل الدخل', en: 'Edit income', fr: 'Modifier le revenu' },
  addIncomeSubtitle: { ar: 'أضف مصدر دخل ليتم احتسابه ضمن خطتك المالية.', en: 'Add an income source so it is included in your financial plan.', fr: 'Ajoutez une source de revenu pour l’inclure dans votre plan financier.' },
  receivedDate: { ar: 'تاريخ الاستلام', en: 'Received date', fr: 'Date de réception' },
  status: { ar: 'الحالة', en: 'Status', fr: 'Statut' },
  recurring: { ar: 'متكرر', en: 'Recurring', fr: 'Récurrent' },
  oneTime: { ar: 'لمرة واحدة', en: 'One time', fr: 'Une fois' },
  frequency: { ar: 'التكرار', en: 'Frequency', fr: 'Fréquence' },
  optionalNote: { ar: 'ملاحظة اختيارية', en: 'Optional note', fr: 'Note facultative' },
  notePlaceholder: { ar: 'اكتب ملاحظة قصيرة إن وجدت', en: 'Write a short note if needed', fr: 'Ajoutez une courte note si nécessaire' },
  startDate: { ar: 'تاريخ البداية', en: 'Start date', fr: 'Date de début' },
  endDateOptional: { ar: 'تاريخ النهاية اختياري', en: 'End date optional', fr: 'Date de fin facultative' },
  upcomingIncome: { ar: 'دخل متوقع قادم', en: 'Upcoming Income', fr: 'Revenus à venir' },
  lateWarning: { ar: 'يوجد دخل متأخر يحتاج تأكيد.', en: 'There is overdue income that needs confirmation.', fr: 'Un revenu en retard nécessite une confirmation.' },
  viewLateIncome: { ar: 'عرض المتأخرات', en: 'View late income', fr: 'Voir les revenus en retard' },
  confirmReceived: { ar: 'تأكيد الاستلام', en: 'Confirm received', fr: 'Confirmer la réception' },
  confirmed: { ar: 'تم تأكيد استلام الدخل.', en: 'Income receipt confirmed.', fr: 'Réception du revenu confirmée.' },
  confirmError: { ar: 'تعذر تأكيد الاستلام. حاول مرة أخرى.', en: 'Could not confirm receipt. Please try again.', fr: 'Impossible de confirmer la réception. Réessayez.' },
  all: { ar: 'الكل', en: 'All', fr: 'Tous' },
  recurringFilter: { ar: 'متكرر', en: 'Recurring', fr: 'Récurrent' },
  oneTimeFilter: { ar: 'لمرة واحدة', en: 'One-time', fr: 'Unique' },
  editThisOnly: { ar: 'تعديل هذا السجل فقط', en: 'Edit this entry only', fr: 'Modifier uniquement cette entrée' },
  editFutureEntries: { ar: 'تعديل السجلات القادمة', en: 'Edit future entries', fr: 'Modifier les entrées futures' },
  deleteThisOnly: { ar: 'حذف هذا فقط', en: 'Delete this only', fr: 'Supprimer uniquement celui-ci' },
  deleteFutureEntries: { ar: 'حذف السجلات القادمة', en: 'Delete future entries', fr: 'Supprimer les entrées futures' },
  sourceCompany: { ar: 'المصدر / الجهة', en: 'Source / Company', fr: 'Source / organisme' },
  notes: { ar: 'ملاحظات', en: 'Notes', fr: 'Notes' },
  cancel: { ar: 'إلغاء', en: 'Cancel', fr: 'Annuler' },
  add: { ar: '+ إضافة', en: '+ Add', fr: '+ Ajouter' },
  save: { ar: 'حفظ', en: 'Save', fr: 'Enregistrer' },
  saveIncome: { ar: 'حفظ الدخل', en: 'Save income', fr: 'Enregistrer le revenu' },
  saving: { ar: 'جارٍ الحفظ...', en: 'Saving...', fr: 'Enregistrement...' },
  edit: { ar: 'تعديل', en: 'Edit', fr: 'Modifier' },
  delete: { ar: 'حذف', en: 'Delete', fr: 'Supprimer' },
  close: { ar: 'إغلاق', en: 'Close', fr: 'Fermer' },
  source: { ar: 'المصدر', en: 'Source', fr: 'Source' },
  date: { ar: 'التاريخ', en: 'Date', fr: 'Date' },
  percent: { ar: 'من الإجمالي', en: 'of total', fr: 'du total' },
  nameError: { ar: 'يرجى إدخال اسم الدخل', en: 'Please enter income name.', fr: 'Veuillez saisir le nom du revenu.' },
  amountError: { ar: 'يرجى إدخال مبلغ صحيح', en: 'Please enter a valid amount.', fr: 'Veuillez saisir un montant valide.' },
  currencyError: { ar: 'يرجى اختيار العملة', en: 'Please choose a currency.', fr: 'Veuillez choisir la devise.' },
  typeError: { ar: 'يرجى اختيار نوع الدخل', en: 'Please choose income type.', fr: 'Veuillez choisir le type de revenu.' },
  frequencyError: { ar: 'يرجى اختيار التكرار', en: 'Please choose frequency.', fr: 'Veuillez choisir la fréquence.' },
  receivedDateError: { ar: 'يرجى اختيار تاريخ الاستلام', en: 'Please choose received date.', fr: 'Veuillez choisir la date de réception.' },
  requiredError: { ar: 'يرجى إكمال الحقول المطلوبة.', en: 'Please complete the required fields.', fr: 'Veuillez compléter les champs requis.' },
  saved: { ar: 'تمت إضافة الدخل بنجاح', en: 'Income added successfully', fr: 'Revenu ajouté avec succès' },
  deleted: { ar: 'تم حذف الدخل', en: 'Income deleted', fr: 'Revenu supprimé' },
  exportSoon: { ar: 'التصدير غير مفعّل في هذه المرحلة.', en: 'Export is not enabled in this phase.', fr: 'L’export n’est pas activé dans cette phase.' },
  insightDetails: { ar: 'تعتمد هذه البطاقة على السجلات المحفوظة فقط، وتظهر بيانات غير كافية عندما لا تتوفر أرقام حقيقية كافية.', en: 'This card uses saved records only and shows insufficient data when there are not enough real numbers.', fr: 'Cette carte utilise uniquement les enregistrements sauvegardés et affiche des données insuffisantes lorsque les chiffres réels manquent.' },
  monthCalculationMethod: { ar: 'طريقة احتساب هذا الشهر', en: 'This month calculation method', fr: 'Mode de calcul de ce mois' },
  fullMonthCalculation: { ar: 'احتساب الشهر كامل', en: 'Count the full month', fr: 'Compter le mois complet' },
  proratedMonthCalculation: { ar: 'احتساب المتبقي من هذا الشهر فقط', en: 'Count the remaining part of this month only', fr: 'Compter uniquement le reste de ce mois' },
  calculatedFromMonthlyIncome: { ar: 'محسوب من الدخل الشهري', en: 'Calculated from monthly income', fr: 'Calculé à partir du revenu mensuel' },
  calculatedFromRemainingMonth: { ar: 'محسوب من المتبقي من الشهر', en: 'Calculated from the remaining month', fr: 'Calculé sur le reste du mois' },
  noIncomeAdded: { ar: 'لم يتم إضافة دخل بعد', en: 'No income has been added yet', fr: 'Aucun revenu ajouté pour le moment' },
  incomeLoadError: { ar: 'تعذر تحميل بيانات الدخل حالياً. حاول تحديث الصفحة أو إعادة المحاولة.', en: 'Income data could not be loaded right now. Refresh the page or try again.', fr: 'Les données de revenu ne peuvent pas être chargées pour le moment. Actualisez la page ou réessayez.' },
  retry: { ar: 'إعادة المحاولة', en: 'Retry', fr: 'Réessayer' },
  selectedMonthLabel: { ar: 'الشهر المعروض', en: 'Selected month', fr: 'Mois affiché' },
  currentMonthIncome: { ar: 'دخل هذا الشهر', en: 'This month income', fr: 'Revenu de ce mois' },
  expectedRemainingMonth: { ar: 'المتبقي من هذا الشهر', en: 'Remaining from this month', fr: 'Reste de ce mois' },
  currentMonthExpectedNet: { ar: 'الصافي المتوقع لهذا الشهر', en: 'Expected net this month', fr: 'Net prévu ce mois' },
  fullMonthlyIncome: { ar: 'الدخل الشهري الكامل', en: 'Full monthly income', fr: 'Revenu mensuel complet' },
  nextMonthFullIncome: { ar: 'الدخل الشهري الكامل المتوقع', en: 'Expected full monthly income', fr: 'Revenu mensuel complet prévu' },
  monthlyCalculationTooltip: { ar: 'يتم احتساب الدخل المتكرر حسب تاريخ البداية والنهاية للشهر المعروض. إذا بدأ الدخل داخل الشهر يمكن احتسابه كاملاً أو بنسبة الأيام المتبقية.', en: 'Recurring income is calculated from its start and end dates for the selected month. If it starts inside the month, it can be counted in full or prorated by remaining days.', fr: 'Le revenu récurrent est calculé selon les dates de début et de fin du mois affiché. S’il commence dans le mois, il peut être compté en entier ou au prorata des jours restants.' },
};

const TYPES: Array<{ id: IncomeType; icon: string; label: Record<Lang, string> }> = [
  { id: 'salary', icon: '💼', label: { ar: 'راتب', en: 'Salary', fr: 'Salaire' } },
  { id: 'freelance', icon: '🧰', label: { ar: 'عمل حر', en: 'Freelance', fr: 'Freelance' } },
  { id: 'project', icon: '🚀', label: { ar: 'مشروع', en: 'Project', fr: 'Projet' } },
  { id: 'investment', icon: '📈', label: { ar: 'استثمار', en: 'Investment', fr: 'Investissement' } },
  { id: 'rent', icon: '🏠', label: { ar: 'إيجار', en: 'Rent', fr: 'Loyer' } },
  { id: 'bonus', icon: '✨', label: { ar: 'مكافأة', en: 'Bonus', fr: 'Prime' } },
  { id: 'other', icon: '💰', label: { ar: 'أخرى', en: 'Other', fr: 'Autre' } },
];

const STATUSES: Array<{ id: IncomeStatus; label: Record<Lang, string> }> = [
  { id: 'received', label: { ar: 'مستلم', en: 'Received', fr: 'Reçu' } },
  { id: 'pending', label: { ar: 'بانتظار', en: 'Pending', fr: 'En attente' } },
  { id: 'expected', label: { ar: 'متوقع', en: 'Expected', fr: 'Prévu' } },
  { id: 'late', label: { ar: 'متأخر', en: 'Late', fr: 'En retard' } },
];

const FREQUENCIES: Array<{ id: Frequency; label: Record<Lang, string> }> = [
  { id: 'monthly', label: { ar: 'شهري', en: 'Monthly', fr: 'Mensuel' } },
  { id: 'weekly', label: { ar: 'أسبوعي', en: 'Weekly', fr: 'Hebdomadaire' } },
  { id: 'daily', label: { ar: 'يومي', en: 'Daily', fr: 'Quotidien' } },
];

const FREQUENCY_MODES: Array<{ id: FrequencyMode; label: Record<Lang, string> }> = [
  ...FREQUENCIES,
  { id: 'one-time', label: { ar: 'مرة واحدة', en: 'One time', fr: 'Une fois' } },
];

const ALLOWED_ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const emptyForm = (): IncomeForm => ({
  name: '',
  amount: '',
  currency: 'KWD',
  incomeType: 'other',
  receivedDate: todayDateOnly(),
  status: 'received',
  isRecurring: false,
  frequency: 'monthly',
  recurrenceStartDate: todayDateOnly(),
  recurrenceEndDate: '',
  calculationMode: defaultCalculationMode(todayDateOnly()),
  sourceName: '',
  notes: '',
});

function tr(key: keyof typeof TX, lang: string) {
  const safe = lang === 'fr' || lang === 'en' || lang === 'ar' ? lang : 'ar';
  return TX[key][safe];
}

function normalizeType(value?: string | null): IncomeType {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'salary' || normalized === 'freelance' || normalized === 'project' || normalized === 'investment' || normalized === 'bonus' || normalized === 'gift' || normalized === 'rent') return normalized;
  if (normalized === 'side' || normalized === 'business' || normalized === 'additional' || normalized === 'active') return 'freelance';
  if (normalized === 'passive' || normalized === 'إيجار' || normalized === 'ايجار' || normalized === 'loyer') return 'rent';
  if (normalized === 'راتب' || normalized === 'salaire') return 'salary';
  if (normalized === 'عمل حر') return 'freelance';
  if (normalized === 'استثمار' || normalized === 'investissement') return 'investment';
  if (normalized === 'مكافأة' || normalized === 'مكافاه' || normalized === 'prime') return 'bonus';
  if (normalized === 'هدية' || normalized === 'cadeau') return 'gift';
  if (normalized === 'مشروع' || normalized === 'projet') return 'project';
  return 'other';
}

function normalizeStatus(value?: string | null): IncomeStatus {
  if (value === 'pending' || value === 'expected' || value === 'late') return value;
  return 'received';
}

function todayDateOnly() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function normalizeCurrency(value?: string | null, fallback = 'KWD') {
  const code = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
}

function parseIncomeAmount(value: string) {
  const normalized = normalizeNumberInput(value).replace(/,/g, '').trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

function toDateInputValue(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${slash[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function dateOnlyToLocalDate(value: string | null | undefined) {
  if (!value) return new Date();
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
}

function compareDateOnly(a: string, b: string) {
  return dateOnlyToLocalDate(a).getTime() - dateOnlyToLocalDate(b).getTime();
}

function addFrequencyDate(value: string, frequency: Frequency) {
  const date = dateOnlyToLocalDate(value);
  if (frequency === 'daily') date.setDate(date.getDate() + 1);
  if (frequency === 'weekly') date.setDate(date.getDate() + 7);
  if (frequency === 'monthly') date.setMonth(date.getMonth() + 1);
  if (frequency === 'yearly') date.setFullYear(date.getFullYear() + 1);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function generateOccurrenceDates(startDate: string, frequency: Frequency, endDate?: string | null) {
  const dates: string[] = [];
  let cursor = startDate;
  for (let index = 0; index < 6; index += 1) {
    if (endDate && compareDateOnly(cursor, endDate) > 0) break;
    dates.push(cursor);
    cursor = addFrequencyDate(cursor, frequency);
  }
  return dates;
}

function workflowStatus(row: IncomeRow): IncomeStatus {
  if (row.confirmed_at || row.status === 'received') return 'received';
  const dueDate = (row.received_date || row.generated_for_date || row.created_at || todayDateOnly()).slice(0, 10);
  const diff = compareDateOnly(dueDate, todayDateOnly());
  if (diff > 0) return 'expected';
  if (diff === 0) return 'pending';
  return 'late';
}

function formatFileSize(size?: number | null) {
  if (!size) return '';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function csvEscape(value: string | number | boolean | null | undefined) {
  const text = normalizeDigits(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function cleanPdfText(value: unknown) {
  return normalizeDigits(value)
    .replace(/\u00C2\u00B7/g, ' | ')
    .replace(/\u00B7/g, ' | ')
    .replace(/\uFFFD/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePdfHtml(value: unknown) {
  return cleanPdfText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(value: string | null | undefined, lang: string) {
  const date = dateOnlyToLocalDate(value);
  const locale = toLatinNumberLocale(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US');
  return normalizeDigits(new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', numberingSystem: 'latn' }).format(date));
}

function monthKey(value: string | null | undefined) {
  return value ? value.slice(0, 7) : '';
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const safeYear = Number.isFinite(year) ? year : new Date().getFullYear();
  const safeMonth = Number.isFinite(monthNumber) ? monthNumber : new Date().getMonth() + 1;
  const start = new Date(safeYear, safeMonth - 1, 1);
  const end = new Date(safeYear, safeMonth, 0);
  const next = new Date(safeYear, safeMonth, 1);
  const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return {
    start,
    end,
    startKey: key(start),
    nextKey: key(next),
    startDate: key(start) + '-01',
    endDate: `${key(end)}-${String(end.getDate()).padStart(2, '0')}`,
    daysInMonth: end.getDate(),
  };
}

function normalizeCalculationMode(value?: string | null): CalculationMode {
  return value === 'prorated_current_month' ? 'prorated_current_month' : 'full_month';
}

function defaultCalculationMode(startDate: string, month = todayDateOnly().slice(0, 7)): CalculationMode {
  const startMonth = monthKey(startDate);
  if (startMonth === month && compareDateOnly(startDate, todayDateOnly()) >= 0) return 'prorated_current_month';
  if (startMonth === month && compareDateOnly(startDate, monthRange(month).startDate) >= 0) return 'prorated_current_month';
  return 'full_month';
}

function isRowActive(row: IncomeRow) {
  return row.is_active !== false && row.is_active !== 'false';
}

function rowFrequency(row: IncomeRow): Frequency | null {
  return row.frequency === 'monthly' || row.frequency === 'weekly' || row.frequency === 'daily' || row.frequency === 'yearly' ? row.frequency : null;
}

function rowIsRecurring(row: IncomeRow) {
  return row.is_recurring === true
    || row.is_recurring === 'true'
    || Boolean(row.parent_recurring_income_id)
    || Boolean(rowFrequency(row));
}

function recurringStartDate(row: IncomeRow) {
  return toDateInputValue(row.start_date || row.recurrence_start_date || row.received_date || row.generated_for_date || row.created_at) || todayDateOnly();
}

function recurringEndDate(row: IncomeRow) {
  return toDateInputValue(row.end_date || row.recurrence_end_date) || '';
}

function activeDaysInMonth(startDate: string, endDate: string | null | undefined, range: ReturnType<typeof monthRange>) {
  if (compareDateOnly(startDate, range.endDate) > 0) return 0;
  if (endDate && compareDateOnly(endDate, range.startDate) < 0) return 0;
  const activeStart = compareDateOnly(startDate, range.startDate) > 0 ? startDate : range.startDate;
  const activeEnd = endDate && compareDateOnly(endDate, range.endDate) < 0 ? endDate : range.endDate;
  const startDay = dateOnlyToLocalDate(activeStart).getDate();
  const endDay = dateOnlyToLocalDate(activeEnd).getDate();
  return Math.max(0, endDay - startDay + 1);
}

function annualOccurrenceDate(startDate: string, month: string) {
  const [year] = month.split('-');
  const [, sourceMonth, sourceDay] = startDate.split('-');
  if (!year || !sourceMonth || !sourceDay) return '';
  const candidate = `${year}-${sourceMonth}-${sourceDay}`;
  return isValidDateOnly(candidate) ? candidate : '';
}

function countRecurringOccurrences(row: IncomeRow, month: string) {
  const range = monthRange(month);
  const startDate = recurringStartDate(row);
  const endDate = recurringEndDate(row);
  const frequency = rowFrequency(row) ?? 'monthly';
  if (!isRowActive(row) || compareDateOnly(startDate, range.endDate) > 0 || (endDate && compareDateOnly(endDate, range.startDate) < 0)) return 0;

  if (frequency === 'daily') return activeDaysInMonth(startDate, endDate, range);
  if (frequency === 'weekly') {
    let cursor = startDate;
    let guard = 0;
    while (compareDateOnly(cursor, range.startDate) < 0 && guard < 540) {
      cursor = addFrequencyDate(cursor, 'weekly');
      guard += 1;
    }
    let count = 0;
    while (compareDateOnly(cursor, range.endDate) <= 0 && (!endDate || compareDateOnly(cursor, endDate) <= 0) && guard < 620) {
      count += 1;
      cursor = addFrequencyDate(cursor, 'weekly');
      guard += 1;
    }
    return count;
  }
  if (frequency === 'yearly') {
    const occurrence = annualOccurrenceDate(startDate, month);
    if (!occurrence) return 0;
    return compareDateOnly(occurrence, startDate) >= 0 && (!endDate || compareDateOnly(occurrence, endDate) <= 0) && monthKey(occurrence) === month ? 1 : 0;
  }
  return activeDaysInMonth(startDate, endDate, range) > 0 ? 1 : 0;
}

type MonthIncomeContribution = {
  row: IncomeViewRow;
  amount: number;
  fullAmount: number;
  recurring: boolean;
  prorated: boolean;
  occurrences: number;
};

function calculateRowForMonth(row: IncomeViewRow, month: string): MonthIncomeContribution | null {
  if (!isRowActive(row)) return null;
  const amount = toFiniteAmount(row.amount);
  if (amount <= 0) return null;
  if (!rowIsRecurring(row)) {
    const date = toDateInputValue(row.received_date || row.generated_for_date || row.created_at);
    if (monthKey(date) !== month) return null;
    return { row, amount, fullAmount: amount, recurring: false, prorated: false, occurrences: 1 };
  }

  const frequency = rowFrequency(row) ?? 'monthly';
  const occurrences = countRecurringOccurrences(row, month);
  if (occurrences <= 0) return null;
  const range = monthRange(month);
  const startDate = recurringStartDate(row);
  const endDate = recurringEndDate(row);
  if (frequency !== 'monthly') {
    return { row, amount: amount * occurrences, fullAmount: amount * occurrences, recurring: true, prorated: false, occurrences };
  }

  const activeDays = activeDaysInMonth(startDate, endDate, range);
  const coversFullMonth = activeDays >= range.daysInMonth;
  const mode = normalizeCalculationMode(row.calculation_mode);
  const shouldProrate = !coversFullMonth && (mode === 'prorated_current_month' || Boolean(endDate && compareDateOnly(endDate, range.endDate) < 0));
  const calculated = shouldProrate ? amount * (activeDays / range.daysInMonth) : amount;
  return { row, amount: calculated, fullAmount: amount, recurring: true, prorated: shouldProrate, occurrences: 1 };
}

function recurringBaseRows(rows: IncomeViewRow[]) {
  const parentIds = new Set(rows.filter(row => rowIsRecurring(row) && !row.parent_recurring_income_id).map(row => row.id));
  const seen = new Set<string>();
  return rows.filter(row => {
    if (!rowIsRecurring(row)) return false;
    if (row.parent_recurring_income_id && parentIds.has(row.parent_recurring_income_id)) return false;
    const key = row.parent_recurring_income_id || row.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function monthIncomeSummary(rows: IncomeViewRow[], month: string) {
  const recurringRows = recurringBaseRows(rows);
  const recurringIds = new Set(recurringRows.map(row => row.id));
  const oneTimeRows = rows.filter(row => !rowIsRecurring(row));
  const contributions = [...oneTimeRows, ...recurringRows]
    .map(row => calculateRowForMonth(row, month))
    .filter((item): item is MonthIncomeContribution => Boolean(item));
  const total = contributions.reduce((sum, item) => sum + item.amount, 0);
  const recurringTotal = contributions.filter(item => item.recurring).reduce((sum, item) => sum + item.amount, 0);
  const fullRecurringTotal = contributions.filter(item => item.recurring).reduce((sum, item) => sum + item.fullAmount, 0);
  const oneTimeTotal = contributions.filter(item => !item.recurring).reduce((sum, item) => sum + item.amount, 0);
  return {
    contributions,
    rows: contributions.map(item => item.row),
    recurringIds,
    total,
    recurringTotal,
    oneTimeTotal,
    fullRecurringTotal,
    proratedTotal: contributions.filter(item => item.prorated).reduce((sum, item) => sum + item.amount, 0),
    hasProrated: contributions.some(item => item.prorated),
    hasRecurring: contributions.some(item => item.recurring),
    recurringCount: recurringRows.length,
  };
}

function formatMonthLabel(month: string, locale: string) {
  const range = monthRange(month);
  return normalizeDigits(new Intl.DateTimeFormat(toLatinNumberLocale(locale), { month: 'long', year: 'numeric', numberingSystem: 'latn' }).format(range.start));
}

function toFiniteAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatPercent(value: number, locale: string, signed = false) {
  if (!Number.isFinite(value)) return '';
  const formatted = normalizeDigits(new Intl.NumberFormat(toLatinNumberLocale(locale), { maximumFractionDigits: 1, numberingSystem: 'latn' }).format(Math.abs(value)));
  if (!signed) return `${formatted}%`;
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatted}%`;
}

function typeLabel(type: string | null | undefined, lang: string) {
  const item = TYPES.find(entry => entry.id === normalizeType(type)) ?? TYPES.at(-1)!;
  return item.label[lang as Lang] ?? item.label.ar;
}

function typeIcon(type: string | null | undefined) {
  return (TYPES.find(entry => entry.id === normalizeType(type)) ?? TYPES.at(-1)!).icon;
}

function statusLabel(status: string | null | undefined, lang: string) {
  const item = STATUSES.find(entry => entry.id === normalizeStatus(status)) ?? STATUSES[0];
  return item.label[lang as Lang] ?? item.label.ar;
}

function suggestIncomeType(name: string): IncomeType | null {
  const value = name.trim().toLowerCase();
  if (!value) return null;
  if (/راتب|salary|payroll|wage/.test(value)) return 'salary';
  if (/إيجار|ايجار|rent|lease/.test(value)) return 'rent';
  if (/مكافأة|مكافاه|bonus|commission/.test(value)) return 'bonus';
  if (/استثمار|dividend|investment|stock|fund/.test(value)) return 'investment';
  if (/هدية|gift/.test(value)) return 'gift';
  if (/project|مشروع/.test(value)) return 'project';
  if (/جانبي|freelance|side|عمل حر|عميل/.test(value)) return 'freelance';
  return null;
}

function legacyName(row: IncomeRow) {
  return row.label || row.name || row.source_name || 'Income';
}

function currencySymbol(code: string) {
  if (code === 'KWD') return 'د.ك';
  if (code === 'USD') return '$';
  if (code === 'EUR') return '€';
  if (code === 'GBP') return '£';
  if (code === 'SAR') return 'ر.س';
  if (code === 'AED') return 'د.إ';
  return code;
}

export default function IncomePage() {
  const { lang, dir } = useLanguage();
  const { user, isGuest } = useAuth();
  const { currency: defaultCurrency } = useCurrency();
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [insightLoadError, setInsightLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<IncomeForm>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState('');
  const [insightOpen, setInsightOpen] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<IncomeFilter>('all');
  const [activeTab, setActiveTab] = useUrlTabState<IncomePageTab>({
    param: 'tab',
    values: INCOME_TAB_IDS,
    defaultValue: 'overview',
    omitDefault: true,
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => todayDateOnly().slice(0, 7));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const exportRef = useRef<HTMLDivElement | null>(null);

  const locale = toLatinNumberLocale(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US');

  const load = useCallback(async () => {
    setLoading(true);
    setInsightLoadError(false);
    if (isGuest || !user) {
      try {
        const local = JSON.parse(localStorage.getItem('sfm_guest_income') || '[]') as IncomeRow[];
        setRows(local);
      } catch {
        setRows([]);
      }
      try {
        const localExpenses = JSON.parse(localStorage.getItem('sfm_guest_expenses') || '[]') as ExpenseRow[];
        setExpenseRows(localExpenses);
      } catch {
        setExpenseRows([]);
      }
      setLoading(false);
      return;
    }
    const [incomeResult, expenseResult] = await Promise.all([
      supabase
        .from('monthly_income_sources')
        .select('*')
        .eq('user_id', user.id)
        .order('received_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('expense_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);
    if (incomeResult.error) {
      setRows([]);
      setInsightLoadError(true);
    } else {
      setRows(personalIncomeRows((incomeResult.data ?? []) as IncomeRow[]));
    }
    if (expenseResult.error) {
      setExpenseRows([]);
      setInsightLoadError(true);
    } else {
      setExpenseRows(personalExpenseRows((expenseResult.data ?? []) as ExpenseRow[]));
    }
    setLoading(false);
  }, [isGuest, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  useEffect(() => {
    if (!exportOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExportOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) setExportOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [exportOpen]);

  const viewRows = useMemo<IncomeViewRow[]>(() => rows.map(row => ({ ...row, workflowStatus: workflowStatus(row) })), [rows]);
  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return viewRows;
    if (statusFilter === 'recurring') return viewRows.filter(row => rowIsRecurring(row));
    if (statusFilter === 'one-time') return viewRows.filter(row => !rowIsRecurring(row));
    return viewRows.filter(row => row.workflowStatus === statusFilter);
  }, [statusFilter, viewRows]);
  const upcomingRows = useMemo(() => viewRows
    .filter(row => row.workflowStatus === 'expected' || row.workflowStatus === 'pending')
    .sort((a, b) => compareDateOnly(a.received_date || a.generated_for_date || todayDateOnly(), b.received_date || b.generated_for_date || todayDateOnly()))
    .slice(0, 5), [viewRows]);
  const lateRows = useMemo(() => viewRows.filter(row => row.workflowStatus === 'late'), [viewRows]);

  const selectedMonthSummary = useMemo(() => monthIncomeSummary(viewRows, selectedMonth), [selectedMonth, viewRows]);
  const nextMonthSummary = useMemo(() => monthIncomeSummary(viewRows, monthRange(selectedMonth).nextKey), [selectedMonth, viewRows]);
  const selectedMonthExpenses = useMemo(() => expenseRows.filter(row => monthKey(row.date || row.created_at) === selectedMonth), [expenseRows, selectedMonth]);

  const total = selectedMonthSummary.total;
  const selectedMonthIncomeTotal = selectedMonthSummary.total;
  const selectedMonthExpenseTotal = selectedMonthExpenses.reduce((sum, row) => sum + toFiniteAmount(row.amount), 0);
  const activeSources = viewRows.filter(row => row.workflowStatus !== 'late' && isRowActive(row)).length;
  const expectedNet = Math.max(selectedMonthIncomeTotal - selectedMonthExpenseTotal, 0);
  const fullMonthlyIncome = selectedMonthSummary.fullRecurringTotal;
  const remainingMonthIncome = Math.max(fullMonthlyIncome - selectedMonthSummary.recurringTotal, 0);
  const nextMonthIncomeTotal = nextMonthSummary.total;
  const nextMonthFullIncome = nextMonthSummary.fullRecurringTotal;
  const calculationBadge = selectedMonthSummary.hasProrated
    ? tr('calculatedFromRemainingMonth', lang)
    : selectedMonthSummary.hasRecurring
      ? tr('calculatedFromMonthlyIncome', lang)
      : selectedMonthIncomeTotal > 0
        ? tr('calculatedFromRealData', lang)
        : tr('noIncomeAdded', lang);
  const recurringTotal = selectedMonthSummary.recurringTotal;
  const recurringRows = useMemo(() => recurringBaseRows(viewRows), [viewRows]);
  const displayRows = activeTab === 'recurring' ? recurringRows : filteredRows;
  const recurringPercent = total > 0 ? Math.round((recurringTotal / total) * 100) : 0;
  const largestContribution = selectedMonthSummary.contributions.reduce<MonthIncomeContribution | null>((largest, item) => item.amount > (largest?.amount ?? 0) ? item : largest, null);
  const largestRow = largestContribution?.row ?? null;
  const concentrationPercent = total > 0 && largestRow ? Math.round((toFiniteAmount(largestRow.amount) / total) * 100) : 0;
  const stableMonths = new Set(viewRows
    .flatMap(row => {
      if (!rowIsRecurring(row)) return [monthKey(row.received_date || row.generated_for_date || row.created_at)];
      const start = monthKey(recurringStartDate(row));
      const current = selectedMonthSummary.recurringIds.has(row.id) ? selectedMonth : '';
      return [start, current];
    })
    .filter(Boolean)).size;
  const hasAnyIncome = viewRows.some(row => isRowActive(row) && toFiniteAmount(row.amount) > 0);
  const hasIncomeData = selectedMonthIncomeTotal > 0 || hasAnyIncome;
  const stabilityScore = hasIncomeData
    ? Math.max(0, Math.min(100,
      Math.min(activeSources, 5) * 6
      + Math.min(recurringPercent, 80) * 0.25
      + Math.min(stableMonths, 4) * 10
      + 25
      - Math.max(0, concentrationPercent - 55) * 0.35
      - lateRows.length * 7
      - viewRows.filter(row => row.workflowStatus === 'pending').length * 3
    ))
    : null;
  const monthTotals = useMemo(() => {
    const totals = new Map<string, number>();
    viewRows.forEach(row => {
      const key = monthKey(row.received_date || row.generated_for_date || row.created_at);
      if (!key) return;
      totals.set(key, monthIncomeSummary(viewRows, key).total);
    });
    totals.set(selectedMonth, selectedMonthIncomeTotal);
    totals.set(monthRange(selectedMonth).nextKey, nextMonthSummary.total);
    return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [nextMonthSummary.total, selectedMonth, selectedMonthIncomeTotal, viewRows]);
  const savingsRate = selectedMonthIncomeTotal > 0
    ? ((selectedMonthIncomeTotal - selectedMonthExpenseTotal) / selectedMonthIncomeTotal) * 100
    : null;
  const spendingRatio = selectedMonthIncomeTotal > 0
    ? (selectedMonthExpenseTotal / selectedMonthIncomeTotal) * 100
    : null;
  const forecastValue = nextMonthIncomeTotal > 0
    ? nextMonthIncomeTotal
    : monthTotals.length >= 3
      ? monthTotals.slice(-3).reduce((sum, [, value]) => sum + value, 0) / Math.min(3, monthTotals.length)
      : null;
  const insightCards = useMemo(() => {
    const unavailable = (title: string, tone: 'success' | 'warning' | 'info') => ({
      title,
      tone,
      value: '',
      message: tr('insightUnavailable', lang),
      source: tr('insufficientData', lang),
      available: false,
    });
    if (insightLoadError) {
      return [
        unavailable(tr('savingsRateTitle', lang), 'success'),
        unavailable(tr('spendingRatioTitle', lang), 'warning'),
        unavailable(tr('nextForecast', lang), 'info'),
      ];
    }
    return [
      {
        title: tr('savingsRateTitle', lang),
        tone: 'success' as const,
        value: savingsRate === null ? '' : formatPercent(savingsRate, locale),
        message: savingsRate === null ? tr('insufficientIncomeSavings', lang) : tr('calculatedFromRealData', lang),
        source: savingsRate === null ? tr('insufficientData', lang) : tr('calculatedFromRealData', lang),
        available: savingsRate !== null,
      },
      {
        title: tr('spendingRatioTitle', lang),
        tone: 'warning' as const,
        value: spendingRatio === null ? '' : formatPercent(spendingRatio, locale),
        message: spendingRatio === null ? tr('insufficientExpensesSpending', lang) : tr('calculatedFromRealData', lang),
        source: spendingRatio === null ? tr('insufficientData', lang) : tr('calculatedFromRealData', lang),
        available: spendingRatio !== null,
      },
      {
        title: tr('nextForecast', lang),
        tone: 'info' as const,
        value: forecastValue === null ? '' : formatMoney(forecastValue, defaultCurrency || 'KWD', lang as Lang),
        message: forecastValue === null ? tr('insufficientForecast', lang) : tr('nextMonthFullIncome', lang),
        source: forecastValue === null ? tr('insufficientData', lang) : (nextMonthSummary.hasRecurring ? tr('calculatedFromMonthlyIncome', lang) : tr('calculatedFromRealData', lang)),
        available: forecastValue !== null,
      },
    ];
  }, [defaultCurrency, forecastValue, insightLoadError, lang, locale, nextMonthSummary.hasRecurring, savingsRate, spendingRatio]);
  const smartGuidance = useMemo(() => {
    if (!hasIncomeData) return [tr('addIncomeForStability', lang)];
    const items: string[] = [];
    if (recurringPercent >= 50) items.push(tr('recurringStrong', lang));
    if (largestRow) items.push(`${tr('largestSource', lang)} ${legacyName(largestRow)}.`);
    if (viewRows.some(row => row.workflowStatus === 'pending')) items.push(tr('pendingExists', lang));
    if (lateRows.length > 0) items.push(tr('lateFollowup', lang));
    items.push(concentrationPercent > 65 ? tr('highDependency', lang) : tr('diversificationHelps', lang));
    return items.slice(0, 5);
  }, [concentrationPercent, hasIncomeData, lang, largestRow, lateRows.length, recurringPercent, viewRows]);
  const categorySuggestion = suggestIncomeType(form.name);
  const frequencyMode: FrequencyMode = form.isRecurring ? form.frequency : 'one-time';
  const incomeTabs = useMemo(() => {
    const labels = {
      ar: {
        overview: 'نظرة عامة',
        sources: 'المصادر',
        recurring: 'المتكرر',
        analytics: 'التحليلات',
        reports: 'التقارير',
      },
      en: {
        overview: 'Overview',
        sources: 'Sources',
        recurring: 'Recurring',
        analytics: 'Analytics',
        reports: 'Reports',
      },
      fr: {
        overview: 'Aperçu',
        sources: 'Sources',
        recurring: 'Récurrent',
        analytics: 'Analyses',
        reports: 'Rapports',
      },
    }[lang as Lang];
    return [
      { id: 'overview', label: labels.overview },
      { id: 'sources', label: labels.sources, count: viewRows.length },
      { id: 'recurring', label: labels.recurring, count: recurringRows.length },
      { id: 'analytics', label: labels.analytics },
      { id: 'reports', label: labels.reports },
    ];
  }, [lang, recurringRows.length, viewRows.length]);

  const distribution = useMemo(() => {
    const colors = ['var(--foreground)', 'var(--primary)', 'var(--accent)', 'var(--info)', 'var(--warning)', 'var(--success)', 'var(--foreground-secondary)'];
    const totals = new Map<IncomeType, number>();
    selectedMonthSummary.contributions.forEach(item => {
      const type = normalizeType(item.row.income_type || item.row.category);
      totals.set(type, (totals.get(type) ?? 0) + item.amount);
    });
    return [...totals.entries()]
      .filter(([, value]) => value > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([type, value], index) => ({
        label: typeLabel(type, lang),
        value: selectedMonthIncomeTotal > 0 ? (value / selectedMonthIncomeTotal) * 100 : 0,
        color: colors[index % colors.length],
      }));
  }, [lang, selectedMonthIncomeTotal, selectedMonthSummary.contributions]);

  const trend = monthTotals.map(([, value]) => value);
  const points = trend.map((value, index) => {
    const x = trend.length > 1 ? (index / (trend.length - 1)) * 360 : 180;
    const min = Math.min(...trend);
    const max = Math.max(...trend);
    const y = 130 - ((value - min) / (max - min || 1)) * 110;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  function patchForm(next: Partial<IncomeForm>, clear?: keyof FormErrors) {
    setForm(previous => ({ ...previous, ...next }));
    if (clear) {
      setFormErrors(previous => {
        const { [clear]: _removed, ...rest } = previous;
        return rest;
      });
    }
    setFormError('');
  }

  function setFrequencyMode(mode: FrequencyMode) {
    if (mode === 'one-time') {
      patchForm({ isRecurring: false }, 'frequency');
      return;
    }
    const startDate = form.receivedDate || todayDateOnly();
    patchForm({
      isRecurring: true,
      frequency: mode,
      recurrenceStartDate: startDate,
      calculationMode: mode === 'monthly' ? defaultCalculationMode(startDate) : 'full_month',
    }, 'frequency');
  }

  function openCreate() {
    setForm({ ...emptyForm(), currency: normalizeCurrency(defaultCurrency, 'KWD') });
    setFormError('');
    setFormErrors({});
    setAttachmentError('');
    setSelectedFile(null);
    setModalOpen(true);
  }

  function openEdit(row: IncomeRow) {
    const receivedDate = toDateInputValue(row.received_date || row.start_date || row.created_at) || todayDateOnly();
    const recurrenceStartDate = toDateInputValue(row.start_date || row.recurrence_start_date || row.received_date || row.created_at) || receivedDate;
    const frequency = rowFrequency(row) ?? 'monthly';
    setForm({
      id: row.id,
      name: legacyName(row),
      amount: row.amount === null || row.amount === undefined ? '' : String(row.amount),
      currency: normalizeCurrency(row.currency, normalizeCurrency(defaultCurrency, 'KWD')),
      incomeType: normalizeType(row.income_type || row.category),
      receivedDate,
      status: normalizeStatus(row.status),
      isRecurring: rowIsRecurring(row),
      frequency,
      recurrenceStartDate,
      recurrenceEndDate: toDateInputValue(row.end_date || row.recurrence_end_date) || '',
      calculationMode: normalizeCalculationMode(row.calculation_mode),
      sourceName: row.source_name || '',
      notes: row.notes || '',
    });
    setFormError('');
    setFormErrors({});
    setAttachmentError('');
    setSelectedFile(null);
    setModalOpen(true);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  }

  function validateAttachment(file: File) {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) return tr('unsupportedFile', lang);
    if (file.size > MAX_ATTACHMENT_SIZE) return tr('fileTooLarge', lang);
    return '';
  }

  function handleFileSelect(file: File | null) {
    setAttachmentError('');
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const error = validateAttachment(file);
    if (error) {
      setAttachmentError(error);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }

  async function uploadAttachment(incomeId: string): Promise<AttachmentPayload> {
    if (!selectedFile) {
      const existing = rows.find(row => row.id === incomeId);
      return {
        attachment_url: existing?.attachment_url ?? null,
        attachment_name: existing?.attachment_name ?? null,
        attachment_type: existing?.attachment_type ?? null,
        attachment_size: existing?.attachment_size ?? null,
      };
    }
    if (isGuest || !user) {
      return {
        attachment_url: URL.createObjectURL(selectedFile),
        attachment_name: selectedFile.name,
        attachment_type: selectedFile.type,
        attachment_size: selectedFile.size,
      };
    }
    const safeName = selectedFile.name.replace(/[^\w.\-]+/g, '-');
    const path = `${user.id}/${incomeId}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('income-attachments').upload(path, selectedFile, {
      cacheControl: '3600',
      upsert: true,
      contentType: selectedFile.type,
    });
    if (error) throw error;
    const { data } = supabase.storage.from('income-attachments').getPublicUrl(path);
    return {
      attachment_url: data.publicUrl,
      attachment_name: selectedFile.name,
      attachment_type: selectedFile.type,
      attachment_size: selectedFile.size,
    };
  }

  function exportCsv() {
    try {
      const headers = ['date', 'name', 'type', 'status', 'amount', 'currency', 'source', 'notes', 'recurring', 'frequency'];
      const lines = viewRows.map(row => [
        row.received_date || row.generated_for_date || '',
        legacyName(row),
        typeLabel(row.income_type || row.category, lang),
        statusLabel(row.workflowStatus, lang),
        Number(row.amount || 0),
        row.currency || 'KWD',
        row.source_name || '',
        row.notes || '',
        rowIsRecurring(row) ? tr('recurring', lang) : tr('oneTime', lang),
        row.frequency || '',
      ].map(csvEscape).join(','));
      const blob = new Blob([`\uFEFF${headers.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `income-data-${todayDateOnly().slice(0, 7)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
      void trackEvent('export_report', { module: 'income', metadata: { export_type: 'csv', report_id: 'income' } });
      showToast(tr('exportSuccess', lang));
    } catch {
      showToast(tr('exportFailed', lang));
    }
  }

  function exportPdf() {
    try {
      const report = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
      if (!report) throw new Error('Popup blocked');
      const pdfLang = (lang === 'ar' || lang === 'en' || lang === 'fr' ? lang : 'ar') as Lang;
      const pdfText = {
        title: { ar: 'تقرير الدخل', en: 'Income Report', fr: 'Rapport des revenus' },
        generatedAt: { ar: 'تاريخ الإنشاء', en: 'Generated at', fr: 'Généré le' },
        month: { ar: 'الشهر', en: 'Month', fr: 'Mois' },
        totalIncome: { ar: 'إجمالي الدخل', en: 'Total income', fr: 'Revenu total' },
        incomeSources: { ar: 'مصادر الدخل', en: 'Income sources', fr: 'Sources de revenus' },
        expectedNet: { ar: 'الصافي المتوقع', en: 'Expected net', fr: 'Net prévu' },
        distribution: { ar: 'توزيع الدخل', en: 'Income distribution', fr: 'Répartition des revenus' },
        records: { ar: 'سجلات الدخل', en: 'Income records', fr: 'Lignes de revenu' },
        date: { ar: 'التاريخ', en: 'Date', fr: 'Date' },
        name: { ar: 'الاسم', en: 'Name', fr: 'Nom' },
        type: { ar: 'النوع', en: 'Type', fr: 'Type' },
        status: { ar: 'الحالة', en: 'Status', fr: 'Statut' },
        amount: { ar: 'المبلغ', en: 'Amount', fr: 'Montant' },
        empty: { ar: 'لا توجد سجلات دخل في هذا التقرير.', en: 'No income records in this report.', fr: 'Aucune ligne de revenu dans ce rapport.' },
        disclaimer: {
          ar: 'هذا التقرير تم إنشاؤه من THE SFM لأغراض المتابعة المالية الشخصية.',
          en: 'This report was generated by THE SFM for personal financial tracking.',
          fr: 'Ce rapport a été généré par THE SFM pour le suivi financier personnel.',
        },
        calculatedFromRemainingMonth: {
          ar: 'محسوب من المتبقي من الشهر',
          en: 'Calculated from the remaining month',
          fr: 'Calculé sur le reste du mois',
        },
        calculatedFromMonthlyIncome: {
          ar: 'محسوب من الدخل الشهري',
          en: 'Calculated from monthly income',
          fr: 'Calculé sur le revenu mensuel',
        },
        calculatedFromRealData: {
          ar: 'محسوب من البيانات الفعلية',
          en: 'Calculated from real data',
          fr: 'Calculé à partir des données réelles',
        },
        noIncomeAdded: {
          ar: 'لا توجد بيانات دخل',
          en: 'No income data',
          fr: 'Aucune donnée de revenu',
        },
      };
      const typeLabels: Record<IncomeType, Record<Lang, string>> = {
        salary: { ar: 'راتب', en: 'Salary', fr: 'Salaire' },
        freelance: { ar: 'عمل حر', en: 'Freelance', fr: 'Freelance' },
        project: { ar: 'مشروع', en: 'Project', fr: 'Projet' },
        investment: { ar: 'استثمار', en: 'Investment', fr: 'Investissement' },
        bonus: { ar: 'مكافأة', en: 'Bonus', fr: 'Prime' },
        gift: { ar: 'هدية', en: 'Gift', fr: 'Cadeau' },
        rent: { ar: 'إيجار', en: 'Rent', fr: 'Loyer' },
        other: { ar: 'أخرى', en: 'Other', fr: 'Autre' },
      };
      const statusLabels: Record<IncomeStatus, Record<Lang, string>> = {
        received: { ar: 'مستلم', en: 'Received', fr: 'Reçu' },
        pending: { ar: 'بانتظار التأكيد', en: 'Pending', fr: 'En attente' },
        expected: { ar: 'متوقع', en: 'Expected', fr: 'Prévu' },
        late: { ar: 'متأخر', en: 'Late', fr: 'En retard' },
      };
      const pdf = (key: keyof typeof pdfText) => pdfText[key][pdfLang] ?? pdfText[key].ar;
      const pdfCalculationBadge = selectedMonthSummary.hasProrated
        ? pdf('calculatedFromRemainingMonth')
        : selectedMonthSummary.hasRecurring
          ? pdf('calculatedFromMonthlyIncome')
          : selectedMonthIncomeTotal > 0
            ? pdf('calculatedFromRealData')
            : pdf('noIncomeAdded');
      const rowsHtml = viewRows.length > 0 ? viewRows.map(row => `
        <tr>
          <td>${escapePdfHtml(formatDate(row.received_date || row.generated_for_date, pdfLang))}</td>
          <td>${escapePdfHtml(legacyName(row))}</td>
          <td>${escapePdfHtml(typeLabels[normalizeType(row.income_type || row.category)][pdfLang])}</td>
          <td>${escapePdfHtml(statusLabels[normalizeStatus(row.workflowStatus)][pdfLang])}</td>
          <td>${escapePdfHtml(formatMoney(Number(row.amount || 0), row.currency || 'KWD', pdfLang))}</td>
        </tr>
      `).join('') : `<tr><td class="empty" colspan="5">${escapePdfHtml(pdf('empty'))}</td></tr>`;
      const distributionText = distribution.length
        ? distribution.map(item => `${item.label}: ${item.value}%`).join(' | ')
        : '-';
      report.document.write(`
        <!doctype html>
        <html dir="${dir}" lang="${pdfLang}">
          <head>
            <meta charset="utf-8" />
            <title>${escapePdfHtml(pdf('title'))}</title>
            <style>
              @page{size:A4;margin:12mm}
              *{box-sizing:border-box}
              body{font-family:var(--font-ui);background:var(--surface);color:var(--primary);margin:0;padding:24px;line-height:1.65}
              .page{background:var(--surface);border:1px solid var(--primary-soft);border-radius:var(--radius-panel);overflow:hidden;box-shadow:var(--shadow-card)}
              header{background:var(--primary);color:var(--primary-foreground);padding:28px 30px}
              .brand{display:inline-flex;border:1px solid color-mix(in srgb, var(--surface) 22%, transparent);background:color-mix(in srgb, var(--surface) 10%, transparent);border-radius:var(--radius-pill);padding:8px 12px;color:var(--success-soft);font-size:12px;font-weight:600}
              h1{margin:12px 0 6px;font-size:30px;line-height:1.25;font-weight:600}.header-meta{color:var(--primary-soft);font-size:12px;font-weight:600}
              .content{padding:24px}.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 20px}
              .stat{border:1px solid var(--primary-soft);background:var(--surface);border-radius:var(--radius-card);padding:14px;min-height:84px}.stat span{display:block;color:var(--info);font-size:12px;font-weight:600}.stat b{display:block;margin-top:7px;color:var(--primary);font-size:16px;font-weight:600;overflow-wrap:anywhere}
              h2{margin:18px 0 10px;color:var(--primary);font-size:15px;font-weight:600}.pill{border:1px solid var(--primary-soft);background:var(--surface);border-radius:var(--radius-control);padding:12px;color:var(--primary);font-weight:600;overflow-wrap:anywhere}
              .table-wrap{border:1px solid var(--primary-soft);border-radius:var(--radius-card);overflow:hidden;margin-top:12px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border-bottom:1px solid var(--accent);padding:11px 12px;text-align:start;font-size:12px;vertical-align:top;overflow-wrap:anywhere}th{background:var(--surface);color:var(--primary);font-weight:600}.empty{text-align:center;color:var(--info);font-weight:600;padding:26px}
              footer{border-top:1px solid var(--accent);background:var(--surface);padding:14px 24px;color:var(--info);font-size:12px;font-weight:600}
              @media print{body{background:var(--surface);padding:0}.page{border:0;border-radius:0;box-shadow:none}.content{padding:18px}}
              @media(max-width:720px){body{padding:14px}.stats{grid-template-columns:1fr}.content{padding:16px}}
            </style>
          </head>
          <body>
            <main class="page">
              <header>
                <div class="brand">THE SFM</div>
                <h1>${escapePdfHtml(pdf('title'))}</h1>
                <div class="header-meta">${escapePdfHtml(pdf('generatedAt'))}: ${escapePdfHtml(normalizeDigits(new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' }).format(new Date())))}</div>
              </header>
              <section class="content">
              <div class="pill">${escapePdfHtml(pdf('month'))}: ${escapePdfHtml(formatMonthLabel(selectedMonth, locale))} | ${escapePdfHtml(pdfCalculationBadge)}</div>
                <section class="stats">
                  <div class="stat"><span>${escapePdfHtml(pdf('totalIncome'))}</span><b>${escapePdfHtml(formatMoney(total || 0, defaultCurrency || 'KWD', pdfLang))}</b></div>
                  <div class="stat"><span>${escapePdfHtml(pdf('incomeSources'))}</span><b>${escapePdfHtml(activeSources)}</b></div>
                  <div class="stat"><span>${escapePdfHtml(pdf('expectedNet'))}</span><b>${escapePdfHtml(formatMoney(expectedNet || 0, defaultCurrency || 'KWD', pdfLang))}</b></div>
                </section>
                <h2>${escapePdfHtml(pdf('distribution'))}</h2>
                <p class="pill">${escapePdfHtml(distributionText)}</p>
                <h2>${escapePdfHtml(pdf('records'))}</h2>
                <div class="table-wrap">
                  <table>
                    <thead><tr><th>${escapePdfHtml(pdf('date'))}</th><th>${escapePdfHtml(pdf('name'))}</th><th>${escapePdfHtml(pdf('type'))}</th><th>${escapePdfHtml(pdf('status'))}</th><th>${escapePdfHtml(pdf('amount'))}</th></tr></thead>
                    <tbody>${rowsHtml}</tbody>
                  </table>
                </div>
              </section>
              <footer>${escapePdfHtml(pdf('disclaimer'))}</footer>
            </main>
            <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script>
          </body>
        </html>
      `);
      report.document.close();
      setExportOpen(false);
      void trackEvent('export_report', { module: 'income', metadata: { export_type: 'pdf', report_id: 'income' } });
      showToast(tr('exportSuccess', lang));
    } catch {
      showToast(tr('exportFailed', lang));
    }
  }

  async function saveIncome(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const name = form.name.trim();
    const amount = parseIncomeAmount(form.amount);
    const currency = normalizeCurrency(form.currency, '');
    const receivedDateInput = toDateInputValue(form.receivedDate);
    const recurrenceStartDate = toDateInputValue(form.recurrenceStartDate || form.receivedDate);
    const recurrenceEndDate = toDateInputValue(form.recurrenceEndDate);
    const effectiveReceivedDate = form.isRecurring ? recurrenceStartDate : receivedDateInput;
    const nextErrors: FormErrors = {};
    if (name.length < 2) nextErrors.name = tr('nameError', lang);
    if (!Number.isFinite(amount) || amount <= 0) nextErrors.amount = tr('amountError', lang);
    if (!currency) nextErrors.currency = tr('currencyError', lang);
    if (!form.incomeType) nextErrors.incomeType = tr('typeError', lang);
    if (!frequencyMode) nextErrors.frequency = tr('frequencyError', lang);
    if (!effectiveReceivedDate || !isValidDateOnly(effectiveReceivedDate)) nextErrors.receivedDate = tr('receivedDateError', lang);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError(Object.values(nextErrors).join(' '));
      return;
    }
    setFormError('');

    setSaving(true);
    const id = form.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const receivedDate = effectiveReceivedDate;
    const savedStatus = form.isRecurring ? workflowStatus({ id, amount, status: 'expected', received_date: receivedDate }) : form.status;
    let attachmentPayload: AttachmentPayload = {
      attachment_url: rows.find(row => row.id === id)?.attachment_url ?? null,
      attachment_name: rows.find(row => row.id === id)?.attachment_name ?? null,
      attachment_type: rows.find(row => row.id === id)?.attachment_type ?? null,
      attachment_size: rows.find(row => row.id === id)?.attachment_size ?? null,
    };
    if (selectedFile) {
      try {
        attachmentPayload = await uploadAttachment(id);
      } catch {
        setAttachmentError(tr('uploadFailed', lang));
        showToast(tr('storageSetup', lang));
      }
    }
    const payload = {
      label: name,
      category: form.incomeType,
      amount,
      amount_kwd: currency === 'KWD' ? amount : null,
      exchange_rate: null,
      income_type: form.incomeType,
      status: savedStatus,
      received_date: receivedDate,
      currency,
      ...attachmentPayload,
      source_name: form.sourceName || null,
      notes: form.notes || null,
      is_recurring: form.isRecurring,
      frequency: form.isRecurring ? form.frequency : null,
      recurrence_start_date: form.isRecurring ? recurrenceStartDate : null,
      recurrence_end_date: form.isRecurring && recurrenceEndDate ? recurrenceEndDate : null,
      start_date: form.isRecurring ? recurrenceStartDate : receivedDate,
      end_date: form.isRecurring && recurrenceEndDate ? recurrenceEndDate : null,
      is_active: true,
      calculation_mode: form.isRecurring && form.frequency === 'monthly' ? form.calculationMode : 'full_month',
      parent_recurring_income_id: null,
      generated_for_date: form.isRecurring ? recurrenceStartDate : null,
      confirmed_at: savedStatus === 'received' ? now : null,
      updated_at: now,
    };
    const nextRow: IncomeRow = { id, ...payload, created_at: now };
    const occurrenceDates = form.isRecurring ? generateOccurrenceDates(recurrenceStartDate, form.frequency, recurrenceEndDate) : [];
    const futureDates = occurrenceDates.slice(1);
    const makeGeneratedRows = (parentId: string, createdAt = now): IncomeRow[] => futureDates.map(date => ({
      ...nextRow,
      id: crypto.randomUUID(),
      status: 'expected',
      received_date: date,
      recurrence_start_date: recurrenceStartDate,
      recurrence_end_date: recurrenceEndDate || null,
      start_date: recurrenceStartDate,
      end_date: recurrenceEndDate || null,
      is_active: true,
      calculation_mode: form.frequency === 'monthly' ? form.calculationMode : 'full_month',
      parent_recurring_income_id: parentId,
      generated_for_date: date,
      confirmed_at: null,
      created_at: createdAt,
      updated_at: createdAt,
    }));

    try {
      if (isGuest || !user) {
        const generatedRows = form.isRecurring && !form.id ? makeGeneratedRows(id) : [];
        const combined = form.id ? rows.map(row => row.id === id ? { ...row, ...nextRow } : row) : [nextRow, ...generatedRows, ...rows];
        const seen = new Set<string>();
        const next = combined.filter(row => {
          const key = row.parent_recurring_income_id && row.generated_for_date ? `${row.parent_recurring_income_id}:${row.generated_for_date}` : row.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        localStorage.setItem('sfm_guest_income', JSON.stringify(next));
        setRows(next);
      } else if (form.id) {
        const { error } = await supabase.from('monthly_income_sources').update(payload).eq('id', id).eq('user_id', user.id);
        if (error) throw error;
        setRows(previous => previous.map(row => row.id === id ? { ...row, ...nextRow } : row));
        await load();
      } else {
        const { data, error } = await supabase
          .from('monthly_income_sources')
          .insert({ ...payload, user_id: user.id })
          .select('*')
          .single();
        if (error) throw error;
        const parent = data as IncomeRow;
        let generatedRows: IncomeRow[] = [];
        if (form.isRecurring && futureDates.length > 0) {
          const { data: existing } = await supabase
            .from('monthly_income_sources')
            .select('generated_for_date')
            .eq('user_id', user.id)
            .eq('parent_recurring_income_id', parent.id)
            .in('generated_for_date', futureDates);
          const existingDates = new Set((existing ?? []).map(item => item.generated_for_date));
          const inserts = futureDates
            .filter(date => !existingDates.has(date))
            .map(date => ({
              label: name,
              category: form.incomeType,
              amount,
              amount_kwd: currency === 'KWD' ? amount : null,
              exchange_rate: null,
              income_type: form.incomeType,
              status: 'expected',
              received_date: date,
              currency,
              source_name: form.sourceName || null,
              notes: form.notes || null,
              is_recurring: true,
              frequency: form.frequency,
              recurrence_start_date: recurrenceStartDate,
              recurrence_end_date: recurrenceEndDate || null,
              start_date: recurrenceStartDate,
              end_date: recurrenceEndDate || null,
              is_active: true,
              calculation_mode: form.frequency === 'monthly' ? form.calculationMode : 'full_month',
              parent_recurring_income_id: parent.id,
              generated_for_date: date,
              confirmed_at: null,
              user_id: user.id,
              updated_at: now,
            }));
          if (inserts.length > 0) {
            const { data: inserted, error: insertError } = await supabase
              .from('monthly_income_sources')
              .insert(inserts)
              .select('*');
            if (insertError) throw insertError;
            generatedRows = (inserted ?? []) as IncomeRow[];
          }
        }
        setRows(previous => [parent, ...generatedRows, ...previous]);
        void trackEvent('add_income', { module: 'income', metadata: { category: form.incomeType, currency, recurring: form.isRecurring } });
        await load();
      }
      setModalOpen(false);
      setSelectedFile(null);
      setAttachmentError('');
      showToast(tr('saved', lang));
    } catch (error) {
      console.error('[Income] Failed to save income record', error);
      setFormError(error instanceof Error ? error.message : tr('requiredError', lang));
    } finally {
      setSaving(false);
    }
  }

  async function deleteIncome(row: IncomeRow) {
    if (isGuest || !user) {
      const next = rows.filter(item => item.id !== row.id);
      localStorage.setItem('sfm_guest_income', JSON.stringify(next));
      setRows(next);
    } else {
      await supabase.from('monthly_income_sources').delete().eq('id', row.id).eq('user_id', user.id);
      setRows(previous => previous.filter(item => item.id !== row.id));
    }
    showToast(tr('deleted', lang));
  }

  async function confirmReceived(row: IncomeRow) {
    const confirmedAt = new Date().toISOString();
    const nextRow = { ...row, status: 'received', confirmed_at: confirmedAt, updated_at: confirmedAt };
    try {
      if (isGuest || !user) {
        const next = rows.map(item => item.id === row.id ? nextRow : item);
        localStorage.setItem('sfm_guest_income', JSON.stringify(next));
        setRows(next);
      } else {
        const { error } = await supabase
          .from('monthly_income_sources')
          .update({ status: 'received', confirmed_at: confirmedAt, updated_at: confirmedAt })
          .eq('id', row.id)
          .eq('user_id', user.id);
        if (error) throw error;
        setRows(previous => previous.map(item => item.id === row.id ? nextRow : item));
      }
      showToast(tr('confirmed', lang));
    } catch {
      showToast(tr('confirmError', lang));
    }
  }

  function donutBackground() {
    if (distribution.length === 0) return 'var(--surface-muted)';
    let cursor = 0;
    const stops = distribution.map(item => {
      const start = cursor;
      cursor += item.value;
      return `${item.color} ${start}% ${cursor}%`;
    }).join(', ');
    return buildSemanticConicGradient(stops);
  }

  return (
    <div className="income-shell" dir={dir}>
      <main className="income-main">
        <header className="income-header">
          <div>
            <p>{tr('breadcrumb', lang)}</p>
            <h1>{tr('title', lang)}</h1>
            <span><CalendarDays size={15} />{formatMonthLabel(selectedMonth, locale)}</span>
          </div>
          <div className="income-actions">
            <label className="month-picker">
              <span>{tr('selectedMonthLabel', lang)}</span>
              <input type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value || todayDateOnly().slice(0, 7))} />
            </label>
            <button type="button" className="primary hero-primary" onClick={openCreate} aria-label={tr('addIncome', lang)}>
              <Plus size={16} />{tr('addIncome', lang)}
            </button>
            <div className="export-wrap" ref={exportRef}>
              <button
                type="button"
                className="ghost"
                aria-label={tr('export', lang)}
                aria-haspopup="menu"
                aria-expanded={exportOpen}
                onClick={() => setExportOpen(open => !open)}
              >
                <Download size={16} />{tr('export', lang)}
              </button>
              {exportOpen && (
                <div className="export-menu" role="menu">
                  <button type="button" role="menuitem" onClick={exportPdf}><FileText size={15} />{tr('exportPdf', lang)}</button>
                  <button type="button" role="menuitem" onClick={exportCsv}><FileDown size={15} />{tr('exportExcel', lang)}</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {insightLoadError && (
          <section className="income-error-state" role="alert">
            <span><AlertTriangle size={18} />{tr('incomeLoadError', lang)}</span>
            <button type="button" className="ghost-light" onClick={() => void load()}>{tr('retry', lang)}</button>
          </section>
        )}

        <section className="insights" aria-label="income insights">
          {insightCards.map(card => (
            <button type="button" className={`insight ${card.tone} ${card.available ? '' : 'muted'}`} key={card.title} onClick={() => setInsightOpen(`${card.title}: ${card.value || card.message}`)}>
              <Sparkles size={17} />
              <span>
                <strong>{card.title}</strong>
                <small>{card.value || card.message}</small>
              </span>
              <b>{card.source}</b>
            </button>
          ))}
        </section>

        <section className="stat-grid">
          {loading ? Array.from({ length: 6 }).map((_, index) => <article className="stat-skeleton" key={index} aria-hidden="true" />) : (
            <>
              <article><span><Wallet size={18} />{tr('totalIncome', lang)}</span><strong>{hasAnyIncome ? formatMoney(selectedMonthIncomeTotal, defaultCurrency || 'KWD', lang as Lang) : tr('noIncomeAdded', lang)}</strong><em title={tr('monthlyCalculationTooltip', lang)}>{calculationBadge}</em></article>
              <article><span><BriefcaseBusiness size={18} />{tr('incomeSources', lang)}</span><strong>{activeSources} {tr('active', lang)}</strong><em>{hasAnyIncome ? tr('calculatedFromRealData', lang) : tr('noIncomeAdded', lang)}</em></article>
              <article><span><CircleDollarSign size={18} />{tr('expectedNet', lang)}</span><strong>{hasAnyIncome ? formatMoney(expectedNet, defaultCurrency || 'KWD', lang as Lang) : tr('noIncomeAdded', lang)}</strong><em>{calculationBadge}</em></article>
              <article><span><Gauge size={18} />{tr('savingsRateTitle', lang)}</span><strong>{savingsRate === null ? tr('noIncomeAdded', lang) : formatPercent(savingsRate, locale)}</strong><em>{savingsRate === null ? tr('noIncomeAdded', lang) : calculationBadge}</em></article>
              <article><span><BarChart3 size={18} />{tr('spendingRatioTitle', lang)}</span><strong>{spendingRatio === null ? tr('noIncomeAdded', lang) : formatPercent(spendingRatio, locale)}</strong><em>{spendingRatio === null ? tr('noIncomeAdded', lang) : tr('calculatedFromRealData', lang)}</em></article>
              <article><span><TrendingUp size={18} />{tr('nextForecast', lang)}</span><strong>{hasAnyIncome ? formatMoney(nextMonthIncomeTotal, defaultCurrency || 'KWD', lang as Lang) : tr('noIncomeAdded', lang)}</strong><em>{nextMonthSummary.hasRecurring ? tr('calculatedFromMonthlyIncome', lang) : tr('nextMonthFullIncome', lang)}</em></article>
            </>
          )}
        </section>

        {!loading && hasAnyIncome && (
          <section className="month-breakdown" aria-label={tr('currentMonthIncome', lang)}>
            <article>
              <span>{tr('currentMonthIncome', lang)}</span>
              <strong>{formatMoney(selectedMonthIncomeTotal, defaultCurrency || 'KWD', lang as Lang)}</strong>
              <em>{calculationBadge}</em>
            </article>
            <article>
              <span>{tr('fullMonthlyIncome', lang)}</span>
              <strong>{formatMoney(fullMonthlyIncome, defaultCurrency || 'KWD', lang as Lang)}</strong>
              <em>{tr('calculatedFromMonthlyIncome', lang)}</em>
            </article>
            <article>
              <span>{tr('expectedRemainingMonth', lang)}</span>
              <strong>{formatMoney(remainingMonthIncome, defaultCurrency || 'KWD', lang as Lang)}</strong>
              <em>{selectedMonthSummary.hasProrated ? tr('calculatedFromRemainingMonth', lang) : tr('fullMonthCalculation', lang)}</em>
            </article>
            <article>
              <span>{tr('currentMonthExpectedNet', lang)}</span>
              <strong>{formatMoney(expectedNet, defaultCurrency || 'KWD', lang as Lang)}</strong>
              <em>{tr('currentMonthIncome', lang)}</em>
            </article>
            <article>
              <span>{tr('nextForecast', lang)}</span>
              <strong>{formatMoney(nextMonthIncomeTotal, defaultCurrency || 'KWD', lang as Lang)}</strong>
              <em>{tr('nextMonthFullIncome', lang)}: {formatMoney(nextMonthFullIncome, defaultCurrency || 'KWD', lang as Lang)}</em>
            </article>
          </section>
        )}

        <PageTabs
          tabs={incomeTabs}
          active={activeTab}
          onChange={id => setActiveTab(id as IncomePageTab)}
          ariaLabel={tr('title', lang)}
          idBase={INCOME_TABS_ID}
          sticky
          mobileMode="scroll"
        />

        <PageTabPanel idBase={INCOME_TABS_ID} value={activeTab} active>
        {activeTab === 'overview' && (
          <>
        <section className="smart-grid">
          <article className="panel smart-score">
            <div className="panel-title"><Gauge size={18} /><h2>{tr('stabilityScore', lang)}</h2></div>
            {stabilityScore === null ? (
              <div className="score-empty">
                <strong>{tr('insufficientData', lang)}</strong>
                <span>{tr('addIncomeForStability', lang)}</span>
                <button type="button" className="ghost-light" onClick={openCreate}>{tr('addIncome', lang)}</button>
              </div>
            ) : (
              <>
                <strong>{normalizeDigits(new Intl.NumberFormat(locale, { numberingSystem: 'latn' }).format(Math.round(stabilityScore)))}/100</strong>
                <span>{stabilityScore >= 70 ? tr('stable', lang) : tr('needsReview', lang)}</span>
              </>
            )}
          </article>
          <article className="panel">
            <div className="panel-title"><TrendingUp size={18} /><h2>{tr('nextForecast', lang)}</h2></div>
            <strong>{forecastValue ? formatMoney(forecastValue, defaultCurrency || 'KWD', lang as Lang) : tr('notEnoughData', lang)}</strong>
            <p>{forecastValue ? (nextMonthSummary.hasRecurring ? tr('calculatedFromMonthlyIncome', lang) : tr('basedOnHistory', lang)) : tr('notEnoughData', lang)}</p>
          </article>
          <article className="panel smart-view">
            <div className="panel-title"><Sparkles size={18} /><h2>{tr('smartIncomeView', lang)}</h2></div>
            <ul>{smartGuidance.map(item => <li key={item}>{item}</li>)}</ul>
          </article>
        </section>

        {lateRows.length > 0 && (
          <section className="late-card">
            <span><AlertTriangle size={18} />{tr('lateWarning', lang)}</span>
            <button type="button" onClick={() => { setStatusFilter('late'); setActiveTab('sources'); }}>{tr('viewLateIncome', lang)}</button>
          </section>
        )}

        <section className="panel upcoming-panel">
          <div className="panel-title list-title">
            <CalendarDays size={18} /><h2>{tr('upcomingIncome', lang)}</h2>
          </div>
          <div className="upcoming-list">
            {upcomingRows.length === 0 ? <div className="empty compact-empty">{tr('noIncome', lang)}</div> : upcomingRows.map(row => (
              <article className="upcoming-item" key={row.id}>
                <div>
                  <strong>{legacyName(row)}</strong>
                  <span>{formatDate(row.received_date || row.generated_for_date, lang)} · {formatMoney(Number(row.amount || 0), row.currency || 'KWD', lang as Lang)}</span>
                </div>
                <em className={`status ${row.workflowStatus}`}>{statusLabel(row.workflowStatus, lang)}</em>
                {row.workflowStatus !== 'expected' || compareDateOnly(row.received_date || row.generated_for_date || todayDateOnly(), todayDateOnly()) <= 0 ? (
                  <button type="button" onClick={() => void confirmReceived(row)} aria-label={tr('confirmReceived', lang)}>
                    <CheckCircle2 size={15} />{tr('confirmReceived', lang)}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
          </>
        )}

        {activeTab === 'analytics' && (
        <section className="chart-grid">
          <article className="panel">
            <div className="panel-title"><BarChart3 size={18} /><h2>{tr('distribution', lang)}</h2></div>
            <div className="donut-wrap">
              <div className="donut" style={{ background: donutBackground() }}><span>{formatPercent(distribution.reduce((sum, item) => sum + item.value, 0), locale)}</span></div>
              <div className="legend">
                {distribution.length === 0 ? <div className="empty">{tr('insufficientData', lang)}</div> : distribution.map(item => <div key={item.label}><i style={{ background: item.color }} /> <span>{item.label}</span><b>{formatPercent(item.value, locale)}</b></div>)}
              </div>
            </div>
          </article>
          <article className="panel">
            <div className="panel-title"><LineChart size={18} /><h2>{tr('trend', lang)}</h2></div>
            <svg className="line-chart" viewBox="0 0 360 150" role="img" aria-label={tr('trend', lang)}>
              <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="360" cy={points.split(' ').at(-1)?.split(',')[1] || 20} r="5" fill="var(--accent)" />
            </svg>
          </article>
        </section>
        )}

        {activeTab === 'reports' && (
          <section className="panel income-report-panel">
            <div className="panel-title list-title">
              <FileText size={18} /><h2>{tr('export', lang)}</h2>
            </div>
            <p>{tr('reportDisclaimer', lang)}</p>
            <div className="income-report-actions">
              <button type="button" className="primary-dark" onClick={exportPdf}><FileText size={15} />{tr('exportPdf', lang)}</button>
              <button type="button" className="ghost-light" onClick={exportCsv}><FileDown size={15} />{tr('exportExcel', lang)}</button>
            </div>
          </section>
        )}

        {(activeTab === 'sources' || activeTab === 'recurring') && (
        <section className="panel">
          <div className="panel-title list-title">
            <ReceiptText size={18} /><h2>{tr('incomeList', lang)}</h2>
          </div>
          {activeTab === 'sources' && <div className="income-filters" role="group" aria-label={tr('status', lang)}>
            {[
              ['all', tr('all', lang)],
              ['received', statusLabel('received', lang)],
              ['pending', statusLabel('pending', lang)],
              ['expected', statusLabel('expected', lang)],
              ['late', statusLabel('late', lang)],
              ['recurring', tr('recurringFilter', lang)],
              ['one-time', tr('oneTimeFilter', lang)],
            ].map(([id, label]) => (
              <button key={id} type="button" className={statusFilter === id ? 'active' : ''} onClick={() => setStatusFilter(id as IncomeFilter)}>
                {label}
              </button>
            ))}
          </div>}
          <div className="income-list">
            {loading ? <div className="empty">{tr('title', lang)}...</div> : displayRows.length === 0 ? (
              <div className="income-empty-state">
                <span className="income-empty-icon" aria-hidden="true"><Wallet size={28} /></span>
                <strong>{tr('noIncome', lang)}</strong>
                <p>{tr('noIncomeDescription', lang)}</p>
                <button type="button" className="primary-dark" onClick={openCreate}><Plus size={16} />{tr('addFirstIncome', lang)}</button>
              </div>
            ) : displayRows.map(row => {
              const amount = Number(row.amount || 0);
              const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
              const projectLinked = isProjectLinkedIncomeRow(row);
              return (
                <article className="income-row" key={row.id}>
                  <div className="row-main">
                    <div className="row-icon">{typeIcon(row.income_type || row.category)}</div>
                    <div>
                      <strong>{legacyName(row)}</strong>
                      <span>{typeLabel(row.income_type || row.category, lang)} · {row.source_name || tr('source', lang)}</span>
                      <div className="row-meta">
                        <em className={`status ${row.workflowStatus}`}>{statusLabel(row.workflowStatus, lang)}</em>
                        {projectLinked ? <em className="project-income">{tr('projectIncome', lang)}</em> : null}
                        <em>{rowIsRecurring(row) ? tr('recurring', lang) : tr('oneTime', lang)}</em>
                        <em><CalendarDays size={12} />{formatDate(row.received_date || row.generated_for_date || row.created_at, lang)}</em>
                        {row.attachment_url && <em><Paperclip size={12} />{tr('attachment', lang)}</em>}
                        <em>{pct}% {tr('percent', lang)}</em>
                      </div>
                    </div>
                  </div>
                  <div className="row-side">
                    <b>{formatMoney(amount, row.currency || 'KWD', lang as Lang)}</b>
                    <div>
                      {row.workflowStatus !== 'received' && (
                        <button type="button" aria-label={tr('confirmReceived', lang)} onClick={() => void confirmReceived(row)}><CheckCircle2 size={15} /></button>
                      )}
                      {row.attachment_url && (
                        <button type="button" aria-label={tr('viewAttachment', lang)} onClick={() => window.open(row.attachment_url || '', '_blank', 'noopener,noreferrer')}><ExternalLink size={15} /></button>
                      )}
                      <button type="button" aria-label={tr('edit', lang)} onClick={() => openEdit(row)}><Edit3 size={15} /></button>
                      <button type="button" aria-label={tr('delete', lang)} onClick={() => void deleteIncome(row)}><Trash2 size={15} /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        )}
        </PageTabPanel>
      </main>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModalOpen(false)}>
          <div className="income-modal" role="dialog" aria-modal="true" aria-labelledby="income-modal-title" onMouseDown={event => event.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title-wrap">
                <span className="modal-title-icon" aria-hidden="true"><CircleDollarSign size={22} /></span>
                <div><h2 id="income-modal-title">{form.id ? tr('editIncomeTitle', lang) : tr('addIncomeTitle', lang)}</h2><p>{tr('addIncomeSubtitle', lang)}</p></div>
              </div>
              <button type="button" aria-label={tr('close', lang)} onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form className="income-form" onSubmit={saveIncome}>
              <label><span>{tr('name', lang)}</span><input autoFocus value={form.name} onChange={e => patchForm({ name: e.target.value }, 'name')} placeholder={tr('incomeNamePlaceholder', lang)} aria-invalid={Boolean(formErrors.name)} />{formErrors.name && <small className="field-error">{formErrors.name}</small>}</label>
              {categorySuggestion && categorySuggestion !== form.incomeType && (
                <div className="suggestion-pill">
                  <Sparkles size={14} />
                  <span>{tr('suggestion', lang)}: {typeLabel(categorySuggestion, lang)}</span>
                  <button type="button" onClick={() => patchForm({ incomeType: categorySuggestion }, 'incomeType')}>{tr('acceptSuggestion', lang)}</button>
                </div>
              )}
              <label><span>{tr('amount', lang)}</span><div className="amount-control"><input value={form.amount} inputMode="decimal" onChange={e => patchForm({ amount: normalizeNumberInput(e.target.value) }, 'amount')} placeholder={tr('amountPlaceholder', lang)} aria-invalid={Boolean(formErrors.amount)} /><em>{currencySymbol(form.currency)}</em></div>{formErrors.amount && <small className="field-error">{formErrors.amount}</small>}</label>
              <div className="currency-field">
                <CurrencySelect
                  value={form.currency}
                  onChange={code => patchForm({ currency: normalizeCurrency(code) }, 'currency')}
                  lang={lang}
                  label={tr('currency', lang)}
                  ariaLabel={tr('currency', lang)}
                />
                {formErrors.currency && <small className="field-error">{formErrors.currency}</small>}
              </div>
              <label><span>{tr('type', lang)}</span><select value={form.incomeType} onChange={e => patchForm({ incomeType: e.target.value as IncomeType }, 'incomeType')} aria-invalid={Boolean(formErrors.incomeType)}>{TYPES.map(item => <option key={item.id} value={item.id}>{item.icon} {item.label[lang as Lang]}</option>)}</select>{formErrors.incomeType && <small className="field-error">{formErrors.incomeType}</small>}</label>
              <label><span>{tr('frequency', lang)}</span><select value={frequencyMode} onChange={e => setFrequencyMode(e.target.value as FrequencyMode)} aria-invalid={Boolean(formErrors.frequency)}>{FREQUENCY_MODES.map(item => <option key={item.id} value={item.id}>{item.label[lang as Lang]}</option>)}</select>{formErrors.frequency && <small className="field-error">{formErrors.frequency}</small>}</label>
              {form.isRecurring && form.frequency === 'monthly' && (
                <label className="wide calculation-mode-field">
                  <span>{tr('monthCalculationMethod', lang)}</span>
                  <select value={form.calculationMode} onChange={e => patchForm({ calculationMode: e.target.value as CalculationMode })}>
                    <option value="full_month">{tr('fullMonthCalculation', lang)}</option>
                    <option value="prorated_current_month">{tr('proratedMonthCalculation', lang)}</option>
                  </select>
                  <small>{tr('monthlyCalculationTooltip', lang)}</small>
                </label>
              )}
              <label><span>{form.isRecurring ? tr('startDate', lang) : tr('receivedDate', lang)}</span><input type="date" value={form.receivedDate} onChange={e => {
                const nextDate = e.target.value;
                patchForm({
                  receivedDate: nextDate,
                  recurrenceStartDate: nextDate,
                  calculationMode: form.isRecurring && form.frequency === 'monthly' ? defaultCalculationMode(nextDate) : form.calculationMode,
                }, 'receivedDate');
              }} aria-invalid={Boolean(formErrors.receivedDate)} />{formErrors.receivedDate && <small className="field-error">{formErrors.receivedDate}</small>}</label>
              {form.isRecurring && (
                <label><span>{tr('endDateOptional', lang)}</span><input type="date" value={form.recurrenceEndDate} onChange={e => patchForm({ recurrenceEndDate: e.target.value })} /></label>
              )}
              <label className="wide"><span>{tr('optionalNote', lang)}</span><textarea value={form.notes} onChange={e => patchForm({ notes: e.target.value })} placeholder={tr('notePlaceholder', lang)} /></label>
              {form.currency !== 'KWD' && <div className="form-note">{tr('conversionDisabled', lang)}</div>}
              {formError && <div className="form-error">{formError}</div>}
              <div className="form-actions">
                <button type="button" className="ghost-light" onClick={() => setModalOpen(false)} disabled={saving}>{tr('cancel', lang)}</button>
                <button type="submit" className="primary-dark" disabled={saving}>{saving ? tr('saving', lang) : tr('saveIncome', lang)}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {insightOpen && (
        <div className="mini-pop" role="dialog" aria-modal="true">
          <button type="button" aria-label={tr('close', lang)} onClick={() => setInsightOpen(null)}><X size={14} /></button>
          <strong>{insightOpen}</strong>
          <p>{tr('insightDetails', lang)}</p>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .income-shell{min-height:100dvh;background:var(--background);color:var(--foreground);font-family:var(--font-ui);overflow-x:hidden}
        .income-main{display:grid;gap:16px;min-width:0}
        .income-header{position:relative;overflow:visible;z-index:20;display:flex;justify-content:space-between;align-items:flex-end;gap:18px;background:var(--hero-gradient);color:var(--hero-foreground);border:1px solid color-mix(in srgb, var(--hero-foreground) 22%, transparent);border-radius:var(--radius-panel);padding:28px;box-shadow:var(--shadow-card)}
        .income-header:before{content:"";position:absolute;inset:0;background:color-mix(in srgb, var(--hero-foreground) 4%, transparent);pointer-events:none}.income-header>*{position:relative;z-index:1}
        .income-header p{margin:0;color:var(--hero-foreground-muted);font-size:13px;font-weight:600}.income-header span{margin:0;color:var(--hero-foreground-muted);font-size:13px;font-weight:500;display:inline-flex;align-items:center;gap:7px}.income-header h1{margin:8px 0;font-size:40px;font-weight:600;color:var(--hero-foreground)}
        .income-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}.month-picker{min-width:178px;display:grid;gap:6px;color:var(--hero-foreground-muted);font-size:12px;font-weight:600}.month-picker input{height:var(--control-h);border-radius:var(--radius-control);border:1px solid color-mix(in srgb, var(--hero-foreground) 30%, transparent);background:color-mix(in srgb, var(--hero-foreground) 12%, transparent);color:var(--hero-foreground);padding:0 12px;font:600 13px inherit;outline:none;color-scheme:dark}.month-picker input:focus{border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}.export-wrap{position:relative}.export-menu{position:absolute;z-index:80;inset-block-start:calc(100% + 8px);inset-inline-end:0;min-width:190px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-control);padding:8px;box-shadow:var(--shadow-card)}.export-menu button{width:100%;min-height:42px;border:0;border-radius:var(--radius-sm);background:var(--surface);color:var(--foreground);display:flex;align-items:center;gap:8px;padding:0 10px;font:600 13px inherit;cursor:pointer;text-align:start;white-space:nowrap}.export-menu button:hover,.export-menu button:focus-visible{background:var(--surface-muted);color:var(--primary-hover);outline:none;box-shadow:var(--focus-shadow)}.primary,.ghost,.primary-dark,.ghost-light{border-radius:var(--radius-control);border:1px solid color-mix(in srgb, var(--hero-foreground) 26%, transparent);height:42px;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:600 14px inherit;cursor:pointer}.primary,.primary-dark{background:var(--primary);color:var(--primary-foreground);border-color:var(--primary)}.ghost{background:color-mix(in srgb, var(--hero-foreground) 10%, transparent);color:var(--hero-foreground);border-color:color-mix(in srgb, var(--hero-foreground) 30%, transparent)}.ghost:disabled{opacity:.55;cursor:not-allowed}.ghost-light{background:var(--surface);color:var(--foreground);border-color:var(--border)}
        .insights{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.insight{min-height:76px;text-align:start;border:1px solid color-mix(in srgb, var(--info) 16%, transparent);border-radius:var(--radius-card);padding:15px;background:var(--surface);display:flex;align-items:center;gap:10px;color:var(--foreground);cursor:pointer;box-shadow:var(--shadow-card)}.insight span{display:grid;gap:3px;line-height:1.45}.insight span strong{font-weight:600}.insight span small{font-size:13px;font-weight:600}.insight b{margin-inline-start:auto;font-size:12px;color:var(--primary-hover);max-width:140px}.insight.success{background:var(--surface-muted);color:var(--accent)}.insight.warning{background:color-mix(in srgb, var(--info) 10%, transparent);color:var(--primary-hover)}.insight.info{background:var(--surface-muted);color:var(--primary)}.insight.muted{background:var(--surface);color:var(--foreground-muted)}
        .stat-grid,.smart-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.stat-grid article,.panel{background:var(--surface);border:1px solid color-mix(in srgb, var(--info) 16%, transparent);border-radius:var(--radius-card);padding:18px;box-shadow:var(--shadow-card)}.stat-grid span{display:flex;gap:8px;align-items:center;color:var(--foreground-muted);font-size:13px}.stat-grid strong{display:block;margin-top:10px;font-size:26px;font-weight:600;color:var(--foreground);min-height:36px}.stat-grid em{display:inline-flex;margin-top:10px;border-radius:var(--radius-pill);background:var(--surface-muted);color:var(--accent);padding:4px 9px;font-style:normal;font-size:12px}.stat-skeleton{min-height:130px;position:relative;overflow:hidden}.stat-skeleton:before{content:"";position:absolute;inset:18px;border-radius:var(--radius-control);background:var(--surface);background-size:220% 100%;animation:shimmer 1.2s ease-in-out infinite}@keyframes shimmer{to{background-position:-220% 0}}.month-breakdown{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.month-breakdown article{min-width:0;border:1px solid color-mix(in srgb, var(--info) 14%, transparent);border-radius:var(--radius-card);background:var(--surface);padding:14px;box-shadow:var(--shadow-card)}.month-breakdown span{display:block;color:var(--foreground-muted);font-size:12px;font-weight:600}.month-breakdown strong{display:block;margin-top:8px;color:var(--foreground);font-size:18px;font-weight:600;white-space:normal}.month-breakdown em{display:block;margin-top:8px;color:var(--primary);font-style:normal;font-size:12px;font-weight:600;line-height:1.5}
        .smart-score strong,.smart-grid strong{display:block;color:var(--foreground);font-size:26px;font-weight:600}.smart-score span,.smart-grid p{color:var(--foreground-muted);font-size:13px;line-height:1.7;margin:8px 0 0}.score-empty{display:grid;gap:9px;align-items:start}.score-empty strong{font-size:18px}.score-empty span{margin:0}.score-empty button{width:max-content}.smart-view{grid-column:span 1}.smart-view ul{margin:0;padding-inline-start:18px;color:var(--foreground-muted);line-height:1.8;font-size:13px}
        .chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.panel-title{display:flex;align-items:center;gap:9px;margin-bottom:16px;color:var(--primary)}.panel-title h2{margin:0;font-size:18px;font-weight:600;color:var(--foreground)}.donut-wrap{display:grid;grid-template-columns:180px 1fr;gap:18px;align-items:center}.donut{width:170px;aspect-ratio:1;border-radius:var(--radius-pill);display:grid;place-items:center;position:relative}.donut:after{content:"";position:absolute;inset:32px;background:var(--surface);border-radius:var(--radius-pill)}.donut span{position:relative;z-index:1;font-weight:600;color:var(--foreground)}.legend{display:grid;gap:10px}.legend div{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font-size:13px}.legend i{width:10px;height:10px;border-radius:var(--radius-pill)}.line-chart{width:100%;height:auto;min-height:170px;background:var(--surface-muted);border-radius:var(--radius-control);padding:12px;overflow:visible}
        .income-report-panel p{margin:0;color:var(--foreground-muted);line-height:1.8;font-weight:600}.income-report-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.income-error-state{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid color-mix(in srgb, var(--danger) 22%, transparent);border-radius:var(--radius-card);background:var(--surface);color:var(--danger);padding:14px 16px;font-weight:600}.income-error-state span{display:flex;align-items:center;gap:8px;line-height:1.6}
        .late-card{display:flex;align-items:center;justify-content:space-between;gap:12px;background:color-mix(in srgb, var(--info) 10%, transparent);color:var(--primary-hover);border:1px solid color-mix(in srgb, var(--danger) 16%, transparent);border-radius:var(--radius-card);padding:14px 16px}.late-card span{display:flex;align-items:center;gap:8px;font-weight:600}.late-card button,.upcoming-item button{border:1px solid color-mix(in srgb, var(--danger) 16%, transparent);background:var(--foreground-secondary);color:var(--primary-hover);border-radius:var(--radius-control);min-height:38px;padding:0 12px;display:inline-flex;align-items:center;gap:7px;font:600 12px inherit;cursor:pointer}.upcoming-panel{display:grid;gap:10px}.upcoming-list{display:grid;gap:9px}.upcoming-item{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:10px;border:1px solid color-mix(in srgb, var(--info) 14%, transparent);border-radius:var(--radius-control);padding:12px;background:var(--surface-muted)}.upcoming-item strong{display:block;color:var(--foreground);font-weight:600}.upcoming-item span{display:block;margin-top:4px;color:var(--foreground-muted);font-size:12px}.upcoming-item em,.income-filters button{font-style:normal;border-radius:var(--radius-pill);background:var(--background);color:var(--foreground-muted);padding:5px 10px;font-size:12px;white-space:nowrap}.upcoming-item .received{background:var(--surface-muted);color:var(--accent)}.upcoming-item .pending,.upcoming-item .expected{background:color-mix(in srgb, var(--info) 10%, transparent);color:var(--primary-hover)}.upcoming-item .late{background:var(--surface);color:var(--danger)}.income-filters{display:flex;gap:8px;overflow-x:auto;padding:0 0 12px;margin-top:-4px;scrollbar-width:thin}.income-filters button{border:1px solid color-mix(in srgb, var(--info) 14%, transparent);cursor:pointer;font:600 12px inherit;background:var(--surface-muted)}.income-filters button.active{background:var(--foreground);color:var(--surface);border-color:var(--foreground)}
        .income-list{display:grid;gap:10px}.income-row{display:flex;justify-content:space-between;gap:14px;border:1px solid color-mix(in srgb, var(--info) 14%, transparent);border-radius:var(--radius-card);padding:14px;background:var(--surface-muted)}.row-main{display:flex;gap:12px;min-width:0}.row-icon{width:44px;height:44px;border-radius:var(--radius-control);background:color-mix(in srgb, var(--info) 10%, transparent);display:grid;place-items:center;font-size:21px}.row-main strong{display:block;font-size:15px;font-weight:600;color:var(--foreground)}.row-main span{display:block;margin-top:4px;color:var(--foreground-muted);font-size:12px}.row-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.row-meta em{font-style:normal;border-radius:var(--radius-pill);background:var(--background);color:var(--foreground-muted);padding:4px 8px;font-size:12px;display:inline-flex;align-items:center;gap:4px}.row-meta .received{background:var(--surface-muted);color:var(--accent)}.row-meta .pending,.row-meta .expected{background:color-mix(in srgb, var(--info) 10%, transparent);color:var(--primary-hover)}.row-meta .late{background:var(--surface);color:var(--danger)}.row-meta .project-income{background:color-mix(in srgb, var(--info) 14%, transparent);color:var(--primary-hover);border:1px solid color-mix(in srgb, var(--info) 22%, transparent)}.row-side{display:flex;align-items:center;gap:12px}.row-side b{white-space:nowrap;color:var(--foreground)}.row-side div{display:flex;gap:6px}.row-side button,.modal-head button,.mini-pop button{width:36px;height:var(--control-h-sm);border-radius:var(--radius-control);border:1px solid color-mix(in srgb, var(--info) 16%, transparent);background:var(--surface);color:var(--foreground);display:grid;place-items:center;cursor:pointer}.empty{padding:24px;text-align:center;color:var(--foreground-muted);border:1px dashed color-mix(in srgb, var(--info) 22%, transparent);border-radius:var(--radius-control);background:var(--surface-muted)}
        .modal-backdrop{position:fixed;inset:0;z-index:90;background:color-mix(in srgb, var(--danger) 42%, transparent);display:grid;place-items:center;padding:18px}.income-modal{width:min(760px,100%);max-height:min(92dvh,900px);overflow:auto;background:var(--surface);border-radius:var(--radius-card);border:1px solid color-mix(in srgb, var(--info) 18%, transparent);padding:20px}.modal-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}.modal-head p{margin:0;color:var(--primary);font-size:12px}.modal-head h2{margin:4px 0 0;font-size:24px;color:var(--foreground)}.income-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.income-form label,.currency-field{display:grid;gap:7px;color:var(--foreground);font-size:13px;font-weight:500}.income-form input,.income-form select,.income-form textarea{width:100%;border:1px solid color-mix(in srgb, var(--info) 16%, transparent);border-radius:var(--radius-control);background:var(--background);color:var(--foreground);padding:0 12px;min-height:46px;font:500 14px inherit;outline:none}.income-form input[type=file]{padding:11px 12px}.income-form textarea{min-height:92px;padding-top:12px;resize:vertical}.income-form input:focus,.income-form select:focus,.income-form textarea:focus{border-color:var(--primary);box-shadow:var(--focus-shadow);background:var(--surface)}.wide,.form-actions,.form-error,.form-note,.attachment-field,.suggestion-pill{grid-column:1/-1}.calculation-mode-field{border:1px solid color-mix(in srgb, var(--info) 14%, transparent);border-radius:var(--radius-card);background:var(--surface);padding:12px}.calculation-mode-field small{color:var(--foreground-muted);font-size:12px;font-weight:600;line-height:1.7}.suggestion-pill{display:flex;align-items:center;gap:8px;border:1px solid color-mix(in srgb, var(--info) 18%, transparent);border-radius:var(--radius-control);background:color-mix(in srgb, var(--info) 10%, transparent);color:var(--primary-hover);padding:10px 12px;font-size:13px}.suggestion-pill button{margin-inline-start:auto;border:0;border-radius:var(--radius-sm);background:var(--foreground);color:var(--surface);padding:7px 10px;font:600 12px inherit;cursor:pointer}.attachment-field{display:grid;gap:10px}.attachment-chip{display:flex;align-items:center;gap:8px;border:1px solid color-mix(in srgb, var(--info) 16%, transparent);border-radius:var(--radius-control);background:var(--background);color:var(--foreground);padding:9px 10px;font-size:13px}.attachment-chip span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.attachment-chip small{color:var(--foreground-muted);margin-inline-start:auto}.attachment-chip button{width:28px;height:28px;border-radius:var(--radius-sm);border:1px solid color-mix(in srgb, var(--info) 16%, transparent);background:var(--surface);color:var(--foreground);display:grid;place-items:center;cursor:pointer}.toggle-line{align-content:end}.toggle{height:46px;border-radius:var(--radius-control);border:1px solid color-mix(in srgb, var(--info) 16%, transparent);background:var(--background);color:var(--foreground);display:flex;align-items:center;gap:9px;padding:0 12px;cursor:pointer}.toggle span{width:20px;height:20px;border-radius:var(--radius-pill);background:var(--foreground-secondary)}.toggle.on span{background:var(--primary)}.form-actions{display:flex;justify-content:flex-end;gap:10px}.form-error{background:var(--surface);color:var(--danger);border-radius:var(--radius-control);padding:10px 12px;font-size:13px}.form-note{background:var(--accent);color:var(--primary);border-radius:var(--radius-control);padding:10px 12px;font-size:13px}
        .mini-pop,.toast{position:fixed;z-index:100;inset-inline-end:22px;bottom:22px;background:var(--surface);border:1px solid color-mix(in srgb, var(--foreground) 8%, transparent);border-radius:var(--radius-card);padding:14px;max-width:min(360px,calc(100% - 32px));box-shadow:var(--shadow-card)}.mini-pop strong{display:block;margin-bottom:6px}.mini-pop p{margin:0;color:var(--foreground-muted);line-height:1.6}.mini-pop button{float:inline-end;width:28px;height:28px}.toast{background:var(--surface-muted);color:var(--accent);font-weight:600}
        .income-shell{background:var(--surface);color:var(--primary)}.income-main{gap:20px}.income-header{overflow:hidden;background:var(--surface);border-color:color-mix(in srgb, var(--info) 24%, transparent);border-radius:var(--radius-panel);padding:34px;box-shadow:var(--shadow-card)}.income-header h1{font-size:clamp(36px,6vw,58px);font-weight:600;color:var(--surface)}.income-header p{color:var(--accent);font-weight:600}.income-header span{color:var(--primary-soft);font-weight:700}.primary,.primary-dark{min-height:46px;border-radius:var(--radius-control);background:var(--primary);color:var(--primary);font-weight:600;box-shadow:var(--shadow-card)}.ghost-light,.ghost{min-height:46px;border-radius:var(--radius-control);font-weight:600}.stat-grid article,.panel,.insight{border-color:var(--surface-muted);background:var(--surface);border-radius:var(--radius-panel);box-shadow:var(--shadow-card)}.stat-grid strong{font-size:clamp(24px,3vw,34px);font-weight:600;color:var(--primary)}.income-row{border-color:var(--surface-muted);background:var(--surface);border-radius:var(--radius-card)}.row-main strong,.row-side b{color:var(--primary);font-weight:600}.empty{border-radius:var(--radius-card);background:var(--surface);font-weight:600}.compact-empty{min-height:96px;display:grid;place-items:center}.income-empty-state{min-height:280px;display:grid;place-items:center;align-content:center;gap:12px;text-align:center;border:1px dashed color-mix(in srgb, var(--info) 28%, transparent);border-radius:var(--radius-panel);background:var(--surface);padding:34px}.income-empty-icon{width:62px;height:62px;border-radius:var(--radius-card);display:grid;place-items:center;color:var(--primary);background:var(--surface);box-shadow:var(--shadow-card)}.income-empty-state strong{font-size:1.25rem;color:var(--primary);font-weight:600}.income-empty-state p{margin:0;max-width:480px;color:var(--info);line-height:1.8;font-weight:600}.modal-backdrop{background:color-mix(in srgb, var(--primary) 56%, transparent);backdrop-filter:blur(10px);padding:18px}.income-modal{width:min(880px,100%);max-height:min(90vh,900px);background:var(--surface);border-radius:var(--radius-panel);border:1px solid color-mix(in srgb, var(--surface-muted) 95%, transparent);padding:24px;box-shadow:var(--shadow-card)}.modal-head{flex-direction:row-reverse;gap:18px;margin-bottom:22px}.modal-title-wrap{display:flex;gap:12px;align-items:flex-start}.modal-title-icon{width:48px;height:48px;border-radius:var(--radius-card);display:grid;place-items:center;color:var(--primary);background:var(--surface);box-shadow:var(--shadow-card);flex:0 0 auto}.modal-head h2{margin:0;font-size:28px;color:var(--primary);font-weight:600}.modal-head p{margin:6px 0 0;color:var(--info);font-size:14px;font-weight:600;line-height:1.7}.income-form{gap:16px}.income-form label{gap:8px;color:var(--primary);font-weight:600}.income-form input,.income-form select,.income-form textarea{border-color:var(--accent);border-radius:var(--radius-control);background:var(--surface);color:var(--primary);min-height:50px;font-weight:600}.income-form input::placeholder,.income-form textarea::placeholder{color:var(--info)}.income-form input:focus,.income-form select:focus,.income-form textarea:focus{border-color:var(--info);box-shadow:var(--focus-shadow);background:var(--surface)}.income-form [aria-invalid="true"]{border-color:var(--danger)}.amount-control{position:relative}.amount-control input{padding-inline-end:58px}.amount-control em{position:absolute;inset-inline-end:12px;top:50%;transform:translateY(-50%);font-style:normal;color:var(--primary);font-weight:600;pointer-events:none}.field-error{color:var(--danger);font-size:12px;font-weight:600}.form-error{font-weight:600}
        .income-shell{background:var(--background);color:var(--foreground)}
        .income-header{background:var(--hero-gradient);color:var(--hero-foreground);border-color:color-mix(in srgb, var(--hero-foreground) 24%, transparent)}
        .income-header h1{color:var(--hero-foreground)}.income-header p,.income-header span{color:var(--hero-foreground-muted);font-weight:600}
        .primary,.primary-dark{background:var(--primary);color:var(--primary-foreground);border-color:var(--primary)}
        .stat-grid article,.panel,.insight,.income-row{border-color:var(--border)}
        .stat-grid strong,.row-main strong,.row-side b{color:var(--foreground)}
        .income-empty-state{border-color:var(--border-strong)}.income-empty-state strong{color:var(--foreground)}.income-empty-state p{color:var(--foreground-muted);font-weight:400}
        .income-form label{color:var(--foreground)}.income-form input,.income-form select,.income-form textarea{border-color:var(--border);color:var(--foreground);font-weight:500}.income-form input::placeholder,.income-form textarea::placeholder{color:var(--foreground-muted)}
        .income-shell :is(.stat-grid strong,.month-breakdown strong,.smart-score strong,.smart-grid strong,.row-side b,.donut span,.legend b,.amount-control input){font-family:var(--font-data)}
        @media(max-width:1024px){.insights,.chart-grid,.smart-grid{grid-template-columns:1fr}.stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.month-breakdown{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:680px){.income-header,.income-row,.late-card,.income-error-state{display:grid}.income-header{padding:24px}.income-header h1{font-size:34px}.income-actions,.form-actions{display:grid;grid-template-columns:1fr}.month-picker{width:100%}.export-wrap,.primary,.ghost,.primary-dark,.ghost-light{width:100%}.export-menu{position:static;margin-top:8px}.stat-grid,.income-form,.donut-wrap,.upcoming-item,.month-breakdown{grid-template-columns:1fr}.row-side{justify-content:space-between}.modal-backdrop{align-items:end;padding:12px}.income-modal{width:calc(100% - 24px);border-radius:var(--radius-panel) var(--radius-panel) 0 0;max-height:90vh;padding:20px;padding-bottom:calc(20px + env(safe-area-inset-bottom))}.modal-title-wrap{display:grid}.income-form input,.income-form select,.income-form textarea{min-height:52px}.insight{align-items:flex-start}.insight b{margin-inline-start:0}.row-meta{gap:5px}.upcoming-item button,.late-card button{width:100%;justify-content:center}.suggestion-pill{display:grid}.suggestion-pill button{margin-inline-start:0;width:100%}}
      `}</style>
    </div>
  );
}
