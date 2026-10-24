import type { Book } from './types';
import lantern from '@/content/books/lily-and-the-lantern-feather.json';
import snore from '@/content/books/grandads-runaway-snore.json';
import sockTrain from '@/content/books/maya-and-the-midnight-sock-train.json';
import snow from '@/content/books/shh-says-the-snow.json';
import dot from '@/content/books/one-more-says-dot.json';
import hiccups from '@/content/books/the-moon-has-the-hiccups.json';
import lostDragon from '@/content/books/the-lost-property-dragon.json';
import nightBakers from '@/content/books/the-secret-night-bakers.json';

// The Ready-to-Read catalogue. Static JSON today; the same shape moves to the
// database when the library grows past a handful of titles.
const BOOKS = [snore, lantern, sockTrain, snow, dot, hiccups, lostDragon, nightBakers] as Book[];

export function allBooks(): Book[] {
  return BOOKS;
}

export function getBook(slug: string): Book | undefined {
  return BOOKS.find((b) => b.slug === slug);
}

export function hasNarration(book: Book): boolean {
  return book.pages.every((p) => p.audio);
}

