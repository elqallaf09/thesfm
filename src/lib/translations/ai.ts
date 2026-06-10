import type { Lang } from '../translations';

type TranslationEntry = Partial<Record<Lang, string>> & { ar: string; en: string };

export const TR_AI: Record<string, TranslationEntry> = {
  ai_manager:     { ar:'المدير المالي الذكي', en:'AI Finance Manager', fr:'Gestionnaire financier IA' },
  ai_active:      { ar:'نشط',             en:'Active', fr:'Actif' },
  ai_working:     { ar:'يعمل حالياً لتحسين وضعك المالي', en:'Currently optimizing your financial health', fr:'Optimisation de votre santé financière en cours' },
  ai_insights_title: { ar:'رؤية المدير المالي الذكي', en:'AI Financial Manager Insights', fr:'Insights du Gestionnaire Financier IA' },
  ai_month_analysis: { ar:'تحليل هذا الشهر', en:"This month's analysis", fr:'Analyse du mois' },
  ai_view_full:      { ar:'عرض التحليل الكامل', en:'View Full Analysis', fr:"Voir l'analyse complète" },
  ai_analysis_loading: { ar:'جاري تحليل وضعك المالي...', en:'Analyzing your financial situation...', fr:'Analyse de votre situation financière...' },
  ai_analysis_result_title: { ar:'نتيجة التحليل', en:'Analysis result', fr:'Résultat de l’analyse' },
  ai_analysis_missing_title: { ar:'بيانات مطلوبة للتحليل', en:'Data needed for analysis', fr:'Données nécessaires à l’analyse' },
  ai_analysis_success_summary: { ar:'تم تحليل وضعك المالي بناءً على بياناتك الحالية.', en:'Your financial situation has been analyzed using your current saved data.', fr:'Votre situation financière a été analysée à partir de vos données enregistrées.' },
  ai_analysis_error_body: { ar:'تعذر تحليل وضعك المالي حالياً. تأكد من وجود بيانات كافية مثل الدخل والمصروفات ثم حاول مرة أخرى.', en:'Your financial situation could not be analyzed right now. Make sure you have enough data such as income and expenses, then try again.', fr:'Votre situation financière ne peut pas être analysée pour le moment. Vérifiez que vous avez assez de données, comme revenus et dépenses, puis réessayez.' },
  ai_analysis_missing_body: { ar:'لا توجد بيانات كافية للتحليل بعد. أضف الدخل والمصروفات أولاً، ثم أضف الأهداف والادخار والاستثمارات إن وجدت.', en:'There is not enough data for analysis yet. Add income and expenses first, then add goals, savings, and investments if available.', fr:'Il n’y a pas encore assez de données pour l’analyse. Ajoutez d’abord revenus et dépenses, puis objectifs, épargne et investissements si disponibles.' },
  ai_analysis_strengths: { ar:'نقاط القوة', en:'Strong points', fr:'Points forts' },
  ai_analysis_weaknesses: { ar:'نقاط الضعف', en:'Weak points', fr:'Points faibles' },
  ai_analysis_recommendations: { ar:'أهم 3 توصيات', en:'Top 3 recommendations', fr:'3 principales recommandations' },
  ai_analysis_optional_data_title: { ar:'لتحسين دقة التحليل، أكمل هذه البيانات:', en:'To improve analysis accuracy, complete this data:', fr:'Pour améliorer la précision, complétez ces données :' },
  ai_analysis_no_strengths: { ar:'لا توجد نقطة قوة واضحة بعد. ابدأ بتسجيل دخل ومصروفات منتظمة لتحسين القراءة.', en:'No clear strong point yet. Start recording regular income and expenses to improve the reading.', fr:'Aucun point fort clair pour le moment. Enregistrez des revenus et dépenses réguliers pour améliorer la lecture.' },
  ai_analysis_no_weaknesses: { ar:'لا توجد نقاط ضعف كبيرة ظاهرة في البيانات الحالية.', en:'No major weak points are visible in the current data.', fr:'Aucun point faible majeur n’apparaît dans les données actuelles.' },
  ai_chat_hint:         { ar:'اكتب سؤالك عن الميزانية، الدخل، أو الاستثمار. الواجهة جاهزة للتوصيل بخدمة الذكاء الموجودة.', en:'Ask about budgets, income, or investing. The interface is ready for the existing AI service.', fr:'Posez vos questions sur le budget, les revenus ou l\'investissement.' },
  ai_welcome:           { ar:'مرحباً، اسألني عن دخلك أو مصروفاتك أو فرص تحسين الادخار.', en:'Hi, ask me about income, expenses, or savings optimization.', fr:'Bonjour, posez-moi vos questions sur vos revenus, dépenses ou l\'optimisation de l\'épargne.' },
  ai_placeholder:       { ar:'مثال: كيف أخفض مصاريفي هذا الشهر؟', en:'Example: How can I reduce expenses this month?', fr:'Exemple: Comment réduire mes dépenses ce mois-ci ?' },
  ai_fallback:          { ar:'وصلتني رسالتك، لكن لم أستطع توليد رد الآن.', en:'I received your message, but could not generate a reply right now.', fr:'J\'ai reçu votre message, mais je n\'ai pas pu générer une réponse pour l\'instant.' },
  ai_unavailable:       { ar:'الخدمة غير متاحة حالياً. حاول مرة أخرى بعد قليل.', en:'The service is unavailable right now. Please try again shortly.', fr:'Le service est indisponible pour l\'instant. Veuillez réessayer dans quelques instants.' },
};
