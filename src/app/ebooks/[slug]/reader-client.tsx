'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Download, FileText, Languages, Library } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { DashboardPageShell } from '@/components/layout/DashboardPageShell';
import { AppCard } from '@/components/layout/AppCard';
import { useLanguage } from '@/hooks/useLanguage';
import {
  EBOOK_CATEGORY_LABELS,
  EBOOK_LANGUAGE_LABELS,
  ebookText,
  ebooks,
  formatEbookSize,
  getEbookBySlug,
  type EbookLocale,
} from '@/data/ebooks';

type ReaderCopy = Record<string, string>;

const UI_COPY: Record<EbookLocale, ReaderCopy> = {
  ar: {
    back: 'العودة إلى المكتبة',
    reader: 'قارئ الكتاب',
    downloadPdf: 'تحميل PDF',
    language: 'اللغة',
    category: 'التصنيف',
    pageCount: 'عدد الصفحات',
    fileSize: 'حجم الملف',
    pdfUnavailable: 'إذا لم يظهر ملف PDF داخل القارئ، يمكنك فتحه أو تحميله من الزر أعلاه.',
    relatedBooks: 'كتب مرتبطة',
    openBook: 'قراءة الكتاب',
    library: 'مكتبة الكتب الإلكترونية',
  },
  en: {
    back: 'Back to library',
    reader: 'Book reader',
    downloadPdf: 'Download PDF',
    language: 'Language',
    category: 'Category',
    pageCount: 'Pages',
    fileSize: 'File size',
    pdfUnavailable: 'If the PDF does not appear in the reader, you can open or download it using the button above.',
    relatedBooks: 'Related books',
    openBook: 'Read book',
    library: 'E-Books Library',
  },
  fr: {
    back: 'Retour à la bibliothèque',
    reader: 'Lecteur du livre',
    downloadPdf: 'Télécharger le PDF',
    language: 'Langue',
    category: 'Catégorie',
    pageCount: 'Pages',
    fileSize: 'Taille du fichier',
    pdfUnavailable: 'Si le PDF ne s’affiche pas dans le lecteur, vous pouvez l’ouvrir ou le télécharger avec le bouton ci-dessus.',
    relatedBooks: 'Livres associés',
    openBook: 'Lire le livre',
    library: 'Bibliothèque de livres électroniques',
  },
};

function localeFrom(lang: string): EbookLocale {
  return lang === 'en' || lang === 'fr' ? lang : 'ar';
}

export function EbookReaderClient({ initialSlug }: { initialSlug: string }) {
  const { lang, dir } = useLanguage();
  const locale = localeFrom(lang);
  const text = UI_COPY[locale];
  const book = getEbookBySlug(initialSlug) ?? ebooks[0];
  const relatedBooks = ebooks.filter(item => item.category === book.category && item.id !== book.id).slice(0, 3);
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="ebook-reader-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={ebookText(book.title, locale)} contentClassName="ebook-reader-content">
        <div className="sfm-page-topbar ebook-reader-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <section className="ebook-reader-hero">
          <Link href="/ebooks" className="ebook-reader-back">
            <BackIcon size={17} aria-hidden="true" />
            {text.back}
          </Link>
          <div className="ebook-reader-title">
            <span><Library size={17} aria-hidden="true" /> {text.reader}</span>
            <h1>{ebookText(book.title, locale)}</h1>
            <p>{ebookText(book.description, locale)}</p>
          </div>
          <a href={book.fileUrl} download={book.fileName} className="ebook-reader-download">
            <Download size={17} aria-hidden="true" />
            {text.downloadPdf}
          </a>
        </section>

        <section className="ebook-reader-meta" aria-label={text.reader}>
          <AppCard className="ebook-reader-meta-card">
            <Languages size={19} aria-hidden="true" />
            <span>{text.language}</span>
            <strong>{ebookText(EBOOK_LANGUAGE_LABELS[book.language], locale)}</strong>
          </AppCard>
          <AppCard className="ebook-reader-meta-card">
            <BookOpen size={19} aria-hidden="true" />
            <span>{text.category}</span>
            <strong>{ebookText(EBOOK_CATEGORY_LABELS[book.category], locale)}</strong>
          </AppCard>
          <AppCard className="ebook-reader-meta-card">
            <FileText size={19} aria-hidden="true" />
            <span>{text.pageCount}</span>
            <strong dir="ltr">{book.pages ?? '-'}</strong>
          </AppCard>
          <AppCard className="ebook-reader-meta-card">
            <FileText size={19} aria-hidden="true" />
            <span>{text.fileSize}</span>
            <strong dir="ltr">{formatEbookSize(book.fileSizeBytes) ?? '-'}</strong>
          </AppCard>
        </section>

        <section className="ebook-reader-frame-card" aria-label={ebookText(book.title, locale)}>
          <iframe
            src={`${book.fileUrl}#toolbar=1&navpanes=0`}
            title={ebookText(book.title, locale)}
            className="ebook-reader-frame"
          />
          <p>{text.pdfUnavailable}</p>
        </section>

        {relatedBooks.length > 0 ? (
          <section className="ebook-reader-related" aria-labelledby="ebook-reader-related-title">
            <div className="ebook-reader-section-head">
              <span>{text.library}</span>
              <h2 id="ebook-reader-related-title">{text.relatedBooks}</h2>
            </div>
            <div className="ebook-reader-related-grid">
              {relatedBooks.map(item => (
                <Link href={`/ebooks/${item.slug}`} className="ebook-reader-related-card" key={item.id}>
                  <BookOpen size={18} aria-hidden="true" />
                  <strong>{ebookText(item.title, locale)}</strong>
                  <span>{text.openBook}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </DashboardPageShell>

      <style jsx global>{`
        .ebook-reader-shell {
          min-height: 100vh;
          display: flex;
          background:
            radial-gradient(circle at top right, rgba(24, 212, 212, 0.14), transparent 34rem),
            linear-gradient(180deg, #f6fbff 0%, #eef7fb 48%, #f8fbff 100%);
          overflow-x: hidden;
          color: #0f172a;
        }

        .ebook-reader-shell .sfm-dashboard-page-shell {
          flex: 1;
          min-width: 0;
        }

        .ebook-reader-content {
          width: min(1500px, 100%);
          margin: 0 auto;
          padding: 28px clamp(16px, 3vw, 36px) 64px;
          display: grid;
          gap: 20px;
        }

        .ebook-reader-topbar {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .ebook-reader-hero,
        .ebook-reader-frame-card,
        .ebook-reader-related {
          border-radius: 30px;
          border: 1px solid rgba(15, 118, 110, 0.14);
          background: rgba(255, 255, 255, 0.88);
          box-shadow: 0 18px 44px rgba(15, 37, 64, 0.08);
        }

        .ebook-reader-hero {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 18px;
          padding: clamp(18px, 3vw, 28px);
        }

        .ebook-reader-title {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .ebook-reader-title span,
        .ebook-reader-section-head span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #0f766e;
          font-weight: 950;
          font-size: 13px;
        }

        .ebook-reader-title h1,
        .ebook-reader-section-head h2 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(26px, 4vw, 46px);
          line-height: 1.2;
        }

        .ebook-reader-title p {
          margin: 0;
          max-width: 820px;
          color: #475569;
          font-weight: 780;
          line-height: 1.8;
        }

        .ebook-reader-back,
        .ebook-reader-download {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          border-radius: 16px;
          padding: 0 15px;
          text-decoration: none;
          font: 950 13px Tajawal, Arial, sans-serif;
          white-space: nowrap;
        }

        .ebook-reader-back {
          border: 1px solid rgba(15, 118, 110, 0.18);
          color: #0f766e;
          background: rgba(255, 255, 255, 0.78);
        }

        .ebook-reader-download {
          color: #ffffff;
          background: linear-gradient(135deg, #1d8cff, #18d4d4);
          box-shadow: 0 14px 28px rgba(29, 140, 255, 0.22);
        }

        .ebook-reader-meta {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .ebook-reader-meta-card {
          display: grid;
          gap: 8px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.90);
          border-color: rgba(15, 118, 110, 0.14);
        }

        .ebook-reader-meta-card svg {
          color: #0f766e;
        }

        .ebook-reader-meta-card span {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
        }

        .ebook-reader-meta-card strong {
          color: #0f172a;
          font-size: 18px;
          line-height: 1.4;
        }

        .ebook-reader-frame-card {
          padding: 14px;
          overflow: hidden;
        }

        .ebook-reader-frame {
          width: 100%;
          min-height: 78vh;
          border: 0;
          border-radius: 22px;
          background: #f1f5f9;
        }

        .ebook-reader-frame-card p {
          margin: 12px 4px 0;
          color: #64748b;
          font-weight: 800;
          line-height: 1.7;
        }

        .ebook-reader-related {
          padding: clamp(18px, 3vw, 28px);
        }

        .ebook-reader-section-head {
          margin-bottom: 16px;
        }

        .ebook-reader-section-head h2 {
          font-size: clamp(24px, 3vw, 34px);
        }

        .ebook-reader-related-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .ebook-reader-related-card {
          min-width: 0;
          display: grid;
          gap: 10px;
          padding: 18px;
          border-radius: 22px;
          border: 1px solid rgba(15, 118, 110, 0.14);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(204, 251, 241, 0.38));
          color: #0f172a;
          text-decoration: none;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .ebook-reader-related-card:hover,
        .ebook-reader-related-card:focus-visible {
          transform: translateY(-2px);
          border-color: rgba(14, 165, 233, 0.42);
          box-shadow: 0 18px 38px rgba(15, 37, 64, 0.12);
          outline: none;
        }

        .ebook-reader-related-card svg,
        .ebook-reader-related-card span {
          color: #0f766e;
        }

        .ebook-reader-related-card strong {
          overflow-wrap: anywhere;
        }

        .ebook-reader-related-card span {
          font-weight: 950;
          font-size: 13px;
        }

        .dark .ebook-reader-shell {
          background:
            radial-gradient(circle at top right, rgba(34, 211, 238, 0.12), transparent 34rem),
            linear-gradient(180deg, #071427 0%, #0a1422 56%, #071427 100%);
          color: #e8eef6;
        }

        .dark .ebook-reader-hero,
        .dark .ebook-reader-frame-card,
        .dark .ebook-reader-related,
        .dark .ebook-reader-meta-card {
          background: rgba(15, 29, 49, 0.88);
          border-color: rgba(167, 243, 240, 0.18);
          color: #e8eef6;
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
        }

        .dark .ebook-reader-title h1,
        .dark .ebook-reader-section-head h2,
        .dark .ebook-reader-meta-card strong,
        .dark .ebook-reader-related-card {
          color: #e8eef6;
        }

        .dark .ebook-reader-title p,
        .dark .ebook-reader-frame-card p,
        .dark .ebook-reader-meta-card span {
          color: #b8c7d9;
        }

        .dark .ebook-reader-back,
        .dark .ebook-reader-related-card {
          background: rgba(19, 36, 58, 0.86);
          border-color: rgba(167, 243, 240, 0.18);
        }

        .dark .ebook-reader-frame {
          background: #13243a;
        }

        @media (max-width: 980px) {
          .ebook-reader-topbar {
            display: none;
          }

          .ebook-reader-hero {
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .ebook-reader-back,
          .ebook-reader-download {
            width: fit-content;
          }

          .ebook-reader-meta,
          .ebook-reader-related-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .ebook-reader-content {
            padding: 18px 14px 44px;
          }

          .ebook-reader-back,
          .ebook-reader-download {
            width: 100%;
          }

          .ebook-reader-frame {
            min-height: 68vh;
          }
        }
      `}</style>
    </div>
  );
}
