'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { ChildProfile, Page, PersonalStory } from '@/lib/types';
import { activeChild, family, uid, useFamily, useHydrated } from '@/lib/store';
import { ChildForm, DEFAULT_LOOK, LookPicker, ProfileExtras, blankChild } from '@/components/ChildForm';
import { HeroPreview } from '@/components/HeroPreview';
import { ensureHero, ensureScene, scenePages, useStoryPictures, usePicturesAvailable } from '@/lib/pictures';
import { Icon } from '@/components/reader/icons';
import { Reader } from '@/components/reader/Reader';
import { pageShape, pictureCount } from '@/lib/engine/prompt';
import { WalletChip } from '@/components/WalletChip';
import { cloudOnClient, refreshWallet, syncFamily, useWallet } from '@/lib/account';
import { tokensApply, totalTokens } from '@/lib/plans';
import { DemoNoTokens, demoRefund, demoSpend } from '@/lib/demoWallet';
import { LENGTHS, MOODS, WORLDS, suggestWorlds } from './options';
import { WorldTile } from '@/components/WorldTile';
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
  /** Pictures starring the child (needs their look). */
  pictures: boolean;
}

interface Writing {
  id: string;
  title: string;
  hook: string;
  pages: Page[];
  expected: number;
  done: boolean;
  reading: boolean;
  error: string | null;
  code: string;
  notConnected: boolean;
  illustrated: boolean;
}

export function CreateFlow({ initialWorld, continueId, againId }: { initialWorld?: string; continueId?: string; againId?: string }) {
  const hydrated = useHydrated();
  const child = useFamily(activeChild);
  const children = useFamily((s) => s.children);
  const stories = useFamily((s) => s.stories);
  const base = stories.find((s) => s.id === (continueId || againId)) ?? null;
  const wallet = useWallet();
  const outOfTokens = Boolean(wallet && tokensApply(wallet) && wallet.signedIn && totalTokens(wallet) === 0 && !againId);

  const [step, setStep] = useState<Step>('who');
  const [editingChild, setEditingChild] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    mood: null,
    world: (WORLDS.find((w) => w.id === initialWorld)?.id as Draft['world']) ?? null,
    customWorld: '',
    minutes: 10,
    todayDetail: '',
    companions: [],
    pictures: true,
  });
  const picturesOn = usePicturesAvailable();
  const [choosingLook, setChoosingLook] = useState(false);
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
    const id = uid();
    const expected = pageShape(child.ageBand, draft.minutes).pages;
    const illustrated = Boolean(picturesOn && draft.pictures && child.look);
    setWriting({ id, title: '', hook: '', pages: [], expected, done: false, reading: false, error: null, code: '', notConnected: false, illustrated });
    // The hero's sheet is usually already drawn; if not, start now, alongside the writing.
    if (illustrated) ensureHero(child);
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
        personality: child.personality ?? [],
        laughs: child.laughs ?? [],
        comfort: child.comfort ?? '',
        learning: child.learning ?? '',
      },
      // Recent stories for this child, so tonight's doesn't repeat them.
      history: stories
        .filter((s) => s.childId === child.id)
        .slice(0, 10)
        .map((s) => ({ title: s.title, premise: s.premise || s.hook, shape: s.shape || '' })),
      mood: mood.prompt,
      world: worldText,
      minutes: draft.minutes,
      todayDetail: draft.todayDetail,
      memory: continuing ? base!.memory : '',
      chapter: continuing ? base!.chapter + 1 : 1,
      avoidTitle: againId && base ? base.title : '',
      // Token bookkeeping (ignored in preview mode): this story's id, and the
      // story being redone, whose first redo within 24h is free.
      storyId: id,
      redoOf: againId && base ? base.id : undefined,
      illustrated,
    };

    // Demo payments: take the token on this device (the server only charges
    // real wallets). Refunded below if the story doesn't arrive.
    const demo = Boolean(wallet?.demo);
    if (demo) {
      try {
        demoSpend(id, againId && base ? base.id : undefined);
      } catch (e) {
        if (e instanceof DemoNoTokens) {
          setWriting((w) => w && { ...w, error: 'Out of tokens', code: 'no_tokens' });
          wake?.release?.().catch(() => {});
          return;
        }
      }
    }
    const refundDemo = () => demo && demoRefund(id);

    try {
      const res = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abort.current.signal,
      });
      if (!res.ok || !res.body) {
        refundDemo();
        const err = await res.json().catch(() => ({}));
        setWriting((w) => w && { ...w, error: err.message || 'Something went wrong.', code: err.error || `http-${res.status}`, notConnected: err.error === 'not_connected' });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let title = '';
      let hook = '';
      let premise = '';
      let shape = '';
      const pages: Page[] = [];
      let memory = '';
      let model = '';
      let cast: NonNullable<PersonalStory['cast']> = [];
      let castSig = '';
      let scenes = 0;
      const totalScenes = pictureCount(expected);
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
            premise = ev.premise || '';
            cast = Array.isArray(ev.cast) ? ev.cast : [];
            castSig = ev.castSig || '';
          } else if (ev.type === 'page') {
            const page = toPage(ev.heading, ev.text, ev.index, expected, ev.art, ev.artSig);
            pages[ev.index] = page;
            // Draw each picture as soon as its direction arrives.
            if (illustrated && page.art && page.artSig) ensureScene({ id, cast, castSig }, child, page, ev.index, scenes++, totalScenes);
          }
          else if (ev.type === 'memory') memory = ev.text;
          else if (ev.type === 'done') {
            model = ev.model;
            shape = ev.shape || '';
          }
          else if (ev.type === 'error') throw Object.assign(new Error(ev.message), { code: ev.code });
          setWriting((w) => w && { ...w, title, hook, pages: pages.filter(Boolean) });
        }
      }

      const finished = pages.filter(Boolean);
      if (finished.length < 3) {
        throw Object.assign(new Error('The story came out too short. Let’s try again.'), { code: `short-${finished.length}${model ? '' : '-nodone'}` });
      }
      const story: PersonalStory = {
        id,
        childId: child.id,
        title,
        hook,
        premise,
        shape,
        world: draft.world === 'other' ? draft.customWorld.trim() : world!.prompt,
        mood: mood.label,
        minutes: draft.minutes,
        pages: finished.map((p, i) => toPage(p.heading, p.text, i, finished.length, p.art, p.artSig)),
        memory,
        seriesId: continuing ? base!.seriesId : uid(),
        chapter: continuing ? base!.chapter + 1 : 1,
        model,
        createdAt: Date.now(),
        ...(illustrated ? { illustrated: true, cast, castSig } : {}),
      };
      family.saveStory(story);
      if (cloudOnClient()) {
        refreshWallet();
        syncFamily();
      }
      setWriting((w) => {
        // Already reading: give the page its permanent address without
        // interrupting the narrator.
        if (w?.reading) window.history.replaceState(null, '', `/read/mine/${id}`);
        return w && { ...w, pages: story.pages, done: true };
      });
    } catch (e: any) {
      refundDemo();
      if (e?.name === 'AbortError') return;
      // A dropped connection (phone locked, signal lost) surfaces as a TypeError.
      const code = e?.code || (e instanceof TypeError ? 'connection' : 'client');
      setWriting((w) => w && { ...w, error: e?.message || 'Something went wrong.', code });
    } finally {
      wake?.release?.().catch(() => {});
    }
  }

  if (!hydrated) return <main className={styles.flow} />;

  if (step === 'writing' && writing?.reading) {
    return <WritingReader writing={writing} childName={child?.name ?? ''} />;
  }

  if (step === 'writing' && writing) {
    return (
      <WritingScreen
        writing={writing}
        child={child}
        onRetry={make}
        onBack={() => go('touches')}
        onRead={() => {
          if (writing.done) window.history.replaceState(null, '', `/read/mine/${writing.id}`);
          setWriting((w) => w && { ...w, reading: true });
        }}
      />
    );
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
          <WorldPicker
            child={child}
            selected={draft.world}
            onPick={(id) => {
              setDraft({ ...draft, world: id });
              if (id !== 'other') setTimeout(next, 180);
            }}
          />
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

          <QuickQuestion child={child} />

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

          {picturesOn && (
            <div className={styles.block}>
              <span className={styles.label}>Pictures</span>
              {choosingLook ? (
                <>
                  <LookPicker child={child} set={(patch) => family.saveChild({ ...child, ...patch })} legend={`How ${child.name} looks`} />
                  <button className="btn btn-ghost btn-block" onClick={() => setChoosingLook(false)}>
                    Done
                  </button>
                </>
              ) : child.look ? (
                <button
                  className={styles.pictures}
                  aria-pressed={draft.pictures}
                  onClick={() => setDraft({ ...draft, pictures: !draft.pictures })}
                >
                  <HeroPreview child={child} size="s" auto />
                  <span>
                    <strong>{draft.pictures ? `${child.name} stars in the pictures` : 'No pictures tonight'}</strong>
                    <small>
                      {draft.pictures
                        ? `${pictureCount(pageShape(child.ageBand, draft.minutes).pages)} pictures, drawn while you read`
                        : 'Tap to add pictures'}
                    </small>
                  </span>
                  <span className={styles.switch} aria-hidden />
                </button>
              ) : (
                <button
                  className={styles.pictures}
                  onClick={() => {
                    family.saveChild({ ...child, look: DEFAULT_LOOK });
                    setChoosingLook(true);
                  }}
                >
                  <span className={styles.picturesIcon} aria-hidden>
                    <Icon name="sparkle" size={26} />
                  </span>
                  <span>
                    <strong>Put {child.name} in the pictures</strong>
                    <small>Choose how they look in 10 seconds. No photos, ever.</small>
                  </span>
                </button>
              )}
            </div>
          )}

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

          <div className={styles.makeWrap}>
            {outOfTokens ? (
              <Link href="/plans" className="btn btn-primary btn-block">
                Get tokens to write this story
              </Link>
            ) : (
              <button className="btn btn-primary btn-block" onClick={make} disabled={!mood || !worldText}>
                <Icon name="sparkle" size={20} />
                {againId ? 'Write a different story' : 'Write the story'}
              </button>
            )}
            <div className={styles.costLine}>
              <WalletChip />
              {tokensApply(wallet) && <span>{againId ? 'First redo within 24 hours is free' : 'Uses 1 token'}</span>}
            </div>
          </div>
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

/** Reading while the story is still arriving; pictures fill in as they're drawn. */
function WritingReader({ writing, childName }: { writing: Writing; childName: string }) {
  const art = useStoryPictures(writing.id, writing.pages, childName);
  const drawing = writing.illustrated && (!writing.done || art.ready < art.total);
  return (
    <Reader
      title={writing.title}
      pages={art.pages}
      pending={!writing.done}
      expectedPages={writing.expected}
      progressKey={`story:${writing.id}`}
      backHref="/stories"
      autoPlay
      artNote={drawing ? 'Drawing this picture…' : undefined}
      endActions={
        writing.done ? (
          <Link className="btn btn-rose btn-block" href={`/create?continue=${writing.id}`}>
            Next chapter, tomorrow night
          </Link>
        ) : undefined
      }
    />
  );
}

function WritingScreen({
  writing,
  child,
  onRetry,
  onBack,
  onRead,
}: {
  writing: Writing;
  child: ChildProfile | null;
  onRetry: () => void;
  onBack: () => void;
  onRead: () => void;
}) {
  const childName = child?.name ?? '';
  const art = useStoryPictures(writing.id, writing.pages, childName);
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
  if (writing.code === 'no_tokens' || writing.code === 'sign_in') {
    const signIn = writing.code === 'sign_in';
    return (
      <main className={styles.writing}>
        <div className={styles.quill} aria-hidden />
        <h1>{signIn ? 'Sign in to make this story' : 'You’ve used all your tokens'}</h1>
        <p className={styles.sub}>
          {signIn
            ? 'It takes one email, and your first personalised story is free.'
            : 'Top up with a few extra tokens, or choose the Family plan for a new book every week. The library is still all yours tonight.'}
        </p>
        <Link href={signIn ? '/account?next=/create' : '/plans'} className="btn btn-primary btn-block">
          {signIn ? 'Sign in' : 'Get more tokens'}
        </Link>
        <Link href="/library" className="btn btn-ghost btn-block">
          Read from the library instead
        </Link>
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
  const status = writing.done
    ? 'Ready when you are'
    : !writing.title
      ? <DreamingStatus name={childName} />
      : `Writing page ${writing.pages.length + 1}…`;
  return (
    <main className={styles.writing} aria-live="polite">
      {writing.illustrated && child ? (
        <div className={styles.heroWait}>
          <HeroPreview child={child} size="s" auto />
        </div>
      ) : (
        <div className={styles.quill} aria-hidden />
      )}
      <p className="eyebrow">{status}</p>
      <h1 className={writing.title ? styles.titleIn : styles.titleWait}>{writing.title || 'Once there was…'}</h1>
      {writing.hook && <p className={styles.sub}>{writing.hook}</p>}
      {writing.illustrated && art.total > 0 && (
        <div className={styles.thumbs} aria-label={`${art.ready} of ${art.total} pictures ready`}>
          {Array.from({ length: Math.max(art.total, pictureCount(writing.expected)) }, (_, i) => {
            const page = art.pages[scenePages(writing.pages)[i]];
            return page?.image ? <img key={i} src={page.image} alt="" /> : <span key={i} />;
          })}
        </div>
      )}
      {writing.pages.length > 0 && (
        <button className={`btn btn-rose btn-block ${styles.readNow}`} onClick={onRead}>
          <Icon name="play" size={20} />
          {writing.done ? 'Read the story' : 'Start reading now'}
        </button>
      )}
      {writing.pages.length > 0 && !writing.done && (
        <p className={styles.code}>The rest of the story keeps arriving while you read.</p>
      )}
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

function toPage(heading: string, text: string, i: number, total: number, art?: Page['art'], artSig?: string): Page {
  return {
    ...(art && artSig ? { art, artSig } : {}),
    heading,
    text,
    image: null,
    imageAlt: '',
    audio: null,
    timings: null,
    mood: i >= total - 1 ? 'sleepy' : i === 0 ? 'warm' : i > total * 0.55 ? 'wonder' : 'curious',
  };
}

/** One gap in the profile per night, so stories get richer without a long form. */
function QuickQuestion({ child }: { child: ChildProfile }) {
  const missing: 'personality' | 'laughs' | 'comfort' | null = !child.personality?.length
    ? 'personality'
    : !child.laughs?.length
      ? 'laughs'
      : !child.comfort
        ? 'comfort'
        : null;
  // Keep asking the same question while it's being answered tonight.
  const [asking] = useState(missing);
  if (!asking) return null;
  const set = (patch: Partial<ChildProfile>) => family.saveChild({ ...child, ...patch });
  const toggle = (key: 'personality' | 'laughs', v: string, max = 3) => {
    const cur = child[key] ?? [];
    set({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v].slice(-max) });
  };
  return (
    <div className={styles.quick}>
      <p className="eyebrow">Quick question · makes tonight’s story better</p>
      <ProfileExtras child={child} toggle={toggle} set={set} only={asking} />
    </div>
  );
}

/** Suggested worlds for this child first (their interests, then their age), the rest on request. */
function WorldPicker({
  child,
  selected,
  onPick,
}: {
  child: ChildProfile | null;
  selected: Draft['world'];
  onPick: (id: Draft['world'] & string) => void;
}) {
  const ordered = suggestWorlds(child).filter((w) => w.id !== 'other');
  const other = WORLDS.find((w) => w.id === 'other')!;
  const selectedIndex = ordered.findIndex((w) => w.id === selected);
  const [showAll, setShowAll] = useState(selectedIndex >= 6);
  const visible = showAll ? ordered : ordered.slice(0, 6);
  const loves = (child?.loves ?? []).map((l) => l.toLowerCase());
  const isMatch = (matches: readonly string[]) => matches.some((m) => loves.some((l) => l.includes(m) || m.includes(l)));
  return (
    <>
      <div className={styles.worldGrid}>
        {visible.map((w) => (
          <WorldTile
            key={w.id}
            world={w}
            pressed={selected === w.id}
            onSelect={() => onPick(w.id)}
            badge={isMatch(w.matches) ? `${child?.name ?? 'They'} loves this` : undefined}
          />
        ))}
        <WorldTile world={other} pressed={selected === 'other'} onSelect={() => onPick('other')} />
      </div>
      {!showAll && (
        <button className="btn btn-ghost btn-block" onClick={() => setShowAll(true)}>
          More worlds ({ordered.length - visible.length})
        </button>
      )}
    </>
  );
}
