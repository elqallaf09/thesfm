'use client';

import Link from 'next/link';
import { Archive, BrainCircuit, ChartNoAxesCombined, Landmark, LineChart, Sparkles } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

const COPY = {
  ar: {
    badge: 'ذكاء SFM الاقتصادي',
    title: 'مركز القيادة الاقتصادية',
    description: 'مساحة موحدة للتوأم المالي، والأولويات اليومية، والتعارضات بين المساحات، والقرارات، والأسواق، وتمويل الأعمال، والنتائج المرصودة.',
    aria: 'إجراءات الذكاء الاقتصادي السريعة',
    advisors: 'المستشارون العشرة',
    decisionLab: 'مختبر القرارات',
    marketIntelligence: 'ذكاء الأسواق',
    business: 'الأعمال',
    briefArchive: 'أرشيف الموجز',
    intelligenceEvents: 'أحداث الذكاء',
  },
  en: {
    badge: 'SFM Economic Intelligence',
    title: 'Economic Command Center',
    description: 'One workspace for your financial twin, daily priorities, cross-workspace conflicts, decisions, markets, business funding, and observed outcomes.',
    aria: 'Economic Intelligence quick actions',
    advisors: 'Ten advisors',
    decisionLab: 'Decision Lab',
    marketIntelligence: 'Market Intelligence',
    business: 'Business',
    briefArchive: 'Brief Archive',
    intelligenceEvents: 'Intelligence Events',
  },
  fr: {
    badge: 'Intelligence économique SFM',
    title: 'Centre de commandement économique',
    description: 'Un espace unifié pour votre jumeau financier, les priorités quotidiennes, les conflits entre espaces, les décisions, les marchés, le financement des entreprises et les résultats observés.',
    aria: 'Actions rapides de l’intelligence économique',
    advisors: 'Dix conseillers',
    decisionLab: 'Laboratoire de décision',
    marketIntelligence: 'Intelligence des marchés',
    business: 'Entreprise',
    briefArchive: 'Archive du brief',
    intelligenceEvents: 'Événements d’intelligence',
  },
} as const;

export function EconomicCommandHero() {
  const { lang, dir } = useLanguage();
  const locale = lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : 'ar';
  const text = COPY[locale];

  return (
    <section className="command-hero" dir={dir}>
      <div>
        <span><BrainCircuit size={16} />{text.badge}</span>
        <h1>{text.title}</h1>
        <p>{text.description}</p>
      </div>
      <nav aria-label={text.aria}>
        <Link href="/economic-intelligence/advisors"><BrainCircuit size={16} />{text.advisors}</Link>
        <Link href="/decisions/simulator"><Landmark size={16} />{text.decisionLab}</Link>
        <Link href="/ai-analyst"><LineChart size={16} />{text.marketIntelligence}</Link>
        <Link href="/business-hub"><ChartNoAxesCombined size={16} />{text.business}</Link>
        <Link href="/economic-intelligence/history"><Archive size={16} />{text.briefArchive}</Link>
        <Link href="/notifications"><Sparkles size={16} />{text.intelligenceEvents}</Link>
      </nav>
    </section>
  );
}
