import { allBooks } from '@/lib/books';
import { Tonight } from './Tonight';

export default function TonightPage() {
  // Only what the home screen needs, so the full manuscripts stay server-side.
  const books = allBooks().map(({ slug, title, ages, minutes, hook, cover, coverAlt, palette, tags, pages, cast, blurb, artStatus }) => ({
    slug,
    title,
    ages,
    minutes,
    hook,
    cover,
    coverAlt,
    palette,
    tags,
    blurb,
    artStatus,
    cast,
    pages: pages.map(() => ({ heading: '', text: '', image: null, imageAlt: '', audio: null, timings: null })),
  }));
  return <Tonight books={books} />;
}
