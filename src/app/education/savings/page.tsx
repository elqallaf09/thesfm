'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Language = 'ar' | 'en' | 'fr';

const content = {
  ar: {
    back: 'العودة للرئيسية',
    title: 'أنواع الإدخار',
    intro: 'الإدخار يعني وضع جزء من المال جانباً للاستخدام المستقبلي. البدء مبكراً يصنع فرقاً كبيراً مع مرور الوقت بفضل الفائدة المركبة.',
    tipsTitle: 'نصائح مهمة',
    tips: [
      'ابدأ بأقل مبلغ ممكن ولا تنتظر للراتب التالي.',
      'حدد هدفاً واضحاً للإدخار لتبقى متحمساً.',
      'افصل حساب الإدخار عن حساب المصروفات.',
      'راجع خطتك شهرياً وعدّلها حسب الحاجة.'
    ],
    items: [
      { title: 'حساب التوفير العادي', desc: 'حساب في البنك بسحب وإيداع بسهولة.', examples: ['حساب جاري', 'حساب توفير عادي', 'حساب توفير ذهبي'] },
      { title: 'شهادات الإدخار', desc: 'ودائع بمعدلات فائدة أعلى من الحساب العادي.', examples: ['شهادة 12 شهر', 'شهادة 24 شهر', 'شهادة 36 شهر'] },
      { title: 'الصناديق الاستثمارية', desc: 'محافظ يديرها مختصون لتحقيق عائد أفضل.', examples: ['صناديق سوق النقد', 'صناديق الدخل الثابت', 'صناديق الأسهم'] },
      { title: 'التأمين على الحياة', desc: 'ادخار مع حماية مالية لأسرتك.', examples: ['تأمين مدى الحياة', 'تأمين مؤقت', 'تأمين توفير'] },
      { title: 'المعاشات التقاعدية', desc: 'خطة ادخار للمستقبل بعد التقاعد.', examples: ['صندوق حكومي', 'صندوق خاص', 'حساب تقاعدي فردي'] },
      { title: 'الذهب والمعادن', desc: 'شراء أصول حقيقية للحماية من التضخم.', examples: ['ذهب عيار 21', 'فضة', 'بلاتين'] },
      { title: 'العقارات', desc: 'شراء عقار وتأجيره كمصدر دخل ثابت.', examples: ['شقة', 'محل تجاري', 'أرض', 'مجمع سكني'] },
      { title: 'العملات الأجنبية', desc: 'ادخار بعملة مستقرة ذات قيمة ثابتة.', examples: ['دولار أمريكي', 'يورو', 'فرنك سويسري'] },
      { title: 'إعادة الاستثمار', desc: 'إعادة توجيه الأرباح لشراء أصول إضافية.', examples: ['أرباح الأسهم', 'أرباح العقار', 'عوائد الاستثمار'] }
    ]
  },
  en: {
    back: 'Back to home',
    title: 'Savings Types',
    intro: 'Saving means setting aside money for future use. Starting early makes a big difference over time thanks to compound interest.',
    tipsTitle: 'Important tips',
    tips: [
      'Start with the smallest amount and do not wait for next salary.',
      'Set a clear savings goal to stay motivated.',
      'Separate your savings account from your spending account.',
      'Review your plan monthly and adjust as needed.'
    ],
    items: [
      { title: 'Regular savings account', desc: 'A bank account for easy withdrawal and deposit.', examples: ['Current account', 'Regular savings', 'Golden savings'] },
      { title: 'Savings certificates', desc: 'Deposits with higher interest rates than regular accounts.', examples: ['12-month certificate', '24-month certificate', '36-month certificate'] },
      { title: 'Investment funds', desc: 'Portfolios managed by specialists for better returns.', examples: ['Money market funds', 'Fixed income funds', 'Equity funds'] },
      { title: 'Life insurance', desc: 'Savings with financial protection for your family.', examples: ['Whole life insurance', 'Term insurance', 'Endowment insurance'] },
      { title: 'Pension plans', desc: 'Savings plan for the future after retirement.', examples: ['Government fund', 'Private fund', 'Individual pension account'] },
      { title: 'Gold and metals', desc: 'Buying real assets for inflation protection.', examples: ['21K gold', 'Silver', 'Platinum'] },
      { title: 'Real estate', desc: 'Buying property to rent as a steady income source.', examples: ['Apartment', 'Commercial shop', 'Land', 'Residential complex'] },
      { title: 'Foreign currencies', desc: 'Saving in stable currency with fixed value.', examples: ['US Dollar', 'Euro', 'Swiss Franc'] },
      { title: 'Reinvestment', desc: 'Redirecting profits to purchase additional assets.', examples: ['Stock dividends', 'Real estate profits', 'Investment returns'] }
    ]
  },
  fr: {
    back: "Retour à l'accueil",
    title: "Types d'épargne",
    intro: "Épargner signifie mettre de l'argent de côté pour une utilisation future. Commencer tôt fait une grande différence avec le temps grâce aux intérêts composés.",
    tipsTitle: 'Conseils importants',
    tips: [
      "Commencez avec le plus petit montant sans attendre le prochain salaire.",
      "Fixez un objectif d'épargne clair pour rester motivé.",
      'Séparez votre compte épargne de votre compte de dépenses.',
      'Révisez votre plan mensuellement et ajustez si nécessaire.'
    ],
    items: [
      { title: 'Compte épargne ordinaire', desc: 'Compte bancaire avec retrait et dépôt faciles.', examples: ['Compte courant', 'Épargne ordinaire', 'Épargne dorée'] },
      { title: "Certificats d'épargne", desc: 'Dépôts avec des taux plus élevés que les comptes ordinaires.', examples: ['Certificat 12 mois', 'Certificat 24 mois', 'Certificat 36 mois'] },
      { title: "Fonds d'investissement", desc: 'Portefeuilles gérés par des spécialistes pour de meilleurs rendements.', examples: ['Fonds du marché monétaire', 'Fonds à revenu fixe', "Fonds d'actions"] },
      { title: 'Assurance-vie', desc: 'Épargne avec protection financière pour votre famille.', examples: ['Assurance-vie entière', 'Assurance temporaire', 'Assurance épargne'] },
      { title: 'Plans de pension', desc: "Plan d'épargne pour l'avenir après la retraite.", examples: ['Fonds gouvernemental', 'Fonds privé', 'Compte de pension individuel'] },
      { title: 'Or et métaux', desc: "Acheter des actifs réels pour se protéger de l'inflation.", examples: ['Or 21K', 'Argent', 'Platine'] },
      { title: 'Immobilier', desc: 'Acheter une propriété à louer comme source de revenus stable.', examples: ['Appartement', 'Local commercial', 'Terrain', 'Complexe résidentiel'] },
      { title: 'Devises étrangères', desc: 'Épargner en monnaie stable à valeur fixe.', examples: ['Dollar américain', 'Euro', 'Franc suisse'] },
      { title: 'Réinvestissement', desc: 'Rediriger les bénéfices pour acheter des actifs supplémentaires.', examples: ['Dividendes', 'Profits immobiliers', "Rendements d'investissement"] }
    ]
  }
};

export default function SavingsEducationPage() {
  const [language, setLanguage] = useState<Language>('ar');
  const t = content[language];
  const isArabic = language === 'ar';

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen px-4 py-8" style={{background: 'linear-gradient(135deg, #fffdf5 0%, #fef9e7 50%, #fdf5d0 100%)'}}>
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="rounded-3xl p-6 text-white shadow-xl" style={{background: '#1a1228'}}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="text-sm hover:opacity-80 transition-opacity" style={{color: '#c4a35a'}}>{t.back}</Link>
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger className="w-[150px] text-white [&>span]:text-white" style={{borderColor: 'rgba(196,163,90,0.3)', background: 'rgba(196,163,90,0.1)'}}>
                <Languages className="h-4 w-4 me-2" style={{color: '#c4a35a'}} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <h1 className="mt-4 text-4xl font-bold" style={{color: '#c4a35a'}}>{t.title}</h1>
          <p className="mt-3 max-w-3xl" style={{color: 'rgba(196,163,90,0.7)'}}>{t.intro}</p>
        </div>

        {/* Cards */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {t.items.map((item, index) => (
            <article key={index} className="rounded-2xl p-5" style={{border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(255,253,245,0.98)', boxShadow: '0 2px 12px rgba(196,163,90,0.08)'}}>
              <h2 className="text-xl font-bold" style={{color: '#7a5c1a'}}>{item.title}</h2>
              <p className="mt-2" style={{color: 'rgba(122,92,26,0.7)'}}>{item.desc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.examples.map((example, i) => (
                  <span key={i} className="rounded-full px-3 py-1 text-sm font-medium" style={{background: 'rgba(196,163,90,0.12)', color: '#7a5c1a', border: '0.5px solid rgba(196,163,90,0.3)'}}>{example}</span>
                ))}
              </div>
            </article>
          ))}
        </section>

        {/* Tips */}
        <div className="rounded-2xl p-5" style={{border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(196,163,90,0.06)'}}>
          <h2 className="text-xl font-bold" style={{color: '#7a5c1a'}}>✦ {t.tipsTitle}</h2>
          <ul className="mt-3 list-disc space-y-2 ps-6" style={{color: 'rgba(122,92,26,0.8)'}}>
            {t.tips.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </div>

        {/* Footer */}
        <div className="pt-6 text-center text-sm" style={{borderTop: '1px solid rgba(196,163,90,0.3)'}}>
          <p style={{color: 'rgba(122,92,26,0.5)'}}>
            {isArabic ? 'المدير المالي الذكي - يساعدك على اتخاذ قرارات مالية أوضح' : language === 'fr' ? 'Le gestionnaire financier intelligent - vous aide à prendre des décisions financières plus claires' : 'Smart Financial Manager - helping you make clearer financial decisions'}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="w-20 h-px" style={{background: 'rgba(196,163,90,0.4)'}}></span>
            <span className="font-medium" style={{color: '#c4a35a'}}>powered by M.Q</span>
            <span className="w-20 h-px" style={{background: 'rgba(196,163,90,0.4)'}}></span>
          </div>
        </div>

      </div>
    </main>
  );
}
