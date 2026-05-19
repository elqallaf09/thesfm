'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, Calculator, CheckCircle2, Languages, Sparkles, Wallet } from 'lucide-react';
import { WisdomTicker } from '@/components/WisdomTicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Language = 'ar' | 'en' | 'fr';
type CategoryIndex = 0 | 1 | 2;
type Importance = 'critical' | 'high' | 'medium' | 'flexible' | 'growth';

const content = {
  ar: {
    back: 'العودة للرئيسية',
    title: 'أنواع المصروفات',
    intro: 'المصروفات هي كل ما تنفقه من أموالك. فهم أنواعها يساعدك على التحكم في ميزانيتك وتحقيق أهدافك المالية.',
    tipsTitle: 'نصائح مهمة',
    tips: [
      'سجّل كل مصروف ولا تعتمد على الذاكرة.',
      'راجع نفقاتك شهرياً لتعرف أين يذهب مالك.',
      'قلّل المصروفات غير الضرورية تدريجياً.',
      'استخدم قاعدة 50/30/20: 50% للضرورة، 30% للرغبات، 20% للادخار.',
    ],
    categories: [
      { title: 'الضرورة', desc: 'مصاريف لا غنى عنها للحياة اليومية.' },
      { title: 'الرغبات', desc: 'مصاريف تضيف راحة ومتعة لكنها ليست ضرورية.' },
      { title: 'الادخار والاستثمار', desc: 'مصاريف موجهة لبناء الثروة والمستقبل.' },
    ],
    items: [
      { title: 'السكن', desc: 'الإيجار أو القسط الشهري، الصيانة، الفواتير.', examples: ['الإيجار', 'الكهرباء', 'الماء', 'الغاز', 'الإنترنت'] },
      { title: 'الطعام', desc: 'البقالة والوجبات الجاهزة والمطاعم.', examples: ['السوبرماركت', 'مطاعم', 'طلبات توصيل'] },
      { title: 'النقل', desc: 'المواصلات العامة أو وقود السيارة وصيانتها.', examples: ['بنزين', 'مواصلات عامة', 'صيانة السيارة', 'تأمين السيارة'] },
      { title: 'الصحة', desc: 'الأدوية والعلاج والتأمين الصحي.', examples: ['زيارة الطبيب', 'الأدوية', 'التأمين الصحي', 'العلاج الطبيعي'] },
      { title: 'التعليم', desc: 'الرسوم الدراسية والكتب والدورات.', examples: ['الرسوم الدراسية', 'الكتب', 'الدورات التدريبية'] },
      { title: 'التسوق', desc: 'الملابس والإلكترونيات ومستلزمات المنزل.', examples: ['ملابس', 'إلكترونيات', 'أثاث', 'مستلزمات منزلية'] },
      { title: 'الترفيه', desc: 'السينما والألعاب والرحلات.', examples: ['سينما', 'ألعاب', 'رحلات', 'اشتراكات streaming'] },
      { title: 'الهدايا والتبرعات', desc: 'الهدايا للأهل والأصدقاء والتبرعات الخيرية.', examples: ['هدايا المناسبات', 'تبرعات خيرية', 'زكاة'] },
      { title: 'التأمينات', desc: 'تأمينات الحياة والصحة والممتلكات.', examples: ['تأمين حياة', 'تأمين صحة', 'تأمين عقار'] },
      { title: 'الديون', desc: 'تسديد القروض وبطاقات الائتمان.', examples: ['قسط سيارة', 'قسط منزل', 'سحب بطاقة ائتمان'] },
    ],
  },
  en: {
    back: 'Back to home',
    title: 'Expense Types',
    intro: 'Expenses are everything you spend your money on. Understanding their types helps you control your budget and achieve your financial goals.',
    tipsTitle: 'Important tips',
    tips: [
      'Record every expense and do not rely on memory.',
      'Review your expenses monthly to know where your money goes.',
      'Reduce non-essential expenses gradually.',
      'Use the 50/30/20 rule: 50% for needs, 30% for wants, 20% for savings.',
    ],
    categories: [
      { title: 'Needs', desc: 'Essential expenses for daily life.' },
      { title: 'Wants', desc: 'Expenses that add comfort and pleasure but are not essential.' },
      { title: 'Savings and investment', desc: 'Expenses directed toward building wealth and the future.' },
    ],
    items: [
      { title: 'Housing', desc: 'Rent or monthly installments, maintenance, bills.', examples: ['Rent', 'Electricity', 'Water', 'Gas', 'Internet'] },
      { title: 'Food', desc: 'Groceries, takeout, and restaurants.', examples: ['Supermarket', 'Restaurants', 'Delivery orders'] },
      { title: 'Transportation', desc: 'Public transport or car fuel and maintenance.', examples: ['Gas', 'Public transit', 'Car maintenance', 'Car insurance'] },
      { title: 'Healthcare', desc: 'Medicines, treatment, and health insurance.', examples: ['Doctor visit', 'Medicines', 'Health insurance', 'Physical therapy'] },
      { title: 'Education', desc: 'Tuition fees, books, and courses.', examples: ['Tuition', 'Books', 'Training courses'] },
      { title: 'Shopping', desc: 'Clothes, electronics, and home supplies.', examples: ['Clothes', 'Electronics', 'Furniture', 'Home supplies'] },
      { title: 'Entertainment', desc: 'Movies, games, and trips.', examples: ['Cinema', 'Games', 'Trips', 'Streaming subscriptions'] },
      { title: 'Gifts and donations', desc: 'Gifts for family, friends, and charitable donations.', examples: ['Occasion gifts', 'Charity', 'Zakat'] },
      { title: 'Insurances', desc: 'Life, health, and property insurance.', examples: ['Life insurance', 'Health insurance', 'Property insurance'] },
      { title: 'Debts', desc: 'Repaying loans and credit cards.', examples: ['Car installment', 'Home installment', 'Credit card draw'] },
    ],
  },
  fr: {
    back: "Retour à l'accueil",
    title: 'Types de dépenses',
    intro: 'Les dépenses sont tout ce que vous dépensez. Comprendre leurs types vous aide à contrôler votre budget et atteindre vos objectifs financiers.',
    tipsTitle: 'Conseils importants',
    tips: [
      'Enregistrez chaque dépense et ne comptez pas sur la mémoire.',
      'Révisez vos dépenses mensuellement pour savoir où va votre argent.',
      'Réduisez progressivement les dépenses non essentielles.',
      "Utilisez la règle 50/30/20: 50% pour les besoins, 30% pour les envies, 20% pour l'épargne.",
    ],
    categories: [
      { title: 'Besoins', desc: 'Dépenses essentielles pour la vie quotidienne.' },
      { title: 'Envies', desc: 'Dépenses qui ajoutent du confort mais ne sont pas essentielles.' },
      { title: 'Épargne et investissement', desc: 'Dépenses dirigées vers la construction de patrimoine.' },
    ],
    items: [
      { title: 'Logement', desc: 'Loyer ou mensualités, entretien, factures.', examples: ['Loyer', 'Électricité', 'Eau', 'Gaz', 'Internet'] },
      { title: 'Alimentation', desc: 'Épicerie, plats à emporter et restaurants.', examples: ['Supermarché', 'Restaurants', 'Livraisons'] },
      { title: 'Transport', desc: 'Transports en commun ou carburant et entretien auto.', examples: ['Essence', 'Transports publics', 'Entretien auto', 'Assurance auto'] },
      { title: 'Santé', desc: 'Médicaments, soins et assurance santé.', examples: ['Visite médecin', 'Médicaments', 'Assurance santé', 'Kinésithérapie'] },
      { title: 'Éducation', desc: 'Frais de scolarité, livres et cours.', examples: ['Frais de scolarité', 'Livres', 'Formations'] },
      { title: 'Shopping', desc: 'Vêtements, électronique et fournitures ménagères.', examples: ['Vêtements', 'Électronique', 'Meubles', 'Fournitures'] },
      { title: 'Divertissement', desc: 'Cinéma, jeux et voyages.', examples: ['Cinéma', 'Jeux', 'Voyages', 'Abonnements streaming'] },
      { title: 'Cadeaux et dons', desc: 'Cadeaux pour la famille, amis et dons caritatifs.', examples: ["Cadeaux d'occasion", 'Dons caritatifs', 'Zakat'] },
      { title: 'Assurances', desc: 'Assurances vie, santé et biens.', examples: ['Assurance vie', 'Assurance santé', 'Assurance biens'] },
      { title: 'Dettes', desc: 'Remboursement de prêts et cartes de crédit.', examples: ['Mensualité voiture', 'Mensualité maison', 'Retrait carte crédit'] },
    ],
  },
};

const uiText = {
  ar: {
    subtitle: 'تعرّف على أنواع المصروفات وكيف توازن بينها لبناء خطة مالية أذكى',
    dashboardLabel: 'دليل المصروفات الذكي',
    cardsTitle: 'بطاقات المصروفات',
    cardsSubtitle: 'اختر فئة المصروفات لرؤية العناصر المرتبطة بها مع أمثلة عملية.',
    summaryTitle: 'ملخص ذكي',
    recommendation: 'ابدأ بتقليل الرغبات تدريجياً وزيادة الادخار بنسبة بسيطة كل شهر.',
    aiTitle: 'مستشار SFM الذكي',
    aiIntro: 'إشارات سريعة تساعدك على قراءة ميزانيتك قبل أن تتراكم المصاريف.',
    aiInsights: [
      'إذا كانت مصروفاتك الأساسية تتجاوز 60% من دخلك، راجع السكن والطعام والنقل أولاً.',
      'إذا كانت الرغبات أكثر من 30%، حدد سقف شهري للترفيه والتسوق.',
      'اجعل الادخار والاستثمار جزءاً ثابتاً من الميزانية وليس المتبقي آخر الشهر.',
    ],
    buttons: ['احسب ميزانيتي', 'ابدأ خطة مالية', 'اسأل المستشار الذكي'],
    importance: {
      critical: 'أولوية قصوى',
      high: 'مهم',
      medium: 'متوسط',
      flexible: 'مرن',
      growth: 'نمو مستقبلي',
    },
    footer: 'المدير المالي الذكي - يساعدك على اتخاذ قرارات مالية أوضح',
  },
  en: {
    subtitle: 'Learn the main expense types and balance them into a smarter financial plan.',
    dashboardLabel: 'Smart expense guide',
    cardsTitle: 'Expense cards',
    cardsSubtitle: 'Choose a category to see related expenses with practical examples.',
    summaryTitle: 'Smart summary',
    recommendation: 'Start reducing wants gradually and increase savings by a small amount every month.',
    aiTitle: 'SFM AI advisor',
    aiIntro: 'Quick signals that help you read your budget before expenses pile up.',
    aiInsights: [
      'If essential expenses exceed 60% of your income, review housing, food, and transportation first.',
      'If wants exceed 30%, set a monthly cap for entertainment and shopping.',
      'Make saving and investing a fixed part of the budget, not what is left at month end.',
    ],
    buttons: ['Calculate my budget', 'Start a plan', 'Ask the AI advisor'],
    importance: {
      critical: 'Top priority',
      high: 'Important',
      medium: 'Moderate',
      flexible: 'Flexible',
      growth: 'Future growth',
    },
    footer: 'Smart Financial Manager - helping you make clearer financial decisions',
  },
  fr: {
    subtitle: 'Découvrez les types de dépenses et comment les équilibrer pour un plan financier plus intelligent.',
    dashboardLabel: 'Guide intelligent des dépenses',
    cardsTitle: 'Cartes de dépenses',
    cardsSubtitle: 'Choisissez une catégorie pour voir les dépenses liées avec des exemples pratiques.',
    summaryTitle: 'Résumé intelligent',
    recommendation: "Commencez par réduire progressivement les envies et augmentez légèrement l'épargne chaque mois.",
    aiTitle: 'Conseiller IA SFM',
    aiIntro: "Des signaux rapides pour lire votre budget avant l'accumulation des dépenses.",
    aiInsights: [
      'Si les dépenses essentielles dépassent 60% de votre revenu, vérifiez d’abord le logement, la nourriture et le transport.',
      'Si les envies dépassent 30%, fixez un plafond mensuel pour le divertissement et le shopping.',
      "Faites de l'épargne et de l'investissement une partie fixe du budget, pas le reste en fin de mois.",
    ],
    buttons: ['Calculer mon budget', 'Commencer un plan', "Demander à l'IA"],
    importance: {
      critical: 'Priorité haute',
      high: 'Important',
      medium: 'Moyen',
      flexible: 'Flexible',
      growth: 'Croissance future',
    },
    footer: 'Le gestionnaire financier intelligent - vous aide à prendre des décisions financières plus claires',
  },
} satisfies Record<Language, {
  subtitle: string;
  dashboardLabel: string;
  cardsTitle: string;
  cardsSubtitle: string;
  summaryTitle: string;
  recommendation: string;
  aiTitle: string;
  aiIntro: string;
  aiInsights: string[];
  buttons: string[];
  importance: Record<Importance, string>;
  footer: string;
}>;

const categoryVisuals = [
  { icon: '🛡️', percent: 50, color: '#2D8A4E', glow: 'rgba(45,138,78,0.12)' },
  { icon: '✨', percent: 30, color: '#C58B2A', glow: 'rgba(197,139,42,0.13)' },
  { icon: '📈', percent: 20, color: '#C8A96B', glow: 'rgba(200,169,107,0.18)' },
] as const;

const expenseVisuals: Array<{ category: CategoryIndex; icon: string; importance: Importance }> = [
  { category: 0, icon: '🏠', importance: 'critical' },
  { category: 0, icon: '🍽️', importance: 'critical' },
  { category: 0, icon: '🚗', importance: 'high' },
  { category: 0, icon: '🏥', importance: 'critical' },
  { category: 2, icon: '📚', importance: 'growth' },
  { category: 1, icon: '🛍️', importance: 'flexible' },
  { category: 1, icon: '🎮', importance: 'flexible' },
  { category: 1, icon: '🎁', importance: 'medium' },
  { category: 0, icon: '🛡️', importance: 'high' },
  { category: 0, icon: '⚖️', importance: 'critical' },
];

export default function ExpensesEducationPage() {
  const [language, setLanguage] = useState<Language>('ar');
  const [activeCategory, setActiveCategory] = useState<CategoryIndex>(0);
  const t = content[language];
  const ui = uiText[language];
  const isArabic = language === 'ar';
  const cards = t.items.map((item, index) => ({ ...item, visual: expenseVisuals[index] }));
  const activeCards = cards.filter((item) => item.visual.category === activeCategory);

  return (
    <>
      <style>{`
        .sfm-expenses-page {
          --sfm-bg: #FAF8F2;
          --sfm-surface: #FFFFFF;
          --sfm-cream: #FFFDF5;
          --sfm-gold: #C8A96B;
          --sfm-gold-dark: #A67C2D;
          --sfm-brown: #5C3D2A;
          --sfm-dark: #2B2118;
          --sfm-text: #2D1A0A;
          --sfm-muted: #7A6A55;
          --sfm-border: rgba(200,169,107,0.20);
          --sfm-success: #2D8A4E;
          --sfm-warning: #C58B2A;
          --sfm-danger: #C0392B;
          min-height: 100vh;
          background:
            radial-gradient(circle at 12% 10%, rgba(200,169,107,0.18), transparent 30%),
            radial-gradient(circle at 85% 0%, rgba(92,61,42,0.10), transparent 28%),
            linear-gradient(135deg, #fffdf5 0%, #fef9e7 48%, #fdf5d0 100%);
          color: var(--sfm-text);
          font-family: "IBM Plex Sans Arabic", "Tajawal", "Cairo", Inter, system-ui, sans-serif;
          line-height: 1.75;
          overflow-x: hidden;
        }

        .sfm-expenses-shell {
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
          padding: 28px 0 42px;
        }

        .sfm-fade-up {
          animation: sfmFadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .sfm-delay-1 { animation-delay: 0.08s; }
        .sfm-delay-2 { animation-delay: 0.16s; }
        .sfm-delay-3 { animation-delay: 0.24s; }

        @keyframes sfmFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .sfm-education-ticker {
          margin-bottom: 16px;
        }

        .sfm-hero {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.22);
          border-radius: 28px;
          padding: 28px;
          background:
            linear-gradient(135deg, rgba(92,61,42,0.98) 0%, rgba(127,92,72,0.95) 48%, rgba(166,124,45,0.92) 100%);
          box-shadow: 0 22px 55px rgba(92,61,42,0.18);
          color: #fff;
        }

        .sfm-hero::before {
          content: "";
          position: absolute;
          inset: -35% auto auto -12%;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: rgba(255,253,245,0.12);
          filter: blur(8px);
        }

        .sfm-hero::after {
          content: "٪";
          position: absolute;
          inset: auto 34px 22px auto;
          color: rgba(255,253,245,0.10);
          font-size: 148px;
          font-weight: 900;
          line-height: 1;
        }

        .sfm-hero-top {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }

        .sfm-back-link,
        .sfm-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          border-radius: 999px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .sfm-back-link {
          padding: 8px 14px;
          border: 1px solid rgba(200,169,107,0.28);
          background: rgba(255,253,245,0.10);
          color: #fff4cc;
          font-size: 13px;
          font-weight: 700;
          backdrop-filter: blur(12px);
        }

        .sfm-back-link:hover,
        .sfm-action-btn:hover {
          transform: translateY(-2px);
        }

        .sfm-back-link:focus-visible,
        .sfm-action-btn:focus-visible,
        .sfm-category-tab:focus-visible {
          outline: 3px solid rgba(200,169,107,0.42);
          outline-offset: 3px;
        }

        .sfm-language-trigger {
          height: 42px;
          width: 156px;
          border-color: rgba(200,169,107,0.32) !important;
          background: rgba(255,253,245,0.12) !important;
          color: #fff !important;
          border-radius: 999px !important;
          backdrop-filter: blur(12px);
        }

        .sfm-language-trigger span {
          color: #fff;
        }

        .sfm-hero-copy {
          position: relative;
          z-index: 1;
          max-width: 760px;
          margin-top: 34px;
        }

        .sfm-guide-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          border-radius: 999px;
          padding: 7px 12px;
          background: rgba(255,253,245,0.14);
          border: 1px solid rgba(200,169,107,0.30);
          color: #f6df9f;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0;
          backdrop-filter: blur(12px);
        }

        .sfm-hero h1 {
          margin: 18px 0 8px;
          color: #fffdf5;
          font-size: clamp(34px, 5vw, 56px);
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1.15;
        }

        .sfm-hero-subtitle {
          max-width: 720px;
          color: #f8e7b8;
          font-size: clamp(17px, 2.3vw, 22px);
          font-weight: 700;
          line-height: 1.8;
        }

        .sfm-hero-intro {
          max-width: 720px;
          margin-top: 10px;
          color: rgba(255,253,245,0.78);
          font-size: 15px;
        }

        .sfm-hero-stats {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 28px;
        }

        .sfm-hero-stat {
          min-height: 98px;
          border-radius: 22px;
          padding: 16px;
          background: rgba(255,253,245,0.11);
          border: 1px solid rgba(255,253,245,0.18);
          backdrop-filter: blur(14px);
        }

        .sfm-hero-stat strong {
          display: block;
          color: #fff;
          font-size: 26px;
          line-height: 1;
        }

        .sfm-hero-stat span {
          display: block;
          margin-top: 10px;
          color: rgba(255,253,245,0.72);
          font-size: 13px;
          font-weight: 700;
        }

        .sfm-category-tabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .sfm-category-tab {
          position: relative;
          overflow: hidden;
          width: 100%;
          min-height: 136px;
          border: 1px solid var(--sfm-border);
          border-radius: 24px;
          padding: 20px;
          background: rgba(255,253,245,0.72);
          box-shadow: 0 10px 30px rgba(92,61,42,0.08);
          color: var(--sfm-text);
          text-align: start;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .sfm-category-tab:hover,
        .sfm-expense-card:hover,
        .sfm-premium-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 44px rgba(92,61,42,0.13);
        }

        .sfm-category-tab.is-active {
          border-color: rgba(200,169,107,0.58);
          background: linear-gradient(135deg, rgba(255,253,245,0.98), rgba(254,249,231,0.96));
        }

        .sfm-category-tab.is-active::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          inset-inline-start: 0;
          width: 5px;
          background: linear-gradient(180deg, var(--sfm-gold), var(--sfm-gold-dark));
        }

        .sfm-category-head {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sfm-category-icon,
        .sfm-card-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          border-radius: 18px;
          background: rgba(200,169,107,0.14);
          box-shadow: inset 0 0 0 1px rgba(200,169,107,0.18);
        }

        .sfm-category-icon {
          width: 46px;
          height: 46px;
          font-size: 23px;
        }

        .sfm-category-tab h2 {
          color: var(--sfm-text);
          font-size: 18px;
          font-weight: 900;
          line-height: 1.35;
        }

        .sfm-category-tab p {
          margin-top: 12px;
          color: var(--sfm-muted);
          font-size: 13px;
          line-height: 1.65;
        }

        .sfm-category-percent {
          position: absolute;
          top: 18px;
          inset-inline-end: 18px;
          color: var(--sfm-gold-dark);
          font-size: 13px;
          font-weight: 900;
        }

        .sfm-dashboard-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 330px;
          align-items: start;
          gap: 18px;
          margin-top: 18px;
        }

        .sfm-main-column {
          min-width: 0;
          display: grid;
          gap: 18px;
        }

        .sfm-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          padding: 0 2px;
        }

        .sfm-section-heading h2 {
          color: var(--sfm-text);
          font-size: 23px;
          font-weight: 900;
          line-height: 1.25;
        }

        .sfm-section-heading p {
          margin-top: 4px;
          color: var(--sfm-muted);
          font-size: 14px;
        }

        .sfm-pill-count {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 7px 12px;
          background: rgba(200,169,107,0.14);
          border: 1px solid var(--sfm-border);
          color: var(--sfm-gold-dark);
          font-size: 12px;
          font-weight: 900;
        }

        .sfm-expense-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .sfm-premium-card,
        .sfm-expense-card {
          border: 1px solid var(--sfm-border);
          border-radius: 22px;
          background: rgba(255,253,245,0.98);
          box-shadow: 0 10px 30px rgba(92,61,42,0.08);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .sfm-expense-card {
          min-height: 270px;
          padding: 20px;
        }

        .sfm-expense-card:hover {
          border-color: rgba(200,169,107,0.42);
        }

        .sfm-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .sfm-card-icon {
          width: 50px;
          height: 50px;
          font-size: 25px;
        }

        .sfm-importance {
          border-radius: 999px;
          padding: 6px 10px;
          background: rgba(92,61,42,0.06);
          border: 1px solid rgba(92,61,42,0.08);
          color: var(--sfm-brown);
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .sfm-expense-card h3 {
          margin-top: 16px;
          color: var(--sfm-text);
          font-size: 21px;
          font-weight: 900;
          line-height: 1.28;
        }

        .sfm-expense-card p {
          margin-top: 8px;
          color: var(--sfm-muted);
          font-size: 14px;
          line-height: 1.75;
        }

        .sfm-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }

        .sfm-category-badge,
        .sfm-chip {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid var(--sfm-border);
          font-size: 12px;
          font-weight: 800;
        }

        .sfm-category-badge {
          gap: 6px;
          padding: 6px 10px;
          background: rgba(200,169,107,0.12);
          color: var(--sfm-gold-dark);
        }

        .sfm-examples {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .sfm-chip {
          padding: 6px 9px;
          background: rgba(255,255,255,0.78);
          color: var(--sfm-muted);
        }

        .sfm-summary-card {
          position: sticky;
          top: 20px;
          padding: 22px;
        }

        .sfm-summary-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--sfm-text);
          font-size: 20px;
          font-weight: 900;
        }

        .sfm-summary-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(200,169,107,0.26), rgba(255,253,245,0.9));
          color: var(--sfm-brown);
        }

        .sfm-summary-bars {
          display: grid;
          gap: 16px;
          margin-top: 22px;
        }

        .sfm-bar-row {
          display: grid;
          gap: 8px;
        }

        .sfm-bar-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--sfm-text);
          font-size: 13px;
          font-weight: 900;
        }

        .sfm-bar-track {
          height: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(92,61,42,0.08);
        }

        .sfm-bar-fill {
          height: 100%;
          border-radius: inherit;
          animation: sfmBar 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes sfmBar {
          from { width: 0; }
        }

        .sfm-recommendation {
          margin-top: 20px;
          border-radius: 20px;
          padding: 16px;
          background: linear-gradient(135deg, rgba(200,169,107,0.12), rgba(255,253,245,0.86));
          border: 1px solid var(--sfm-border);
          color: var(--sfm-brown);
          font-size: 14px;
          font-weight: 700;
          line-height: 1.8;
        }

        .sfm-tips-card,
        .sfm-ai-card {
          padding: 24px;
        }

        .sfm-ai-card {
          overflow: hidden;
          background:
            linear-gradient(135deg, rgba(43,33,24,0.98), rgba(92,61,42,0.96)),
            var(--sfm-dark);
          color: #fff;
        }

        .sfm-ai-card:hover {
          transform: translateY(-3px);
        }

        .sfm-ai-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .sfm-ai-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sfm-ai-title h2 {
          color: #fffdf5;
          font-size: 22px;
          font-weight: 900;
        }

        .sfm-ai-title span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 46px;
          border-radius: 17px;
          background: rgba(200,169,107,0.16);
          color: var(--sfm-gold);
        }

        .sfm-ai-card p {
          margin-top: 8px;
          color: rgba(255,253,245,0.70);
          font-size: 14px;
        }

        .sfm-ai-list {
          display: grid;
          gap: 10px;
          margin-top: 20px;
        }

        .sfm-ai-item {
          display: grid;
          grid-template-columns: 26px 1fr;
          gap: 10px;
          align-items: flex-start;
          border-radius: 18px;
          padding: 12px;
          background: rgba(255,253,245,0.08);
          border: 1px solid rgba(200,169,107,0.18);
          color: rgba(255,253,245,0.88);
          font-size: 14px;
        }

        .sfm-ai-item svg {
          margin-top: 3px;
          color: #f4d589;
        }

        .sfm-ai-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .sfm-action-btn {
          min-width: 154px;
          padding: 11px 16px;
          border: 1px solid rgba(200,169,107,0.28);
          background: rgba(255,253,245,0.10);
          color: #fff7dd;
          font-size: 13px;
          font-weight: 900;
        }

        .sfm-action-btn.primary {
          background: linear-gradient(135deg, var(--sfm-gold), var(--sfm-gold-dark));
          color: #2b2118;
          border-color: transparent;
        }

        .sfm-tips-card h2 {
          color: var(--sfm-text);
          font-size: 21px;
          font-weight: 900;
        }

        .sfm-tips-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
        }

        .sfm-tip {
          border-radius: 18px;
          padding: 14px;
          background: rgba(200,169,107,0.09);
          border: 1px solid var(--sfm-border);
          color: var(--sfm-muted);
          font-size: 14px;
          font-weight: 700;
        }

        .sfm-footer {
          margin-top: 22px;
          padding-top: 22px;
          border-top: 1px solid var(--sfm-border);
          text-align: center;
          color: var(--sfm-muted);
          font-size: 13px;
        }

        .sfm-footer-brand {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          border-radius: 999px;
          padding: 6px 14px;
          background: rgba(255,253,245,0.82);
          border: 1px solid var(--sfm-border);
          color: var(--sfm-gold-dark);
          font-weight: 900;
        }

        @media (max-width: 1100px) {
          .sfm-dashboard-grid {
            grid-template-columns: 1fr;
          }

          .sfm-summary-card {
            position: relative;
            top: auto;
          }

          .sfm-expense-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 780px) {
          .sfm-expenses-shell {
            width: min(100% - 22px, 1180px);
            padding-top: 16px;
          }

          .sfm-hero {
            padding: 22px;
            border-radius: 24px;
          }

          .sfm-hero-top,
          .sfm-section-heading {
            align-items: stretch;
            flex-direction: column;
          }

          .sfm-back-link,
          .sfm-language-trigger,
          .sfm-pill-count {
            width: 100%;
          }

          .sfm-hero-stats,
          .sfm-category-tabs,
          .sfm-expense-grid,
          .sfm-tips-grid {
            grid-template-columns: 1fr;
          }

          .sfm-expense-card {
            min-height: auto;
          }

          .sfm-ai-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .sfm-action-btn {
            width: 100%;
          }
        }
      `}</style>

      <main dir={isArabic ? 'rtl' : 'ltr'} className="sfm-expenses-page">
        <div className="sfm-expenses-shell">
          <div className="sfm-education-ticker sfm-fade-up">
            <WisdomTicker language={language} onLanguageChange={setLanguage} showLanguageSelector={false} />
          </div>

          <section className="sfm-hero sfm-fade-up">
            <div className="sfm-hero-top">
              <Link href="/" className="sfm-back-link">
                <ArrowRight className="h-4 w-4" />
                {t.back}
              </Link>

              <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                <SelectTrigger className="sfm-language-trigger">
                  <Languages className="h-4 w-4" style={{ color: '#f6df9f' }} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sfm-hero-copy">
              <div className="sfm-guide-badge">
                <Sparkles className="h-4 w-4" />
                SFM Financial Guide
              </div>
              <h1>{t.title}</h1>
              <p className="sfm-hero-subtitle">{ui.subtitle}</p>
              <p className="sfm-hero-intro">{t.intro}</p>
            </div>

            <div className="sfm-hero-stats">
              {t.categories.map((category, index) => (
                <div key={category.title} className="sfm-hero-stat">
                  <strong>{categoryVisuals[index].percent}%</strong>
                  <span>
                    {categoryVisuals[index].icon} {category.title}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="sfm-category-tabs sfm-fade-up sfm-delay-1" aria-label={ui.dashboardLabel}>
            {t.categories.map((category, index) => {
              const visual = categoryVisuals[index];
              const isActive = activeCategory === index;

              return (
                <button
                  key={category.title}
                  type="button"
                  className={`sfm-category-tab${isActive ? ' is-active' : ''}`}
                  onClick={() => setActiveCategory(index as CategoryIndex)}
                  aria-pressed={isActive}
                >
                  <span className="sfm-category-percent">{visual.percent}%</span>
                  <div className="sfm-category-head">
                    <span className="sfm-category-icon" style={{ background: visual.glow }}>{visual.icon}</span>
                    <h2>{category.title}</h2>
                  </div>
                  <p>{category.desc}</p>
                </button>
              );
            })}
          </section>

          <section className="sfm-dashboard-grid sfm-fade-up sfm-delay-2">
            <div className="sfm-main-column">
              <div className="sfm-section-heading">
                <div>
                  <h2>{ui.cardsTitle}</h2>
                  <p>{ui.cardsSubtitle}</p>
                </div>
                <span className="sfm-pill-count">
                  {activeCards.length} / {t.items.length}
                </span>
              </div>

              <div className="sfm-expense-grid">
                {activeCards.map((item) => {
                  const category = t.categories[item.visual.category];
                  const categoryVisual = categoryVisuals[item.visual.category];

                  return (
                    <article key={item.title} className="sfm-expense-card">
                      <div className="sfm-card-top">
                        <span className="sfm-card-icon" style={{ background: categoryVisual.glow }}>{item.visual.icon}</span>
                        <span className="sfm-importance">{ui.importance[item.visual.importance]}</span>
                      </div>

                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>

                      <div className="sfm-card-meta">
                        <span className="sfm-category-badge">
                          {categoryVisual.icon} {category.title}
                        </span>
                      </div>

                      <div className="sfm-examples">
                        {item.examples.map((example) => (
                          <span key={example} className="sfm-chip">{example}</span>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>

              <article className="sfm-ai-card sfm-premium-card sfm-fade-up sfm-delay-3">
                <div className="sfm-ai-head">
                  <div>
                    <div className="sfm-ai-title">
                      <span><Bot className="h-5 w-5" /></span>
                      <h2>{ui.aiTitle}</h2>
                    </div>
                    <p>{ui.aiIntro}</p>
                  </div>
                </div>

                <div className="sfm-ai-list">
                  {ui.aiInsights.map((insight) => (
                    <div key={insight} className="sfm-ai-item">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>

                <div className="sfm-ai-actions">
                  <Link href="/" className="sfm-action-btn primary">
                    <Calculator className="h-4 w-4" />
                    {ui.buttons[0]}
                  </Link>
                  <Link href="/" className="sfm-action-btn">
                    <Wallet className="h-4 w-4" />
                    {ui.buttons[1]}
                  </Link>
                  <Link href="/projects" className="sfm-action-btn">
                    <Bot className="h-4 w-4" />
                    {ui.buttons[2]}
                  </Link>
                </div>
              </article>

              <section className="sfm-tips-card sfm-premium-card">
                <h2>✦ {t.tipsTitle}</h2>
                <div className="sfm-tips-grid">
                  {t.tips.map((tip) => (
                    <div key={tip} className="sfm-tip">{tip}</div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="sfm-summary-card sfm-premium-card">
              <div className="sfm-summary-title">
                <span className="sfm-summary-icon"><Wallet className="h-5 w-5" /></span>
                {ui.summaryTitle}
              </div>

              <div className="sfm-summary-bars">
                {t.categories.map((category, index) => {
                  const visual = categoryVisuals[index];

                  return (
                    <div key={category.title} className="sfm-bar-row">
                      <div className="sfm-bar-label">
                        <span>{visual.icon} {category.title}</span>
                        <span>{visual.percent}%</span>
                      </div>
                      <div className="sfm-bar-track">
                        <div
                          className="sfm-bar-fill"
                          style={{
                            width: `${visual.percent}%`,
                            background: `linear-gradient(90deg, ${visual.color}, #C8A96B)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="sfm-recommendation">{ui.recommendation}</div>
            </aside>
          </section>

          <footer className="sfm-footer">
            <p>{ui.footer}</p>
            <div className="sfm-footer-brand">
              <span>powered by</span>
              <strong>M.Q</strong>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
