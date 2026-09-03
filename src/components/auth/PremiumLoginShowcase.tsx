import Image from 'next/image';
import { BarChart3, BrainCircuit, Headphones, ShieldCheck, Target } from 'lucide-react';
import type { Lang } from '@/lib/translations';

const COPY = {
  ar: {
    descriptor: 'المدير المالي الذكي',
    headline: 'المدير المالي الذكي',
    body: 'تحكّم في دخلك ومصروفاتك وأهدافك واستثماراتك برؤية واضحة وقرارات أذكى.',
    preview: 'معاينة توضيحية للمنتج',
    overview: 'نظرة عامة على الأداء',
    allocation: 'توزيع المحفظة',
    total: 'إجمالي الأصول',
    investments: 'أداء الاستثمارات',
    growth: 'معدل النمو',
    benefits: [
      ['أمان متقدم', 'أدوات واضحة لإدارة حسابك'],
      ['أهداف ذكية', 'تخطيط واضح وتقدم قابل للقياس'],
      ['رؤى وتقارير', 'تحليلات تساعدك على القرار'],
      ['دعم مخصص', 'تجربة مساعدة عند الحاجة'],
    ],
  },
  en: {
    descriptor: 'Smart Financial Manager',
    headline: 'Smart Financial Manager',
    body: 'Bring income, expenses, goals, and investments together for clearer insight and smarter decisions.',
    preview: 'Illustrative product preview',
    overview: 'Performance overview',
    allocation: 'Portfolio allocation',
    total: 'Total assets',
    investments: 'Investment performance',
    growth: 'Growth rate',
    benefits: [
      ['Advanced security', 'Clear tools for managing your account'],
      ['Smart goals', 'Clear planning and measurable progress'],
      ['Insights and reports', 'Analysis that supports decisions'],
      ['Dedicated support', 'Help when you need it'],
    ],
  },
  fr: {
    descriptor: 'Gestionnaire financier intelligent',
    headline: 'Gestionnaire financier intelligent',
    body: 'Réunissez revenus, dépenses, objectifs et investissements pour des décisions plus claires et plus intelligentes.',
    preview: 'Aperçu illustratif du produit',
    overview: 'Vue d’ensemble des performances',
    allocation: 'Répartition du portefeuille',
    total: 'Total des actifs',
    investments: 'Performance des investissements',
    growth: 'Taux de croissance',
    benefits: [
      ['Sécurité avancée', 'Des outils clairs pour gérer votre compte'],
      ['Objectifs intelligents', 'Planification claire et progrès mesurable'],
      ['Analyses et rapports', 'Des données utiles à la décision'],
      ['Assistance dédiée', 'Une aide disponible au bon moment'],
    ],
  },
} as const;

const BENEFIT_ICONS = [ShieldCheck, Target, BrainCircuit, Headphones] as const;

export function PremiumLoginShowcase({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  return (
    <aside className="login-showcase" aria-label={copy.preview}>
      <div className="showcase-brand">
        <Image src="/brand/sfm-original-logo.png" alt="" width={72} height={72} priority />
        <div><strong>THE SFM</strong><span>{copy.descriptor}</span></div>
      </div>

      <div className="showcase-copy">
        <h2>{copy.headline}</h2>
        <p>{copy.body}</p>
        <span className="preview-label">{copy.preview}</span>
      </div>

      <div className="showcase-dashboard" aria-hidden="true">
        <section className="preview-chart-card">
          <div className="preview-card-heading"><strong>{copy.overview}</strong><span>+24%</span></div>
          <svg viewBox="0 0 560 170" role="img">
            <defs><linearGradient id="sfmChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--auth-chart-accent)" stopOpacity=".52"/><stop offset="1" stopColor="var(--auth-chart-fade)" stopOpacity="0"/></linearGradient></defs>
            <path className="chart-grid" d="M0 35H560M0 80H560M0 125H560" />
            <path className="chart-fill" d="M0 145 C48 128 72 100 112 112 S176 122 213 87 S275 55 316 72 S379 98 420 48 S505 62 560 18 V170 H0Z" />
            <path className="chart-line" d="M0 145 C48 128 72 100 112 112 S176 122 213 87 S275 55 316 72 S379 98 420 48 S505 62 560 18" />
          </svg>
        </section>

        <section className="allocation-card">
          <div className="allocation-ring"><span>68%</span></div>
          <div><strong>{copy.allocation}</strong><span>68 · 22 · 10</span></div>
        </section>

        <div className="preview-metrics">
          <article><span><BarChart3 size={18} />{copy.total}</span><strong>24,850</strong><small>+12.5%</small></article>
          <article><span><BarChart3 size={18} />{copy.investments}</span><strong>8,950</strong><small>+8.4%</small></article>
          <article><span><BarChart3 size={18} />{copy.growth}</span><strong>15,900</strong><small>+18.7%</small></article>
        </div>
      </div>

      <div className="showcase-benefits">
        {copy.benefits.map(([title, body], index) => {
          const Icon = BENEFIT_ICONS[index];
          return <article key={title}><Icon size={24} /><div><strong>{title}</strong><span>{body}</span></div></article>;
        })}
      </div>
    </aside>
  );
}
