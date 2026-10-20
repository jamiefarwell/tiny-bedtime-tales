import type { Book } from './types';
import lantern from '@/content/books/lily-and-the-lantern-feather.json';
import snore from '@/content/books/grandads-runaway-snore.json';
import sockTrain from '@/content/books/maya-and-the-midnight-sock-train.json';

// The Ready-to-Read catalogue. Static JSON today; the same shape moves to the
// database when the library grows past a handful of titles.
const BOOKS = [lantern, snore, sockTrain] as Book[];

export function allBooks(): Book[] {
  return BOOKS;
}

export function getBook(slug: string): Book | undefined {
  return BOOKS.find((b) => b.slug === slug);
}

export function hasNarration(book: Book): boolean {
  return book.pages.every((p) => p.audio);
}
