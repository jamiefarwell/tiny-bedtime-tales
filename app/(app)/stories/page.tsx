'use client';

import Link from 'next/link';
import { family, useFamily, useHydrated } from '@/lib/store';
import { BookCover } from '@/components/BookCover';
import { Icon } from '@/components/reader/icons';
import ui from '../pages.module.css';
import styles from './stories.module.css';

export default function StoriesPage() {
  const hydrated = useHydrated();
  const stories = useFamily((s) => s.stories);
  const children = useFamily((s) => s.children);
  const nameOf = (id: string) => children.find((c) => c.id === id)?.name ?? '';

  // Group chapters into their series, newest first.
  const series = new Map<string, typeof stories>();
  for (const s of stories) series.set(s.seriesId, [...(series.get(s.seriesId) ?? []), s]);

  return (
    <main>
      <header className={ui.pageHead}>
        <p className="eyebrow">Your family’s shelf</p>
        <h1>Our stories</h1>
        <p>Every story you make is kept here, ready to read again or carry on tomorrow.</p>
      </header>

      {hydrated && stories.length === 0 && (
        <div className={`${ui.card} ${ui.empty}`}>
          <h2>Nothing here yet</h2>
          <p>Make the first one tonight. It takes about a minute and they’re the hero.</p>
          <Link href="/create" className="btn btn-primary">
            <Icon name="sparkle" size={20} /> Make a story
          </Link>
        </div>
      )}

      <div className={styles.list}>
        {[...series.values()].map((chapters) => {
          const latest = chapters[0];
          return (
            <article key={latest.seriesId} className={styles.series}>
              <div className={styles.head}>
                <div className={styles.cover}>
                  <BookCover title={latest.title} image={null} alt="" size="s" showTitle={false} />
                </div>
                <div>
                  <p className="eyebrow">
                    {nameOf(latest.childId)} · {chapters.length > 1 ? `${chapters.length} chapters` : latest.mood}
                  </p>
                  <h2>{latest.title}</h2>
                  <p className={styles.hook}>{latest.hook}</p>
                </div>
              </div>
              <ol className={styles.chapters}>
                {chapters.map((c) => (
                  <li key={c.id}>
                    <Link href={`/read/mine/${c.id}`}>
                      <span>Ch. {c.chapter}</span>
                      <strong>{c.title}</strong>
                      <Icon name="play" size={18} />
                    </Link>
                  </li>
                ))}
              </ol>
              <div className={styles.actions}>
                <Link href={`/create?continue=${latest.id}`} className="btn btn-rose">
                  Next chapter
                </Link>
                <Link href={`/create?again=${latest.id}`} className="btn btn-ghost">
                  Try a different one
                </Link>
                <button
                  className={styles.remove}
                  onClick={() => {
                    if (confirm(`Remove “${latest.title}” from your shelf?`)) chapters.forEach((c) => family.removeStory(c.id));
                  }}
                >
                  Remove
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
