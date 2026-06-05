'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Clock3,
  ExternalLink,
  Filter,
  Gauge,
  Landmark,
  Layers3,
  LineChart,
  Loader2,
  Newspaper,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { MarketTickerStrip } from '@/components/market/MarketTickerStrip';
import { useLanguage } from '@/hooks/useLanguage';
import { marketAnalysisUrl } from '@/lib/data/investmentData';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { StockCategoryMoverItem, StockCategoryMoversResponse } from '@/lib/market/fetchStockCategoryMovers';
import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';
import styles from './BankNewsPage.module.css';

type LangCode = 'ar' | 'en' | 'fr';
type CategoryId =
  | 'all'
  | 'banks'
  | 'investment_banks'
  | 'payments'
  | 'asset_management'
  | 'rates'
  | 'earnings'
  | 'dividends'
  | 'regulations'
  | 'breaking';
type DateFilter = 'all' | 'today' | 'week' | 'month';
type SortMode = 'newest' | 'oldest';
type DashboardTab = 'news' | 'stocks' | 'categories' | 'sources';
type Tone = 'positive' | 'negative' | 'neutral';
type TFunction = (key: string) => string;
type IconType = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

type BankTickerItem = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  delayed: true;
};

type BankTickerResponse =
  | {
    ok: true;
    source: string;
    updated_at: string;
    items: BankTickerItem[];
  }
  | {
    ok: false;
    code?: string;
    source: string | null;
    updated_at: string | null;
    items: BankTickerItem[];
  };

type BankingSnapshotItem = {
  symbol: string;
  displayName: string;
  nameAr: string;
  category: string;
  unit: string;
  value: number | null;
  change: number | null;
  changePercent: number | null;
  lastUpdated: string;
  source: string | null;
  delayed: true;
  available: boolean;
};

type BankingSnapshotResponse =
  | {
    ok: true;
    source: string;
    updated_at: string;
    items: BankingSnapshotItem[];
  }
  | {
    ok: false;
    source: string | null;
    updated_at: string | null;
    items: BankingSnapshotItem[];
    error?: string;
  };

type BankNewsItem = {
  id: string;
  title?: string;
  headline?: string;
  summary?: string;
  titleOriginal?: string;
  summaryOriginal?: string;
  languageOriginal?: string;
  source: string;
  url: string;
  publishedAt: string;
  isTranslated?: boolean;
  translatedTo?: string;
  companyName?: string;
  ticker?: string;
  sector?: string;
  sectors?: string[];
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
  priceSource?: string | null;
  delayed?: true;
  sentiment?: string | null;
  impact?: string | null;
};

type BankNewsResponse =
  | {
    success: true;
    category: 'banking';
    source: string;
    priceSource: string;
    lastUpdated: string;
    language: string;
    translationEnabled: boolean;
    prices: TechStockPrice[];
    items: BankNewsItem[];
    limit: number;
    message?: string;
  }
  | {
    success: false;
    error?: string;
    reason?: string;
  };

type SummaryMetric = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
  icon: IconType;
};

type CategoryConfig = {
  id: CategoryId;
  labelKey: string;
  sectors?: string[];
  keywords?: string[];
};

const BANKING_CONFIG = getStockCategoryConfig('banking');
const NEWS_PAGE_SIZE = 9;
const STOCK_PREVIEW_LIMIT = 8;
const AUTO_REFRESH_MS = 5 * 60 * 1000;
const BANK_TICKER_ORDER = ['JPM', 'BAC', 'C', 'WFC', 'GS', 'MS', 'USB', 'PNC', 'SCHW', 'BLK', 'V', 'MA', 'PYPL'];
const BANK_TICKER_SYMBOLS = new Set<string>(BANK_TICKER_ORDER);

const CATEGORY_FILTERS: CategoryConfig[] = [
  { id: 'all', labelKey: 'bank_news_filter_all' },
  {
    id: 'banks',
    labelKey: 'bank_news_filter_banks',
    sectors: ['large_banks', 'regional_banks'],
    keywords: ['bank', 'banks', 'lender', 'loan', 'deposit'],
  },
  {
    id: 'investment_banks',
    labelKey: 'bank_news_filter_investment_banks',
    sectors: ['investment_banks'],
    keywords: ['investment bank', 'capital markets', 'deal', 'ipo', 'trading revenue'],
  },
  {
    id: 'payments',
    labelKey: 'bank_news_filter_payments',
    sectors: ['payments'],
    keywords: ['payment', 'payments', 'card', 'cards', 'transaction', 'visa', 'mastercard'],
  },
  {
    id: 'asset_management',
    labelKey: 'bank_news_filter_asset_management',
    sectors: ['asset_management', 'exchanges_services'],
    keywords: ['asset management', 'wealth management', 'fund flows', 'aum', 'ratings', 'exchange'],
  },
  {
    id: 'rates',
    labelKey: 'bank_news_filter_rates',
    keywords: ['interest rate', 'rates', 'central bank', 'federal reserve', 'fed', 'fomc', 'yield', 'treasury', 'ecb'],
  },
  {
    id: 'earnings',
    labelKey: 'bank_news_filter_earnings',
    keywords: ['earnings', 'results', 'quarter', 'revenue', 'profit', 'guidance', 'net income'],
  },
  {
    id: 'dividends',
    labelKey: 'bank_news_filter_dividends',
    keywords: ['dividend', 'buyback', 'capital return', 'share repurchase', 'payout'],
  },
  {
    id: 'regulations',
    labelKey: 'bank_news_filter_regulations',
    keywords: ['regulation', 'regulator', 'basel', 'capital requirement', 'lawsuit', 'compliance', 'supervision', 'fine'],
  },
  {
    id: 'breaking',
    labelKey: 'bank_news_filter_breaking',
    keywords: ['breaking', 'urgent', 'alert', 'exclusive', 'عاجل'],
  },
];

const DASHBOARD_TABS: Array<{ id: DashboardTab; labelKey: string }> = [
  { id: 'news', labelKey: 'bank_news_tab_news' },
  { id: 'stocks', labelKey: 'bank_news_tab_stocks' },
  { id: 'categories', labelKey: 'bank_news_tab_categories' },
  { id: 'sources', labelKey: 'bank_news_tab_sources' },
];

function localeFor(lang: LangCode) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

function formatMoney(value: number | null | undefined, currency = 'USD', locale = 'ar-KW') {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: value >= 100 ? 2 : 4,
  }).format(value);
}

function formatNumber(value: number | null | undefined, locale = 'ar-KW') {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number | null | undefined, locale = 'ar-KW') {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(value)}%`;
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function relativeTime(value: string | null | undefined, locale: string) {
  if (!value) return '';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (absSeconds < 60) return formatter.format(diffSeconds, 'second');
  if (absSeconds < 3600) return formatter.format(Math.round(diffSeconds / 60), 'minute');
  if (absSeconds < 86400) return formatter.format(Math.round(diffSeconds / 3600), 'hour');
  return formatter.format(Math.round(diffSeconds / 86400), 'day');
}

function formatSnapshotValue(item: BankingSnapshotItem, locale: string) {
  if (!item.available || typeof item.value !== 'number') return '';
  if (item.unit === '%' || item.unit.toLowerCase().includes('percent')) return formatPercent(item.value, locale);
  return formatNumber(item.value, locale);
}

function changeTone(value: number | null | undefined): Tone {
  if (typeof value !== 'number' || value === 0 || Number.isNaN(value)) return 'neutral';
  return value > 0 ? 'positive' : 'negative';
}

function newestTimestamp(values: Array<string | null | undefined>) {
  const timestamps = values
    .map(value => value ? new Date(value).getTime() : NaN)
    .filter(value => Number.isFinite(value));
  if (timestamps.length === 0) return '';
  return new Date(Math.max(...timestamps)).toISOString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [delay, value]);
  return debounced;
}

function displayTitle(item: BankNewsItem) {
  return (item.title || item.headline || item.titleOriginal || '').trim();
}

function displaySummary(item: BankNewsItem) {
  return (item.summary || item.summaryOriginal || '').trim();
}

function textForSearch(item: BankNewsItem) {
  return [
    displayTitle(item),
    displaySummary(item),
    item.source,
    item.companyName,
    item.ticker,
    item.sector,
    ...(item.sectors ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function newsKey(item: BankNewsItem) {
  return [
    displayTitle(item).toLowerCase().replace(/\s+/g, ' '),
    (item.url || '').toLowerCase().trim(),
    (item.source || '').toLowerCase().trim(),
    item.publishedAt || '',
  ].join('|');
}

function dedupeNews(items: BankNewsItem[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = newsKey(item) || item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function itemMatchesSearch(item: BankNewsItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return textForSearch(item).includes(normalized);
}

function itemMatchesCategory(item: BankNewsItem, categoryId: CategoryId) {
  if (categoryId === 'all') return true;
  const config = CATEGORY_FILTERS.find(filter => filter.id === categoryId);
  if (!config) return true;
  const sectors = new Set([item.sector, ...(item.sectors ?? [])].filter(Boolean));
  if (config.sectors?.some(sector => sectors.has(sector))) return true;
  const text = textForSearch(item);
  return Boolean(config.keywords?.some(keyword => text.includes(keyword.toLowerCase())));
}

function itemMatchesSource(item: BankNewsItem, source: string) {
  return source === 'all' || item.source === source;
}

function itemMatchesMarket(item: BankNewsItem, market: string) {
  if (market === 'all') return true;
  const sectors = [item.sector, ...(item.sectors ?? [])].filter(Boolean);
  return sectors.includes(market);
}

function itemMatchesDate(item: BankNewsItem, dateFilter: DateFilter) {
  if (dateFilter === 'all') return true;
  const time = new Date(item.publishedAt).getTime();
  if (!Number.isFinite(time)) return false;
  const now = Date.now();
  const age = now - time;
  if (dateFilter === 'today') return new Date(item.publishedAt).toDateString() === new Date().toDateString();
  if (dateFilter === 'week') return age <= 7 * 24 * 60 * 60 * 1000;
  return age <= 30 * 24 * 60 * 60 * 1000;
}

function getNewsSentiment(item: BankNewsItem): Tone | null {
  const raw = String(item.sentiment || item.impact || '').toLowerCase();
  if (!raw) return null;
  if (raw.includes('positive') || raw.includes('bullish') || raw.includes('إيجابي')) return 'positive';
  if (raw.includes('negative') || raw.includes('bearish') || raw.includes('سلبي')) return 'negative';
  if (raw.includes('neutral') || raw.includes('محايد')) return 'neutral';
  return null;
}

function categoryLabel(item: BankNewsItem, t: TFunction) {
  const match = CATEGORY_FILTERS.find(filter => filter.id !== 'all' && itemMatchesCategory(item, filter.id));
  return t(match?.labelKey ?? 'bank_news_filter_banks');
}

function sectorLabel(sector: string | undefined, t: TFunction) {
  if (!sector) return t('bank_news_not_available');
  const match = CATEGORY_FILTERS.find(filter => filter.sectors?.includes(sector));
  return match ? t(match.labelKey) : sector.replace(/_/g, ' ');
}

function providerStatus(newsError: string, marketError: string, newsItems: BankNewsItem[], tickerItems: BankTickerItem[]) {
  if (newsError && marketError) return 'unavailable';
  if (newsItems.length > 0 || tickerItems.length > 0) return 'available';
  return 'unavailable';
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(value => value?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <span className={`${styles.skeleton} ${className}`} aria-hidden="true" />;
}

function HeaderBadge({ children }: { children: React.ReactNode }) {
  return <span className={styles.headerBadge}>{children}</span>;
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = 'secondary',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button type="button" className={`${styles.actionButton} ${styles[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function NewsSkeleton() {
  return (
    <div className={styles.skeletonPage}>
      <div className={styles.summaryStrip}>
        {Array.from({ length: 6 }).map((_, index) => (
          <article className={styles.summaryCard} key={index}>
            <SkeletonBlock className={styles.skeletonIcon} />
            <SkeletonBlock className={styles.skeletonLine} />
            <SkeletonBlock className={styles.skeletonValue} />
          </article>
        ))}
      </div>
      <div className={styles.contentGrid}>
        <div className={styles.newsGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <article className={styles.newsCard} key={index}>
              <SkeletonBlock className={styles.skeletonBadge} />
              <SkeletonBlock className={styles.skeletonTitleSmall} />
              <SkeletonBlock className={styles.skeletonText} />
              <SkeletonBlock className={styles.skeletonTextShort} />
            </article>
          ))}
        </div>
        <aside className={styles.sidebarPanel}>
          <SkeletonBlock className={styles.skeletonTitleSmall} />
          <SkeletonBlock className={styles.skeletonText} />
          <SkeletonBlock className={styles.skeletonTextShort} />
        </aside>
      </div>
    </div>
  );
}

function PageHeader({
  t,
  lastUpdated,
  locale,
  refreshing,
  onRefresh,
}: {
  t: TFunction;
  lastUpdated: string;
  locale: string;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <div className={styles.badgeRow}>
          <HeaderBadge><ShieldCheck size={14} />{t('bank_news_real_data_badge')}</HeaderBadge>
          <HeaderBadge><Landmark size={14} />{t('bank_news_sector_badge')}</HeaderBadge>
          <HeaderBadge><Clock3 size={14} />{t('bank_news_last_updated')}: {lastUpdated ? formatDateTime(lastUpdated, locale) : t('bank_news_not_available')}</HeaderBadge>
        </div>
        <h1>{t('bank_news_title')}</h1>
        <p>{t('bank_news_subtitle')}</p>
      </div>
      <div className={styles.heroActions}>
        <ActionButton onClick={onRefresh} disabled={refreshing}>
          {refreshing ? <Loader2 size={16} className={styles.spin} /> : <RefreshCcw size={16} />}
          {refreshing ? t('bank_news_refreshing') : t('bank_news_refresh')}
        </ActionButton>
      </div>
    </header>
  );
}

function BankTickerStrip({
  items,
  loading,
  t,
  locale,
}: {
  items: BankTickerItem[];
  loading: boolean;
  t: TFunction;
  locale: string;
}) {
  const orderedItems = BANK_TICKER_ORDER
    .map(symbol => items.find(item => item.symbol === symbol))
    .filter((item): item is BankTickerItem => Boolean(item));
  const extraItems = items.filter(item => !BANK_TICKER_SYMBOLS.has(item.symbol)).slice(0, 6);
  const tickerItems = [...orderedItems, ...extraItems];

  if (loading) {
    return (
      <section className={`${styles.bankTickerStrip} ${styles.bankTickerState}`} aria-label={t('bank_news_ticker_label')}>
        <Loader2 size={16} className={styles.spin} />
        <span>{t('bank_news_ticker_loading')}</span>
      </section>
    );
  }

  if (tickerItems.length === 0) {
    return (
      <section className={`${styles.bankTickerStrip} ${styles.bankTickerState}`} aria-label={t('bank_news_ticker_label')}>
        <AlertTriangle size={16} />
        <span>{t('bank_news_market_unavailable')}</span>
      </section>
    );
  }

  return (
    <MarketTickerStrip
      ariaLabel={t('bank_news_ticker_label')}
      className={styles.bankTickerStrip}
      viewportClassName={styles.bankTickerViewport}
      trackClassName={styles.bankTickerTrack}
      setClassName={styles.bankTickerSet}
      status={<span className={styles.bankTickerStatus}>{t('market_prices_delayed')}</span>}
    >
      {tickerItems.map(item => {
        const tone = changeTone(item.changePercent);
        const Icon = tone === 'negative' ? TrendingDown : TrendingUp;
        return (
          <Link className={styles.bankTickerItem} href={marketAnalysisUrl(item.symbol)} key={item.symbol}>
            <strong>{item.symbol}</strong>
            <span>{formatMoney(item.price, item.currency, locale) || t('bank_news_not_available')}</span>
            {typeof item.changePercent === 'number' ? (
              <b className={styles[tone]} dir="ltr">
                <Icon size={13} />
                {formatPercent(item.changePercent, locale)}
              </b>
            ) : null}
          </Link>
        );
      })}
    </MarketTickerStrip>
  );
}

function MarketSummaryStrip({ metrics, loading }: { metrics: SummaryMetric[]; loading: boolean }) {
  if (loading) {
    return (
      <section className={styles.summaryStrip}>
        {Array.from({ length: 6 }).map((_, index) => (
          <article className={styles.summaryCard} key={index}>
            <SkeletonBlock className={styles.skeletonIcon} />
            <SkeletonBlock className={styles.skeletonLine} />
            <SkeletonBlock className={styles.skeletonValue} />
          </article>
        ))}
      </section>
    );
  }
  return (
    <section className={styles.summaryStrip} aria-label="Market summary">
      {metrics.map(metric => {
        const Icon = metric.icon;
        return (
          <article className={styles.summaryCard} key={metric.id}>
            <span className={`${styles.summaryIcon} ${metric.tone ? styles[metric.tone] : ''}`}><Icon size={18} /></span>
            <p>{metric.label}</p>
            <strong dir="auto">{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        );
      })}
    </section>
  );
}

function StockCard({ item, t, locale }: { item: BankTickerItem; t: TFunction; locale: string }) {
  const tone = changeTone(item.changePercent);
  return (
    <article className={styles.stockCard}>
      <div className={styles.stockHead}>
        <span dir="ltr">{item.symbol}</span>
        <em className={styles[tone]} dir="ltr">{formatPercent(item.changePercent, locale) || t('bank_news_not_available')}</em>
      </div>
      <h3>{item.name}</h3>
      <p>{sectorLabel(item.sector, t)}</p>
      <div className={styles.stockMeta}>
        <span>{t('bank_news_price')}</span>
        <strong dir="ltr">{formatMoney(item.price, item.currency, locale) || t('bank_news_not_available')}</strong>
      </div>
      <div className={styles.stockActions}>
        <Link href={marketAnalysisUrl(item.symbol)}>
          <LineChart size={14} />
          {t('bank_news_analyze')}
        </Link>
        <Link href={`/market-analysis?tab=watchlist&symbol=${encodeURIComponent(item.symbol)}`}>
          <WalletCards size={14} />
          {t('bank_news_add_watchlist')}
        </Link>
      </div>
    </article>
  );
}

function FinancialStocksPreview({
  items,
  loading,
  t,
  locale,
  onShowAll,
}: {
  items: BankTickerItem[];
  loading: boolean;
  t: TFunction;
  locale: string;
  onShowAll: () => void;
}) {
  const visible = items.slice(0, STOCK_PREVIEW_LIMIT);
  return (
    <section className={styles.sectionBlock}>
      <div className={styles.sectionHead}>
        <div>
          <span>{t('bank_news_stocks_eyebrow')}</span>
          <h2>{t('bank_news_stocks_title')}</h2>
        </div>
        {items.length > STOCK_PREVIEW_LIMIT ? (
          <ActionButton onClick={onShowAll}>
            <Layers3 size={15} />
            {t('bank_news_show_all_stocks')}
          </ActionButton>
        ) : null}
      </div>
      {loading ? (
        <div className={styles.stockGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <article className={styles.stockCard} key={index}>
              <SkeletonBlock className={styles.skeletonBadge} />
              <SkeletonBlock className={styles.skeletonTitleSmall} />
              <SkeletonBlock className={styles.skeletonTextShort} />
            </article>
          ))}
        </div>
      ) : visible.length > 0 ? (
        <div className={styles.stockGrid}>
          {visible.map(item => <StockCard item={item} t={t} locale={locale} key={item.symbol} />)}
        </div>
      ) : (
        <SmallState icon={AlertTriangle} title={t('bank_news_not_available')} body={t('bank_news_market_unavailable')} />
      )}
    </section>
  );
}

function FeaturedNews({
  items,
  t,
  locale,
}: {
  items: BankNewsItem[];
  t: TFunction;
  locale: string;
}) {
  if (items.length === 0) return null;
  const [primary, ...secondary] = items.slice(0, 5);
  return (
    <section className={styles.featuredSection}>
      <div className={styles.sectionHead}>
        <div>
          <span>{t('bank_news_featured_eyebrow')}</span>
          <h2>{t('bank_news_featured_title')}</h2>
        </div>
      </div>
      <div className={styles.featuredGrid}>
        <article className={styles.featuredPrimary}>
          <div className={styles.newsCardTop}>
            <span>{categoryLabel(primary, t)}</span>
            <small><Clock3 size={13} />{relativeTime(primary.publishedAt, locale)}</small>
          </div>
          <h3>{displayTitle(primary) || t('bank_news_no_title')}</h3>
          {displaySummary(primary) ? <p>{displaySummary(primary)}</p> : null}
          <div className={styles.newsFooter}>
            <span>{primary.source || t('bank_news_not_available')}</span>
            {primary.url ? (
              <a href={primary.url} target="_blank" rel="noreferrer">
                {t('bank_news_read_more')}
                <ExternalLink size={14} />
              </a>
            ) : null}
          </div>
        </article>
        <div className={styles.featuredList}>
          {secondary.map(item => (
            <article className={styles.featuredMini} key={item.id || newsKey(item)}>
              <span>{categoryLabel(item, t)}</span>
              <h3>{displayTitle(item) || t('bank_news_no_title')}</h3>
              <small>{item.source || t('bank_news_not_available')} · {relativeTime(item.publishedAt, locale)}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function BreakingStrip({ items, t, locale }: { items: BankNewsItem[]; t: TFunction; locale: string }) {
  if (items.length === 0) return null;
  return (
    <section className={styles.breakingStrip}>
      <strong><Sparkles size={15} />{t('bank_news_breaking_title')}</strong>
      <div>
        {items.map(item => (
          <a href={item.url || '#'} target={item.url ? '_blank' : undefined} rel={item.url ? 'noreferrer' : undefined} key={item.id || newsKey(item)}>
            {displayTitle(item) || t('bank_news_no_title')}
            <small>{relativeTime(item.publishedAt, locale)}</small>
          </a>
        ))}
      </div>
    </section>
  );
}

function CategoryChips({
  activeCategory,
  setActiveCategory,
  counts,
  t,
}: {
  activeCategory: CategoryId;
  setActiveCategory: (category: CategoryId) => void;
  counts: Record<CategoryId, number>;
  t: TFunction;
}) {
  return (
    <div className={styles.categoryScroller} aria-label={t('bank_news_categories')}>
      {CATEGORY_FILTERS.map(filter => (
        <button
          type="button"
          className={activeCategory === filter.id ? styles.activeChip : ''}
          aria-pressed={activeCategory === filter.id}
          onClick={() => setActiveCategory(filter.id)}
          key={filter.id}
        >
          {t(filter.labelKey)}
          <span>{counts[filter.id] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

function NewsFilters({
  query,
  setQuery,
  source,
  setSource,
  market,
  setMarket,
  dateFilter,
  setDateFilter,
  sortMode,
  setSortMode,
  sources,
  markets,
  filtersOpen,
  setFiltersOpen,
  t,
}: {
  query: string;
  setQuery: (value: string) => void;
  source: string;
  setSource: (value: string) => void;
  market: string;
  setMarket: (value: string) => void;
  dateFilter: DateFilter;
  setDateFilter: (value: DateFilter) => void;
  sortMode: SortMode;
  setSortMode: (value: SortMode) => void;
  sources: string[];
  markets: string[];
  filtersOpen: boolean;
  setFiltersOpen: (value: boolean) => void;
  t: TFunction;
}) {
  return (
    <section className={styles.filterPanel}>
      <div className={styles.searchRow}>
        <label className={styles.searchBox}>
          <Search size={17} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('bank_news_search_placeholder')} />
        </label>
        <button type="button" className={styles.mobileFilterButton} onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}>
          <Filter size={16} />
          {t('bank_news_filter_button')}
          <ChevronDown size={15} />
        </button>
      </div>
      <div className={`${styles.filterGrid} ${filtersOpen ? styles.filtersExpanded : ''}`}>
        <label>
          <span>{t('bank_news_source')}</span>
          <select value={source} onChange={event => setSource(event.target.value)}>
            <option value="all">{t('bank_news_all_sources')}</option>
            {sources.map(item => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>{t('bank_news_market')}</span>
          <select value={market} onChange={event => setMarket(event.target.value)}>
            <option value="all">{t('bank_news_all_markets')}</option>
            {markets.map(item => <option value={item} key={item}>{sectorLabel(item, t)}</option>)}
          </select>
        </label>
        <label>
          <span>{t('bank_news_date')}</span>
          <select value={dateFilter} onChange={event => setDateFilter(event.target.value as DateFilter)}>
            <option value="all">{t('bank_news_all_dates')}</option>
            <option value="today">{t('bank_news_today')}</option>
            <option value="week">{t('bank_news_week')}</option>
            <option value="month">{t('bank_news_month')}</option>
          </select>
        </label>
        <label>
          <span>{t('bank_news_sort')}</span>
          <select value={sortMode} onChange={event => setSortMode(event.target.value as SortMode)}>
            <option value="newest">{t('bank_news_newest_first')}</option>
            <option value="oldest">{t('bank_news_oldest_first')}</option>
          </select>
        </label>
      </div>
    </section>
  );
}

function NewsCard({ item, t, locale }: { item: BankNewsItem; t: TFunction; locale: string }) {
  const sentiment = getNewsSentiment(item);
  const tone = changeTone(item.changePercent);
  return (
    <article className={styles.newsCard}>
      <div className={styles.newsCardTop}>
        <span>{categoryLabel(item, t)}</span>
        <small><Clock3 size={13} />{relativeTime(item.publishedAt, locale) || t('bank_news_not_available')}</small>
      </div>
      <h3>{displayTitle(item) || t('bank_news_no_title')}</h3>
      {displaySummary(item) ? <p>{displaySummary(item)}</p> : null}
      <div className={styles.newsMeta}>
        <span>{item.source || t('bank_news_not_available')}</span>
        {item.ticker ? <span dir="ltr">{item.ticker}</span> : null}
        {sentiment ? <span className={styles[sentiment]}>{t(`bank_news_sentiment_${sentiment}`)}</span> : null}
        {typeof item.price === 'number' ? (
          <span dir="ltr">{formatMoney(item.price, 'USD', locale)} <em className={styles[tone]}>{formatPercent(item.changePercent, locale)}</em></span>
        ) : null}
      </div>
      <div className={styles.newsFooter}>
        <small><CalendarDays size={13} />{formatDateTime(item.publishedAt, locale) || t('bank_news_not_available')}</small>
        {item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer">
            {t('bank_news_read_more')}
            <ExternalLink size={14} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function SmallState({ icon: Icon, title, body }: { icon: IconType; title: string; body: string }) {
  return (
    <div className={styles.smallState}>
      <Icon size={20} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
  );
}

function EmptyState({ t, onRetry, onClear }: { t: TFunction; onRetry: () => void; onClear: () => void }) {
  return (
    <div className={styles.emptyState}>
      <Newspaper size={24} />
      <h3>{t('bank_news_empty_title')}</h3>
      <p>{t('bank_news_empty_body')}</p>
      <div>
        <ActionButton variant="primary" onClick={onRetry}><RefreshCcw size={15} />{t('bank_news_retry')}</ActionButton>
        <ActionButton onClick={onClear}><X size={15} />{t('bank_news_clear_filters')}</ActionButton>
      </div>
    </div>
  );
}

function ErrorAlert({ t, onRetry }: { t: TFunction; onRetry: () => void }) {
  return (
    <div className={styles.errorAlert} role="alert">
      <AlertTriangle size={20} />
      <div>
        <strong>{t('bank_news_error_title')}</strong>
        <p>{t('bank_news_error_body')}</p>
      </div>
      <ActionButton onClick={onRetry}><RefreshCcw size={15} />{t('bank_news_retry')}</ActionButton>
    </div>
  );
}

function NewsDashboardGrid({
  items,
  loading,
  error,
  visibleCount,
  setVisibleCount,
  t,
  locale,
  onRetry,
  onClear,
  hasFeatured,
}: {
  items: BankNewsItem[];
  loading: boolean;
  error: string;
  visibleCount: number;
  setVisibleCount: (value: number) => void;
  t: TFunction;
  locale: string;
  onRetry: () => void;
  onClear: () => void;
  hasFeatured: boolean;
}) {
  const visible = items.slice(0, visibleCount);
  return (
    <section className={styles.newsPanel}>
      <div className={styles.sectionHead}>
        <div>
          <span>{t('bank_news_grid_eyebrow')}</span>
          <h2>{t('bank_news_grid_title')}</h2>
        </div>
        <small>{visible.length} / {items.length}</small>
      </div>
      {error ? (
        <ErrorAlert t={t} onRetry={onRetry} />
      ) : loading ? (
        <div className={styles.newsGrid}>
          {Array.from({ length: NEWS_PAGE_SIZE }).map((_, index) => (
            <article className={styles.newsCard} key={index}>
              <SkeletonBlock className={styles.skeletonBadge} />
              <SkeletonBlock className={styles.skeletonTitleSmall} />
              <SkeletonBlock className={styles.skeletonText} />
              <SkeletonBlock className={styles.skeletonTextShort} />
            </article>
          ))}
        </div>
      ) : items.length === 0 && hasFeatured ? (
        <div className={styles.loadMoreWrap}>
          <span>{t('bank_news_no_more')}</span>
        </div>
      ) : items.length === 0 && !error ? (
        <EmptyState t={t} onRetry={onRetry} onClear={onClear} />
      ) : (
        <>
          <div className={styles.newsGrid}>
            {visible.map(item => <NewsCard item={item} t={t} locale={locale} key={item.id || newsKey(item)} />)}
          </div>
          <div className={styles.loadMoreWrap}>
            {visible.length < items.length ? (
              <ActionButton variant="primary" onClick={() => setVisibleCount(visibleCount + NEWS_PAGE_SIZE)}>
                <ChevronDown size={16} />
                {t('bank_news_load_more')}
              </ActionButton>
            ) : (
              <span>{t('bank_news_no_more')}</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function NewsSidebar({
  stocks,
  news,
  sources,
  lastUpdated,
  t,
  locale,
}: {
  stocks: BankTickerItem[];
  news: BankNewsItem[];
  sources: string[];
  lastUpdated: string;
  t: TFunction;
  locale: string;
}) {
  return (
    <aside className={styles.sidebarPanel}>
      <section>
        <h3><TrendingUp size={16} />{t('bank_news_sidebar_followed')}</h3>
        <div className={styles.sidebarList}>
          {stocks.slice(0, 5).map(item => (
            <Link href={marketAnalysisUrl(item.symbol)} key={item.symbol}>
              <span>
                <b dir="ltr">{item.symbol}</b>
                <small>{item.name}</small>
              </span>
              <em className={styles[changeTone(item.changePercent)]} dir="ltr">{formatPercent(item.changePercent, locale) || t('bank_news_not_available')}</em>
            </Link>
          ))}
          {stocks.length === 0 ? <p>{t('bank_news_not_available')}</p> : null}
        </div>
      </section>
      <section>
        <h3><Newspaper size={16} />{t('bank_news_sidebar_top_news')}</h3>
        <div className={styles.sidebarNewsList}>
          {news.slice(0, 4).map(item => (
            <a href={item.url || '#'} target={item.url ? '_blank' : undefined} rel={item.url ? 'noreferrer' : undefined} key={item.id || newsKey(item)}>
              <strong>{displayTitle(item) || t('bank_news_no_title')}</strong>
              <small>{item.source || t('bank_news_not_available')}</small>
            </a>
          ))}
          {news.length === 0 ? <p>{t('bank_news_not_available')}</p> : null}
        </div>
      </section>
      <section>
        <h3><BriefcaseBusiness size={16} />{t('bank_news_sidebar_sources')}</h3>
        <div className={styles.sourceChips}>
          {sources.slice(0, 6).map(source => <span key={source}>{source}</span>)}
          {sources.length === 0 ? <span>{t('bank_news_not_available')}</span> : null}
        </div>
      </section>
      <section>
        <h3><Clock3 size={16} />{t('bank_news_last_updated')}</h3>
        <p>{lastUpdated ? formatDateTime(lastUpdated, locale) : t('bank_news_not_available')}</p>
      </section>
      <section>
        <h3><Bell size={16} />{t('bank_news_sidebar_quick_links')}</h3>
        <div className={styles.quickLinks}>
          <Link href="/market-analysis">{t('bank_news_link_market_analysis')}</Link>
          <Link href="/market-analysis?tab=watchlist">{t('bank_news_link_watchlist')}</Link>
          <Link href="/market-analysis?tab=alerts">{t('bank_news_link_alerts')}</Link>
        </div>
      </section>
    </aside>
  );
}

function SnapshotPanel({
  snapshotItems,
  movers,
  tickerItems,
  loading,
  t,
  locale,
}: {
  snapshotItems: BankingSnapshotItem[];
  movers: StockCategoryMoverItem[];
  tickerItems: BankTickerItem[];
  loading: boolean;
  t: TFunction;
  locale: string;
}) {
  const tickerBySymbol = new Map(tickerItems.map(item => [item.symbol, item]));
  const fallbackMovers = tickerItems
    .filter(item => typeof item.changePercent === 'number')
    .slice()
    .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))
    .slice(0, 6);
  return (
    <section className={styles.analysisGrid}>
      <article className={styles.analysisPanel}>
        <div className={styles.sectionHead}>
          <div>
            <span>{t('bank_news_analysis_eyebrow')}</span>
            <h2>{t('bank_news_snapshot_title')}</h2>
          </div>
        </div>
        {loading ? (
          <div className={styles.compactGrid}>{Array.from({ length: 4 }).map((_, index) => <SkeletonBlock className={styles.skeletonText} key={index} />)}</div>
        ) : snapshotItems.length > 0 ? (
          <div className={styles.compactGrid}>
            {snapshotItems.slice(0, 6).map(item => (
              <div className={styles.metricTile} key={item.symbol}>
                <span dir="ltr">{item.symbol}</span>
                <strong>{item.nameAr || item.displayName}</strong>
                <b dir="ltr">{formatSnapshotValue(item, locale) || t('bank_news_not_available')}</b>
                <small>{item.source || t('bank_news_not_available')}</small>
              </div>
            ))}
          </div>
        ) : (
          <SmallState icon={Gauge} title={t('bank_news_not_available')} body={t('bank_news_market_unavailable')} />
        )}
      </article>
      <article className={styles.analysisPanel}>
        <div className={styles.sectionHead}>
          <div>
            <span>{t('bank_news_stocks_eyebrow')}</span>
            <h2>{t('bank_news_movers_title')}</h2>
          </div>
        </div>
        {loading ? (
          <div className={styles.sidebarList}>{Array.from({ length: 5 }).map((_, index) => <SkeletonBlock className={styles.skeletonText} key={index} />)}</div>
        ) : movers.length > 0 || fallbackMovers.length > 0 ? (
          <div className={styles.sidebarList}>
            {(movers.length > 0 ? movers : fallbackMovers).slice(0, 6).map(item => {
              const symbol = item.symbol;
              const quote = tickerBySymbol.get(symbol);
              const changePercent = 'changePercent' in item ? item.changePercent : quote?.changePercent ?? null;
              const price = 'price' in item ? item.price : quote?.price ?? null;
              const currency = quote?.currency ?? 'USD';
              return (
                <Link href={marketAnalysisUrl(symbol)} key={symbol}>
                  <span>
                    <b dir="ltr">{symbol}</b>
                    <small>{'name' in item ? item.name : quote?.name}</small>
                  </span>
                  <em className={styles[changeTone(changePercent)]} dir="ltr">
                    {formatMoney(price, currency, locale) || t('bank_news_not_available')} · {formatPercent(changePercent, locale) || t('bank_news_not_available')}
                  </em>
                </Link>
              );
            })}
          </div>
        ) : (
          <SmallState icon={TrendingUp} title={t('bank_news_not_available')} body={t('bank_news_market_unavailable')} />
        )}
      </article>
    </section>
  );
}

function SourcesPanel({ sources, t }: { sources: string[]; t: TFunction }) {
  return (
    <section className={styles.sectionBlock}>
      <div className={styles.sectionHead}>
        <div>
          <span>{t('bank_news_sources_eyebrow')}</span>
          <h2>{t('bank_news_sources_footer')}</h2>
        </div>
      </div>
      <div className={styles.sourceChips}>
        {sources.length > 0 ? sources.map(source => <span key={source}>{source}</span>) : <span>{t('bank_news_not_available')}</span>}
      </div>
      <p className={styles.helperText}>{t('bank_news_sources_note')}</p>
    </section>
  );
}

function AllStocksModal({
  items,
  t,
  locale,
  onClose,
}: {
  items: BankTickerItem[];
  t: TFunction;
  locale: string;
  onClose: () => void;
}) {
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="bank-stocks-modal-title">
      <div className={styles.modalPanel}>
        <div className={styles.modalHead}>
          <div>
            <h2 id="bank-stocks-modal-title">{t('bank_news_all_stocks_title')}</h2>
            <p>{t('bank_news_all_stocks_body')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('bank_news_close')}>
            <X size={19} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.stockGrid}>
            {items.map(item => <StockCard item={item} t={t} locale={locale} key={item.symbol} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BankNewsPage() {
  const { dir, lang, t } = useLanguage();
  const activeLang = (lang === 'en' || lang === 'fr' ? lang : 'ar') as LangCode;
  const locale = localeFor(activeLang);
  const [tickerItems, setTickerItems] = useState<BankTickerItem[]>([]);
  const [snapshotItems, setSnapshotItems] = useState<BankingSnapshotItem[]>([]);
  const [newsItems, setNewsItems] = useState<BankNewsItem[]>([]);
  const [movers, setMovers] = useState<StockCategoryMoversResponse | null>(null);
  const [tickerUpdatedAt, setTickerUpdatedAt] = useState('');
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState('');
  const [newsUpdatedAt, setNewsUpdatedAt] = useState('');
  const [moversUpdatedAt, setMoversUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [marketError, setMarketError] = useState('');
  const [activeTab, setActiveTab] = useState<DashboardTab>('news');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const [showAllStocks, setShowAllStocks] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 250);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setNewsError('');
    setMarketError('');

    const [tickerResult, snapshotResult, newsResult, moversResult] = await Promise.allSettled([
      fetchJson<BankTickerResponse>('/api/banking-stocks/ticker'),
      fetchJson<BankingSnapshotResponse>('/api/market/banking/snapshot'),
      fetchJson<BankNewsResponse>(`/api/banking-stocks/news?lang=${encodeURIComponent(activeLang)}&limit=72`),
      fetchJson<StockCategoryMoversResponse>('/api/banking-stocks/movers?limit=6'),
    ]);

    if (tickerResult.status === 'fulfilled' && tickerResult.value.ok) {
      setTickerItems(tickerResult.value.items);
      setTickerUpdatedAt(tickerResult.value.updated_at);
    } else {
      console.error('[BankNewsPage] Banking ticker request failed', tickerResult.status === 'rejected' ? tickerResult.reason : tickerResult.value);
      setTickerItems([]);
      setTickerUpdatedAt('');
      setMarketError(t('bank_news_market_unavailable'));
    }

    if (snapshotResult.status === 'fulfilled' && snapshotResult.value.ok) {
      setSnapshotItems(snapshotResult.value.items);
      setSnapshotUpdatedAt(snapshotResult.value.updated_at);
    } else {
      console.error('[BankNewsPage] Banking snapshot request failed', snapshotResult.status === 'rejected' ? snapshotResult.reason : snapshotResult.value);
      setSnapshotItems([]);
      setSnapshotUpdatedAt('');
    }

    if (newsResult.status === 'fulfilled' && newsResult.value.success) {
      setNewsItems(newsResult.value.items);
      setNewsUpdatedAt(newsResult.value.lastUpdated);
    } else {
      console.error('[BankNewsPage] Banking news request failed', newsResult.status === 'rejected' ? newsResult.reason : newsResult.value);
      setNewsItems([]);
      setNewsUpdatedAt('');
      setNewsError(t('bank_news_error_body'));
    }

    if (moversResult.status === 'fulfilled') {
      setMovers(moversResult.value);
      setMoversUpdatedAt(moversResult.value.ok ? moversResult.value.updated_at : '');
    } else {
      console.error('[BankNewsPage] Banking movers request failed', moversResult.reason);
      setMovers(null);
      setMoversUpdatedAt('');
    }

    setLoading(false);
    setRefreshing(false);
  }, [activeLang, t]);

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadData(false);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
  }, [activeCategory, debouncedQuery, sourceFilter, marketFilter, dateFilter, sortMode]);

  const lastUpdated = useMemo(
    () => newestTimestamp([tickerUpdatedAt, snapshotUpdatedAt, newsUpdatedAt, moversUpdatedAt]),
    [moversUpdatedAt, newsUpdatedAt, snapshotUpdatedAt, tickerUpdatedAt],
  );

  const dedupedNews = useMemo(() => dedupeNews(newsItems), [newsItems]);

  const sources = useMemo(
    () => uniqueValues(dedupedNews.map(item => item.source)),
    [dedupedNews],
  );

  const markets = useMemo(
    () => uniqueValues([
      ...dedupedNews.flatMap(item => [item.sector, ...(item.sectors ?? [])]),
      ...tickerItems.map(item => item.sector),
    ]),
    [dedupedNews, tickerItems],
  );

  const todayNewsCount = useMemo(
    () => dedupedNews.filter(item => itemMatchesDate(item, 'today')).length,
    [dedupedNews],
  );

  const categoryCounts = useMemo(() => {
    return CATEGORY_FILTERS.reduce((acc, filter) => {
      acc[filter.id] = dedupedNews.filter(item => itemMatchesSearch(item, debouncedQuery) && itemMatchesCategory(item, filter.id)).length;
      return acc;
    }, {} as Record<CategoryId, number>);
  }, [debouncedQuery, dedupedNews]);

  const filteredNews = useMemo(() => {
    const sorted = dedupedNews
      .filter(item => itemMatchesSearch(item, debouncedQuery))
      .filter(item => itemMatchesCategory(item, activeCategory))
      .filter(item => itemMatchesSource(item, sourceFilter))
      .filter(item => itemMatchesMarket(item, marketFilter))
      .filter(item => itemMatchesDate(item, dateFilter))
      .slice()
      .sort((a, b) => {
        const left = new Date(a.publishedAt).getTime();
        const right = new Date(b.publishedAt).getTime();
        return sortMode === 'oldest' ? left - right : right - left;
      });
    return sorted;
  }, [activeCategory, dateFilter, debouncedQuery, dedupedNews, marketFilter, sortMode, sourceFilter]);

  const featuredNews = useMemo(() => filteredNews.slice(0, 5), [filteredNews]);
  const featuredKeys = useMemo(() => new Set(featuredNews.map(newsKey)), [featuredNews]);
  const gridNews = useMemo(
    () => filteredNews.filter(item => !featuredKeys.has(newsKey(item))),
    [featuredKeys, filteredNews],
  );
  const breakingNews = useMemo(
    () => dedupedNews.filter(item => itemMatchesCategory(item, 'breaking')).slice(0, 3),
    [dedupedNews],
  );

  const sortedTickerItems = useMemo(() => {
    const configOrder = new Map((BANKING_CONFIG?.watchlist ?? []).map((item, index) => [item.symbol, index]));
    return tickerItems.slice().sort((a, b) => {
      const aOrder = configOrder.get(a.symbol) ?? 999;
      const bOrder = configOrder.get(b.symbol) ?? 999;
      return aOrder - bOrder;
    });
  }, [tickerItems]);

  const moverRows = useMemo(() => {
    if (!movers?.ok) return [];
    return [...movers.data.topGainers, ...movers.data.topLosers]
      .filter((item, index, arr) => arr.findIndex(row => row.symbol === item.symbol) === index)
      .slice(0, 6);
  }, [movers]);

  const summaryMetrics = useMemo<SummaryMetric[]>(() => {
    const validChanges = tickerItems
      .map(item => item.changePercent)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const sectorChange = validChanges.length > 0
      ? validChanges.reduce((sum, value) => sum + value, 0) / validChanges.length
      : null;
    const topGainer = tickerItems
      .filter(item => typeof item.changePercent === 'number')
      .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))[0];
    const topLoser = tickerItems
      .filter(item => typeof item.changePercent === 'number')
      .sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0))[0];
    const status = providerStatus(newsError, marketError, dedupedNews, tickerItems);
    return [
      {
        id: 'sector',
        label: t('bank_news_summary_sector'),
        value: sectorChange === null ? t('bank_news_not_available') : formatPercent(sectorChange, locale),
        detail: t('bank_news_summary_sector_detail'),
        tone: changeTone(sectorChange),
        icon: Gauge,
      },
      {
        id: 'gainer',
        label: t('bank_news_summary_top_gainer'),
        value: topGainer ? topGainer.symbol : t('bank_news_not_available'),
        detail: topGainer ? formatPercent(topGainer.changePercent, locale) || topGainer.name : t('bank_news_not_available'),
        tone: topGainer ? changeTone(topGainer.changePercent) : 'neutral',
        icon: TrendingUp,
      },
      {
        id: 'loser',
        label: t('bank_news_summary_top_loser'),
        value: topLoser ? topLoser.symbol : t('bank_news_not_available'),
        detail: topLoser ? formatPercent(topLoser.changePercent, locale) || topLoser.name : t('bank_news_not_available'),
        tone: topLoser ? changeTone(topLoser.changePercent) : 'neutral',
        icon: TrendingDown,
      },
      {
        id: 'newsToday',
        label: t('bank_news_summary_news_today'),
        value: formatNumber(todayNewsCount, locale) || '0',
        detail: t('bank_news_summary_news_today_detail'),
        icon: Newspaper,
      },
      {
        id: 'updated',
        label: t('bank_news_summary_last_update'),
        value: lastUpdated ? formatDateTime(lastUpdated, locale) : t('bank_news_not_available'),
        detail: t('bank_news_summary_last_update_detail'),
        icon: Clock3,
      },
      {
        id: 'provider',
        label: t('bank_news_summary_provider'),
        value: status === 'available' ? t('bank_news_provider_available') : t('bank_news_provider_unavailable'),
        detail: status === 'available' ? t('bank_news_provider_available_detail') : t('bank_news_provider_unavailable_detail'),
        tone: status === 'available' ? 'positive' : 'neutral',
        icon: ShieldCheck,
      },
    ];
  }, [dedupedNews, lastUpdated, locale, marketError, newsError, t, tickerItems, todayNewsCount]);

  const clearFilters = useCallback(() => {
    setQuery('');
    setActiveCategory('all');
    setSourceFilter('all');
    setMarketFilter('all');
    setDateFilter('all');
    setSortMode('newest');
  }, []);

  return (
    <div className={styles.page} dir={dir}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.container}>
          <PageHeader
            t={t}
            lastUpdated={lastUpdated}
            locale={locale}
            refreshing={refreshing}
            onRefresh={() => void loadData(false)}
          />

          <BankTickerStrip items={sortedTickerItems} loading={loading} t={t} locale={locale} />

          {loading ? (
            <NewsSkeleton />
          ) : (
            <>
              <MarketSummaryStrip metrics={summaryMetrics} loading={loading} />

              <div className={styles.tabsBar}>
                <nav className={styles.tabs} aria-label={t('bank_news_tabs_label')}>
                  {DASHBOARD_TABS.map(tab => (
                    <button
                      type="button"
                      className={activeTab === tab.id ? styles.activeTab : ''}
                      aria-pressed={activeTab === tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      key={tab.id}
                    >
                      {t(tab.labelKey)}
                    </button>
                  ))}
                </nav>
                <Link className={styles.reportsLink} href="/reports-center">
                  {t('bank_news_open_reports')}
                  <ArrowUpRight size={14} />
                </Link>
              </div>

              {activeTab === 'news' ? (
                <>
                  <FinancialStocksPreview
                    items={sortedTickerItems}
                    loading={loading}
                    t={t}
                    locale={locale}
                    onShowAll={() => setShowAllStocks(true)}
                  />
                  <BreakingStrip items={breakingNews} t={t} locale={locale} />
                  <FeaturedNews items={featuredNews} t={t} locale={locale} />
                  <div className={styles.contentGrid}>
                    <NewsDashboardGrid
                      items={gridNews}
                      loading={loading}
                      error={newsError}
                      visibleCount={visibleCount}
                      setVisibleCount={setVisibleCount}
                      t={t}
                      locale={locale}
                      onRetry={() => void loadData(true)}
                      onClear={clearFilters}
                      hasFeatured={featuredNews.length > 0}
                    />
                    <NewsSidebar
                      stocks={sortedTickerItems}
                      news={featuredNews}
                      sources={sources}
                      lastUpdated={lastUpdated}
                      t={t}
                      locale={locale}
                    />
                  </div>
                  <SourcesPanel sources={sources} t={t} />
                </>
              ) : null}

              {activeTab === 'stocks' ? (
                <>
                  <FinancialStocksPreview
                    items={sortedTickerItems}
                    loading={loading}
                    t={t}
                    locale={locale}
                    onShowAll={() => setShowAllStocks(true)}
                  />
                  <SnapshotPanel
                    snapshotItems={snapshotItems}
                    movers={moverRows}
                    tickerItems={sortedTickerItems}
                    loading={loading}
                    t={t}
                    locale={locale}
                  />
                </>
              ) : null}

              {activeTab === 'categories' ? (
                <>
                  <section className={styles.sectionBlock}>
                    <CategoryChips activeCategory={activeCategory} setActiveCategory={setActiveCategory} counts={categoryCounts} t={t} />
                    <NewsFilters
                      query={query}
                      setQuery={setQuery}
                      source={sourceFilter}
                      setSource={setSourceFilter}
                      market={marketFilter}
                      setMarket={setMarketFilter}
                      dateFilter={dateFilter}
                      setDateFilter={setDateFilter}
                      sortMode={sortMode}
                      setSortMode={setSortMode}
                      sources={sources}
                      markets={markets}
                      filtersOpen={filtersOpen}
                      setFiltersOpen={setFiltersOpen}
                      t={t}
                    />
                  </section>
                  <div className={styles.contentGrid}>
                    <NewsDashboardGrid
                      items={filteredNews}
                      loading={loading}
                      error={newsError}
                      visibleCount={visibleCount}
                      setVisibleCount={setVisibleCount}
                      t={t}
                      locale={locale}
                      onRetry={() => void loadData(true)}
                      onClear={clearFilters}
                      hasFeatured={false}
                    />
                    <NewsSidebar
                      stocks={sortedTickerItems}
                      news={filteredNews}
                      sources={sources}
                      lastUpdated={lastUpdated}
                      t={t}
                      locale={locale}
                    />
                  </div>
                </>
              ) : null}

              {activeTab === 'sources' ? <SourcesPanel sources={sources} t={t} /> : null}
            </>
          )}
        </div>
      </main>

      {showAllStocks ? (
        <AllStocksModal items={sortedTickerItems} t={t} locale={locale} onClose={() => setShowAllStocks(false)} />
      ) : null}
    </div>
  );
}

export default BankNewsPage;
