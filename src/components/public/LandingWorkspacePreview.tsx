'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Layers3, TrendingUp, Wallet } from 'lucide-react';
import styles from './PublicLandingPage.module.css';

type Lang = 'ar' | 'en' | 'fr';
const WORKSPACES = [
  {
    icon: Wallet,
    title: { ar: 'المال الشخصي', en: 'Personal finance', fr: 'Finances' },
    heading: { ar: 'كل تفاصيل أموالك، أمامك.', en: 'Your finances, in focus.', fr: 'Vos finances, en perspective.' },
    description: { ar: 'نظّم اليوم وخطّط لما تريد تحقيقه غدًا.', en: 'Organize today. Plan for what comes next.', fr: 'Organisez le présent. Préparez la suite.' },
    items: [
      { href: '/income', ar: 'الدخل والمصروفات', en: 'Income & expenses', fr: 'Revenus et dépenses' },
      { href: '/savings', ar: 'المدخرات والأهداف', en: 'Savings & goals', fr: 'Épargne et objectifs' },
      { href: '/zakat-calculator', ar: 'الزكاة والحاسبات', en: 'Zakat & calculators', fr: 'Zakat et calculateurs' },
    ],
  },
  {
    icon: TrendingUp,
    title: { ar: 'الأسواق', en: 'Markets', fr: 'Marchés' },
    heading: { ar: 'تابع الأسواق بصورة أوضح.', en: 'A clearer view of the markets.', fr: 'Une vision claire des marchés.' },
    description: { ar: 'أسهم وأخبار وتحليلات مرتبطة بالأدلة المتاحة.', en: 'Stocks, news and analysis grounded in available evidence.', fr: 'Actions, actualités et analyses fondées sur les données disponibles.' },
    items: [
      { href: '/global-markets', ar: 'الأسواق العالمية', en: 'Global markets', fr: 'Marchés mondiaux' },
      { href: '/watchlist', ar: 'قائمة المتابعة', en: 'Your watchlist', fr: 'Liste de suivi' },
      { href: '/ai-analyst/analyze', ar: 'المحلل الذكي', en: 'Smart analyst', fr: 'Analyse intelligente' },
    ],
  },
  {
    icon: BriefcaseBusiness,
    title: { ar: 'الأعمال', en: 'Business', fr: 'Entreprises' },
    heading: { ar: 'من الفكرة إلى إدارة مشروعك.', en: 'From an idea to your business.', fr: 'De l’idée à votre entreprise.' },
    description: { ar: 'اجمع التخطيط والعمليات والتقارير في مساحة واحدة.', en: 'Bring planning, operations and reporting together.', fr: 'Réunissez planification, opérations et rapports.' },
    items: [
      { href: '/business-hub', ar: 'مركز الأعمال', en: 'Business hub', fr: 'Espace entreprise' },
      { href: '/projects', ar: 'المشاريع', en: 'Projects', fr: 'Projets' },
      { href: '/reports-center', ar: 'التقارير والمستندات', en: 'Reports & documents', fr: 'Rapports et documents' },
    ],
  },
] as const;

const COPY = {
  ar: { label: 'استكشف مساحات المنصة', account: 'حساب واحد. ثلاث مساحات.', preview: 'معاينة الأدوات', note: 'أضف بياناتك بعد التسجيل لتبدأ متابعتها هنا.' },
  en: { label: 'Explore the workspaces', account: 'One account. Three workspaces.', preview: 'Explore the tools', note: 'Add your data after signing up to start tracking it here.' },
  fr: { label: 'Explorer les espaces', account: 'Un compte. Trois espaces.', preview: 'Découvrez les outils', note: 'Ajoutez vos données après votre inscription pour les suivre ici.' },
};

export function LandingWorkspacePreview({ lang }: { lang: Lang }) {
  const [selected, setSelected] = useState(0);
  const workspace = WORKSPACES[selected];
  const Icon = workspace.icon;
  const copy = COPY[lang];
  return <aside className={styles.preview} aria-label={copy.label}>
    <div className={styles.previewBar}><span dir="ltr">THE SFM <span className={styles.previewWordmark}>/</span></span><span className={styles.previewLabel}>{copy.preview}</span><Layers3 size={18} /></div>
    <div className={styles.previewTabs} role="group" aria-label={copy.label}>
      {WORKSPACES.map((item, index) => <button type="button" key={index} aria-pressed={selected === index} aria-controls="landing-workspace-preview" onClick={() => setSelected(index)}><item.icon size={17} /><span>{item.title[lang]}</span></button>)}
    </div>
    <div className={styles.previewBody} id="landing-workspace-preview" aria-live="polite">
      <span className={styles.previewIcon}><Icon size={28} /></span>
      <h2>{workspace.heading[lang]}</h2><p>{workspace.description[lang]}</p>
      <div className={styles.previewLinks}>{workspace.items.map(item => <Link href={item.href} key={item.href} prefetch={false}><span>{item[lang]}</span><ArrowLeft size={17} className={styles.directionArrow} /></Link>)}</div>
      <p className={styles.previewNote}>{copy.note}</p>
    </div>
    <div className={styles.previewFooter}><CheckCircle2 size={17} />{copy.account}</div>
  </aside>;
}
