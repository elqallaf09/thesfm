'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Language = 'ar' | 'en' | 'fr';

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
      'استخدم قاعدة 50/30/20: 50% للضرورة، 30% للرغبات، 20% للادخار.'
    ],
    categories: [
      { title: 'الضرورة', desc: 'مصاريف لا غنى عنها للحياة اليومية.' },
      { title: 'الرغبات', desc: 'مصاريف تضيف راحة ومتعة لكنها ليست ضرورية.' },
      { title: 'الادخار والاستثمار', desc: 'مصاريف موجهة لبناء الثروة والمستقبل.' }
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
      { title: 'الديون', desc: 'تسديد القروض وبطاقات الائتمان.', examples: ['قسط سيارة', 'قسط منزل', 'سحب بطاقة ائتمان'] }
    ]
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
      'Use the 50/30/20 rule: 50% for needs, 30% for wants, 20% for savings.'
    ],
    categories: [
      { title: 'Needs', desc: 'Essential expenses for daily life.' },
      { title: 'Wants', desc: 'Expenses that add comfort and pleasure but are not essential.' },
      { title: 'Savings and investment', desc: 'Expenses directed toward building wealth and the future.' }
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
      { title: 'Debts', desc: 'Repaying loans and credit cards.', examples: ['Car installment', 'Home installment', 'Credit card draw'] }
    ]
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
      "Utilisez la règle 50/30/20: 50% pour les besoins, 30% pour les envies, 20% pour l'épargne."
    ],
    categories: [
      { title: 'Besoins', desc: 'Dépenses essentielles pour la vie quotidienne.' },
      { title: 'Envies', desc: 'Dépenses qui ajoutent du confort mais ne sont pas essentielles.' },
      { title: 'Épargne et investissement', desc: 'Dépenses dirigées vers la construction de patrimoine.' }
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
      { title: 'Dettes', desc: 'Remboursement de prêts et cartes de crédit.', examples: ['Mensualité voiture', 'Mensualité maison', 'Retrait carte crédit'] }
    ]
  }
};

export default function ExpensesEducationPage() {
  const [language, setLanguage] = useState<Language>('ar');
  const t = content[language];
  const isArabic = language === 'ar';

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl bg-purple-950 p-6 text-white shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="text-sm text-purple-100 hover:text-white">{t.back}</Link>
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger className="w-[150px] border-white/20 bg-white/10 text-white [&>span]:text-white">
                <Languages className="h-4 w-4 me-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <h1 className="mt-4 text-4xl font-bold">{t.title}</h1>
          <p className="mt-3 max-w-3xl text-purple-100">{t.intro}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {t.categories.map((cat, i) => (
            <div key={i} className="rounded-2xl bg-white p-4 text-center shadow-sm border border-purple-100">
              <h3 className="text-xl font-bold text-purple-900">{cat.title}</h3>
              <p className="mt-2 text-slate-600">{cat.desc}</p>
            </div>
          ))}
        </div>
        <section className="grid gap-4 md:grid-cols-2">
          {t.items.map((item, index) => (
            <article key={index} className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-purple-900">{item.title}</h2>
              <p className="mt-2 text-slate-700">{item.desc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.examples.map((example, i) => (
                  <span key={i} className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-800">{example}</span>
                ))}
              </div>
            </article>
          ))}
        </section>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <h2 className="text-xl font-bold">{t.tipsTitle}</h2>
          <ul className="mt-3 list-disc space-y-2 ps-6">
            {t.tips.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </div>
      </div>
    </main>
  );
}
