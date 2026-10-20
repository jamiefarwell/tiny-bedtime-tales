import type { Metadata } from 'next';
import ui from '../pages.module.css';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto' }}>
      <header className={ui.pageHead}>
        <p className="eyebrow">Privacy</p>
        <h1>Your family’s information</h1>
      </header>
      <div className={ui.card} style={{ display: 'grid', gap: 14, color: 'var(--cream-dim)' }}>
        <p>
          Tiny Bedtime Tales is used by parents and carers, not by children directly. A story only needs a first name or nickname, a
          story level and a few things your child enjoys.
        </p>
        <p>
          We never ask for photographs, surnames, dates of birth, schools, addresses or phone numbers. If something like that is typed
          into a story request by mistake, we strip it out before the request reaches our storyteller.
        </p>
        <p>
          During this preview, profiles and stories are saved on this device only. When family accounts launch, they will be stored
          securely, visible only to you, and you will be able to delete everything in one step.
        </p>
        <p>
          Stories are written by an AI storyteller (Anthropic’s Claude) following strict rules for bedtime: nothing frightening,
          calm endings and nothing from your “keep out” list. Our Ready-to-Read library is written, illustrated and checked before it
          is published.
        </p>
      </div>
    </main>
  );
}
