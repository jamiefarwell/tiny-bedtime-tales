import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { allBooks, getBook, hasNarration } from '@/lib/books';
import { BookCover } from '@/components/BookCover';
import { Icon } from '@/components/reader/icons';
import { ResumeHint } from './ResumeHint';
import ui from '../../pages.module.css';
import styles from './book.module.css';

export function generateStaticParams() {
  return allBooks().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const book = getBook((await params).slug);
  return book ? { title: book.title, description: book.hook } : {};
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const book = getBook((await params).slug);
  if (!book) notFound();
  const peek = book.pages.filter((p) => p.image).slice(0, 4);

  return (
    <main className={styles.page}>
      <Link href="/library" className={styles.back} aria-label="Back to the library">
        <Icon name="back" size={20} />
        Library
      </Link>

      <div className={styles.hero}>
        <BookCover title={book.title} image={book.cover} alt={book.coverAlt} glow={book.palette.glow} size="l" priority />
      </div>

      <div className={styles.body}>
        <div className={ui.chips}>
          <span className="chip">Ages {book.ages}</span>
          <span className="chip">{book.minutes} min</span>
          <span className="chip">{book.pages.length} pages</span>
          {book.tags.map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>


        <ResumeHint slug={book.slug} pages={book.pages.length} />

        <div className={styles.actions}>
          <Link href={`/read/${book.slug}?listen=1`} className="btn btn-rose btn-block">
            <Icon name="play" size={20} />
            Read it to us
          </Link>
          <Link href={`/read/${book.slug}`} className="btn btn-ghost btn-block">
            <Icon name="book" size={20} />
            I’ll read it myself
          </Link>
        </div>
        {!hasNarration(book) && (
          <p className={styles.note}>
            Narration uses your device’s best storytelling voice while our recorded narrator is being produced.
          </p>
        )}

        <p className={styles.blurb}>{book.blurb}</p>

        {peek.length > 0 && (
          <section className={ui.section}>
            <div className={ui.sectionHead}>
              <h2>Look inside</h2>
            </div>
            <div className={ui.rail}>
              {peek.map((p) => (
                <img key={p.image} src={p.image!} alt={p.imageAlt} className={styles.peek} loading="lazy" />
              ))}
            </div>
          </section>
        )}

        <section className={ui.section}>
          <div className={ui.sectionHead}>
            <h2>In this story</h2>
          </div>
          <ul className={styles.cast}>
            {book.cast.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong>
                <span>{c.role}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
