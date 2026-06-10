import type { Lang } from '../translations';

type TranslationEntry = Partial<Record<Lang, string>> & { ar: string; en: string };

export const TR_CHARITY: Record<string, TranslationEntry> = {
  // ── Page header ──
  'charity.title':                    { ar: 'الأعمال الخيرية',                           en: 'Charity',                                 fr: 'Charité' },
  'charity.subtitle':                 { ar: 'أضف المبالغ الخيرية الشهرية وسيتم احتسابها ضمن المصروفات', en: 'Add monthly charity amounts — counted as expenses automatically', fr: 'Ajoutez les montants mensuels — comptés automatiquement dans les dépenses' },

  // ── Stats ──
  'charity.monthTotal':               { ar: 'إجمالي الشهر',                              en: 'Month Total',                             fr: 'Total du mois' },
  'charity.yearTotal':                { ar: 'إجمالي السنة',                              en: 'Year Total',                              fr: "Total de l'année" },
  'charity.donationCount':            { ar: 'عدد التبرعات',                              en: 'Donation Count',                          fr: 'Nombre de dons' },
  'charity.currency':                 { ar: 'KWD',                                       en: 'KWD',                                     fr: 'KWD' },

  // ── Shortcut banner ──
  'charity.projectsShortcutTitle':    { ar: 'المشاريع الخيرية',                          en: 'Charity Projects',                        fr: 'Projets caritatifs' },
  'charity.projectsShortcutDescription': { ar: 'تتبع مشاريعك الخيرية وأهدافها', en: 'Track your charity projects and their goals', fr: 'Suivez vos projets caritatifs et leurs objectifs' },
  'charity.openProjects':             { ar: 'فتح المشاريع',                              en: 'Open Projects',                           fr: 'Ouvrir les projets' },

  // ── Add donation form ──
  'charity.addDonation':              { ar: 'إضافة عمل خيري',                            en: 'Add Charity Payment',                     fr: 'Ajouter un don' },
  'charity.autoExpenseNote':          { ar: 'يُحتسب تلقائياً ضمن المصروفات',            en: 'Automatically counted as an expense',     fr: 'Comptabilisé automatiquement comme dépense' },
  'charity.month':                    { ar: 'الشهر',                                     en: 'Month',                                   fr: 'Mois' },
  'charity.amount':                   { ar: 'المبلغ',                                    en: 'Amount',                                  fr: 'Montant' },
  'charity.nameOrNote':               { ar: 'الاسم أو الملاحظة',                        en: 'Name or Note',                            fr: 'Nom ou note' },
  'charity.namePlaceholder':          { ar: 'مثال: زكاة مال، صدقة جارية',               en: 'e.g. Zakat, ongoing charity',             fr: 'ex. Zakat, aumône continue' },
  'charity.saveDonation':             { ar: '🤲 حفظ وتسجيل ضمن المصروفات',             en: '🤲 Save & Record as Expense',             fr: '🤲 Enregistrer comme dépense' },
  'charity.countedInExpenses':        { ar: 'يُحتسب ضمن إجمالي المصروفات',             en: 'Counted in total expenses',               fr: 'Compté dans les dépenses totales' },
  'charity.selectType':               { ar: 'اختر نوع العمل الخيري',                    en: 'Select charity type',                     fr: 'Sélectionner le type' },
  'charity.defaultDonationName':      { ar: 'تبرع',                                      en: 'Donation',                               fr: 'Don' },

  // ── Validation / errors ──
  'charity.invalidAmount':            { ar: 'الرجاء إدخال مبلغ صحيح',                   en: 'Please enter a valid amount',             fr: 'Veuillez entrer un montant valide' },
  'charity.invalidName':              { ar: 'الرجاء إدخال اسم أو ملاحظة',               en: 'Please enter a name or note',             fr: 'Veuillez entrer un nom ou une note' },
  'charity.saveError':                { ar: 'خطأ في الحفظ',                              en: 'Error saving',                            fr: "Erreur d'enregistrement" },
  'charity.saveSuccess':              { ar: 'تم تسجيل {amount} {currency} في {month}',  en: 'Recorded {amount} {currency} for {month}', fr: '{amount} {currency} enregistré pour {month}' },
  'charity.deleteError':              { ar: 'خطأ في الحذف',                              en: 'Error deleting',                          fr: 'Erreur de suppression' },
  'charity.deleteSuccess':            { ar: 'تم الحذف بنجاح',                            en: 'Deleted successfully',                    fr: 'Supprimé avec succès' },
  'charity.loadError':                { ar: 'خطأ في تحميل البيانات',                     en: 'Error loading data',                      fr: 'Erreur de chargement' },

  // ── History / table ──
  'charity.historyTitle':             { ar: 'سجل الأعمال الخيرية',                       en: 'Charity History',                         fr: 'Historique des dons' },
  'charity.donationCountValue':       { ar: '{count} تبرع هذا الشهر',                   en: '{count} donation(s) this month',          fr: '{count} don(s) ce mois' },
  'charity.noDonationsForMonth':      { ar: 'لا توجد تبرعات في {month}',                en: 'No donations for {month}',               fr: 'Aucun don pour {month}' },
  'charity.tableName':                { ar: 'الاسم',                                     en: 'Name',                                    fr: 'Nom' },
  'charity.tableAmount':              { ar: 'المبلغ',                                    en: 'Amount',                                  fr: 'Montant' },
  'charity.tableMonth':               { ar: 'الشهر',                                     en: 'Month',                                   fr: 'Mois' },
  'charity.total':                    { ar: 'الإجمالي',                                  en: 'Total',                                   fr: 'Total' },
  'charity.allMonthsSummary':         { ar: 'ملخص كل الأشهر',                           en: 'All Months Summary',                      fr: 'Résumé de tous les mois' },

  // ── Ring / this month ──
  'charity.thisMonth':                { ar: 'الأعمال الخيرية هذا الشهر',                 en: "This month's charity",                    fr: 'Charité ce mois-ci' },

  // ── Types ──
  'charity.typesTitle':               { ar: 'أنواع الأعمال الخيرية',                    en: 'Charity Types',                           fr: 'Types de charité' },
  'charity.typeGeneral':              { ar: 'عام',                                       en: 'General',                                 fr: 'Général' },
  'charity.typeGeneralDesc':          { ar: 'صدقة عامة أو تبرع',                        en: 'General charity or donation',             fr: 'Don général' },
  'charity.typeZakat':                { ar: 'زكاة',                                      en: 'Zakat',                                   fr: 'Zakat' },
  'charity.typeZakatDesc':            { ar: 'زكاة المال الواجبة',                        en: 'Obligatory wealth Zakat',                 fr: 'Zakat obligatoire' },
  'charity.typeSacrifice':            { ar: 'أضحية',                                     en: 'Sacrifice',                               fr: 'Sacrifice' },
  'charity.typeSacrificeDesc':        { ar: 'أضحية العيد',                               en: 'Eid sacrifice',                           fr: 'Sacrifice de l\'Aïd' },
  'charity.typeOrphan':               { ar: 'كفالة يتيم',                                en: 'Orphan Sponsorship',                      fr: 'Parrainage d\'orphelin' },
  'charity.typeOrphanDesc':           { ar: 'كفالة يتيم شهرية أو سنوية',                en: 'Monthly or annual orphan sponsorship',   fr: 'Parrainage mensuel ou annuel' },
  'charity.typeKaffara':              { ar: 'كفارة',                                     en: 'Kaffara',                                 fr: 'Kaffara' },
  'charity.typeKaffaraDesc':          { ar: 'كفارة يمين أو صيام',                        en: 'Oath or fasting expiation',               fr: 'Expiation de serment' },
  'charity.typeWaqf':                 { ar: 'وقف',                                       en: 'Waqf',                                    fr: 'Waqf' },
  'charity.typeWaqfDesc':             { ar: 'صدقة جارية / وقف',                         en: 'Ongoing charity / Waqf',                  fr: 'Charité continue / Waqf' },

  // ── Daily message ──
  'charity.dailyMessage':             { ar: 'رسالة اليوم',                               en: "Today's Message",                         fr: "Message du jour" },
  'charity.dailyQuote':               { ar: '"الصدقة تطفئ غضب الرب وتبارك في الرزق"', en: '"Charity extinguishes the Lord\'s wrath and blesses provision"', fr: '"La charité éteint la colère du Seigneur et bénit la provision"' },

  // ── Footer ──
  'charity.footerNote':               { ar: 'يُحتسب هذا المبلغ تلقائياً في إجمالي مصروفاتك', en: 'This amount is automatically included in your total expenses', fr: 'Ce montant est automatiquement inclus dans vos dépenses totales' },
};
