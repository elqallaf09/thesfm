import type { Metadata } from 'next';
import { fetchStockCategoryMovers, type StockCategoryMoverItem } from '@/lib/market/fetchStockCategoryMovers';
import { fetchStockCategoryNews, type StockCategoryNewsItem } from '@/lib/market/fetchStockCategoryNews';
import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';
import GrowthStocksInteractive from './GrowthStocksInteractive';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'أخبار أسهم النمو | THE SFM',
  description: 'تابع أخبار الشركات التي تركز على التوسع السريع ونمو الإيرادات والابتكار مع بيانات سوق حقيقية من مصادر Finnhub وYahoo Finance.',
};

type TickerView = {
  sym: string;
  name: string;
  px: string;
  chg: string;
  up: boolean;
};

type NewsView = {
  sym: string;
  name: string;
  px: string;
  chg: string;
  up: boolean;
  title: string;
  desc: string;
  src: string;
  date: string;
  url: string;
  sectors: string[];
  searchText: string;
};

type MoverRowView = {
  sym: string;
  name: string;
  px: string;
  chg: string;
  up: boolean;
  vol?: string;
};

type MoverSectionView = {
  title: string;
  accent: 'up' | 'down' | 'vol';
  rows: MoverRowView[];
};

const FILTER_LABELS: Record<string, string> = {
  all: 'الكل',
  software: 'البرمجيات',
  cloud: 'الحوسبة السحابية',
  artificial_intelligence: 'الذكاء الاصطناعي',
  semiconductors: 'أشباه الموصلات',
  ecommerce: 'التجارة الإلكترونية',
  fintech: 'التكنولوجيا المالية',
  cybersecurity: 'الأمن السيبراني',
  electric_vehicles: 'السيارات الكهربائية',
  innovative_healthcare: 'الرعاية الصحية المبتكرة',
  digital_consumption: 'الاستهلاك الرقمي',
};

const NAV_SUB = [
  { label: 'تحليلات السوق', href: '/market-analysis' },
  { label: 'أخبار أسواق الخليج', href: '/gulf-news' },
  { label: 'أخبار الأسواق الأوروبية', href: '/europe-news' },
  { label: 'أخبار السوق التقني', href: '/tech-news' },
  { label: 'أخبار الأسهم الدفاعية', href: '/defensive-stocks' },
  { label: 'أخبار أسهم النمو', href: '/growth-stocks', active: true },
  { label: 'أخبار أسهم التوزيعات', href: '/dividend-stocks' },
  { label: 'أخبار الأسهم الدورية', href: '/cyclical-stocks' },
  { label: 'أخبار الطاقة', href: '/energy-stocks' },
  { label: 'أخبار البنوك', href: '/banking-stocks' },
  { label: 'أخبار الأسهم الشرعية', href: '/sharia-stocks' },
];

const COMPARE = [
  {
    title: 'أسهم النمو',
    tone: 'defensive',
    items: [
      'تركز على التوسع السريع',
      'نمو أعلى في الإيرادات',
      'غالبًا تعيد استثمار الأرباح',
      'قد تكون أكثر تقلبًا',
      'تقييمات مرتفعة أحيانًا',
    ],
  },
  {
    title: 'أسهم القيمة',
    tone: 'cyclical',
    items: [
      'تركز على الشركات المقومة بأقل من قيمتها',
      'قد تكون أكثر استقرارًا',
      'قد تقدم توزيعات أرباح',
      'نمو أبطأ نسبيًا',
      'مناسبة أكثر للمستثمر المحافظ',
    ],
  },
];

const SECTORS = [
  {
    title: 'البرمجيات',
    text: 'شركات برمجية ومنصات أعمال تعتمد على الاشتراكات ونمو الإيرادات المتكرر، مع قابلية توسع عالية عند تحسن الطلب.',
    symbols: ['CRM', 'NOW', 'SNOW', 'DDOG'],
  },
  {
    title: 'التجارة الإلكترونية',
    text: 'منصات بيع وأسواق رقمية تستفيد من توسع الإنفاق عبر الإنترنت ونمو قواعد المستخدمين والتجار.',
    symbols: ['AMZN', 'SHOP', 'MELI'],
  },
  {
    title: 'الحوسبة السحابية',
    text: 'شركات بنية تحتية وبيانات وسحابة تقدم خدمات قابلة للتوسع للشركات، وقد تتأثر بسرعة الإنفاق التقني.',
    symbols: ['NET', 'SNOW', 'DDOG', 'MDB'],
  },
  {
    title: 'التكنولوجيا المالية',
    text: 'شركات المدفوعات والخدمات المالية الرقمية التي تعتمد على حجم المعاملات وانتشار المحافظ والمنصات الرقمية.',
    symbols: ['SQ', 'PYPL'],
  },
  {
    title: 'الذكاء الاصطناعي',
    text: 'شركات تستفيد من الطلب على البنية الحاسوبية، نماذج الذكاء الاصطناعي، وتحليلات البيانات في قطاعات متعددة.',
    symbols: ['NVDA', 'MSFT', 'PLTR', 'GOOGL'],
  },
  {
    title: 'أشباه الموصلات',
    text: 'شركات رقائق ومعالجات ومكونات حوسبة ترتبط بدورات الإنفاق على الخوادم، الأجهزة، والذكاء الاصطناعي.',
    symbols: ['NVDA', 'AMD', 'AVGO'],
  },
  {
    title: 'الرعاية الصحية المبتكرة',
    text: 'شركات أجهزة طبية وتقنيات صحية تعتمد على الابتكار والاعتماد السريري ونمو الأسواق المتخصصة.',
    symbols: ['ISRG', 'DXCM'],
  },
];

function finite(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function trimText(value: string | null | undefined, fallback: string, max = 180) {
  const clean = String(value ?? '').replace(/\s+/g, ' ').trim() || fallback;
  return clean.length > max ? `${clean.slice(0, max - 3).trim()}...` : clean;
}

function formatCurrency(value: number | null | undefined, currency = 'USD') {
  const parsed = finite(value);
  if (parsed === null) return 'غير متاح';
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency,
    maximumFractionDigits: parsed >= 100 ? 2 : 3,
  }).format(parsed);
}

function formatPercent(value: number | null | undefined) {
  const parsed = finite(value);
  if (parsed === null) return 'غير متاح';
  const sign = parsed > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('ar-KW', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(parsed)}%`;
}

function formatDate(value: string | number | null | undefined) {
  if (!value) return 'غير متاح';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير متاح';
  return new Intl.DateTimeFormat('ar-KW', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatVolume(value: number | null | undefined) {
  const parsed = finite(value);
  if (parsed === null) return 'غير متاح';
  return new Intl.NumberFormat('ar-KW', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(parsed);
}

function toNewsView(item: StockCategoryNewsItem): NewsView {
  const changePercent = finite(item.changePercent) ?? 0;
  const sectors = Array.from(
    new Set(['all', item.sector, ...item.sectors].filter((value): value is string => Boolean(value))),
  );
  return {
    sym: item.ticker || 'GRO',
    name: item.companyName || 'سهم نمو',
    px: item.price === null ? 'غير متاح' : formatCurrency(item.price),
    chg: item.changePercent === null ? 'غير متاح' : formatPercent(item.changePercent),
    up: changePercent >= 0,
    title: trimText(item.title, 'خبر من مصدر سوق حقيقي', 110),
    desc: trimText(item.summary, item.title || 'لا يتوفر ملخص لهذا الخبر حاليًا.', 190),
    src: item.source || 'مصدر سوق',
    date: formatDate(item.publishedAt),
    url: item.url || '#',
    sectors,
    searchText: [
      item.ticker,
      item.companyName,
      item.title,
      item.summary,
      item.source,
      item.sector,
      ...item.sectors,
    ].join(' '),
  };
}

function mapMoverRow(row: StockCategoryMoverItem): MoverRowView {
  const change = finite(row.changePercent) ?? 0;
  return {
    sym: row.symbol,
    name: row.name,
    px: formatCurrency(row.price, row.currency),
    chg: row.changePercent === null ? 'غير متاح' : formatPercent(row.changePercent),
    up: change >= 0,
    vol: formatVolume(row.volume),
  };
}

function buildMoverSections(response: Awaited<ReturnType<typeof fetchStockCategoryMovers>>): MoverSectionView[] {
  if (!response.ok || !response.data) return [];
  const sections: MoverSectionView[] = [
    {
      title: 'أعلى 5 أسهم نمو ارتفاعًا',
      accent: 'up',
      rows: response.data.topGainers.map(mapMoverRow),
    },
    {
      title: 'أكثر 5 أسهم نمو انخفاضًا',
      accent: 'down',
      rows: response.data.topLosers.map(mapMoverRow),
    },
    {
      title: 'أعلى 5 أسهم تداولًا',
      accent: 'vol',
      rows: response.data.highestVolume.map(mapMoverRow),
    },
  ];
  return sections.filter(section => section.rows.length > 0);
}

export default async function GrowthStocksPage() {
  const config = getStockCategoryConfig('growth');

  const [newsPayload, moversPayload] = await Promise.all([
    fetchStockCategoryNews('growth', 'ar'),
    fetchStockCategoryMovers('growth', 5),
  ]);

  const allItems = newsPayload.items;
  const NEWS = allItems.map(toNewsView);
  const MOVERS = buildMoverSections(moversPayload);
  const TICKERS: TickerView[] = newsPayload.prices
    .filter(price => price.available && price.price !== null)
    .map(price => {
      const stock = config?.watchlist.find(item => item.symbol === price.symbol);
      const change = finite(price.changePercent) ?? 0;
      return {
        sym: price.symbol,
        name: stock?.name ?? price.symbol,
        px: formatCurrency(price.price),
        chg: formatPercent(price.changePercent),
        up: change >= 0,
      };
    })
    .slice(0, 18);
  const CHIPS = (config?.filters ?? []).map(filter => ({
    key: filter.key,
    label: FILTER_LABELS[filter.key] ?? filter.key,
  }));
  const SUMMARY = [
    { k: 'عدد الأخبار', v: new Intl.NumberFormat('ar-KW').format(allItems.length) },
    { k: 'عدد الرموز', v: new Intl.NumberFormat('ar-KW').format(config?.watchlist.length ?? 0) },
    { k: 'مصدر الأخبار', v: newsPayload.source },
    { k: 'مصدر الأسعار', v: newsPayload.priceSource },
  ];

  return (
    <main className="sfm" dir="rtl">
      <div className="layout">
        <aside className="nav" aria-label="تنقل أخبار السوق">
          <div className="brand">
            <strong>THE SFM</strong>
            <span>أسرار السوق الذكي</span>
          </div>
          <nav>
            {NAV_SUB.map(item => (
              <a key={item.href} className={item.active ? 'active' : ''} href={item.href}>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </aside>

        <section className="main">
          <div className="ticker" aria-label="شريط أسعار أسهم النمو">
            <strong>شريط أسهم النمو</strong>
            {TICKERS.length > 0 ? (
              <div className="ticker-track">
                {[...TICKERS, ...TICKERS].map((item, index) => (
                  <span className="tk" key={`${item.sym}-${index}`}>
                    <b dir="ltr">{item.sym}</b>
                    <span dir="ltr">{item.px}</span>
                    <em className={item.up ? 'up' : 'down'} dir="ltr">{item.chg}</em>
                  </span>
                ))}
              </div>
            ) : (
              <span className="warn">لا توجد بيانات كافية لعرض شريط أسهم النمو.</span>
            )}
          </div>

          <div className="container">
            <div className="page-head">
              <div>
                <span className="pill">تصنيف استثماري للنمو</span>
                <h1>أخبار أسهم النمو</h1>
                <p>
                  أخبار وتحليلات عن الشركات التي تركز على التوسع السريع ونمو الإيرادات والابتكار.
                </p>
              </div>
              <a className="refresh" href="/growth-stocks">تحديث البيانات</a>
            </div>

            <section className="edu-card intro-card" aria-label="شرح أسهم النمو">
              <div className="intro-icon" aria-hidden="true">نمو</div>
              <div className="block-title">
                <span>معلومة تعليمية</span>
                <h2>ما هي أسهم النمو؟</h2>
              </div>
              <p>
                أسهم النمو هي أسهم شركات يتوقع المستثمرون أن تنمو إيراداتها وأرباحها بمعدل أسرع من متوسط السوق. غالبًا تعيد هذه الشركات استثمار أرباحها في التوسع بدلًا من توزيع أرباح نقدية، وقد تكون أكثر حساسية للتقييمات المرتفعة والتقلبات.
              </p>
              <div className="comparison-title">
                <span>أسهم النمو مقارنة بأسهم القيمة</span>
              </div>
              <div className="compare-grid">
                {COMPARE.map(item => (
                  <article className={`compare-card ${item.tone}`} key={item.title}>
                    <h3>{item.title}</h3>
                    <ul>
                      {item.items.map(point => (
                        <li key={point}>
                          <span aria-hidden="true">{item.tone === 'defensive' ? '✓' : '•'}</span>
                          <b>{point}</b>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <GrowthStocksInteractive news={NEWS} chips={CHIPS} summary={SUMMARY} />

            <section className="movers">
              <div className="section-head">
                <span>بيانات سوق حقيقية</span>
                <h2>حركة أسهم النمو</h2>
                <p>ملخص مختصر لأداء أسهم النمو من Yahoo Finance عند توفر البيانات.</p>
              </div>
              {MOVERS.length > 0 ? (
                <div className="movers-grid">
                  {MOVERS.map(section => (
                    <article className={`mover-card ${section.accent}`} key={section.title}>
                      <h3>{section.title}</h3>
                      {section.rows.slice(0, 2).map((row, index) => (
                        <div className="mover-row" key={`${section.title}-${row.sym}`}>
                          <b>{index + 1}</b>
                          <span dir="ltr">{row.sym}</span>
                          <small>{row.name}</small>
                          <strong dir="ltr">{row.px}</strong>
                          <em className={row.up ? 'up' : 'down'} dir="ltr">{row.chg}</em>
                          {row.vol ? <i>{row.vol}</i> : null}
                        </div>
                      ))}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty">لا توجد بيانات سوق كافية لعرض حركة أسهم النمو حاليًا.</div>
              )}
            </section>

            <section className="sectors">
              <div className="section-head">
                <span>دليل تعليمي</span>
                <h2>أبرز قطاعات النمو</h2>
                <p>هذه أمثلة لقوائم متابعة تعليمية وليست توصيات شراء أو بيع.</p>
              </div>
              <div className="sectors-grid">
                {SECTORS.map(item => (
                  <article className="sector-card" key={item.title}>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <div>
                      {item.symbols.map(symbol => <span key={symbol} dir="ltr">{symbol}</span>)}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="disclaimer">
              <h2>تنبيه استثماري</h2>
              <p>
                أسهم النمو قد تقدم فرصًا مرتفعة للنمو، لكنها قد تكون أكثر حساسية للتقييمات المرتفعة وارتفاع أسعار الفائدة وتقلبات السوق. هذه الصفحة لأغراض تعليمية وليست توصية استثمارية.
              </p>
            </section>
          </div>
        </section>
      </div>
      <style>{CSS}</style>
    </main>
  );
}

const CSS = `
.sfm {
  --nav-width: 292px;
  --bg: #edf7ff;
  --panel: rgba(255,255,255,.92);
  --panel2: rgba(248,252,255,.86);
  --line: rgba(139,184,217,.35);
  --text: #071a35;
  --muted: #60718c;
  --cyan: #05b8d8;
  --blue: #1976f3;
  --green: #16a66a;
  --red: #df3b4a;
  --amber: #d98910;
  min-height: 100vh;
  background:
    radial-gradient(circle at 15% 5%, rgba(5,184,216,.18), transparent 30%),
    linear-gradient(180deg, #eaf6ff 0%, #f7fbff 46%, #eef7ff 100%);
  color: var(--text);
  font-family: var(--font-tajawal), 'Tajawal', system-ui, sans-serif;
}
.dark .sfm {
  --bg: #061425;
  --panel: rgba(10,26,45,.88);
  --panel2: rgba(13,36,61,.76);
  --line: rgba(91,178,220,.24);
  --text: #edf8ff;
  --muted: #a9bdd2;
  background:
    radial-gradient(circle at 16% 4%, rgba(5,184,216,.2), transparent 28%),
    linear-gradient(180deg, #041020 0%, #071827 52%, #061425 100%);
}
.layout {
  width: 100%;
  min-height: 100vh;
}
.main {
  min-width: 0;
  margin-inline-start: var(--nav-width);
  padding: 24px 32px 48px;
}
.nav {
  position: fixed;
  inset-block: 0;
  inset-inline-start: 0;
  z-index: 30;
  width: var(--nav-width);
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid var(--line);
  border-block: 0;
  border-inline-start: 0;
  border-radius: 0 0 0 30px;
  background: linear-gradient(180deg, rgba(5,28,50,.96), rgba(7,44,72,.9));
  color: #e9f8ff;
  padding: 20px;
  box-shadow: -18px 0 54px rgba(4,29,57,.18);
  scrollbar-width: thin;
}
[dir="ltr"] .sfm .nav {
  border-radius: 0 0 30px 0;
  box-shadow: 18px 0 54px rgba(4,29,57,.18);
}
.brand {
  display: grid;
  gap: 4px;
  padding: 10px 12px 18px;
  border-bottom: 1px solid rgba(255,255,255,.1);
  margin-bottom: 12px;
}
.brand strong { font-size: 1.25rem; letter-spacing: .02em; }
.brand span { color: rgba(233,248,255,.72); font-size: .86rem; }
.nav nav { display: grid; gap: 8px; }
.nav a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  border-radius: 16px;
  padding: 0 14px;
  color: rgba(233,248,255,.82);
  text-decoration: none;
  border: 1px solid transparent;
  transition: background .2s ease, border-color .2s ease, transform .2s ease;
}
.nav a:hover { background: rgba(255,255,255,.08); transform: translateY(-1px); }
.nav a.active {
  color: #fff;
  background: linear-gradient(135deg, rgba(25,118,243,.45), rgba(5,184,216,.24));
  border-color: rgba(89,197,245,.45);
}
.ticker {
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: var(--panel);
  padding: 10px 14px;
  box-shadow: 0 14px 36px rgba(15,74,117,.08);
  max-width: 1440px;
  margin-inline: auto;
}
.ticker > strong {
  flex: 0 0 auto;
  color: var(--text);
  white-space: nowrap;
}
.ticker-track {
  display: flex;
  gap: 10px;
  min-width: max-content;
  animation: sfmTicker 42s linear infinite;
}
.ticker:hover .ticker-track { animation-play-state: paused; }
.tk {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel2);
  padding: 8px 12px;
  font-size: .86rem;
}
.tk b { color: var(--blue); }
.up { color: var(--green); }
.down { color: var(--red); }
.warn {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(217,137,16,.28);
  background: rgba(255,244,220,.72);
  color: #8a5600;
  padding: 8px 12px;
  font-weight: 700;
}
.dark .warn { background: rgba(217,137,16,.16); color: #ffd28a; }
.container {
  display: grid;
  gap: 22px;
  width: 100%;
  max-width: 1440px;
  margin: 18px auto 0;
}
.page-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  border: 1px solid var(--line);
  border-radius: 34px;
  padding: 34px;
  background:
    linear-gradient(135deg, rgba(255,255,255,.94), rgba(230,248,255,.82)),
    radial-gradient(circle at 10% 0%, rgba(5,184,216,.16), transparent 35%);
  box-shadow: 0 22px 60px rgba(15,74,117,.1);
}
.dark .page-head {
  background:
    linear-gradient(135deg, rgba(10,29,51,.94), rgba(7,49,76,.74)),
    radial-gradient(circle at 10% 0%, rgba(5,184,216,.2), transparent 35%);
}
.pill, .badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  border-radius: 999px;
  border: 1px solid rgba(5,184,216,.35);
  background: rgba(5,184,216,.1);
  color: #087a92;
  padding: 8px 12px;
  font-size: .82rem;
  font-weight: 800;
}
.dark .pill, .dark .badge { color: #9aebff; background: rgba(5,184,216,.16); }
.page-head h1 {
  margin: 14px 0 10px;
  font-size: clamp(2.1rem, 5vw, 4rem);
  line-height: 1.05;
  letter-spacing: 0;
}
.page-head p {
  max-width: 760px;
  margin: 0;
  color: var(--muted);
  font-size: 1.06rem;
  line-height: 1.9;
}
.refresh, .hero a, .ncard a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  border-radius: 16px;
  padding: 0 18px;
  border: 0;
  color: #fff;
  text-decoration: none;
  font-weight: 900;
  background: linear-gradient(135deg, var(--blue), var(--cyan));
  box-shadow: 0 14px 28px rgba(5,154,216,.2);
}
.feat-panel, .edu-card, .side-card, .movers, .sectors, .disclaimer {
  border: 1px solid var(--line);
  border-radius: 30px;
  background: var(--panel);
  box-shadow: 0 18px 48px rgba(15,74,117,.08);
}
.intro-card {
  position: relative;
  overflow: hidden;
  padding-inline-start: 110px;
}
.intro-card::before {
  content: "";
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 7px;
  background: linear-gradient(180deg, var(--cyan), var(--green));
}
.intro-icon {
  position: absolute;
  inset-block-start: 26px;
  inset-inline-start: 26px;
  display: grid;
  place-items: center;
  width: 74px;
  height: 74px;
  border-radius: 24px;
  border: 1px solid rgba(5,184,216,.28);
  background: linear-gradient(135deg, rgba(5,184,216,.14), rgba(22,166,106,.12));
  color: var(--blue);
  font-size: .92rem;
  font-weight: 900;
}
.feat-panel { padding: 22px; }
.feat-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  margin-bottom: 16px;
}
.feat-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(280px, .7fr);
  gap: 16px;
}
.hero, .mini-list a, .compare-card, .ncard, .sector-card, .mover-card {
  border: 1px solid var(--line);
  border-radius: 24px;
  background: var(--panel2);
}
.hero { padding: 28px; }
.hero h2, .ncard h3 {
  margin: 0 0 12px;
  line-height: 1.35;
  font-size: 1.45rem;
}
.hero p, .ncard p, .edu-card p, .sector-card p, .compare-card p, .section-head p, .disclaimer p {
  color: var(--muted);
  line-height: 1.85;
  margin: 0;
}
.meta, .market-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 18px 0;
}
.meta span, .meta em, .market-row b, .market-row em {
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,.55);
  padding: 7px 10px;
  font-style: normal;
  font-weight: 900;
}
.dark .meta span, .dark .meta em, .dark .market-row b, .dark .market-row em { background: rgba(255,255,255,.05); }
.mini-list { display: grid; gap: 12px; }
.mini-list a, .latest a {
  display: grid;
  gap: 6px;
  text-decoration: none;
  color: var(--text);
  padding: 16px;
}
.mini-list small, .latest span, .rank-row small, .nmeta span, .market-row span {
  color: var(--muted);
}
.edu-card, .movers, .sectors, .disclaimer { padding: 26px; }
.block-title span, .section-head span {
  color: var(--cyan);
  font-weight: 900;
}
.block-title h2, .section-head h2, .disclaimer h2 {
  margin: 6px 0 12px;
  font-size: 1.65rem;
}
.comparison-title {
  margin-top: 22px;
  color: var(--text);
  font-size: 1.15rem;
  font-weight: 900;
}
.compare-grid, .sectors-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}
.compare-card, .sector-card { padding: 18px; }
.compare-card h3, .sector-card h3, .mover-card h3, .side-card h3 {
  margin: 0 0 10px;
  font-size: 1.05rem;
}
.compare-card ul {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.compare-card li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--text);
  line-height: 1.6;
}
.compare-card li span {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  font-weight: 900;
}
.compare-card.defensive li span {
  background: rgba(22,166,106,.12);
  color: var(--green);
}
.compare-card.cyclical li span {
  background: rgba(217,137,16,.14);
  color: var(--amber);
}
.search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 12px;
}
.search input, .search button {
  min-height: 54px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text);
  font: inherit;
  padding: 0 16px;
}
.search button {
  cursor: pointer;
  color: #fff;
  font-weight: 900;
  border: 0;
  background: linear-gradient(135deg, var(--blue), var(--cyan));
}
.chips {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.chips button {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex: 0 0 auto;
  min-height: 42px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text);
  text-decoration: none;
  padding: 0 14px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}
.chips button.active {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, var(--blue), var(--cyan));
}
.chips b {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  border-radius: 999px;
  background: rgba(255,255,255,.5);
  font-size: .78rem;
}
.content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;
}
.news-area {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.news-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: var(--panel);
  padding: 18px 20px;
}
.news-heading span {
  color: var(--cyan);
  font-weight: 900;
}
.news-heading h2 {
  margin: 4px 0 0;
  font-size: 1.5rem;
}
.news-heading > b {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(5,184,216,.32);
  background: rgba(5,184,216,.1);
  color: var(--blue);
  padding: 0 12px;
}
.news-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  min-width: 0;
}
.ncard {
  display: flex;
  min-width: 0;
  min-height: 330px;
  flex-direction: column;
  padding: 20px;
}
.nmeta {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 12px;
}
.market-row {
  font-size: .88rem;
  margin: 16px 0;
}
.ncard a { margin-top: auto; }
.load-more {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  padding-top: 8px;
}
.load-more button, .load-more span {
  display: inline-flex;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text);
  padding: 0 18px;
  text-decoration: none;
  font: inherit;
  font-weight: 900;
}
.load-more button {
  cursor: pointer;
}
.load-more button:hover {
  border-color: rgba(5,184,216,.45);
  color: var(--blue);
}
.sidebar {
  display: grid;
  gap: 14px;
  position: sticky;
  top: 18px;
}
.side-card { padding: 18px; }
.latest { display: grid; gap: 10px; }
.ranked, .sources, .summary { display: grid; gap: 10px; }
.rank-row, .sources div, .summary div {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 10px;
}
.rank-row b {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: rgba(25,118,243,.12);
  color: var(--blue);
}
.rank-row em, .sources b, .summary b {
  font-style: normal;
  font-weight: 900;
  color: var(--green);
}
.sources div, .summary div {
  grid-template-columns: minmax(0,1fr) auto;
}
.movers-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}
.mover-card { padding: 16px; }
.mover-card.up { border-color: rgba(22,166,106,.28); }
.mover-card.down { border-color: rgba(223,59,74,.25); }
.mover-card.vol { border-color: rgba(5,184,216,.28); }
.mover-row {
  display: grid;
  grid-template-columns: 28px 58px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  border-top: 1px solid var(--line);
  padding: 10px 0;
}
.mover-row strong, .mover-row em, .mover-row i {
  grid-column: 2 / -1;
  font-style: normal;
  color: var(--muted);
}
.mover-row em { font-weight: 900; }
.sector-card div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
.sector-card span {
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(25,118,243,.08);
  color: var(--blue);
  padding: 7px 10px;
  font-weight: 900;
}
.empty {
  border: 1px dashed var(--line);
  border-radius: 24px;
  background: var(--panel2);
  padding: 24px;
  color: var(--muted);
  line-height: 1.8;
}
@keyframes sfmTicker {
  from { transform: translateX(0); }
  to { transform: translateX(50%); }
}
@media (prefers-reduced-motion: reduce) {
  .ticker-track { animation: none; }
}
@media (max-width: 1280px) {
  .news-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .content { grid-template-columns: minmax(0, 1fr); }
  .sidebar { position: static; grid-template-columns: repeat(2, minmax(0,1fr)); }
}
@media (max-width: 1024px) {
  .nav { display: none; }
  .main { margin-inline-start: 0; padding: 18px 16px 38px; }
}
@media (max-width: 860px) {
  .main { padding-inline: 12px; }
  .ticker { align-items: flex-start; flex-direction: column; }
  .ticker-track { animation: none; overflow-x: auto; width: 100%; padding-bottom: 4px; }
  .page-head { align-items: stretch; flex-direction: column; padding: 24px; }
  .intro-card { padding-inline-start: 26px; padding-top: 112px; }
  .intro-icon { inset-block-start: 24px; }
  .feat-grid, .compare-grid, .news-grid, .movers-grid, .sectors-grid, .sidebar { grid-template-columns: minmax(0,1fr); }
  .search { grid-template-columns: minmax(0,1fr); }
  .refresh, .search button { width: 100%; }
}
`;
