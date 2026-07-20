'use client';

import Link from 'next/link';
import { ArrowUpRight, CircleAlert, FileText, FolderClock, Landmark, Plus, ShieldCheck, WalletCards } from 'lucide-react';
import { AssetAvatar } from '@/components/asset/AssetAvatar';
import { PlatformIdentity } from '@/components/invest/PlatformIdentity';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { useAuth } from '@/hooks/useAuth';
import { useInvestments } from '@/hooks/useInvestments';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency, formatDateTime } from '@/lib/format';
import {
  INVESTMENT_CENTER_ASSET_CLASSES,
  investmentAnalysisHref,
  investmentCenterAssetClassFor,
  investmentMatchesCenterAssetClass,
  type InvestmentCenterAssetClass,
} from '@/lib/investments/center';
import { useCurrency } from '@/lib/useCurrency';
import type { Investment } from '@/types/investment';
import styles from './InvestmentCenter.module.css';

type Copy = Record<'ar' | 'en' | 'fr', string>;

const COPY: Record<string, Copy> = {
  eyebrow: { ar: 'مركز الملكية والقيمة', en: 'Ownership and value center', fr: 'Centre de propriété et de valeur' },
  title: { ar: 'الاستثمارات', en: 'Investments', fr: 'Investissements' },
  description: { ar: 'عرض موحّد لملكية الأصول وقيمتها ومصادرها دون تكرار تحليلات الذكاء الاصطناعي.', en: 'One portfolio view for asset ownership, value, and sources—without duplicating AI analysis.', fr: 'Une vue portefeuille pour la propriété, la valeur et les sources, sans dupliquer l’analyse IA.' },
  add: { ar: 'إضافة استثمار', en: 'Add investment', fr: 'Ajouter un investissement' },
  manage: { ar: 'إدارة السجلات الحالية', en: 'Manage current records', fr: 'Gérer les enregistrements actuels' },
  migration: { ar: 'مرحلة توافق القراءة القديمة', en: 'Legacy-read compatibility stage', fr: 'Étape de compatibilité en lecture héritée' },
  migrationBody: { ar: 'تُعرض السجلات الأصلية كما هي أثناء التحقق من الاستيراد. لا تُملأ القيم أو التقييمات أو الثقة الناقصة تلقائياً.', en: 'Original records remain visible while the additive import is verified. Missing values, valuations, and confidence are never filled in automatically.', fr: 'Les enregistrements d’origine restent visibles pendant la vérification de l’import additif. Les valeurs, évaluations et niveaux de confiance manquants ne sont jamais complétés automatiquement.' },
  totalValue: { ar: 'إجمالي القيمة الحالية', en: 'Total current value', fr: 'Valeur actuelle totale' },
  totalInvested: { ar: 'رأس المال المستثمر', en: 'Invested capital', fr: 'Capital investi' },
  gainLoss: { ar: 'الربح والخسارة غير المحققة', en: 'Unrealized gain/loss', fr: 'Gain/perte non réalisé(e)' },
  valueCoverage: { ar: 'تغطية التقييم', en: 'Valuation coverage', fr: 'Couverture de valorisation' },
  excluded: { ar: 'مستبعد لعدم توفر تحويل أو قيمة موثقة', en: 'Excluded when conversion or a recorded value is unavailable', fr: 'Exclu lorsqu’une conversion ou une valeur enregistrée est indisponible' },
  unavailable: { ar: 'غير متاح', en: 'Unavailable', fr: 'Indisponible' },
  recordedOnly: { ar: 'القيمة المسجلة فقط', en: 'Recorded values only', fr: 'Valeurs enregistrées uniquement' },
  notCalculated: { ar: 'لا يُحسب حتى التحقق', en: 'Not calculated until verified', fr: 'Non calculé avant vérification' },
  bestWorst: { ar: 'أفضل وأسوأ أداء', en: 'Best and worst performers', fr: 'Meilleures et moins bonnes performances' },
  bestWorstBody: { ar: 'لا يظهر ترتيب أداء حتى تتوفر قيم وتكلفة موثقة بالعملة نفسها.', en: 'Performance ranking stays unavailable until values and cost basis are verified in the same currency.', fr: 'Le classement reste indisponible tant que les valeurs et le coût ne sont pas vérifiés dans la même devise.' },
  currencyExposure: { ar: 'التعرض للعملات', en: 'Currency exposure', fr: 'Exposition aux devises' },
  sourceQuality: { ar: 'جودة المصدر والحداثة', en: 'Source quality and freshness', fr: 'Qualité et fraîcheur des sources' },
  documents: { ar: 'مستندات الملكية', en: 'Ownership documents', fr: 'Documents de propriété' },
  documentsBody: { ar: 'سيُحفظ صك الملكية والعقود والتقارير والبيانات والصور في مساحة خاصة مرتبطة بالمركز، وليست ضمن مستندات عروض الاستثمار.', en: 'Deeds, contracts, reports, statements, and images will live in private position storage—not in Investment Offers documents.', fr: 'Les actes, contrats, rapports, relevés et images seront conservés dans un stockage privé lié à la position, distinct des documents d’Offres d’investissement.' },
  analyze: { ar: 'حلّل هذا الأصل', en: 'Analyze this asset', fr: 'Analyser cet actif' },
  source: { ar: 'مصدر الملكية', en: 'Ownership source', fr: 'Source de propriété' },
  valuation: { ar: 'نوع التقييم', en: 'Valuation type', fr: 'Type d’évaluation' },
  lastUpdated: { ar: 'آخر تحديث', en: 'Last updated', fr: 'Dernière mise à jour' },
  noTimestamp: { ar: 'لا يوجد وقت تقييم مسجل', en: 'No valuation timestamp recorded', fr: 'Aucun horodatage de valorisation enregistré' },
  stale: { ar: 'قديمة', en: 'Stale', fr: 'Ancienne' },
  fresh: { ar: 'مسجلة', en: 'Recorded', fr: 'Enregistrée' },
  manual: { ar: 'تحتاج إلى تقييم يدوي', en: 'Needs manual valuation', fr: 'Nécessite une évaluation manuelle' },
  guest: { ar: 'وضع الضيف', en: 'Guest mode', fr: 'Mode invité' },
  guestBody: { ar: 'لا تظهر بيانات محفظة خاصة. سجّل الدخول لمزامنة سجلاتك الخاصة.', en: 'No private portfolio data is shown. Sign in to access and sync your own records.', fr: 'Aucune donnée de portefeuille privée n’est affichée. Connectez-vous pour accéder à vos propres enregistrements.' },
  signIn: { ar: 'تسجيل الدخول', en: 'Sign in', fr: 'Se connecter' },
  empty: { ar: 'لا توجد استثمارات مسجلة بعد', en: 'No investments recorded yet', fr: 'Aucun investissement enregistré pour le moment' },
  loading: { ar: 'جارٍ تحميل الاستثمارات…', en: 'Loading investments…', fr: 'Chargement des investissements…' },
  error: { ar: 'تعذر تحميل الاستثمارات الحالية.', en: 'Current investments could not be loaded.', fr: 'Les investissements actuels n’ont pas pu être chargés.' },
  overview: { ar: 'نظرة عامة', en: 'Overview', fr: 'Vue d’ensemble' },
  stocks: { ar: 'الأسهم', en: 'Stocks', fr: 'Actions' },
  realEstate: { ar: 'العقارات', en: 'Real Estate', fr: 'Immobilier' },
  goldSilver: { ar: 'الذهب والفضة', en: 'Gold & Silver', fr: 'Or et argent' },
  crypto: { ar: 'العملات الرقمية', en: 'Crypto', fr: 'Crypto' },
  funds: { ar: 'الصناديق', en: 'Funds', fr: 'Fonds' },
  bonds: { ar: 'السندات', en: 'Bonds', fr: 'Obligations' },
  commodities: { ar: 'السلع', en: 'Commodities', fr: 'Matières premières' },
};

const LABEL_KEY_BY_CLASS: Record<InvestmentCenterAssetClass, keyof typeof COPY> = {
  overview: 'overview',
  stocks: 'stocks',
  'real-estate': 'realEstate',
  'gold-silver': 'goldSilver',
  crypto: 'crypto',
  funds: 'funds',
  bonds: 'bonds',
  commodities: 'commodities',
};

function finite(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function currencyOf(investment: Investment) {
  const value = String(investment.userCurrency ?? investment.currency ?? investment.priceCurrency ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(value) ? value : null;
}

function recordedValue(investment: Investment) {
  const amount = finite(investment.convertedMarketValue) ?? finite(investment.currentValue) ?? finite(investment.currentMarketValue);
  const currency = currencyOf(investment);
  return amount === null || !currency ? null : { amount, currency };
}

function recordedBaseValue(investment: Investment, baseCurrency: string) {
  const normalizedBase = baseCurrency.toUpperCase();
  const explicitConverted = finite(investment.convertedMarketValue);
  const fxState = String(investment.fxSource ?? '').toLowerCase();
  if (String(investment.userCurrency ?? '').toUpperCase() === normalizedBase && explicitConverted !== null && !/(stale|unavailable|failed)/.test(fxState)) {
    return explicitConverted;
  }
  const direct = recordedValue(investment);
  return direct?.currency === normalizedBase ? direct.amount : null;
}

function recordedBaseCost(investment: Investment, baseCurrency: string) {
  const amount = finite(investment.purchaseTotal);
  return amount !== null && String(investment.currency ?? '').toUpperCase() === baseCurrency.toUpperCase() ? amount : null;
}

function valuationTimestamp(investment: Investment) {
  return investment.valuationLastUpdatedAt ?? investment.lastPriceUpdatedAt ?? null;
}

function freshness(investment: Investment) {
  const value = valuationTimestamp(investment);
  if (!value || !Number.isFinite(Date.parse(value))) return 'missing' as const;
  return Date.now() - Date.parse(value) > 7 * 24 * 60 * 60 * 1000 ? 'stale' as const : 'recorded' as const;
}

function classHref(assetClass: InvestmentCenterAssetClass) {
  return assetClass === 'overview' ? '/investments' : `/investments/${assetClass}`;
}

export function InvestmentCenter({ assetClass = 'overview' }: { assetClass?: InvestmentCenterAssetClass }) {
  const { lang, dir } = useLanguage();
  const { currency } = useCurrency();
  const { user, isGuest } = useAuth();
  const { items, isLoading, error } = useInvestments();
  const text = (key: keyof typeof COPY) => COPY[key][lang === 'en' || lang === 'fr' ? lang : 'ar'];
  const filtered = assetClass === 'overview' ? items : items.filter(item => investmentMatchesCenterAssetClass(item, assetClass));
  const baseValues = items.map(item => recordedBaseValue(item, currency));
  const baseCosts = items.map(item => recordedBaseCost(item, currency));
  const totalValue = baseValues.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const totalCost = baseCosts.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const valueCoverage = baseValues.filter((value): value is number => value !== null).length;
  const costCoverage = baseCosts.filter((value): value is number => value !== null).length;
  const exposure = items.reduce<Map<string, { amount: number; count: number }>>((groups, item) => {
    const value = recordedValue(item);
    if (!value) return groups;
    const current = groups.get(value.currency) ?? { amount: 0, count: 0 };
    groups.set(value.currency, { amount: current.amount + value.amount, count: current.count + 1 });
    return groups;
  }, new Map());
  const staleCount = items.filter(item => freshness(item) === 'stale').length;
  const missingValuationCount = items.filter(item => !recordedValue(item)).length;

  return (
    <div className={styles.shell} dir={dir}>
      <DashboardPageShell ariaLabel={text('title')} className={styles.main} contentClassName={styles.content}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{text('eyebrow')}</p>
            <h1>{text('title')}</h1>
            <p>{text('description')}</p>
          </div>
          <div className={styles.actions}>
            <Link href="/invest" className={styles.secondaryAction}><WalletCards size={16} aria-hidden="true" />{text('manage')}</Link>
            <Link href="/invest" className={styles.primaryAction}><Plus size={16} aria-hidden="true" />{text('add')}</Link>
          </div>
        </header>

        <nav className={styles.desktopNav} aria-label={text('title')}>
          {INVESTMENT_CENTER_ASSET_CLASSES.map(entry => (
            <Link key={entry} href={classHref(entry)} aria-current={assetClass === entry ? 'page' : undefined}>
              {text(LABEL_KEY_BY_CLASS[entry])}
            </Link>
          ))}
        </nav>
        <details className={styles.mobileNav}>
          <summary>{text(LABEL_KEY_BY_CLASS[assetClass])}</summary>
          <nav aria-label={text('title')}>
            {INVESTMENT_CENTER_ASSET_CLASSES.map(entry => <Link key={entry} href={classHref(entry)}>{text(LABEL_KEY_BY_CLASS[entry])}</Link>)}
          </nav>
        </details>

        {isGuest || !user ? (
          <section className={styles.guestGate}>
            <div><ShieldCheck size={18} aria-hidden="true" /><strong>{text('guest')}</strong><p>{text('guestBody')}</p></div>
            <Link href="/login?next=%2Finvestments">{text('signIn')}</Link>
          </section>
        ) : null}

        <section className={styles.migrationNotice} aria-label={text('migration')}>
          <FolderClock size={18} aria-hidden="true" />
          <div><strong>{text('migration')}</strong><p>{text('migrationBody')}</p></div>
        </section>

        {isLoading ? <section className={styles.state}>{text('loading')}</section> : error ? <section className={styles.state} role="alert">{text('error')}</section> : (
          <>
            <section className={styles.summaryGrid} aria-label={text('overview')}>
              <Metric label={text('totalValue')} value={valueCoverage ? formatCurrency(totalValue, currency, lang) : text('unavailable')} detail={`${valueCoverage}/${items.length} · ${text('excluded')}`} />
              <Metric label={text('totalInvested')} value={costCoverage ? formatCurrency(totalCost, currency, lang) : text('unavailable')} detail={`${costCoverage}/${items.length} · ${text('recordedOnly')}`} />
              <Metric label={text('gainLoss')} value={text('unavailable')} detail={text('notCalculated')} />
              <Metric label={text('valueCoverage')} value={`${valueCoverage}/${items.length}`} detail={text('recordedOnly')} />
            </section>

            {assetClass === 'overview' ? (
              <div className={styles.infoGrid}>
                <section className={styles.infoCard}>
                  <h2>{text('currencyExposure')}</h2>
                  {exposure.size ? <ul>{[...exposure.entries()].map(([code, value]) => <li key={code}><span dir="ltr">{code}</span><strong dir="ltr">{formatCurrency(value.amount, code, lang)}</strong><small>{value.count}</small></li>)}</ul> : <p>{text('unavailable')}</p>}
                </section>
                <section className={styles.infoCard}>
                  <h2>{text('sourceQuality')}</h2>
                  <p>{staleCount ? `${staleCount} · ${text('stale')}` : text('fresh')}</p>
                  <p>{missingValuationCount ? `${missingValuationCount} · ${text('manual')}` : text('recordedOnly')}</p>
                </section>
                <section className={styles.infoCard}>
                  <h2>{text('bestWorst')}</h2>
                  <p>{text('bestWorstBody')}</p>
                </section>
                <section className={styles.infoCard}>
                  <FileText size={18} aria-hidden="true" /><h2>{text('documents')}</h2><p>{text('documentsBody')}</p>
                </section>
              </div>
            ) : null}

            <section className={styles.holdings} aria-label={text(LABEL_KEY_BY_CLASS[assetClass])}>
              <div className={styles.sectionHead}><div><p>{text('recordedOnly')}</p><h2>{text(LABEL_KEY_BY_CLASS[assetClass])}</h2></div><span>{filtered.length}</span></div>
              {filtered.length ? <div className={styles.cards}>{filtered.map(investment => <InvestmentCard key={investment.id} investment={investment} lang={lang} copy={text} />)}</div> : <div className={styles.empty}>{text('empty')}</div>}
            </section>
          </>
        )}
      </DashboardPageShell>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className={styles.metric}><span>{label}</span><strong dir="ltr">{value}</strong><small>{detail}</small></article>;
}

function InvestmentCard({ investment, lang, copy }: { investment: Investment; lang: 'ar' | 'en' | 'fr'; copy: (key: keyof typeof COPY) => string }) {
  const value = recordedValue(investment);
  const updated = valuationTimestamp(investment);
  const assetType = investmentCenterAssetClassFor(investment.assetType ?? investment.type);
  const sourceName = investment.purchasePlatformName?.trim();
  const state = freshness(investment);
  const valuation = investment.valuationSource?.trim() || investment.dataSource?.trim();
  return (
    <article className={styles.card}>
      <div className={styles.cardIdentity}>
        <AssetAvatar
          symbol={investment.symbol}
          providerSymbol={investment.providerSymbol}
          name={investment.name}
          assetType={investment.assetType ?? investment.type}
          market={investment.market}
          size="md"
        />
        <div><h3>{investment.name || '—'}</h3><p>{copy(LABEL_KEY_BY_CLASS[assetType])}{investment.symbol ? ` · ${investment.symbol}` : ''}</p></div>
      </div>
      <div className={styles.cardValue}>
        <span>{copy('totalValue')}</span>
        <strong dir="ltr">{value ? formatCurrency(value.amount, value.currency, lang) : copy('unavailable')}</strong>
      </div>
      <dl className={styles.facts}>
        <div><dt>{copy('valuation')}</dt><dd>{valuation || copy('unavailable')}</dd></div>
        <div><dt>{copy('lastUpdated')}</dt><dd className={state === 'stale' ? styles.stale : ''}>{updated ? formatDateTime(updated, lang) : copy('noTimestamp')}</dd></div>
        <div><dt>{copy('source')}</dt><dd>{sourceName ? <PlatformIdentity name={sourceName} /> : copy('unavailable')}</dd></div>
      </dl>
      {!value ? <p className={styles.manual}><CircleAlert size={15} aria-hidden="true" />{copy('manual')}</p> : null}
      <Link className={styles.analyze} href={investmentAnalysisHref(investment)}><ArrowUpRight size={16} aria-hidden="true" />{copy('analyze')}</Link>
    </article>
  );
}
