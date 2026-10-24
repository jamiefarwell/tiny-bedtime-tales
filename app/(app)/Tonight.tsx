'use client';

import Link from 'next/link';
import type { Book } from '@/lib/types';
import { activeChild, useFamily, useHydrated } from '@/lib/store';
import { BookTile } from '@/components/BookTile';
import { BookCover } from '@/components/BookCover';
import { Icon } from '@/components/reader/icons';
import { suggestWorlds } from './create/options';
import { booksForAge } from '@/lib/shelves';
import { WorldTile } from '@/components/WorldTile';
import { WalletChip } from '@/components/WalletChip';
import ui from './pages.module.css';
import styles from './tonight.module.css';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Still awake?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Tonight({ books }: { books: Book[] }) {
  const hydrated = useHydrated();
  const child = useFamily(activeChild);
  const children = useFamily((s) => s.children);
  const stories = useFamily((s) => s.stories);
  const progress = useFamily((s) => s.progress);

  // The most recent unfinished thing, whether a library book or their own story.
  const inProgress = Object.entries(progress)
    .filter(([, p]) => !p.finished && p.page > 0)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0];
  let resume: { href: string; title: string; image: string | null; alt: string; page: number; total: number } | null = null;
  if (inProgress) {
    const [key, p] = inProgress;
    if (key.startsWith('book:')) {
      const b = books.find((x) => `book:${x.slug}` === key);
      if (b) resume = { href: `/read/${b.slug}`, title: b.title, image: b.cover, alt: b.coverAlt, page: p.page, total: b.pages.length };
    } else if (key.startsWith('story:')) {
      const s = stories.find((x) => `story:${x.id}` === key);
      if (s) resume = { href: `/read/mine/${s.id}`, title: s.title, image: null, alt: s.title, page: p.page, total: s.pages.length };
    }
  }

  const latestSeries = child ? stories.find((s) => s.childId === child.id) : null;
  const name = hydrated && child ? child.name : null;

  return (
    <main>
      <section className={styles.hero}>
        <picture>
          <source media="(min-width: 760px)" srcSet="/art/hero-wide.webp" />
          <img
            src="/art/hero-mobile.webp"
            alt="A child at a bedroom window, looking out at a night sky full of story worlds"
            className={styles.heroArt}
            fetchPriority="high"
          />
        </picture>
        <div className={styles.heroShade} />
        <div className={styles.heroTop}>
          <p className={styles.hello}>{hydrated ? greeting() : ' '}</p>
          <WalletChip />
        </div>
        <div className={styles.heroBody}>
          <h1>
            Tonight, <em>{name ?? 'they’re'}</em>
            {name ? ' is' : ''} the hero.
          </h1>
          <p className={styles.lede}>A brand-new story starring {name ?? 'your child'}, in a world that remembers them.</p>
          <Link href="/create" className="btn btn-primary btn-block">
            <Icon name="sparkle" size={20} />
            {name ? `Make ${name}’s story` : 'Make tonight’s story'}
          </Link>
          {hydrated && children.length > 1 && (
            <p className={styles.switch}>
              Not {child?.name}? <Link href="/family">Switch child</Link>
            </p>
          )}
        </div>
      </section>

      {resume && (
        <Link href={resume.href} className={styles.resume}>
          <div className={styles.resumeCover}>
            <BookCover title={resume.title} image={resume.image} alt={resume.alt} size="s" showTitle={!resume.image} />
          </div>
          <div>
            <p className="eyebrow">Carry on reading</p>
            <strong>{resume.title}</strong>
            <span>
              Page {resume.page + 1} of {resume.total}
            </span>
          </div>
          <Icon name="play" size={22} className={styles.resumePlay} />
        </Link>
      )}

      {latestSeries && (
        <Link href={`/create?continue=${latestSeries.id}`} className={styles.series}>
          <p className="eyebrow">A world that remembers</p>
          <strong>
            Chapter {latestSeries.chapter + 1}: what happens next in “{latestSeries.title}”?
          </strong>
          <span>Same characters, same world, a brand-new adventure.</span>
        </Link>
      )}

      <section className={ui.section}>
        <div className={ui.sectionHead}>
          <h2>{name ? `Worlds for ${name}` : 'Pick a world'}</h2>
          <Link href="/create">All worlds</Link>
        </div>
        <div className={`${ui.rail} ${styles.worldRail}`}>
          {suggestWorlds(hydrated ? child : null)
            .filter((w) => w.id !== 'other')
            .slice(0, 8)
            .map((w) => (
              <WorldTile key={w.id} world={w} href={`/create?world=${w.id}`} size="l" />
            ))}
        </div>
      </section>

      <section className={ui.section}>
        <div className={ui.sectionHead}>
          <h2>Ready to read</h2>
          <Link href="/library">Library</Link>
        </div>
        <div className={ui.rail}>
          {booksForAge(books, hydrated ? child?.ageBand : undefined).map((b, i) => (
            <BookTile key={b.slug} book={b} priority={i === 0} />
          ))}
        </div>
      </section>

      <section className={ui.section}>
        <div className={styles.promises}>
          <div>
            <Icon name="stories" />
            <strong>A world that remembers</strong>
            <span>Characters, places and running jokes carry on from one night to the next.</span>
          </div>
          <div>
            <Icon name="book" />
            <strong>Read-along words</strong>
            <span>Each word lights up as it’s read aloud, so early readers can follow.</span>
          </div>
          <div>
            <Icon name="moon" />
            <strong>Made for falling asleep</strong>
            <span>Sleepy mode slows the voice, dims the screen and never plays “just one more”.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
