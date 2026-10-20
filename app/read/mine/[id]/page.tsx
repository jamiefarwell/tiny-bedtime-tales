'use client';

import Link from 'next/link';
import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useFamily, useHydrated } from '@/lib/store';
import { Reader } from '@/components/reader/Reader';

function MyStory({ id }: { id: string }) {
  const hydrated = useHydrated();
  const story = useFamily((s) => s.stories.find((x) => x.id === id));
  const listen = useSearchParams().get('listen') === '1';

  if (!hydrated) return null;
  if (!story) {
    return (
      <main style={{ padding: 40, textAlign: 'center', display: 'grid', gap: 16, justifyItems: 'center' }}>
        <h1>We couldn’t find that story</h1>
        <p>It may have been made on another device.</p>
        <Link className="btn btn-primary" href="/stories">
          Our stories
        </Link>
      </main>
    );
  }
  return (
    <Reader
      title={story.title}
      pages={story.pages}
      progressKey={`story:${story.id}`}
      backHref="/stories"
      autoPlay={listen}
      endActions={
        <Link className="btn btn-rose btn-block" href={`/create?continue=${story.id}`}>
          Next chapter, tomorrow night
        </Link>
      }
    />
  );
}

export default function MyStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <MyStory id={id} />
    </Suspense>
  );
}
