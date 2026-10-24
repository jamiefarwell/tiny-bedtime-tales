import type { Metadata } from 'next';
import Link from 'next/link';
import { allBooks } from '@/lib/books';
import { SHELVES, shelfOf } from '@/lib/shelves';
import { BookTile } from '@/components/BookTile';
import { BookCover } from '@/components/BookCover';
import ui from '../pages.module.css';
import styles from './library.module.css';

export const metadata: Metadata = { title: 'Library' };

export default function LibraryPage() {
  const books = allBooks();
  const featured = books.find((b) => b.cover) ?? books[0];
  const shelves = SHELVES.map((s) => ({ ...s, books: books.filter((b) => shelfOf(b) === s.id) })).filter((s) => s.books.length);

  return (
    <main>
      <header className={ui.pageHead}>
        <p className="eyebrow">Ready to read</p>
        <h1>The library</h1>
        <p>Finished, illustrated books for the nights you just want to press play. Hand-picked, read aloud, no setup.</p>
        <nav className={styles.ages} aria-label="Shelves by age">
          {shelves.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="chip">
              {s.label} · {s.ages}
            </a>
          ))}
        </nav>
      </header>

      <Link href={`/library/${featured.slug}`} className={styles.feature}>
        <div className={styles.featureArt}>
          <BookCover title={featured.title} image={featured.cover} alt={featured.coverAlt} size="l" priority showTitle={false} />
        </div>
        <div className={styles.featureBody}>
          <p className="eyebrow">Book of the week</p>
          <h2>{featured.title}</h2>
          <p>{featured.hook}</p>
          <div className={ui.chips}>
            <span className="chip">Ages {featured.ages}</span>
            <span className="chip">{featured.minutes} min</span>
            {featured.tags.slice(0, 2).map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
        </div>
      </Link>

      {shelves.map((s) => (
        <section key={s.id} id={s.id} className={`${ui.section} ${styles.shelf}`}>
          <div className={styles.shelfHead}>
            <p className="eyebrow">Ages {s.ages}</p>
            <h2>{s.label}</h2>
            <p>{s.note}</p>
          </div>
          <div className={ui.grid}>
            {s.books.map((b) => (
              <BookTile key={b.slug} book={b} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
