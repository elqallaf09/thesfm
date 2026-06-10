import type { Lang } from '../translations';

type TranslationEntry = Partial<Record<Lang, string>> & { ar: string; en: string };

export const TR_CHARITY: Record<string, TranslationEntry> = {
  charity_title:   { ar:'الأعمال الخيرية',  en:'Charity', fr:'Charité' },
  charity_subtitle:{ ar:'أضف المبالغ الخيرية الشهرية وسيتم احتسابها ضمن المصروفات', en:'Add monthly charity amounts — counted as expenses automatically', fr:'Ajoutez les montants mensuels — comptés automatiquement dans les dépenses' },
  charity_add:     { ar:'إضافة عمل خيري',  en:'Add Charity Payment', fr:'Ajouter un don' },
  charity_month:   { ar:'الشهر',           en:'Month', fr:'Mois' },
  charity_amount:  { ar:'المبلغ',          en:'Amount', fr:'Montant' },
  charity_name:    { ar:'الاسم أو الملاحظة', en:'Name or Note', fr:'Nom ou note' },
  charity_save:    { ar:'🤲 حفظ وتسجيل ضمن المصروفات', en:'🤲 Save & Record as Expense', fr:'🤲 Enregistrer comme dépense' },
  charity_month_total:{ ar:'إجمالي الشهر', en:'Month Total', fr:'Total du mois' },
  charity_year:    { ar:'إجمالي السنة',    en:'Year Total', fr:"Total de l'année" },
  charity_count:   { ar:'عدد التبرعات',    en:'Donation Count', fr:'Nombre de dons' },
  charity_types:   { ar:'أنواع الأعمال الخيرية', en:'Charity Types', fr:'Types de charité' },
  charity_daily_msg:{ ar:'رسالة اليوم',   en:"Today's Message", fr:'Message du jour' },
  charity_quote:   { ar:'"الصدقة تطفئ غضب الرب وتبارك في الرزق"', en:"\"Charity extinguishes the Lord's wrath and blesses provision\"", fr:'\"La charité éteint la colère du Seigneur et bénit la provision\"' },
  charity_history: { ar:'سجل الأعمال الخيرية', en:'Charity History', fr:'Historique des dons' },
  charity_summary: { ar:'ملخص كل الأشهر',  en:'All Months Summary', fr:'Résumé de tous les mois' },
  charity_ring:    { ar:'الأعمال الخيرية هذا الشهر', en:"This month's charity", fr:'Charité ce mois-ci' },
  charity_note:    { ar:'يُحتسب هذا المبلغ تلقائياً في إجمالي مصروفاتك', en:'This amount is automatically included in your total expenses', fr:'Ce montant est automatiquement inclus dans vos dépenses totales' },
};
