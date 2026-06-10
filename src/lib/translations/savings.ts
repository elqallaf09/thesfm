import type { Lang } from '../translations';

type TranslationEntry = Partial<Record<Lang, string>> & { ar: string; en: string };

export const TR_SAVINGS: Record<string, TranslationEntry> = {
  sav_hero_title:   { ar:'أنشئ مستقبل ثروتك',  en:'Build Your Wealth Future', fr:'Construisez votre avenir financier' },
  sav_hero_sub:     { ar:'حوّل الادخار من عادة إلى نظام ذكي لبناء الثروة', en:'Transform saving from habit to a smart wealth-building system', fr:"Transformez l'épargne en un système intelligent de création de richesse" },
  sav_plan_btn:     { ar:'ابدأ الخطة ←',       en:'Start the Plan ←', fr:'Commencer le plan ←' },
  sav_ai_btn:       { ar:'🤖 تحليل الذكاء المالي', en:'🤖 AI Financial Analysis', fr:'🤖 Analyse financière IA' },
  sav_new_goal:     { ar:'+ إنشاء هدف جديد',   en:'+ Create New Goal', fr:'+ Créer un nouvel objectif' },
  sav_current:      { ar:'ادخارك الحالي',       en:'Current Savings', fr:'Épargne actuelle' },
  sav_target:       { ar:'الهدف المستهدف',      en:'Target Goal', fr:'Objectif cible' },
  sav_time_est:     { ar:'الوقت المقدّر',       en:'Estimated Time', fr:'Délai estimé' },
  sav_ai_score:     { ar:'تقييم SFM AI',        en:'SFM AI Score', fr:'Score SFM AI' },
  sav_path:         { ar:'مسار الثروة',          en:'Wealth Path', fr:'Parcours de richesse' },
  sav_tools:        { ar:'أدوات بناء الثروة',   en:'Wealth Building Tools', fr:'Outils de création de richesse' },
  sav_simulator:    { ar:'محاكي الثروة المستقبلية', en:'Future Wealth Simulator', fr:'Simulateur de richesse future' },
  sav_ai_advisor:   { ar:'مستشار الثروة الذكي', en:'AI Wealth Advisor', fr:'Conseiller richesse IA' },
  sav_dashboard:    { ar:'لوحة الثروة',         en:'Wealth Dashboard', fr:'Tableau de bord richesse' },
  savings_error_name_required: { ar:'اسم الإدخار مطلوب', en:'Saving name is required', fr:"Le nom de l'épargne est requis" },
  savings_error_amount_required: { ar:'المبلغ يجب أن يكون أكبر من صفر', en:'Amount must be greater than zero', fr:'Le montant doit être supérieur à zéro' },
  savings_error_currency_required: { ar:'اختر العملة', en:'Choose a currency', fr:'Choisissez une devise' },
  savings_error_type_required: { ar:'اختر نوع الإدخار', en:'Choose the saving type', fr:"Choisissez le type d'épargne" },
  savings_error_method_required: { ar:'اختر طريقة الإدخار', en:'Choose the saving method', fr:"Choisissez la méthode d'épargne" },
  savings_error_date_required: { ar:'التاريخ غير صالح', en:'Date is invalid', fr:'La date est invalide' },
  savings_error_auth_required: { ar:'يرجى تسجيل الدخول لحفظ الإدخار.', en:'Please sign in to save this saving.', fr:"Veuillez vous connecter pour enregistrer cette épargne." },
  savings_error_permission: { ar:'لا تملك صلاحية حفظ هذا السجل', en:'You do not have permission to save this record', fr:"Vous n'avez pas l'autorisation d'enregistrer cet élément" },
  savings_error_unknown: { ar:'تعذر حفظ الإدخار. الرجاء المحاولة مرة أخرى.', en:'Could not save saving. Please try again.', fr:"Impossible d'enregistrer l'épargne. Veuillez réessayer." },
  savings_entry_title: { ar:'إدخار', en:'Saving', fr:'Épargne' },
  savings_report:       { ar:'تقرير الادخار', en:'Savings report', fr:'Rapport d\'épargne' },
  savings_balance:      { ar:'رصيد الادخار المسجل', en:'Recorded savings balance', fr:'Solde d\'épargne enregistré' },
};
