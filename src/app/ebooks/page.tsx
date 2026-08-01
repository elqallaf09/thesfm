'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  BookMarked,
  BookOpen,
  Download,
  Eye,
  FileText,
  Languages,
  Library,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  X,
} from 'lucide-react';
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
import { FILTERS, UI_COPY, type FilterId } from './_copy';
import { EbooksDetailStyles } from './_detailStyles';
import { EbooksStyles } from './_styles';

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

      <EbooksStyles />
      <EbooksDetailStyles />
    </div>
  );
}
