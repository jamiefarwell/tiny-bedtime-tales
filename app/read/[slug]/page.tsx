import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allBooks, getBook } from '@/lib/books';
import { Reader } from '@/components/reader/Reader';

export function generateStaticParams() {
  return allBooks().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const book = getBook((await params).slug);
  return { title: book ? `Reading: ${book.title}` : 'Book' };
}

export default async function ReadPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ listen?: string }>;
}) {
  const book = getBook((await params).slug);
  const listen = (await searchParams).listen === '1';
  if (!book) notFound();
  return (
    <Reader
      title={book.title}
      pages={book.pages}
      progressKey={`book:${book.slug}`}
      backHref={`/library/${book.slug}`}
      glow={book.palette.glow}
      autoPlay={listen}
      artNote={book.artStatus === 'pending' ? 'Illustrations being painted' : undefined}
    />
  );
}
