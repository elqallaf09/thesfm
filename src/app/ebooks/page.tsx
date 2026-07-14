'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookMarked,
  BookOpen,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Languages,
  Library,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  X,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { DashboardPageShell } from '@/components/layout/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { AppCard } from '@/components/layout/AppCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import {
  EBOOK_CATEGORY_LABELS,
  EBOOK_LANGUAGE_LABELS,
  ebookText,
  ebooks,
  formatEbookSize,
  type Ebook,
  type EbookCategory,
  type EbookLanguage,
  type EbookLocale,
} from '@/data/ebooks';

type FilterId = 'all' | EbookCategory | EbookLanguage;

const UI_COPY: Record<EbookLocale, Record<string, string>> = {
  ar: {
    eyebrow: 'مكتبة تعليمية رقمية',
    title: 'كتب إلكترونية',
    heroTitle: 'مكتبة الكتب الإلكترونية',
    subtitle: 'مكتبة تعليمية تضم أدلة عملية في إدارة الأموال، التداول، ودراسة الجدوى.',
    searchPlaceholder: 'ابحث عن كتاب أو موضوع',
    searchLabel: 'البحث في الكتب الإلكترونية',
    all: 'الكل',
    booksCount: 'عدد الكتب',
    languagesCount: 'عدد اللغات',
    categoriesCount: 'عدد التصنيفات',
    latestAddition: 'أحدث إضافة',
    featuredBook: 'الكتاب المقترح',
    featuredReason: 'مناسب لمستخدمي صفحة تحليلات السوق والتداول.',
    allBooks: 'جميع الكتب',
    browseByCategory: 'تصفح حسب التصنيف',
    readingPath: 'مسار قراءة مقترح',
    readBook: 'قراءة الكتاب',
    downloadPdf: 'تحميل PDF',
    viewDetails: 'عرض التفاصيل',
    fileType: 'PDF',
    fileSize: 'حجم الملف',
    pages: 'صفحة',
    pageCount: 'عدد الصفحات',
    detailsTitle: 'تفاصيل الكتاب',
    whatYouWillLearn: 'ماذا ستتعلم؟',
    close: 'إغلاق',
    topics: 'الموضوعات',
    language: 'اللغة',
    category: 'التصنيف',
    emptyTitle: 'لا توجد كتب مطابقة لبحثك.',
    emptyBody: 'جرّب تغيير كلمات البحث أو الفلتر المحدد.',
    readingStepOne: 'ابدأ بكتاب المدخرات والاستثمار لبناء أساس مالي واضح.',
    readingStepTwo: 'ثم اقرأ قراءة شموع الأسهم وتحليلها لفهم حركة السعر ضمن سياق تداول منضبط.',
    readingStepThree: 'بعد ذلك اقرأ دراسة الجدوى: دليل عملي إذا كنت تخطط لمشروع أو قرار استثماري.',
    disclaimerTitle: 'تنبيه تعليمي',
    disclaimerBody: 'هذه الكتب لأغراض تعليمية وتثقيفية، ولا تُعد توصية مالية أو استثمارية.',
    relatedBooks: 'كتب مرتبطة',
    openReader: 'فتح القارئ',
    newest: 'إضافة حديثة',
    noPages: 'عدد الصفحات غير متاح',
  },
  en: {
    eyebrow: 'Digital education library',
    title: 'E-Books',
    heroTitle: 'E-Books Library',
    subtitle: 'An educational library with practical guides for personal finance, trading, and feasibility studies.',
    searchPlaceholder: 'Search for a book or topic',
    searchLabel: 'Search e-books',
    all: 'All',
    booksCount: 'Books',
    languagesCount: 'Languages',
    categoriesCount: 'Categories',
    latestAddition: 'Latest addition',
    featuredBook: 'Featured book',
    featuredReason: 'Suitable for Market Analysis and trading users.',
    allBooks: 'All books',
    browseByCategory: 'Browse by category',
    readingPath: 'Suggested reading path',
    readBook: 'Read book',
    downloadPdf: 'Download PDF',
    viewDetails: 'View details',
    fileType: 'PDF',
    fileSize: 'File size',
    pages: 'pages',
    pageCount: 'Pages',
    detailsTitle: 'Book details',
    whatYouWillLearn: 'What you will learn',
    close: 'Close',
    topics: 'Topics',
    language: 'Language',
    category: 'Category',
    emptyTitle: 'No books match your search.',
    emptyBody: 'Try changing the search terms or selected filter.',
    readingStepOne: 'Start with Savings and Investment to build a clear financial foundation.',
    readingStepTwo: 'Then read Reading and Analyzing Stock Candlesticks to understand price movement in a disciplined trading context.',
    readingStepThree: 'After that, read Feasibility Study: Practical Guide if you are planning a project or investment decision.',
    disclaimerTitle: 'Educational notice',
    disclaimerBody: 'These books are for educational purposes only and are not financial or investment advice.',
    relatedBooks: 'Related books',
    openReader: 'Open reader',
    newest: 'Recently added',
    noPages: 'Page count unavailable',
  },
  fr: {
    eyebrow: 'Bibliothèque éducative numérique',
    title: 'Livres électroniques',
    heroTitle: 'Bibliothèque de livres électroniques',
    subtitle: 'Une bibliothèque éducative avec des guides pratiques sur les finances personnelles, le trading et les études de faisabilité.',
    searchPlaceholder: 'Rechercher un livre ou un sujet',
    searchLabel: 'Rechercher dans les livres électroniques',
    all: 'Tout',
    booksCount: 'Livres',
    languagesCount: 'Langues',
    categoriesCount: 'Catégories',
    latestAddition: 'Dernier ajout',
    featuredBook: 'Livre recommandé',
    featuredReason: 'Adapté aux utilisateurs des analyses de marché et du trading.',
    allBooks: 'Tous les livres',
    browseByCategory: 'Parcourir par catégorie',
    readingPath: 'Parcours de lecture suggéré',
    readBook: 'Lire le livre',
    downloadPdf: 'Télécharger le PDF',
    viewDetails: 'Voir les détails',
    fileType: 'PDF',
    fileSize: 'Taille du fichier',
    pages: 'pages',
    pageCount: 'Pages',
    detailsTitle: 'Détails du livre',
    whatYouWillLearn: 'Ce que vous apprendrez',
    close: 'Fermer',
    topics: 'Sujets',
    language: 'Langue',
    category: 'Catégorie',
    emptyTitle: 'Aucun livre ne correspond à votre recherche.',
    emptyBody: 'Essayez de modifier les mots-clés ou le filtre sélectionné.',
    readingStepOne: 'Commencez par Épargne et investissement pour bâtir une base financière claire.',
    readingStepTwo: 'Lisez ensuite Lire et analyser les chandeliers des actions pour comprendre le mouvement des prix dans un cadre de trading discipliné.',
    readingStepThree: 'Lisez ensuite Étude de faisabilité : guide pratique si vous préparez un projet ou une décision d’investissement.',
    disclaimerTitle: 'Avis éducatif',
    disclaimerBody: 'Ces livres sont fournis à des fins éducatives et ne constituent pas un conseil financier ou d’investissement.',
    relatedBooks: 'Livres associés',
    openReader: 'Ouvrir le lecteur',
    newest: 'Ajout récent',
    noPages: 'Nombre de pages indisponible',
  },
};

const FILTERS: Array<{ id: FilterId; label: Record<EbookLocale, string> }> = [
  { id: 'all', label: { ar: 'الكل', en: 'All', fr: 'Tout' } },
  { id: 'personal-finance', label: { ar: 'إدارة الأموال', en: 'Personal finance', fr: 'Finances personnelles' } },
  { id: 'investment', label: { ar: 'الاستثمار', en: 'Investment', fr: 'Investissement' } },
  { id: 'trading', label: { ar: 'التداول', en: 'Trading', fr: 'Trading' } },
  { id: 'feasibility', label: { ar: 'دراسة الجدوى', en: 'Feasibility studies', fr: 'Études de faisabilité' } },
  { id: 'ar', label: { ar: 'العربية', en: 'Arabic', fr: 'Arabe' } },
  { id: 'en', label: { ar: 'الإنجليزية', en: 'English', fr: 'Anglais' } },
  { id: 'fr', label: { ar: 'الفرنسية', en: 'French', fr: 'Français' } },
  { id: 'multilingual', label: { ar: 'متعدد اللغات', en: 'Multilingual', fr: 'Multilingue' } },
];

function localeFrom(lang: string): EbookLocale {
  return lang === 'en' || lang === 'fr' ? lang : 'ar';
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function isCategoryFilter(filter: FilterId): filter is EbookCategory {
  return Object.prototype.hasOwnProperty.call(EBOOK_CATEGORY_LABELS, filter);
}

function isLanguageFilter(filter: FilterId): filter is EbookLanguage {
  return Object.prototype.hasOwnProperty.call(EBOOK_LANGUAGE_LABELS, filter);
}

function bookCategories(book: Ebook) {
  return Array.from(new Set([book.category, ...(book.categories ?? [])]));
}

function bookLanguages(book: Ebook) {
  return book.languages ?? (book.language === 'multilingual' ? [] : [book.language]);
}

function bookMatchesCategory(book: Ebook, category: EbookCategory) {
  return bookCategories(book).includes(category);
}

function bookMatchesFilter(book: Ebook, filter: FilterId) {
  if (filter === 'all') return true;
  if (isCategoryFilter(filter)) return bookMatchesCategory(book, filter);
  if (isLanguageFilter(filter)) {
    if (filter === 'multilingual') return book.language === 'multilingual';
    return book.language === filter || book.languages?.includes(filter);
  }
  return false;
}

function coverLabel(book: Ebook, locale: EbookLocale) {
  if (book.coverType === 'trading') return locale === 'ar' ? 'تداول' : locale === 'fr' ? 'Trading' : 'Trading';
  if (book.coverType === 'feasibility') return locale === 'ar' ? 'جدوى' : locale === 'fr' ? 'Faisabilité' : 'Feasibility';
  return locale === 'ar' ? 'مال' : locale === 'fr' ? 'Finance' : 'Finance';
}

function EbookCover({ book, locale }: { book: Ebook; locale: EbookLocale }) {
  return (
    <div className={`ebook-cover ebook-cover-${book.coverType}`} aria-hidden="true">
      <div className="ebook-cover-inner">
        <BookOpen size={28} />
        <span>{coverLabel(book, locale)}</span>
        <strong>{ebookText(book.title, locale)}</strong>
        <small>THE SFM</small>
      </div>
    </div>
  );
}

function EbookBadges({ book, locale }: { book: Ebook; locale: EbookLocale }) {
  const languageList = bookLanguages(book)
    .map(language => ebookText(EBOOK_LANGUAGE_LABELS[language], locale))
    .join(' · ');

  return (
    <div className="ebook-badges">
      <span>{ebookText(EBOOK_LANGUAGE_LABELS[book.language], locale)}</span>
      {book.language === 'multilingual' && languageList ? <span>{languageList}</span> : null}
      <span>{ebookText(EBOOK_CATEGORY_LABELS[book.category], locale)}</span>
      <span dir="ltr">PDF</span>
    </div>
  );
}

function EbookActions({ book, text }: { book: Ebook; text: Record<string, string> }) {
  return (
    <div className="ebook-actions">
      <Link href={`/ebooks/${book.slug}`} className="ebook-primary-action">
        <BookOpen size={16} aria-hidden="true" />
        {text.readBook}
      </Link>
      <a href={book.fileUrl} download={book.fileName} className="ebook-secondary-action">
        <Download size={16} aria-hidden="true" />
        {text.downloadPdf}
      </a>
    </div>
  );
}

function EbookCard({
  book,
  locale,
  text,
  onDetails,
}: {
  book: Ebook;
  locale: EbookLocale;
  text: Record<string, string>;
  onDetails: (book: Ebook) => void;
}) {
  const size = formatEbookSize(book.fileSizeBytes);
  return (
    <article className="ebook-card">
      <EbookCover book={book} locale={locale} />
      <div className="ebook-card-body">
        <EbookBadges book={book} locale={locale} />
        <h3>{ebookText(book.title, locale)}</h3>
        <p>{ebookText(book.description, locale)}</p>
        <div className="ebook-topic-row">
          {book.topics.slice(0, 4).map(topic => (
            <span key={ebookText(topic, 'en')}>{ebookText(topic, locale)}</span>
          ))}
        </div>
        <div className="ebook-meta-row">
          <span><FileText size={15} aria-hidden="true" />{text.fileType}</span>
          {book.pages ? <span><BookOpen size={15} aria-hidden="true" /><span dir="ltr">{book.pages}</span> {text.pages}</span> : null}
          {size ? <span dir="ltr">{size}</span> : <span>{text.noPages}</span>}
        </div>
        <EbookActions book={book} text={text} />
        <button type="button" className="ebook-detail-button" onClick={() => onDetails(book)}>
          <Eye size={15} aria-hidden="true" />
          {text.viewDetails}
        </button>
      </div>
    </article>
  );
}

export default function EbooksPage() {
  const { lang, dir } = useLanguage();
  const locale = localeFrom(lang);
  const text = UI_COPY[locale];
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [selectedBook, setSelectedBook] = useState<Ebook | null>(null);

  const filteredBooks = useMemo(() => {
    const term = normalize(query);
    return ebooks.filter(book => {
      if (!bookMatchesFilter(book, activeFilter)) return false;
      if (!term) return true;
      const searchable = [
        ebookText(book.title, locale),
        ebookText(book.description, locale),
        ebookText(EBOOK_CATEGORY_LABELS[book.category], locale),
        ebookText(EBOOK_LANGUAGE_LABELS[book.language], locale),
        book.originalTitle,
        ...bookLanguages(book).map(language => ebookText(EBOOK_LANGUAGE_LABELS[language], locale)),
        ...bookCategories(book).map(category => ebookText(EBOOK_CATEGORY_LABELS[category], locale)),
        ...book.topics.flatMap(topic => [topic.ar, topic.en, topic.fr]),
        ...(book.searchTerms ?? []).flatMap(term => [term.ar, term.en, term.fr]),
      ].join(' ');
      return normalize(searchable).includes(term);
    });
  }, [activeFilter, locale, query]);

  const languageCount = new Set(ebooks.flatMap(bookLanguages)).size;
  const categoryCount = Object.keys(EBOOK_CATEGORY_LABELS).length;
  const featuredBook = ebooks[0];
  const latestBook = ebooks[0];
  const categorySummaries = (Object.keys(EBOOK_CATEGORY_LABELS) as EbookCategory[]).map(category => ({
    category,
    count: ebooks.filter(book => bookMatchesCategory(book, category)).length,
  }));

  return (
    <div className="ebooks-shell" dir={dir}>
      <DashboardPageShell ariaLabel={text.title} contentClassName="ebooks-content">
        <div className="sfm-page-topbar ebooks-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <PageHero
          className="ebooks-hero"
          eyebrow={text.eyebrow}
          title={text.heroTitle}
          subtitle={text.subtitle}
          icon={<Library size={30} />}
          status={<span className="ebooks-hero-note">{text.disclaimerBody}</span>}
        />

        <section className="ebooks-search-panel" aria-label={text.searchLabel}>
          <label className="ebooks-search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">{text.searchLabel}</span>
            <input
              type="search"
              value={query}
              placeholder={text.searchPlaceholder}
              onChange={event => setQuery(event.target.value)}
            />
          </label>
          <div className="ebooks-filter-row" role="tablist" aria-label={text.browseByCategory}>
            {FILTERS.map(filter => (
              <button
                key={filter.id}
                type="button"
                className={activeFilter === filter.id ? 'active' : ''}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label[locale]}
              </button>
            ))}
          </div>
        </section>

        <section className="ebooks-stats-grid" aria-label={text.booksCount}>
          <AppCard className="ebooks-stat-card">
            <BookOpen size={20} aria-hidden="true" />
            <span>{text.booksCount}</span>
            <strong dir="ltr">{ebooks.length}</strong>
          </AppCard>
          <AppCard className="ebooks-stat-card">
            <Languages size={20} aria-hidden="true" />
            <span>{text.languagesCount}</span>
            <strong dir="ltr">{languageCount}</strong>
          </AppCard>
          <AppCard className="ebooks-stat-card">
            <Tags size={20} aria-hidden="true" />
            <span>{text.categoriesCount}</span>
            <strong dir="ltr">{categoryCount}</strong>
          </AppCard>
          <AppCard className="ebooks-stat-card">
            <Sparkles size={20} aria-hidden="true" />
            <span>{text.latestAddition}</span>
            <strong>{ebookText(latestBook.title, locale)}</strong>
          </AppCard>
        </section>

        <section className="ebooks-featured-section" aria-labelledby="ebooks-featured-title">
          <div className="ebooks-section-head">
            <span>{text.featuredBook}</span>
            <h2 id="ebooks-featured-title">{ebookText(featuredBook.title, locale)}</h2>
            <p>{text.featuredReason}</p>
          </div>
          <article className="ebooks-featured-card">
            <EbookCover book={featuredBook} locale={locale} />
            <div className="ebooks-featured-copy">
              <EbookBadges book={featuredBook} locale={locale} />
              <h3>{ebookText(featuredBook.title, locale)}</h3>
              <p>{ebookText(featuredBook.description, locale)}</p>
              <div className="ebook-topic-row">
                {featuredBook.topics.slice(0, 6).map(topic => (
                  <span key={ebookText(topic, 'en')}>{ebookText(topic, locale)}</span>
                ))}
              </div>
              <EbookActions book={featuredBook} text={text} />
            </div>
          </article>
        </section>

        <section className="ebooks-grid-section" aria-labelledby="ebooks-grid-title">
          <div className="ebooks-section-head compact">
            <span>{filteredBooks.length} / {ebooks.length}</span>
            <h2 id="ebooks-grid-title">{text.allBooks}</h2>
          </div>

          {filteredBooks.length > 0 ? (
            <div className="ebooks-grid">
              {filteredBooks.map(book => (
                <EbookCard
                  key={book.id}
                  book={book}
                  locale={locale}
                  text={text}
                  onDetails={setSelectedBook}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookMarked size={28} />}
              title={text.emptyTitle}
              description={text.emptyBody}
            />
          )}
        </section>

        <section className="ebooks-category-section" aria-labelledby="ebooks-category-title">
          <div className="ebooks-section-head compact">
            <span>{text.browseByCategory}</span>
            <h2 id="ebooks-category-title">{text.browseByCategory}</h2>
          </div>
          <div className="ebooks-category-grid">
            {categorySummaries.map(item => (
              <button
                key={item.category}
                type="button"
                className={activeFilter === item.category ? 'active' : ''}
                onClick={() => setActiveFilter(item.category)}
              >
                <span>{ebookText(EBOOK_CATEGORY_LABELS[item.category], locale)}</span>
                <strong dir="ltr">{item.count}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="ebooks-reading-path" aria-labelledby="ebooks-reading-path-title">
          <div className="ebooks-section-head compact">
            <span>{text.readingPath}</span>
            <h2 id="ebooks-reading-path-title">{text.readingPath}</h2>
          </div>
          <div className="ebooks-path-grid">
            {[text.readingStepOne, text.readingStepTwo, text.readingStepThree].map((step, index) => (
              <AppCard key={step} className="ebooks-path-card">
                <span dir="ltr">{String(index + 1).padStart(2, '0')}</span>
                <p>{step}</p>
              </AppCard>
            ))}
          </div>
        </section>

        <section className="ebooks-disclaimer" aria-labelledby="ebooks-disclaimer-title">
          <ShieldCheck size={22} aria-hidden="true" />
          <div>
            <h2 id="ebooks-disclaimer-title">{text.disclaimerTitle}</h2>
            <p>{text.disclaimerBody}</p>
          </div>
        </section>
      </DashboardPageShell>

      {selectedBook ? (
        <div className="ebooks-modal-backdrop" role="presentation" onClick={() => setSelectedBook(null)}>
          <section
            className="ebooks-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ebooks-modal-title"
            onClick={event => event.stopPropagation()}
          >
            <button type="button" className="ebooks-modal-close" onClick={() => setSelectedBook(null)} aria-label={text.close}>
              <X size={18} aria-hidden="true" />
            </button>
            <EbookCover book={selectedBook} locale={locale} />
            <div className="ebooks-modal-copy">
              <span>{text.detailsTitle}</span>
              <h2 id="ebooks-modal-title">{ebookText(selectedBook.title, locale)}</h2>
              <p>{ebookText(selectedBook.description, locale)}</p>
              <dl>
                <div>
                  <dt>{text.language}</dt>
                  <dd>{ebookText(EBOOK_LANGUAGE_LABELS[selectedBook.language], locale)}</dd>
                </div>
                <div>
                  <dt>{text.category}</dt>
                  <dd>{ebookText(EBOOK_CATEGORY_LABELS[selectedBook.category], locale)}</dd>
                </div>
                <div>
                  <dt>{text.pageCount}</dt>
                  <dd dir="ltr">{selectedBook.pages ?? '-'}</dd>
                </div>
                <div>
                  <dt>{text.fileSize}</dt>
                  <dd dir="ltr">{formatEbookSize(selectedBook.fileSizeBytes) ?? '-'}</dd>
                </div>
              </dl>
              <div>
                <h3>{text.whatYouWillLearn}</h3>
                <ul>
                  {selectedBook.learningPoints.map(point => (
                    <li key={ebookText(point, 'en')}>{ebookText(point, locale)}</li>
                  ))}
                </ul>
              </div>
              <div className="ebook-topic-row">
                {selectedBook.topics.map(topic => (
                  <span key={ebookText(topic, 'en')}>{ebookText(topic, locale)}</span>
                ))}
              </div>
              <EbookActions book={selectedBook} text={text} />
            </div>
          </section>
        </div>
      ) : null}

      <style jsx global>{`
        .ebooks-shell {
          min-height: 100vh;
          display: flex;
          background: var(--background);
          color: var(--foreground);
          font-family: var(--font-ui);
          overflow-x: hidden;
        }

        .ebooks-shell .sfm-dashboard-page-shell {
          flex: 1;
          width: 100%;
          min-width: 0;
        }

        .ebooks-content {
          width: 100%;
          margin: 0 auto;
          padding: 28px clamp(16px, 3vw, 36px) 64px;
          display: grid;
          gap: 24px;
        }

        .ebooks-topbar {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          min-width: 0;
        }

        .ebooks-hero {
          position: relative;
          overflow: hidden;
          border-radius: var(--radius-panel);
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 22%, transparent);
          background: var(--hero-gradient);
          box-shadow: var(--shadow-lg);
          color: var(--hero-foreground);
        }

        .ebooks-hero .sfm-page-hero-icon {
          background: color-mix(in srgb, var(--hero-foreground) 11%, transparent);
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 18%, transparent);
          color: var(--hero-foreground-muted);
        }

        .ebooks-hero h1,
        .ebooks-hero p,
        .ebooks-hero span {
          color: inherit;
        }

        .ebooks-hero-note {
          display: inline-flex;
          max-width: 520px;
          padding: 10px 14px;
          border-radius: var(--radius-card);
          background: color-mix(in srgb, var(--hero-foreground) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 18%, transparent);
          color: var(--hero-foreground-muted);
          font-weight: 500;
          line-height: 1.7;
        }

        .ebooks-search-panel,
        .ebooks-featured-section,
        .ebooks-grid-section,
        .ebooks-category-section,
        .ebooks-reading-path,
        .ebooks-disclaimer {
          border-radius: var(--radius-card);
          border: 1px solid var(--border);
          background: var(--surface);
          box-shadow: var(--shadow-card);
        }

        .ebooks-search-panel {
          display: grid;
          gap: 16px;
          padding: 18px;
        }

        .ebooks-search-field {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 52px;
          padding: 0 16px;
          border-radius: var(--radius-control);
          border: 1px solid var(--border-strong);
          background: var(--control-background);
          color: var(--accent);
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .ebooks-search-field:focus-within {
          border-color: var(--focus-ring);
          box-shadow: var(--focus-shadow);
        }

        .ebooks-search-field input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--foreground);
          font: 400 15px/1.5 var(--font-ui);
        }

        .ebooks-search-field input::placeholder {
          color: var(--control-placeholder);
        }

        .ebooks-filter-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: none;
        }

        .ebooks-filter-row::-webkit-scrollbar {
          display: none;
        }

        .ebooks-filter-row button,
        .ebooks-category-grid button {
          flex: 0 0 auto;
          min-height: 42px;
          border: 1px solid var(--border);
          border-radius: var(--radius-pill);
          background: var(--surface);
          color: var(--foreground-secondary);
          padding: 0 16px;
          font: 500 13px/1.5 var(--font-ui);
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
          white-space: nowrap;
        }

        .ebooks-filter-row button:hover,
        .ebooks-filter-row button:focus-visible,
        .ebooks-category-grid button:hover,
        .ebooks-category-grid button:focus-visible,
        .ebooks-filter-row button.active,
        .ebooks-category-grid button.active {
          border-color: var(--primary);
          background: var(--primary);
          color: var(--primary-foreground);
          transform: translateY(-1px);
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }

        .ebooks-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .ebooks-stat-card {
          min-width: 0;
          display: grid;
          gap: 8px;
          padding: 18px;
          border-color: var(--border);
          background: var(--surface);
        }

        .ebooks-stat-card svg {
          color: var(--accent);
        }

        .ebooks-stat-card span {
          color: var(--foreground-muted);
          font-size: 12px;
          font-weight: 600;
        }

        .ebooks-stat-card strong {
          min-width: 0;
          color: var(--foreground);
          font-size: clamp(18px, 2vw, 24px);
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .ebooks-featured-section,
        .ebooks-grid-section,
        .ebooks-category-section,
        .ebooks-reading-path {
          padding: clamp(18px, 3vw, 28px);
        }

        .ebooks-section-head {
          max-width: 760px;
          display: grid;
          gap: 8px;
          margin-bottom: 18px;
        }

        .ebooks-section-head.compact {
          max-width: none;
          grid-template-columns: 1fr auto;
          align-items: end;
        }

        .ebooks-section-head span {
          color: var(--accent);
          font-size: 13px;
          font-weight: 600;
        }

        .ebooks-section-head h2 {
          margin: 0;
          color: var(--foreground);
          font-size: clamp(24px, 3vw, 36px);
          line-height: 1.2;
        }

        .ebooks-section-head p {
          margin: 0;
          color: var(--foreground-secondary);
          font-weight: 400;
          line-height: 1.8;
        }

        .ebooks-featured-card {
          display: grid;
          grid-template-columns: minmax(220px, 300px) 1fr;
          gap: 22px;
          align-items: stretch;
          border-radius: var(--radius-card);
          border: 1px solid var(--border);
          background: var(--accent-soft);
          padding: 18px;
        }

        .ebooks-featured-copy {
          display: grid;
          align-content: center;
          gap: 14px;
          min-width: 0;
        }

        .ebooks-featured-copy h3,
        .ebook-card h3,
        .ebooks-modal h2 {
          margin: 0;
          color: var(--foreground);
          font-size: clamp(21px, 2vw, 30px);
          line-height: 1.3;
        }

        .ebooks-featured-copy p,
        .ebook-card p,
        .ebooks-modal p {
          margin: 0;
          color: var(--foreground-secondary);
          font-weight: 400;
          line-height: 1.8;
        }

        .ebooks-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .ebook-card {
          display: grid;
          grid-template-rows: auto 1fr;
          min-width: 0;
          border-radius: var(--radius-card);
          border: 1px solid var(--border);
          background: var(--surface);
          box-shadow: var(--shadow-card);
          overflow: hidden;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .ebook-card:hover {
          transform: translateY(-3px);
          border-color: var(--border-strong);
          box-shadow: var(--shadow-md);
        }

        .ebook-card-body {
          display: grid;
          gap: 12px;
          padding: 18px;
          min-width: 0;
        }

        .ebook-cover {
          min-height: 220px;
          padding: 18px;
          background: var(--primary);
          color: var(--primary-foreground);
        }

        .ebook-cover-finance {
          background: var(--accent);
          color: var(--accent-foreground);
        }

        .ebook-cover-trading {
          background: var(--info);
        }

        .ebook-cover-feasibility {
          background: var(--primary-hover);
        }

        .ebook-cover-inner {
          height: 100%;
          min-height: 184px;
          border-radius: var(--radius-card);
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 22%, transparent);
          background: color-mix(in srgb, var(--hero-foreground) 8%, transparent);
          display: grid;
          align-content: space-between;
          gap: 16px;
          padding: 18px;
        }

        .ebook-cover-inner svg {
          color: var(--hero-foreground-muted);
        }

        .ebook-cover-inner span,
        .ebook-cover-inner small {
          color: var(--hero-foreground-muted);
          font-weight: 600;
        }

        .ebook-cover-inner strong {
          color: var(--hero-foreground);
          font-size: clamp(22px, 3vw, 34px);
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .ebook-badges,
        .ebook-topic-row,
        .ebook-meta-row,
        .ebook-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
        }

        .ebook-badges span,
        .ebook-topic-row span,
        .ebook-meta-row span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: var(--radius-pill);
          border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border));
          background: var(--accent-soft);
          color: var(--accent-hover);
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.3;
        }

        .ebook-topic-row span {
          background: var(--surface-muted);
          color: var(--foreground-secondary);
          border-color: var(--border);
        }

        .ebook-meta-row span {
          background: var(--primary-soft);
          color: var(--primary);
          border-color: color-mix(in srgb, var(--primary) 22%, var(--border));
        }

        .ebook-actions a,
        .ebook-detail-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          border-radius: var(--radius-control);
          padding: 0 14px;
          font: 600 13px/1.5 var(--font-ui);
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .ebook-primary-action {
          border: 1px solid transparent;
          background: var(--primary);
          color: var(--primary-foreground);
          box-shadow: var(--shadow-sm);
        }

        .ebook-secondary-action,
        .ebook-detail-button {
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--accent);
        }

        .ebook-detail-button {
          width: fit-content;
        }

        .ebook-actions a:hover,
        .ebook-actions a:focus-visible,
        .ebook-detail-button:hover,
        .ebook-detail-button:focus-visible {
          transform: translateY(-1px);
          border-color: var(--primary);
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }

        .ebooks-category-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .ebooks-category-grid button {
          border-radius: var(--radius-panel);
          min-height: 92px;
          justify-content: space-between;
          display: flex;
          align-items: center;
          padding: 18px;
          text-align: start;
        }

        .ebooks-category-grid button strong {
          font-size: 24px;
        }

        .ebooks-path-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .ebooks-path-card {
          padding: 18px;
          display: grid;
          gap: 10px;
          background: var(--surface-muted);
          border-color: var(--border);
        }

        .ebooks-path-card span {
          color: var(--accent);
          font-weight: 600;
        }

        .ebooks-path-card p {
          margin: 0;
          color: var(--foreground-secondary);
          line-height: 1.8;
          font-weight: 500;
        }

        .ebooks-disclaimer {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          padding: 18px;
          background: var(--info-soft);
        }

        .ebooks-disclaimer svg {
          flex: 0 0 auto;
          color: var(--info);
        }

        .ebooks-disclaimer h2,
        .ebooks-disclaimer p {
          margin: 0;
        }

        .ebooks-disclaimer h2 {
          color: var(--foreground);
          font-size: 18px;
        }

        .ebooks-disclaimer p {
          margin-top: 6px;
          color: var(--foreground-secondary);
          font-weight: 500;
          line-height: 1.8;
        }

        .ebooks-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10050;
          background: var(--background-overlay);
          backdrop-filter: blur(10px);
          display: grid;
          place-items: center;
          padding: 20px;
        }

        .ebooks-modal {
          position: relative;
          width: min(980px, 100%);
          max-height: min(760px, calc(100vh - 40px));
          overflow: auto;
          display: grid;
          grid-template-columns: minmax(220px, 310px) 1fr;
          gap: 18px;
          border-radius: var(--radius-panel);
          border: 1px solid var(--border);
          background: var(--surface-elevated);
          padding: 18px;
          box-shadow: var(--shadow-popover);
        }

        .ebooks-modal-close {
          position: absolute;
          inset-block-start: 14px;
          inset-inline-end: 14px;
          z-index: 2;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-control);
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--accent);
          cursor: pointer;
        }

        .ebooks-modal-copy {
          display: grid;
          gap: 14px;
          align-content: start;
          padding: 8px;
          min-width: 0;
        }

        .ebooks-modal-copy > span {
          color: var(--accent);
          font-weight: 600;
        }

        .ebooks-modal dl {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 0;
        }

        .ebooks-modal dl div {
          border-radius: var(--radius-card);
          border: 1px solid var(--border);
          background: var(--surface-muted);
          padding: 12px;
        }

        .ebooks-modal dt {
          color: var(--foreground-muted);
          font-size: 12px;
          font-weight: 600;
        }

        .ebooks-modal dd {
          margin: 5px 0 0;
          color: var(--foreground);
          font-weight: 600;
        }

        .ebooks-modal h3 {
          margin: 0 0 8px;
          color: var(--foreground);
          font-size: 18px;
        }

        .ebooks-modal ul {
          margin: 0;
          padding-inline-start: 20px;
          color: var(--foreground-secondary);
          font-weight: 500;
          line-height: 1.8;
        }


        @media (min-width: 1500px) {
          .ebooks-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 1100px) {
          .ebooks-stats-grid,
          .ebooks-grid,
          .ebooks-path-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 1024px) {
          .ebooks-topbar {
            display: none;
          }
        }

        @media (max-width: 820px) {
          .ebooks-content {
            padding: 18px 14px 44px;
          }

          .ebooks-featured-card,
          .ebooks-modal {
            grid-template-columns: 1fr;
          }

          .ebooks-category-grid {
            grid-template-columns: 1fr;
          }

          .ebooks-modal dl {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .ebooks-stats-grid,
          .ebooks-grid,
          .ebooks-path-grid {
            grid-template-columns: 1fr;
          }

          .ebooks-section-head.compact {
            grid-template-columns: 1fr;
            align-items: start;
          }

          .ebook-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .ebook-actions a,
          .ebook-detail-button {
            width: 100%;
          }

          .ebook-cover {
            min-height: 190px;
          }

          .ebook-cover-inner {
            min-height: 154px;
          }
        }
      `}</style>
    </div>
  );
}
