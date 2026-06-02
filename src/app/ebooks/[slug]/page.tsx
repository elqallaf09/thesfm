import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEbookBySlug, ebooks, ebookText } from '@/data/ebooks';
import { pageMetadata } from '@/lib/seo';
import { EbookReaderClient } from './reader-client';

type EbookReaderPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return ebooks.map(book => ({ slug: book.slug }));
}

export async function generateMetadata({ params }: EbookReaderPageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = getEbookBySlug(slug);
  if (!book) {
    return pageMetadata({
      title: 'كتب إلكترونية | THE SFM',
      path: '/ebooks',
    });
  }
  return pageMetadata({
    title: `${ebookText(book.title, 'ar')} | THE SFM`,
    description: ebookText(book.description, 'ar'),
    path: `/ebooks/${book.slug}`,
  });
}

export default async function EbookReaderPage({ params }: EbookReaderPageProps) {
  const { slug } = await params;
  const book = getEbookBySlug(slug);
  if (!book) notFound();
  return <EbookReaderClient initialSlug={book.slug} />;
}

