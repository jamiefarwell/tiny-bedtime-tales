import type { Book } from './types';

// Age shelves for the library. Kept apart from lib/books.ts so client
// components can use them without bundling every book's JSON.

export const SHELVES = [
  { id: 'babies', label: 'Babies and toddlers', ages: '0–2', note: 'Rhythm, sounds and a soft refrain' },
  { id: 'little', label: 'Little ones', ages: '2–5', note: 'Join in, giggle, then settle' },
  { id: 'picture', label: 'Picture books', ages: '4–7', note: 'Proper stories with a twist' },
  { id: 'bigger', label: 'Bigger kids', ages: '7–9', note: 'Mysteries and longer reads' },
] as const;
export type ShelfId = (typeof SHELVES)[number]['id'];

/** A book's age range as numbers, from its "a–b" label. */
export function ageRange(ages: string): [number, number] {
  const [a, b] = ages.split(/[–-]/).map((n) => parseInt(n, 10));
  return [Number.isFinite(a) ? a : 4, Number.isFinite(b) ? b : Number.isFinite(a) ? a : 7];
}

/** Which shelf a book sits on, by the youngest age it's for. */
export function shelfOf(book: Pick<Book, 'ages'>): ShelfId {
  const [from] = ageRange(book.ages);
  return from < 2 ? 'babies' : from < 4 ? 'little' : from < 7 ? 'picture' : 'bigger';
}

const CHILD_AGES: Record<string, [number, number]> = {
  'Newborn–1': [0, 1],
  '2–3': [2, 3],
  '4–5': [4, 5],
  '6–7': [6, 7],
  '8–9': [8, 9],
  '10–12': [10, 12],
  'Older kids': [7, 12],
};

/** Books ordered by how well they fit a child's age band (best first; stable otherwise). */
export function booksForAge(books: Book[], ageBand: string | undefined): Book[] {
  const child = ageBand ? CHILD_AGES[ageBand] : undefined;
  if (!child) return books;
  const gap = (b: Book) => {
    const [lo, hi] = ageRange(b.ages);
    return Math.max(0, lo - child[1], child[0] - hi);
  };
  return books.map((b, i) => ({ b, i, g: gap(b) })).sort((x, y) => x.g - y.g || x.i - y.i).map((x) => x.b);
}
