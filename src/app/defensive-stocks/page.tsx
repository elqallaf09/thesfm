import type { Metadata } from 'next';
import { fetchStockCategoryMovers, type StockCategoryMoverItem } from '@/lib/market/fetchStockCategoryMovers';
import { fetchStockCategoryNews, type StockCategoryNewsItem } from '@/lib/market/fetchStockCategoryNews';
import { getStockCategoryConfig, type StockCategoryFilterKey } from '@/lib/market/stockCategoryConfigs';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'أخبار الأسهم الدفاعية | THE SFM',
  description: 'تابع أخبار الشركات والقطاعات الدفاعية وبيانات السوق الحقيقية من مصادر Finnhub وYahoo Finance.',
};

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

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
};

type RankedView = {
  sym: string;
  name: string;
  count: number;
};

type SourceView = {
  name: string;
  count: number;
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
  consumer_staples: 'السلع الاستهلاكية الأساسية',
  healthcare: 'الرعاية الصحية',
  utilities: 'المرافق العامة',
  telecom: 'الاتصالات',
  food_beverage: 'الأغذية والمشروبات',
  essential_retail: 'التجزئة الأساسية',
  pharmaceuticals: 'الأدوية',
  insurance_stable: 'التأمين والخدمات المستقرة',
};

const NAV_SUB = [
  { label: 'تحليلات السوق', href: '/market-analysis' },
  { label: 'أخبار أسواق الخليج', href: '/gulf-news' },
  { label: 'أخبار الأسواق الأوروبية', href: '/europe-news' },
  { label: 'أخبار السوق التقني', href: '/tech-news' },
  { label: 'أخبار الأسهم الدفاعية', href: '/defensive-stocks', active: true },
  { label: 'أخبار أسهم النمو', href: '/growth-stocks' },
  { label: 'أخبار أسهم التوزيعات', href: '/dividend-stocks' },
  { label: 'أخبار الأسهم الدورية', href: '/cyclical-stocks' },
  { label: 'أخبار الطاقة', href: '/energy-stocks' },
  { label: 'أخبار البنوك', href: '/banking-stocks' },
  { label: 'أخبار الأسهم الشرعية', href: '/sharia-stocks' },
];

const COMPARE = [
  {
    title: 'الأسهم الدفاعية',
    text: 'تركّز على شركات تقدم منتجات أو خدمات أساسية، وقد يكون الطلب عليها أكثر استقرارًا نسبيًا وقت التقلبات.',
  },
  {
    title: 'الأسهم الدورية',
    text: 'تتأثر عادةً بدورات الاقتصاد والإنفاق، وقد ترتفع بقوة وقت الانتعاش وتتراجع وقت الركود.',
  },
];

const SECTORS = [
  {
    title: 'السلع الاستهلاكية الأساسية',
    text: 'شركات الأغذية والمشروبات والمنتجات المنزلية التي يظل الطلب عليها حاضرًا في أغلب الظروف.',
    symbols: ['PG', 'KO', 'PEP', 'WMT', 'COST'],
  },
  {
    title: 'الرعاية الصحية',
    text: 'شركات الأدوية والخدمات الصحية التي ترتبط باحتياجات أساسية طويلة الأجل.',
    symbols: ['JNJ', 'MRK', 'PFE', 'ABBV', 'UNH'],
  },
  {
    title: 'المرافق العامة',
    text: 'شركات الكهرباء والمياه والبنية الخدمية التي تميل إيراداتها إلى الاستقرار النسبي.',
    symbols: ['NEE', 'DUK', 'SO', 'AEP'],
  },
  {
    title: 'الاتصالات',
    text: 'مزودو خدمات الاتصال والبيانات التي تُعد من الخدمات الأساسية للمستهلكين والشركات.',
    symbols: ['VZ', 'T'],
  },
];

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

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

function itemMatchesFilter(item: StockCategoryNewsItem, filter: StockCategoryFilterKey) {
  if (filter === 'all') return true;
  return item.sector === filter || item.sectors.includes(filter);
}

function itemMatchesQuery(item: StockCategoryNewsItem, query: string) {
  if (!query) return true;
  const haystack = [
    item.ticker,
    item.companyName,
    item.title,
    item.summary,
    item.source,
    item.sector,
    ...item.sectors,
  ].join(' ').toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function countByFilter(items: StockCategoryNewsItem[], filter: StockCategoryFilterKey) {
  return items.filter(item => itemMatchesFilter(item, filter)).length;
}

function toNewsView(item: StockCategoryNewsItem): NewsView {
  const changePercent = finite(item.changePercent) ?? 0;
  return {
    sym: item.ticker || 'DEF',
    name: item.companyName || 'سهم دفاعي',
    px: item.price === null ? 'غير متاح' : formatCurrency(item.price),
    chg: item.changePercent === null ? 'غير متاح' : formatPercent(item.changePercent),
    up: changePercent >= 0,
    title: trimText(item.title, 'خبر من مصدر سوق حقيقي', 110),
    desc: trimText(item.summary, item.title || 'لا يتوفر ملخص لهذا الخبر حاليًا.', 190),
    src: item.source || 'مصدر سوق',
    date: formatDate(item.publishedAt),
    url: item.url || '#',
  };
}

function buildRanked(items: StockCategoryNewsItem[]) {
  const map = new Map<string, RankedView>();
  items.forEach(item => {
    const sym = item.ticker?.trim().toUpperCase();
    if (!sym || sym === 'DEFENSIVE') return;
    const current = map.get(sym);
    map.set(sym, {
      sym,
      name: current?.name ?? item.companyName ?? sym,
      count: (current?.count ?? 0) + 1,
    });
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
}

function buildSources(items: StockCategoryNewsItem[]) {
  const map = new Map<string, number>();
  items.forEach(item => {
    const source = item.source?.trim() || 'مصدر سوق';
    map.set(source, (map.get(source) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
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
      title: 'أعلى 5 أسهم دفاعية ارتفاعًا',
      accent: 'up',
      rows: response.data.topGainers.map(mapMoverRow),
    },
    {
      title: 'أكثر 5 أسهم دفاعية انخفاضًا',
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

function buildUrl(filter: string, query: string) {
  const params = new URLSearchParams();
  if (filter && filter !== 'all') params.set('filter', filter);
  if (query) params.set('q', query);
  const suffix = params.toString();
  return suffix ? `/defensive-stocks?${suffix}` : '/defensive-stocks';
}

export default async function DefensiveStocksPage({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  const config = getStockCategoryConfig('defensive');
  const selectedFilter = single(params.filter) || 'all';
  const query = single(params.q)?.trim() || '';

  const [newsPayload, moversPayload] = await Promise.all([
    fetchStockCategoryNews('defensive', 'ar'),
    fetchStockCategoryMovers('defensive', 5),
  ]);

  const allItems = newsPayload.items;
  const filteredItems = allItems.filter(item => itemMatchesFilter(item, selectedFilter) && itemMatchesQuery(item, query));
  const NEWS = filteredItems.map(toNewsView);
  const FEATURED = NEWS[0] ?? null;
  const MINI = NEWS.slice(1, 4);
  const LATEST = NEWS.slice(0, 4);
  const RANKED = buildRanked(filteredItems.length > 0 ? filteredItems : allItems);
  const SOURCES = buildSources(filteredItems.length > 0 ? filteredItems : allItems);
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
    count: countByFilter(allItems, filter.key),
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
          <div className="ticker" aria-label="شريط أسعار الأسهم الدفاعية">
            <strong>شريط الأسهم الدفاعية</strong>
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
              <span className="warn">لا توجد بيانات كافية لعرض شريط الأسهم الدفاعية.</span>
            )}
          </div>

          <div className="container">
            <div className="page-head">
              <div>
                <span className="pill">تصنيف استثماري دفاعي</span>
                <h1>أخبار الأسهم الدفاعية</h1>
                <p>
                  تابع أخبار الشركات والقطاعات التي تميل إلى الاستقرار أثناء تقلبات السوق،
                  مثل السلع الأساسية، الرعاية الصحية، المرافق، والاتصالات.
                </p>
              </div>
              <a className="refresh" href="/defensive-stocks">تحديث البيانات</a>
            </div>

            <section className="feat-panel" aria-label="أحدث خبر دفاعي بارز">
              {FEATURED ? (
                <>
                  <div className="feat-head">
                    <span className="badge" dir="ltr">{FEATURED.sym}</span>
                    <span>{FEATURED.src}</span>
                    <span>{FEATURED.date}</span>
                  </div>
                  <div className="feat-grid">
                    <article className="hero">
                      <h2>{FEATURED.title}</h2>
                      <p>{FEATURED.desc}</p>
                      <div className="meta">
                        <span dir="ltr">{FEATURED.px}</span>
                        <em className={FEATURED.up ? 'up' : 'down'} dir="ltr">{FEATURED.chg}</em>
                      </div>
                      <a href={FEATURED.url} target="_blank" rel="noreferrer">قراءة الخبر</a>
                    </article>
                    <div className="mini-list">
                      {MINI.length > 0 ? MINI.map(item => (
                        <a href={item.url} target="_blank" rel="noreferrer" key={`${item.sym}-${item.title}`}>
                          <b dir="ltr">{item.sym}</b>
                          <span>{item.title}</span>
                          <small>{item.date}</small>
                        </a>
                      )) : (
                        <div className="empty">لا توجد أخبار إضافية من المصادر المتاحة حاليًا.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty">
                  <h2>لا توجد أخبار حاليًا في هذا التصنيف</h2>
                  <p>جرّب تصنيفًا آخر أو ابحث عن شركة محددة.</p>
                </div>
              )}
            </section>

            <section className="edu-card">
              <div className="block-title">
                <span>معلومة تعليمية</span>
                <h2>ما هي الأسهم الدفاعية؟</h2>
              </div>
              <p>
                الأسهم الدفاعية هي أسهم شركات تقدم منتجات أو خدمات أساسية يظل الطلب عليها مستقرًا نسبيًا
                حتى أثناء فترات الركود أو تقلبات السوق، مثل الغذاء، الدواء، الكهرباء، الماء، الاتصالات،
                والسلع الاستهلاكية الأساسية.
              </p>
              <div className="compare-grid">
                {COMPARE.map(item => (
                  <article className="compare-card" key={item.title}>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            </section>

            <form className="search" action="/defensive-stocks">
              <input type="hidden" name="filter" value={selectedFilter} />
              <input
                name="q"
                defaultValue={query}
                placeholder="ابحث عن سهم أو شركة أو تصنيف..."
                aria-label="البحث في أخبار الأسهم الدفاعية"
              />
              <button type="submit">بحث</button>
            </form>

            <div className="chips" aria-label="تصنيفات الأسهم الدفاعية">
              {CHIPS.map(chip => (
                <a
                  key={chip.key}
                  href={buildUrl(chip.key, query)}
                  className={chip.key === selectedFilter ? 'active' : ''}
                >
                  <span>{chip.label}</span>
                  <b>{chip.count}</b>
                </a>
              ))}
            </div>

            <div className="content">
              <section className="news-grid" aria-label="أخبار الأسهم الدفاعية">
                {NEWS.length > 0 ? NEWS.map(item => (
                  <article className="ncard" key={`${item.sym}-${item.url}`}>
                    <div className="nmeta">
                      <span className="badge" dir="ltr">{item.sym}</span>
                      <span>{item.name}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <div className="market-row">
                      <span>{item.src}</span>
                      <span>{item.date}</span>
                      <b dir="ltr">{item.px}</b>
                      <em className={item.up ? 'up' : 'down'} dir="ltr">{item.chg}</em>
                    </div>
                    <a href={item.url} target="_blank" rel="noreferrer">قراءة الخبر</a>
                  </article>
                )) : (
                  <div className="empty">
                    <h3>لا توجد أخبار حاليًا في هذا التصنيف</h3>
                    <p>جرّب تصنيفًا آخر أو ابحث عن شركة محددة.</p>
                  </div>
                )}
              </section>

              <aside className="sidebar">
                <section className="side-card latest">
                  <h3>أحدث الأخبار</h3>
                  {LATEST.length > 0 ? LATEST.map(item => (
                    <a href={item.url} target="_blank" rel="noreferrer" key={`${item.url}-latest`}>
                      <b dir="ltr">{item.sym}</b>
                      <span>{item.title}</span>
                    </a>
                  )) : <p>لا توجد أخبار حديثة متاحة حاليًا.</p>}
                </section>

                <section className="side-card ranked">
                  <h3>الأسهم الدفاعية الأكثر ذكرًا</h3>
                  {RANKED.length > 0 ? RANKED.map((item, index) => (
                    <div className="rank-row" key={item.sym}>
                      <b>{index + 1}</b>
                      <span dir="ltr">{item.sym}</span>
                      <small>{item.name}</small>
                      <em>{item.count} أخبار</em>
                    </div>
                  )) : <p>لا توجد إشارات كافية بعد.</p>}
                </section>

                <section className="side-card sources">
                  <h3>مصادر الأخبار</h3>
                  {SOURCES.length > 0 ? SOURCES.map(item => (
                    <div key={item.name}>
                      <span>{item.name}</span>
                      <b>{item.count}</b>
                    </div>
                  )) : <p>لا توجد مصادر متاحة حاليًا.</p>}
                </section>

                <section className="side-card summary">
                  <h3>ملخص سريع</h3>
                  {SUMMARY.map(item => (
                    <div key={item.k}>
                      <span>{item.k}</span>
                      <b>{item.v}</b>
                    </div>
                  ))}
                </section>
              </aside>
            </div>

            <section className="movers">
              <div className="section-head">
                <span>بيانات سوق حقيقية</span>
                <h2>حركة الأسهم الدفاعية</h2>
                <p>ملخص مختصر لأداء الأسهم الدفاعية من Yahoo Finance عند توفر البيانات.</p>
              </div>
              {MOVERS.length > 0 ? (
                <div className="movers-grid">
                  {MOVERS.map(section => (
                    <article className={`mover-card ${section.accent}`} key={section.title}>
                      <h3>{section.title}</h3>
                      {section.rows.slice(0, 5).map((row, index) => (
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
                <div className="empty">لا توجد بيانات سوق كافية لعرض حركة الأسهم الدفاعية حاليًا.</div>
              )}
            </section>

            <section className="sectors">
              <div className="section-head">
                <span>دليل تعليمي</span>
                <h2>دليل القطاعات الدفاعية</h2>
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
              <h2>التنبيه الاستثماري</h2>
              <p>
                هذه المعلومات تعليمية وتحليلية فقط، ولا تُعد توصية شراء أو بيع أو نصيحة استثمارية.
                الأسهم الدفاعية قد تنخفض أيضًا، ولا يوجد أصل خالٍ من المخاطر.
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) 292px;
  gap: 22px;
  align-items: start;
  width: min(1560px, calc(100% - 32px));
  margin: 0 auto;
  padding: 22px 0 42px;
}
.main { min-width: 0; }
.nav {
  position: sticky;
  top: 18px;
  order: 2;
  border: 1px solid var(--line);
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(5,28,50,.96), rgba(7,44,72,.9));
  color: #e9f8ff;
  padding: 20px;
  box-shadow: 0 24px 60px rgba(4,29,57,.18);
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
.container { display: grid; gap: 22px; margin-top: 18px; }
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
.chips a {
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
  font-weight: 800;
}
.chips a.active {
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
.news-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  min-width: 0;
}
.ncard { padding: 20px; min-width: 0; }
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
@media (max-width: 1180px) {
  .layout { grid-template-columns: minmax(0,1fr); }
  .nav { position: static; order: 0; }
  .nav nav { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .content { grid-template-columns: minmax(0, 1fr); }
  .sidebar { position: static; grid-template-columns: repeat(2, minmax(0,1fr)); }
}
@media (max-width: 860px) {
  .layout { width: min(100% - 20px, 1560px); padding-top: 12px; }
  .ticker { align-items: flex-start; flex-direction: column; }
  .ticker-track { animation: none; overflow-x: auto; width: 100%; padding-bottom: 4px; }
  .page-head { align-items: stretch; flex-direction: column; padding: 24px; }
  .feat-grid, .compare-grid, .news-grid, .movers-grid, .sectors-grid, .sidebar { grid-template-columns: minmax(0,1fr); }
  .search { grid-template-columns: minmax(0,1fr); }
  .refresh, .search button { width: 100%; }
  .nav nav { grid-template-columns: minmax(0,1fr); }
}
`;
