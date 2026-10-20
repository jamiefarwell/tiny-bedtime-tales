import Link from 'next/link';
import type { Book } from '@/lib/types';
import { BookCover } from './BookCover';
import styles from './BookTile.module.css';

export function BookTile({ book, priority }: { book: Book; priority?: boolean }) {
  return (
    <Link href={`/library/${book.slug}`} className={styles.tile}>
      <BookCover title={book.title} image={book.cover} alt={book.coverAlt} glow={book.palette.glow} priority={priority} />
      <div className={styles.meta}>
        <span>Ages {book.ages}</span>
        <span aria-hidden>·</span>
        <span>{book.minutes} min</span>
      </div>
      <p className={styles.hook}>{book.hook}</p>
    </Link>
  );
}
