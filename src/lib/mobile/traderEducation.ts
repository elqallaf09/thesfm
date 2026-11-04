export type TraderEducationLanguage = 'ar' | 'en' | 'fr';

type LocalizedText = Record<TraderEducationLanguage, string>;

export type TraderLesson = {
  title: LocalizedText;
  body: LocalizedText;
};

export type TraderLessonCategory = {
  id: string;
  title: LocalizedText;
  lessons: TraderLesson[];
};

export const TRADER_EDUCATION_COPY = {
  eyebrow: { ar: 'التعلّم قبل القرار', en: 'Learn before deciding', fr: 'Apprendre avant de décider' },
  title: { ar: 'مركز تعليم التداول', en: 'Trading education center', fr: 'Centre de formation au trading' },
  subtitle: {
    ar: 'دروس قصيرة توضّح قراءة بيانات المنصة وإدارة المخاطر من دون أسعار أو نتائج افتراضية.',
    en: 'Short lessons for reading platform data and managing risk without synthetic prices or outcomes.',
    fr: 'Des leçons courtes pour lire les données de la plateforme et gérer le risque sans cours ni résultats fictifs.',
  },
  lesson: { ar: 'درس', en: 'Lesson', fr: 'Leçon' },
  lessonCount: { ar: 'درسًا', en: 'lessons', fr: 'leçons' },
  disclaimerTitle: { ar: 'تنبيه مهم', en: 'Important notice', fr: 'Avis important' },
  disclaimer: {
    ar: 'هذا المحتوى تعليمي عام وليس توصية استثمارية. تحقّق من البيانات وقيّم قدرتك على تحمّل الخسارة قبل أي قرار.',
    en: 'This is general educational content, not investment advice. Verify the data and assess your loss tolerance before acting.',
    fr: 'Ce contenu est éducatif et ne constitue pas un conseil en investissement. Vérifiez les données et votre capacité à supporter une perte avant d’agir.',
  },
} satisfies Record<string, LocalizedText>;

export const TRADER_LESSON_CATEGORIES: TraderLessonCategory[] = [
  {
    id: 'fundamentals',
    title: { ar: 'الأساسيات', en: 'Fundamentals', fr: 'Principes de base' },
    lessons: [
      {
        title: { ar: 'كيف تقرأ توصية الذكاء الاصطناعي؟', en: 'How to read an AI recommendation', fr: 'Comment lire une recommandation de l’IA' },
        body: {
          ar: 'لا تظهر التوصية إلا عند توفر مزود بيانات وتحليل مكتمل. عند غياب المزود تظهر حالة فارغة بدل أرقام مصطنعة.',
          en: 'A recommendation appears only when a data provider and complete analysis are available. Otherwise, an empty state replaces invented figures.',
          fr: 'Une recommandation apparaît uniquement avec un fournisseur et une analyse complète. Sinon, un état vide remplace les chiffres inventés.',
        },
      },
      {
        title: { ar: 'العملة حسب الأصل', en: 'Currency by asset', fr: 'Devise par actif' },
        body: {
          ar: 'يستخدم كل أصل عملته من بيانات الرمز أو السوق، وليس من السوق المحدد في الواجهة.',
          en: 'Each asset uses its currency from symbol or market data, not the market selected in the interface.',
          fr: 'Chaque actif utilise la devise de ses données de symbole ou de marché, et non celle choisie dans l’interface.',
        },
      },
      {
        title: { ar: 'السوق مقابل الرمز', en: 'Market versus symbol', fr: 'Marché et symbole' },
        body: {
          ar: 'اختيار السوق يصفّي الرموز فقط؛ السعر والعملة يأتيان من الرمز نفسه.',
          en: 'Choosing a market filters symbols; price and currency still come from the symbol itself.',
          fr: 'Le choix du marché filtre les symboles ; le cours et la devise proviennent toujours du symbole.',
        },
      },
    ],
  },
  {
    id: 'risk',
    title: { ar: 'إدارة المخاطر', en: 'Risk management', fr: 'Gestion des risques' },
    lessons: [
      {
        title: { ar: 'حجم الصفقة', en: 'Position size', fr: 'Taille de la position' },
        body: {
          ar: 'حدد حجم المركز ونسبة المخاطرة من رأس المال قبل الدخول في أي صفقة.',
          en: 'Set the position size and capital risk percentage before entering any trade.',
          fr: 'Définissez la taille de la position et le pourcentage du capital risqué avant toute transaction.',
        },
      },
      {
        title: { ar: 'وقف الخسارة', en: 'Stop loss', fr: 'Stop de protection' },
        body: {
          ar: 'ضع نقطة إلغاء واضحة قبل الدخول والتزم بها دون تحريكها عاطفيًا.',
          en: 'Set a clear invalidation point before entry and follow it without moving it emotionally.',
          fr: 'Fixez un niveau d’invalidation clair avant l’entrée et respectez-le sans le déplacer sous l’effet de l’émotion.',
        },
      },
      {
        title: { ar: 'العائد إلى المخاطرة', en: 'Risk/reward', fr: 'Risque/rendement' },
        body: {
          ar: 'قيّم العائد المحتمل مقابل الخسارة المحتملة، ولا تعتمد على نسبة واحدة بمعزل عن جودة البيانات والسيولة.',
          en: 'Compare potential return with potential loss, and never use one ratio without considering data quality and liquidity.',
          fr: 'Comparez le rendement et la perte potentiels, sans isoler un ratio de la qualité des données et de la liquidité.',
        },
      },
    ],
  },
  {
    id: 'technical',
    title: { ar: 'التحليل الفني', en: 'Technical analysis', fr: 'Analyse technique' },
    lessons: [
      {
        title: { ar: 'الدعم والمقاومة', en: 'Support and resistance', fr: 'Support et résistance' },
        body: {
          ar: 'هي مناطق يتكرر عندها تفاعل السعر، وتُستخدم كسياق للدخول والأهداف لا كضمان للاتجاه.',
          en: 'These are zones of repeated price reaction, used as context for entries and targets rather than a guarantee of direction.',
          fr: 'Ce sont des zones de réaction répétée du cours, utilisées comme contexte et non comme garantie de direction.',
        },
      },
      {
        title: { ar: 'الاتجاه', en: 'Trend', fr: 'Tendance' },
        body: {
          ar: 'افحص الاتجاه على أكثر من إطار زمني وتجنب اعتبار حركة قصيرة دليلًا كافيًا وحدها.',
          en: 'Check the trend across multiple timeframes and do not treat a short move as sufficient evidence by itself.',
          fr: 'Examinez la tendance sur plusieurs horizons et ne considérez pas un mouvement court comme une preuve suffisante.',
        },
      },
      {
        title: { ar: 'حجم التداول', en: 'Trading volume', fr: 'Volume de négociation' },
        body: {
          ar: 'قد يزيد الحجم المرتفع موثوقية الحركة، لكن يجب التحقق من مصدر البيانات وسياق السوق.',
          en: 'Higher volume may strengthen a move, but its data source and market context still need verification.',
          fr: 'Un volume élevé peut renforcer un mouvement, mais sa source et le contexte de marché doivent être vérifiés.',
        },
      },
    ],
  },
  {
    id: 'portfolio',
    title: { ar: 'المحفظة', en: 'Portfolio', fr: 'Portefeuille' },
    lessons: [
      {
        title: { ar: 'التنويع', en: 'Diversification', fr: 'Diversification' },
        body: {
          ar: 'وزّع المخاطر عبر أسواق وقطاعات مختلفة لتقليل أثر أصل واحد، مع مراعاة الترابط بينها.',
          en: 'Spread risk across markets and sectors to reduce single-asset impact while accounting for correlations.',
          fr: 'Répartissez le risque entre marchés et secteurs tout en tenant compte de leurs corrélations.',
        },
      },
      {
        title: { ar: 'التوزيع وإعادة التوازن', en: 'Allocation and rebalancing', fr: 'Allocation et rééquilibrage' },
        body: {
          ar: 'حدد نسبة كل فئة أصول وراجعها دوريًا بدل تغييرها استجابةً لكل حركة يومية.',
          en: 'Set each asset-class allocation and review it periodically instead of reacting to every daily move.',
          fr: 'Définissez l’allocation de chaque classe d’actifs et révisez-la périodiquement sans réagir à chaque mouvement quotidien.',
        },
      },
    ],
  },
];
