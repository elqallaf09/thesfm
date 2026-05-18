'use client';
import { useState } from 'react';
import { WisdomTicker } from '@/components/WisdomTicker';
import Link from 'next/link';
import { Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Language = 'ar' | 'en' | 'fr';

const content = {
  ar: {
    back: 'العودة للرئيسية',
    title: 'أنواع الاستثمار',
    intro: 'الاستثمار يعني تشغيل المال أو الوقت في أصل أو مهارة بهدف تحقيق نمو مستقبلي. الأفضل دائماً توزيع المخاطر وعدم وضع كل المال في خيار واحد.',
    tipsTitle: 'نصائح مهمة',
    tips: [
      'ابدأ بمبلغ صغير وتعلم قبل زيادة المبلغ.',
      'نوّع بين أكثر من نوع استثمار لتقليل المخاطر.',
      'لا تستثمر مال الطوارئ أو المال الذي تحتاجه قريباً.',
      'قارن الرسوم والمخاطر قبل الاختيار.',
      'الاستثمار طويل الأمد أكثر أماناً من المضاربة قصيرة الأمد.',
    ],
    items: [
      { title: 'الأسهم', emoji: '📈', risk: 'عالي', desc: 'شراء حصة في شركة مدرجة. قد تربح من ارتفاع السعر أو توزيعات الأرباح. مناسب للمستثمر الصبور على المدى الطويل.', examples: ['أسهم البنوك', 'أسهم الاتصالات', 'أسهم الطاقة', 'الشركات القيادية', 'أسهم الصناعة'] },
      { title: 'الصناديق الاستثمارية', emoji: '🏦', risk: 'متوسط', desc: 'محفظة يديرها مختصون وتجمع أموال عدة مستثمرين. توفر تنويعاً تلقائياً وتقليل مخاطر.', examples: ['صناديق الأسهم', 'صناديق الدخل الثابت', 'صناديق متوازنة', 'صناديق مؤشرات', 'صناديق النمو'] },
      { title: 'الصكوك والسندات', emoji: '📋', risk: 'منخفض', desc: 'أدوات دخل ثابت أو شبه ثابت. تمنحك عائداً دورياً منتظماً مع مخاطر أقل من الأسهم. مناسب لمن يريد دخلاً ثابتاً.', examples: ['صكوك حكومية', 'صكوك شركات', 'سندات قصيرة الأجل', 'صكوك إسلامية'] },
      { title: 'العقار', emoji: '🏠', risk: 'متوسط', desc: 'شراء أصل عقاري للاستفادة من الإيجار الشهري أو ارتفاع القيمة مع الوقت. من أكثر الاستثمارات استقراراً في الخليج.', examples: ['شقة للإيجار', 'أرض', 'محل تجاري', 'صناديق عقارية (REITs)', 'مجمع سكني'] },
      { title: 'الذهب والمعادن', emoji: '🥇', risk: 'منخفض-متوسط', desc: 'أصول تستخدم للحماية من التضخم وتنويع المحفظة. الذهب يحتفظ بقيمته عبر الزمن وهو ملاذ آمن في أوقات الأزمات.', examples: ['ذهب عيار 24', 'سبائك ذهب', 'صناديق ذهب ETF', 'فضة', 'بلاتين'] },
      { title: 'المشاريع الصغيرة', emoji: '🏪', risk: 'متوسط-عالي', desc: 'استثمار مباشر في نشاط تجاري. العائد قد يكون كبيراً لكنه يحتاج وقتاً وجهداً وإدارة. من أفضل الاستثمارات إذا كان في مجال تتقنه.', examples: ['متجر إلكتروني', 'مطعم أو كافيه', 'خدمات رقمية', 'تجارة العملات', 'الفرنشايز'] },
      { title: 'التعليم والمهارات', emoji: '📚', risk: 'منخفض جداً', desc: 'أفضل استثمار وأعلى عائد على المدى الطويل. تطوير مهاراتك يرفع دخلك ويفتح أبواباً جديدة لا تُغلق.', examples: ['دورات مهنية معتمدة', 'تعلم البرمجة', 'اللغات الأجنبية', 'إدارة الأعمال', 'التسويق الرقمي'] },
      { title: 'العملات الرقمية', emoji: '💎', risk: 'عالي جداً', desc: 'أصول رقمية عالية التذبذب. قد تحقق مكاسب كبيرة أو خسائر فادحة. لا تستثمر فيها إلا ما تقبل خسارته كاملاً.', examples: ['بيتكوين BTC', 'إيثريوم ETH', 'صناديق مرتبطة بالعملات', 'BNB', 'Solana'] },
    ]
  },
  en: {
    back: 'Back to home',
    title: 'Investment Types',
    intro: 'Investing means using money or time in an asset or skill to achieve future growth. It is always best to diversify risks and avoid putting everything in one option.',
    tipsTitle: 'Important tips',
    tips: [
      'Start small and learn before increasing the amount.',
      'Diversify across more than one investment type to reduce risk.',
      'Do not invest emergency money or money you need soon.',
      'Compare fees and risks before choosing.',
      'Long-term investing is safer than short-term speculation.',
    ],
    items: [
      { title: 'Stocks', emoji: '📈', risk: 'High', desc: 'Buying a share in a listed company. You may profit from price growth or dividends. Best for patient long-term investors.', examples: ['Bank stocks', 'Telecom stocks', 'Energy stocks', 'Blue-chip companies', 'Industrial stocks'] },
      { title: 'Investment Funds', emoji: '🏦', risk: 'Medium', desc: 'A portfolio managed by specialists combining money from multiple investors. Provides automatic diversification and reduced risk.', examples: ['Equity funds', 'Fixed income funds', 'Balanced funds', 'Index funds', 'Growth funds'] },
      { title: 'Sukuk & Bonds', emoji: '📋', risk: 'Low', desc: 'Fixed or semi-fixed income instruments giving regular periodic returns with lower risk than stocks. Ideal for steady income seekers.', examples: ['Government sukuk', 'Corporate sukuk', 'Short-term bonds', 'Islamic sukuk'] },
      { title: 'Real Estate', emoji: '🏠', risk: 'Medium', desc: 'Buying property to benefit from monthly rent or value appreciation over time. One of the most stable investments in the Gulf.', examples: ['Rental apartment', 'Land', 'Commercial shop', 'REITs', 'Residential complex'] },
      { title: 'Gold & Metals', emoji: '🥇', risk: 'Low-Medium', desc: 'Assets used to protect against inflation and diversify your portfolio. Gold preserves value over time and serves as a safe haven in crises.', examples: ['24K gold', 'Gold bullion', 'Gold ETF funds', 'Silver', 'Platinum'] },
      { title: 'Small Businesses', emoji: '🏪', risk: 'Medium-High', desc: 'Direct investment in a business activity. Returns can be significant but require time, effort, and management. Best if in a field you master.', examples: ['Online store', 'Restaurant or cafe', 'Digital services', 'Franchise', 'Currency trading'] },
      { title: 'Education & Skills', emoji: '📚', risk: 'Very Low', desc: 'The best investment with the highest long-term return. Developing your skills raises your income and opens doors that never close.', examples: ['Certified professional courses', 'Programming', 'Foreign languages', 'Business management', 'Digital marketing'] },
      { title: 'Digital Assets', emoji: '💎', risk: 'Very High', desc: 'Highly volatile digital assets. May generate large gains or severe losses. Only invest what you can afford to lose entirely.', examples: ['Bitcoin BTC', 'Ethereum ETH', 'Crypto-linked funds', 'BNB', 'Solana'] },
    ]
  },
  fr: {
    back: "Retour à l'accueil",
    title: "Types d'investissement",
    intro: "Investir signifie utiliser de l'argent ou du temps dans un actif ou une compétence pour obtenir une croissance future. Il vaut toujours mieux diversifier les risques.",
    tipsTitle: 'Conseils importants',
    tips: [
      "Commencez petit et apprenez avant d'augmenter.",
      "Diversifiez entre plusieurs types d'investissement.",
      "N'investissez pas votre fonds d'urgence.",
      "Comparez les frais et les risques avant de choisir.",
      "L'investissement à long terme est plus sûr que la spéculation.",
    ],
    items: [
      { title: 'Actions', emoji: '📈', risk: 'Élevé', desc: "Acheter une part d'une entreprise cotée. Profit possible via hausse du prix ou dividendes. Idéal pour les investisseurs patients à long terme.", examples: ['Banques', 'Télécoms', 'Énergie', 'Grandes sociétés', 'Industrie'] },
      { title: "Fonds d'investissement", emoji: '🏦', risk: 'Moyen', desc: "Portefeuille géré par des spécialistes regroupant l'argent de plusieurs investisseurs. Offre une diversification automatique.", examples: ['Fonds actions', 'Fonds revenus fixes', 'Fonds équilibrés', 'Fonds indiciels', 'Fonds croissance'] },
      { title: 'Sukuk et obligations', emoji: '📋', risk: 'Faible', desc: "Instruments de revenu fixe ou semi-fixe donnant des rendements périodiques réguliers avec moins de risque que les actions.", examples: ['Sukuk publics', 'Sukuk sociétés', 'Obligations courtes', 'Sukuk islamiques'] },
      { title: 'Immobilier', emoji: '🏠', risk: 'Moyen', desc: "Acheter un bien pour le loyer mensuel ou la valorisation. Un des investissements les plus stables dans le Golfe.", examples: ['Appartement locatif', 'Terrain', 'Local commercial', 'Fonds immobiliers', 'Complexe résidentiel'] },
      { title: 'Or et métaux', emoji: '🥇', risk: 'Faible-Moyen', desc: "Actifs utilisés pour protéger contre l'inflation et diversifier le portefeuille. L'or préserve sa valeur dans le temps.", examples: ['Or 24K', 'Lingots d\'or', 'Fonds or ETF', 'Argent', 'Platine'] },
      { title: 'Petites entreprises', emoji: '🏪', risk: 'Moyen-Élevé', desc: "Investissement direct dans une activité. Les rendements peuvent être importants mais nécessitent temps et gestion.", examples: ['Boutique en ligne', 'Restaurant', 'Services numériques', 'Franchise', 'Commerce'] },
      { title: 'Éducation et compétences', emoji: '📚', risk: 'Très faible', desc: "Le meilleur investissement avec le rendement le plus élevé à long terme. Développer ses compétences augmente ses revenus.", examples: ['Formations certifiées', 'Programmation', 'Langues étrangères', 'Gestion', 'Marketing digital'] },
      { title: 'Actifs numériques', emoji: '💎', risk: 'Très élevé', desc: "Actifs numériques très volatils. Peuvent générer de grands gains ou de lourdes pertes. N'investissez que ce que vous pouvez perdre.", examples: ['Bitcoin BTC', 'Ethereum ETH', 'Fonds crypto', 'BNB', 'Solana'] },
    ]
  }
};

const riskColor: Record<string, string> = {
  'منخفض جداً': '#2d8a4e', 'Very Low': '#2d8a4e', 'Très faible': '#2d8a4e',
  'منخفض': '#4a9e6b', 'Low': '#4a9e6b', 'Faible': '#4a9e6b',
  'منخفض-متوسط': '#7a8a2e', 'Low-Medium': '#7a8a2e', 'Faible-Moyen': '#7a8a2e',
  'متوسط': '#c4a35a', 'Medium': '#c4a35a', 'Moyen': '#c4a35a',
  'متوسط-عالي': '#b87333', 'Medium-High': '#b87333', 'Moyen-Élevé': '#b87333',
  'عالي': '#c0622e', 'High': '#c0622e', 'Élevé': '#c0622e',
  'عالي جداً': '#c0392b', 'Very High': '#c0392b', 'Très élevé': '#c0392b',
};

export default function InvestmentEducationPage() {
  const [language, setLanguage] = useState<Language>('ar');
  const t = content[language];
  const isArabic = language === 'ar';

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen px-4 py-8" style={{background: 'linear-gradient(135deg, #fffdf5 0%, #fef9e7 50%, #fdf5d0 100%)'}}>
      <div className="mx-auto max-w-5xl space-y-4">
        <WisdomTicker language={language} onLanguageChange={setLanguage} showLanguageSelector={false} />

        {/* Header */}
        <div className="rounded-3xl p-6 shadow-xl" style={{background: '#7f5c48', boxShadow: '0 4px 24px rgba(127,92,72,0.35), 0 8px 40px rgba(127,92,72,0.15)'}}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="text-sm hover:opacity-80 transition-opacity" style={{color: '#f0d080'}}>{t.back}</Link>
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger className="w-[150px] text-white [&>span]:text-white" style={{borderColor: 'rgba(240,208,128,0.3)', background: 'rgba(240,208,128,0.1)'}}>
                <Languages className="h-4 w-4 me-2" style={{color: '#f0d080'}} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <h1 className="mt-4 text-4xl font-bold" style={{color: '#f0d080'}}>{t.title}</h1>
          <p className="mt-3 max-w-3xl text-white/75">{t.intro}</p>
        </div>

        {/* Risk Legend */}
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            { label: isArabic ? 'مخاطرة منخفضة' : 'Low risk', color: '#4a9e6b' },
            { label: isArabic ? 'مخاطرة متوسطة' : 'Medium risk', color: '#c4a35a' },
            { label: isArabic ? 'مخاطرة عالية' : 'High risk', color: '#c0392b' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium" style={{background: `${item.color}18`, border: `1px solid ${item.color}40`, color: item.color}}>
              <span className="w-2.5 h-2.5 rounded-full" style={{background: item.color}}></span>
              {item.label}
            </div>
          ))}
        </div>

        {/* Investment Cards */}
        <section className="grid gap-4 md:grid-cols-2">
          {t.items.map((item, index) => {
            const color = riskColor[item.risk] || '#c4a35a';
            return (
              <article key={index} className="rounded-2xl p-5" style={{border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(255,253,245,0.98)', boxShadow: '0 2px 12px rgba(196,163,90,0.08)'}}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{item.emoji}</span>
                    <h2 className="text-xl font-bold" style={{color: '#7a5c1a'}}>{item.title}</h2>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full shrink-0" style={{background: `${color}15`, color, border: `1px solid ${color}40`}}>
                    {isArabic ? 'مخاطرة: ' : language === 'fr' ? 'Risque: ' : 'Risk: '}{item.risk}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{color: 'rgba(122,92,26,0.75)'}}>{item.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.examples.map((example, i) => (
                    <span key={i} className="rounded-full px-3 py-1 text-xs font-medium" style={{background: 'rgba(196,163,90,0.12)', color: '#7a5c1a', border: '0.5px solid rgba(196,163,90,0.3)'}}>{example}</span>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        {/* Tips */}
        <div className="rounded-2xl p-5" style={{border: '1px solid rgba(196,163,90,0.3)', background: 'rgba(196,163,90,0.06)'}}>
          <h2 className="text-xl font-bold" style={{color: '#7a5c1a'}}>✦ {t.tipsTitle}</h2>
          <ul className="mt-3 space-y-2 ps-2">
            {t.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{color: 'rgba(122,92,26,0.8)'}}>
                <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{background: 'rgba(196,163,90,0.2)', color: '#c4a35a'}}>{i + 1}</span>
                {tip}
              </li>
            ))}
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
