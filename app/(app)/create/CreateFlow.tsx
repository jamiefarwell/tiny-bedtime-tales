'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ChildProfile, Page, PersonalStory } from '@/lib/types';
import { activeChild, family, uid, useFamily, useHydrated } from '@/lib/store';
import { ChildForm, blankChild } from '@/components/ChildForm';
import { Icon } from '@/components/reader/icons';
import { LENGTHS, MOODS, WORLDS } from './options';
import styles from './create.module.css';

type Step = 'who' | 'mood' | 'world' | 'touches' | 'writing';
const ORDER: Step[] = ['who', 'mood', 'world', 'touches'];

interface Draft {
  mood: (typeof MOODS)[number]['id'] | null;
  world: (typeof WORLDS)[number]['id'] | null;
  customWorld: string;
  minutes: 5 | 10 | 15;
  todayDetail: string;
  companions: string[];
}

interface Writing {
  title: string;
  hook: string;
  pages: { heading: string; text: string }[];
  expected: number;
  error: string | null;
  code: string;
  notConnected: boolean;
}

export function CreateFlow({ initialWorld, continueId, againId }: { initialWorld?: string; continueId?: string; againId?: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const child = useFamily(activeChild);
  const children = useFamily((s) => s.children);
  const stories = useFamily((s) => s.stories);
  const base = stories.find((s) => s.id === (continueId || againId)) ?? null;

  const [step, setStep] = useState<Step>('who');
  const [editingChild, setEditingChild] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    mood: null,
    world: (WORLDS.find((w) => w.id === initialWorld)?.id as Draft['world']) ?? null,
    customWorld: '',
    minutes: 10,
    todayDetail: '',
    companions: [],
  });
  const [writing, setWriting] = useState<Writing | null>(null);
  const abort = useRef<AbortController | null>(null);

  // Returning families skip straight past "who"; continuing a series skips to the end.
  useEffect(() => {
    if (!hydrated) return;
    if (base) {
      const world = WORLDS.find((w) => w.prompt === base.world || w.label === base.world);
      setDraft((d) => ({
        ...d,
        world: (world?.id as Draft['world']) ?? 'other',
        customWorld: world ? '' : base.world,
        mood: (MOODS.find((m) => m.label === base.mood)?.id as Draft['mood']) ?? 'adventure',
        minutes: (base.minutes as Draft['minutes']) || 10,
      }));
      if (base.childId) family.setActiveChild(base.childId);
      setStep('touches');
    } else if (child) {
      setStep('mood');
    }
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => () => abort.current?.abort(), []);

  const stepIndex = ORDER.indexOf(step as (typeof ORDER)[number]);
  const go = (s: Step) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const next = () => go(ORDER[Math.min(ORDER.length - 1, stepIndex + 1)]);
  const back = () => go(ORDER[Math.max(0, stepIndex - 1)]);

  const world = WORLDS.find((w) => w.id === draft.world);
  const mood = MOODS.find((m) => m.id === draft.mood);
  const worldText = draft.world === 'other' ? draft.customWorld.trim() : world?.prompt ?? '';

  async function make() {
    if (!child || !mood || !worldText) return;
    const continuing = Boolean(continueId && base);
    setWriting({ title: '', hook: '', pages: [], expected: 10, error: null, code: '', notConnected: false });
    go('writing');
    abort.current = new AbortController();
    // Writing takes up to a minute; if the phone auto-locks, the connection drops.
    const wake = await (navigator as any).wakeLock?.request('screen').catch(() => null);

    const body = {
      child: {
        name: child.name,
        ageBand: child.ageBand,
        pronouns: child.pronouns,
        loves: child.loves,
        companions: child.companions.filter((c) => draft.companions.includes(c.name)),
        avoid: child.avoid,
      },
      mood: mood.prompt,
      world: worldText,
      minutes: draft.minutes,
      todayDetail: draft.todayDetail,
      memory: continuing ? base!.memory : '',
      chapter: continuing ? base!.chapter + 1 : 1,
      avoidTitle: againId && base ? base.title : '',
    };

    try {
      const res = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abort.current.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setWriting((w) => w && { ...w, error: err.message || 'Something went wrong.', code: err.error || `http-${res.status}`, notConnected: err.error === 'not_connected' });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let title = '';
      let hook = '';
      const pages: { heading: string; text: string }[] = [];
      let memory = '';
      let model = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === 'meta') {
            title = ev.title;
            hook = ev.hook;
          } else if (ev.type === 'page') pages[ev.index] = { heading: ev.heading, text: ev.text };
          else if (ev.type === 'memory') memory = ev.text;
          else if (ev.type === 'done') model = ev.model;
          else if (ev.type === 'error') throw Object.assign(new Error(ev.message), { code: ev.code });
          setWriting((w) => w && { ...w, title, hook, pages: pages.filter(Boolean) });
        }
      }

      const finished = pages.filter(Boolean);
      if (finished.length < 3) {
        throw Object.assign(new Error('The story came out too short. Let’s try again.'), { code: `short-${finished.length}${model ? '' : '-nodone'}` });
      }
      const story: PersonalStory = {
        id: uid(),
        childId: child.id,
        title,
        hook,
        world: draft.world === 'other' ? draft.customWorld.trim() : world!.prompt,
        mood: mood.label,
        minutes: draft.minutes,
        pages: finished.map(
          (p, i): Page => ({
            heading: p.heading,
            text: p.text,
            image: null,
            imageAlt: '',
            audio: null,
            timings: null,
            mood: i === finished.length - 1 ? 'sleepy' : i === 0 ? 'warm' : i > finished.length * 0.55 ? 'wonder' : 'curious',
          }),
        ),
        memory,
        seriesId: continuing ? base!.seriesId : uid(),
        chapter: continuing ? base!.chapter + 1 : 1,
        model,
        createdAt: Date.now(),
      };
      family.saveStory(story);
      router.push(`/read/mine/${story.id}?listen=1`);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      // A dropped connection (phone locked, signal lost) surfaces as a TypeError.
      const code = e?.code || (e instanceof TypeError ? 'connection' : 'client');
      setWriting((w) => w && { ...w, error: e?.message || 'Something went wrong.', code });
    } finally {
      wake?.release?.().catch(() => {});
    }
  }

  if (!hydrated) return <main className={styles.flow} />;

  if (step === 'writing' && writing) {
    return <WritingScreen writing={writing} childName={child?.name ?? ''} onRetry={make} onBack={() => go('touches')} />;
  }

  return (
    <main className={styles.flow}>
      <div className={styles.top}>
        {stepIndex > 0 && !(step === 'touches' && base) ? (
          <button className={styles.backBtn} onClick={back} aria-label="Back">
            <Icon name="back" size={20} />
          </button>
        ) : (
          <span />
        )}
        <div className={styles.dots} aria-label={`Step ${stepIndex + 1} of 4`}>
          {ORDER.map((s, i) => (
            <span key={s} data-on={i <= stepIndex || undefined} />
          ))}
        </div>
        <span />
      </div>

      {step === 'who' && (
        <section className={styles.step}>
          <p className="eyebrow">Step one</p>
          <h1>Who’s the hero tonight?</h1>
          {children.length > 0 && !editingChild ? (
            <>
              <div className={styles.kids}>
                {children.map((c) => (
                  <button
                    key={c.id}
                    className={styles.kid}
                    aria-pressed={child?.id === c.id}
                    onClick={() => {
                      family.setActiveChild(c.id);
                      next();
                    }}
                  >
                    <span className={styles.avatar}>{c.name.charAt(0).toUpperCase()}</span>
                    <strong>{c.name}</strong>
                    <small>{c.ageBand === 'Newborn–1' ? 'Baby' : c.ageBand}</small>
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost btn-block" onClick={() => setEditingChild(true)}>
                <Icon name="plus" size={18} /> Add another child
              </button>
            </>
          ) : (
            <ChildForm
              initial={blankChild()}
              compact
              saveLabel="Continue"
              onSave={(c: ChildProfile) => {
                family.saveChild(c);
                setEditingChild(false);
                next();
              }}
            />
          )}
        </section>
      )}

      {step === 'mood' && child && (
        <section className={styles.step}>
          <button className={styles.forChild} onClick={() => go('who')}>
            <span className={styles.avatarSm}>{child.name.charAt(0).toUpperCase()}</span>
            For {child.name} <span>Change</span>
          </button>
          <h1>What does tonight need?</h1>
          <div className={styles.moods}>
            {MOODS.map((m) => (
              <button
                key={m.id}
                className={styles.mood}
                aria-pressed={draft.mood === m.id}
                onClick={() => {
                  setDraft({ ...draft, mood: m.id });
                  setTimeout(next, 180);
                }}
              >
                <strong>{m.label}</strong>
                <span>{m.note}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'world' && (
        <section className={styles.step}>
          <p className="eyebrow">{mood?.label}</p>
          <h1>Where shall we go?</h1>
          <div className={styles.worlds}>
            {WORLDS.map((w) => (
              <button
                key={w.id}
                className={styles.world}
                aria-pressed={draft.world === w.id}
                style={{ '--tint': w.tint } as React.CSSProperties}
                onClick={() => {
                  setDraft({ ...draft, world: w.id });
                  if (w.id !== 'other') setTimeout(next, 180);
                }}
              >
                <span aria-hidden>{w.emoji}</span>
                {w.label}
              </button>
            ))}
          </div>
          {draft.world === 'other' && (
            <div className={styles.other}>
              <label htmlFor="world">Where’s the story set?</label>
              <input
                id="world"
                autoFocus
                maxLength={70}
                value={draft.customWorld}
                placeholder="Tractors, ballet school, a volcano made of jelly…"
                onChange={(e) => setDraft({ ...draft, customWorld: e.target.value })}
              />
              <button className="btn btn-primary btn-block" disabled={!draft.customWorld.trim()} onClick={next}>
                That’s the one
              </button>
            </div>
          )}
        </section>
      )}

      {step === 'touches' && child && (
        <section className={styles.step}>
          {base && continueId ? (
            <>
              <p className="eyebrow" style={{ color: 'var(--sea)' }}>
                Chapter {base.chapter + 1}
              </p>
              <h1>What happens next in “{base.title}”?</h1>
              <p className={styles.sub}>Same world, same friends. The storyteller remembers where they left off.</p>
            </>
          ) : (
            <>
              <p className="eyebrow">
                {mood?.label} · {draft.world === 'other' ? draft.customWorld : world?.label}
              </p>
              <h1>A few finishing touches</h1>
              <p className={styles.sub}>All optional, and they make it feel like {child.name}’s own.</p>
            </>
          )}

          <div className={styles.block}>
            <span className={styles.label}>How long?</span>
            <div className={styles.lengths}>
              {LENGTHS.map((l) => (
                <button key={l.value} aria-pressed={draft.minutes === l.value} onClick={() => setDraft({ ...draft, minutes: l.value })}>
                  <strong>{l.label}</strong>
                  <span>{l.note}</span>
                </button>
              ))}
            </div>
          </div>

          {child.companions.length > 0 && (
            <div className={styles.block}>
              <span className={styles.label}>Bring along</span>
              <div className={styles.pills}>
                {child.companions.map((c) => (
                  <button
                    key={c.name}
                    aria-pressed={draft.companions.includes(c.name)}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        companions: draft.companions.includes(c.name)
                          ? draft.companions.filter((x) => x !== c.name)
                          : [...draft.companions, c.name],
                      })
                    }
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.block}>
            <label className={styles.label} htmlFor="today">
              Anything from today?
            </label>
            <textarea
              id="today"
              rows={3}
              maxLength={220}
              value={draft.todayDetail}
              placeholder="Lost a first tooth… scored a goal… nervous about swimming tomorrow…"
              onChange={(e) => setDraft({ ...draft, todayDetail: e.target.value })}
            />
            <small>We’ll weave it in gently. The best stories have a little bit of real life in them.</small>
          </div>

          <button className={`btn btn-primary btn-block ${styles.make}`} onClick={make} disabled={!mood || !worldText}>
            <Icon name="sparkle" size={20} />
            {againId ? 'Write a different story' : 'Write the story'}
          </button>
        </section>
      )}
    </main>
  );
}

// The storyteller plans silently for ~20–30s before the first words arrive;
// rotate gentle status lines so the wait feels alive rather than frozen.
function DreamingStatus({ name }: { name: string }) {
  const lines = [
    `Dreaming up ${name}’s world…`,
    'Choosing a sidekick…',
    'Hiding a surprise for later…',
    'Thinking of something funny…',
    'Planning a cosy ending…',
    'Picking the perfect title…',
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, lines.length - 1)), 4500);
    return () => clearInterval(t);
  }, [lines.length]);
  return <>{lines[i]}</>;
}

function WritingScreen({
  writing,
  childName,
  onRetry,
  onBack,
}: {
  writing: Writing;
  childName: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  if (writing.notConnected) {
    return (
      <main className={styles.writing}>
        <div className={styles.quill} aria-hidden />
        <h1>The storyteller is almost here</h1>
        <p className={styles.sub}>
          Personalised stories switch on as soon as our storyteller is connected. In the meantime the library has finished books ready
          to read tonight.
        </p>
        <Link href="/library" className="btn btn-primary btn-block">
          Open the library
        </Link>
        <button className="btn btn-ghost btn-block" onClick={onBack}>
          Back
        </button>
      </main>
    );
  }
  if (writing.error) {
    return (
      <main className={styles.writing}>
        <h1>That one got away</h1>
        <p className={styles.sub}>{writing.error}</p>
        {writing.code && <p className={styles.code}>Code: {writing.code}</p>}
        <button className="btn btn-primary btn-block" onClick={onRetry}>
          Try again
        </button>
        <button className="btn btn-ghost btn-block" onClick={onBack}>
          Change something
        </button>
      </main>
    );
  }
  const status = !writing.title ? <DreamingStatus name={childName} /> : `Writing page ${writing.pages.length + 1}…`;
  return (
    <main className={styles.writing} aria-live="polite">
      <div className={styles.quill} aria-hidden />
      <p className="eyebrow">{status}</p>
      <h1 className={writing.title ? styles.titleIn : styles.titleWait}>{writing.title || 'Once there was…'}</h1>
      {writing.hook && <p className={styles.sub}>{writing.hook}</p>}
      <ol className={styles.pagesList}>
        {writing.pages.map((p, i) => (
          <li key={i}>
            <span>{i + 1}</span>
            <div>
              <strong>{p.heading}</strong>
              <p>{p.text.split(/(?<=[.!?])\s/)[0]}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
