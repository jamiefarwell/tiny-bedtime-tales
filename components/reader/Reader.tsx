'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Page } from '@/lib/types';
import { family, useFamily, useHydrated, useSettings } from '@/lib/store';
import { tokenise, type Token } from '@/lib/tokenise';
import { Scene } from '@/components/Scene';
import { bestVoice, estimateSeconds, loadVoices, narrate, preloadAudio, type Narration } from './narration';
import { startAmbient, type Ambient } from './ambient';
import { Icon } from './icons';
import styles from './Reader.module.css';

export interface ReaderProps {
  title: string;
  pages: Page[];
  /** Key for remembering the reader's place. */
  progressKey: string;
  backHref: string;
  glow?: string;
  artNote?: string;
  /** Extra actions shown on the end screen (e.g. "Next chapter"). */
  endActions?: ReactNode;
  /** Start narrating as soon as the book opens. */
  autoPlay?: boolean;
  /** More pages are still being written; wait for them instead of ending. */
  pending?: boolean;
  /** Total pages expected while `pending`, for the progress bar. */
  expectedPages?: number;
}

// A breath between pages: long enough to feel like turning, short enough not to drag.
const TURN_DELAY = 800;
const TURN_MS = 560;
const AMBIENT_AFTER_END_MS = 10 * 60 * 1000;

export function Reader({ title, pages, progressKey, backHref, glow, artNote, endActions, autoPlay, pending, expectedPages }: ReaderProps) {
  const hydrated = useHydrated();
  const [settings, update] = useSettings();
  const saved = useFamily((s) => s.progress[progressKey]);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [word, setWord] = useState(-1);
  const [pageProgress, setPageProgress] = useState(0);
  const [ended, setEnded] = useState(false);
  const [panel, setPanel] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [resumeWord, setResumeWord] = useState(0);
  const [restored, setRestored] = useState(false);
  // Narration reached the newest page while the rest is still being written.
  const [waiting, setWaiting] = useState(false);
  // The page being turned away from, kept on screen while it animates out.
  const [turn, setTurn] = useState<{ from: number; dir: 1 | -1 } | null>(null);
  const prevIndex = useRef(0);

  const narrationRef = useRef<Narration | null>(null);
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ambientRef = useRef<Ambient | null>(null);
  const wakeRef = useRef<any>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; t: number; active: boolean } | null>(null);

  // Read inside narration callbacks, which outlive the render that made them.
  const autoTurnRef = useRef(settings.autoTurn);
  autoTurnRef.current = settings.autoTurn;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const lastRef = useRef(pages.length - 1);
  lastRef.current = pages.length - 1;

  const page = pages[index];
  const tokens = useMemo(() => pages.map((p) => tokenise(p.text)), [pages]);
  // Real recording length where we have one, otherwise a reading-pace estimate.
  const durations = useMemo(
    () => tokens.map((t, i) => {
      const timed = pages[i]?.timings;
      return timed?.length ? timed[timed.length - 1].end + 1.4 : estimateSeconds(t.length);
    }),
    [tokens, pages],
  );
  const last = pages.length - 1;
  const sleepy = settings.sleepy;
  const windDown = last > 0 ? index / last : 0;

  // Resume where this family left off, once storage has been read.
  useEffect(() => {
    if (!hydrated || restored) return;
    if (saved && !saved.finished && saved.page > 0 && saved.page <= last) setIndex(saved.page);
    setRestored(true);
    if (autoPlay) setPlaying(true);
  }, [hydrated, restored, saved, last, autoPlay]);

  useEffect(() => {
    if (!restored) return;
    family.setProgress(progressKey, { page: index, finished: ended, updatedAt: Date.now() });
  }, [index, ended, restored, progressKey]);

  const stopNarration = useCallback(() => {
    if (turnTimer.current) clearTimeout(turnTimer.current);
    turnTimer.current = null;
    narrationRef.current?.stop();
    narrationRef.current = null;
  }, []);

  // Narration for the current page. Restarts whenever the page or play state
  // changes; everything else is read from refs/props at call time.
  useEffect(() => {
    if (!playing || ended || !page) return;
    const pageTokens = tokens[index];
    const rate = sleepy ? Math.max(0.8, 0.94 - windDown * 0.12) : 1;
    const volume = sleepy ? Math.max(0.65, 1 - windDown * 0.3) : 1;
    narrationRef.current = narrate({
      text: page.text,
      tokens: pageTokens,
      audio: page.audio,
      timings: page.timings,
      rate,
      volume,
      voiceURI: settings.voiceURI,
      fromWord: resumeWord,
      onWord: setWord,
      onProgress: setPageProgress,
      onBlocked: () => setPlaying(false),
      onEnd: () => {
        narrationRef.current = null;
        setWord(-1);
        setResumeWord(0);
        if (!autoTurnRef.current) {
          setPlaying(false);
          return;
        }
        turnTimer.current = setTimeout(() => {
          if (index < lastRef.current) setIndex(index + 1);
          else if (pendingRef.current) setWaiting(true);
          else setEnded(true);
        }, TURN_DELAY);
      },
    });
    return stopNarration;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, ended]);

  // Reset per-page state on every page change (not when new pages stream in).
  useEffect(() => {
    setWord(-1);
    setPageProgress(0);
    textRef.current?.scrollTo({ top: 0 });
  }, [index]);

  // Fetch the next page's picture and narration while this one is read, so
  // turning the page never waits on the network.
  useEffect(() => {
    const here = pages[index];
    const next = pages[index + 1];
    if (here?.audio) preloadAudio(here.audio);
    if (next?.image) new Image().src = next.image;
    if (next?.audio) preloadAudio(next.audio);
  }, [index, pages]);

  // Page-turn animation: the old page slides away as the new one arrives.
  useEffect(() => {
    if (prevIndex.current === index) return;
    setTurn({ from: prevIndex.current, dir: index > prevIndex.current ? 1 : -1 });
    prevIndex.current = index;
    const t = setTimeout(() => setTurn(null), TURN_MS);
    return () => clearTimeout(t);
  }, [index]);

  // The page we were waiting for has arrived (or the story is complete).
  useEffect(() => {
    if (!waiting) return;
    if (index < last) {
      setWaiting(false);
      setIndex(index + 1);
    } else if (!pending) {
      setWaiting(false);
      setEnded(true);
    }
  }, [waiting, index, last, pending]);

  // Keep the screen awake while a story is being told.
  useEffect(() => {
    const nav = navigator as any;
    if (playing && nav.wakeLock && !wakeRef.current) {
      nav.wakeLock.request('screen').then((l: any) => (wakeRef.current = l), () => {});
    }
    if (!playing && wakeRef.current) {
      wakeRef.current.release?.();
      wakeRef.current = null;
    }
  }, [playing]);

  // Sleep sounds: only in sleepy mode, rising gently as the story winds down,
  // and carrying on for a while after the end.
  useEffect(() => {
    const want = sleepy && settings.ambient !== 'off' && (playing || ended);
    if (want && !ambientRef.current) ambientRef.current = startAmbient(settings.ambient as any, 0.18);
    if (!want && ambientRef.current) {
      ambientRef.current.stop(1.5);
      ambientRef.current = null;
    }
  }, [sleepy, settings.ambient, playing, ended]);

  useEffect(() => {
    ambientRef.current?.setVolume(ended ? 0.32 : 0.16 + windDown * 0.14, 4);
    if (!ended) return;
    const t = setTimeout(() => {
      ambientRef.current?.stop(60);
      ambientRef.current = null;
    }, AMBIENT_AFTER_END_MS);
    return () => clearTimeout(t);
  }, [ended, windDown]);

  useEffect(
    () => () => {
      stopNarration();
      ambientRef.current?.stop(0.5);
      wakeRef.current?.release?.();
    },
    [stopNarration],
  );

  // Keep the word being read in view on small screens.
  useEffect(() => {
    if (word < 0 || !settings.readAlong) return;
    const el = textRef.current?.querySelector<HTMLElement>(`[data-w="${word}"]`);
    const box = textRef.current;
    if (!el || !box) return;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop + 8 || top > box.scrollTop + box.clientHeight - 48) {
      box.scrollTo({ top: Math.max(0, top - box.clientHeight / 3), behavior: 'smooth' });
    }
  }, [word, settings.readAlong]);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0) return;
      stopNarration();
      setResumeWord(0);
      if (next > last) {
        if (pending) setWaiting(true);
        else setEnded(true);
        return;
      }
      setWaiting(false);
      setEnded(false);
      setIndex(next);
    },
    [last, stopNarration],
  );

  const togglePlay = useCallback(() => {
    if (playing) {
      setResumeWord(narrationRef.current?.position() ?? 0);
      stopNarration();
      setPlaying(false);
    } else {
      if (!settings.narration) update({ narration: true });
      setPlaying(true);
    }
  }, [playing, settings.narration, stopNarration, update]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
      else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'Escape') setPanel(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, index, togglePlay]);

  // Swipe to turn. The page follows the finger, with resistance at the ends.
  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    drag.current = { x: e.clientX, y: e.clientY, t: Date.now(), active: false };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.active && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.3) d.active = true;
    if (!d.active) return;
    const atEdge = (dx > 0 && index === 0) || (dx < 0 && ended);
    setDragX(atEdge ? dx * 0.25 : dx);
  }
  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    setDragX(0);
    if (!d?.active) return;
    const dx = e.clientX - d.x;
    const velocity = Math.abs(dx) / Math.max(1, Date.now() - d.t);
    if (Math.abs(dx) > 70 || velocity > 0.5) goTo(dx < 0 ? index + 1 : index - 1);
  }

  const elapsed = durations.slice(0, index).reduce((a, b) => a + b, 0) + durations[index] * pageProgress;
  const total = durations.reduce((a, b) => a + b, 0);
  const minutesLeft = Math.max(1, Math.round((total - elapsed) / 60));

  return (
    <div
      className={styles.reader}
      data-sleepy={sleepy || undefined}
      style={
        {
          '--wind': sleepy ? windDown : 0,
          '--text-scale': settings.textScale,
          '--glow': glow,
        } as React.CSSProperties
      }
    >
      <div
        className={styles.stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setDragX(0);
        }}
      >
        {!ended && turn && pages[turn.from] && (
          <div key={`leave-${turn.from}`} className={`${styles.spread} ${turn.dir > 0 ? styles.leaveFwd : styles.leaveBack}`} aria-hidden>
            <figure className={styles.art}>
              {pages[turn.from].image ? (
                <img src={pages[turn.from].image!} alt="" draggable={false} />
              ) : (
                <Scene mood={pages[turn.from].mood} seed={turn.from + 1} glow={glow} className={styles.scene} />
              )}
            </figure>
            <article className={styles.paper}>
              <div className={styles.paperInner}>
                <h2 className={styles.heading}>{pages[turn.from].heading}</h2>
                <StoryText text={pages[turn.from].text} tokens={tokens[turn.from]} current={-1} />
              </div>
            </article>
          </div>
        )}

        {!ended && page && (
          <div
            key={index}
            className={`${styles.spread} ${turn ? (turn.dir > 0 ? styles.enterFwd : styles.enterBack) : ''}`}
            style={{ transform: dragX ? `translateX(${dragX}px)` : undefined, transition: dragX ? 'none' : undefined }}
          >
            <figure className={styles.art} data-playing={playing || undefined}>
              {page.image ? (
                <img src={page.image} alt={page.imageAlt} draggable={false} />
              ) : (
                <Scene mood={page.mood} seed={index + 1} glow={glow} className={styles.scene} label={page.imageAlt} />
              )}
              {!page.image && artNote && <figcaption className={styles.artNote}>{artNote}</figcaption>}
            </figure>

            <article className={styles.paper}>
              <div className={styles.paperInner} ref={textRef}>
                <h2 className={styles.heading}>{page.heading}</h2>
                <StoryText
                  text={page.text}
                  tokens={tokens[index]}
                  current={settings.readAlong && playing ? word : -1}
                />
              </div>
            </article>
          </div>
        )}

        {ended && (
          <EndScreen
            title={title}
            sleepy={sleepy}
            backHref={backHref}
            ambientOn={sleepy && settings.ambient !== 'off'}
            onAgain={() => {
              setEnded(false);
              setPlaying(false);
              setIndex(0);
            }}
            actions={endActions}
          />
        )}
      </div>

      <header className={styles.top}>
        <Link href={backHref} className={styles.round} aria-label="Close book">
          <Icon name="close" />
        </Link>
        <div className={styles.topTitle}>
          <span>{title}</span>
          {!ended && (
            <small>
              Page {index + 1} of {pending ? Math.max(pages.length, expectedPages ?? 0) : pages.length}
            </small>
          )}
        </div>
        <button className={styles.round} onClick={() => setPanel((p) => !p)} aria-label="Reading settings" aria-expanded={panel}>
          <Icon name="settings" />
        </button>
      </header>

      {!ended && (
        <footer className={styles.controls}>
          <div className={styles.progress} aria-hidden>
            {Array.from({ length: pending ? Math.max(pages.length, expectedPages ?? 0) : pages.length }, (_, i) => (
              <button
                key={i}
                className={styles.segment}
                onClick={() => goTo(i)}
                tabIndex={-1}
                style={{ '--fill': i < index ? 1 : i === index ? pageProgress : 0 } as React.CSSProperties}
              />
            ))}
          </div>
          <div className={styles.meta}>
            <span>
              {waiting ? 'Writing the next page…' : playing ? (settings.autoTurn ? 'Reading to you' : 'Reading this page') : 'Paused'}
            </span>
            <span>About {minutesLeft} min left</span>
          </div>
          <div className={styles.buttons}>
            <button className={styles.side} onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous page">
              <Icon name="prev" />
            </button>
            <button className={styles.play} onClick={togglePlay} aria-label={playing ? 'Pause narration' : 'Read to me'}>
              <Icon name={playing ? 'pause' : 'play'} />
            </button>
            <button className={styles.side} onClick={() => goTo(index + 1)} aria-label="Next page">
              <Icon name="next" />
            </button>
          </div>
          <div className={styles.toggles}>
            <Toggle label="Turn pages" on={settings.autoTurn} onChange={(v) => update({ autoTurn: v })} />
            <Toggle label="Sleepy mode" icon="moon" on={sleepy} onChange={(v) => update({ sleepy: v })} />
          </div>
        </footer>
      )}

      {panel && (
        <SettingsPanel
          onClose={() => setPanel(false)}
          settings={settings}
          update={update}
        />
      )}
    </div>
  );
}

function StoryText({ text, tokens, current }: { text: string; tokens: Token[]; current: number }) {
  // Rebuild paragraphs from the token list so every word span carries the same
  // index the narrator reports.
  const paras: ReactNode[][] = [[]];
  tokens.forEach((t, i) => {
    const gap = i === 0 ? '' : text.slice(tokens[i - 1].end, t.start);
    if (/\n\s*\n/.test(gap)) paras.push([]);
    else if (gap.includes('\n')) paras[paras.length - 1].push(<br key={`br${i}`} />);
    else if (i > 0) paras[paras.length - 1].push(' ');
    paras[paras.length - 1].push(
      <span key={i} data-w={i} className={i === current ? styles.now : i < current ? styles.read : undefined}>
        {t.word}
      </span>,
    );
  });
  return (
    <div className={styles.text}>
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function Toggle({ label, on, onChange, icon }: { label: string; on: boolean; onChange: (v: boolean) => void; icon?: 'moon' }) {
  return (
    <button className={styles.toggle} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      {icon && <Icon name={icon} />}
      <span>{label}</span>
      <i aria-hidden />
    </button>
  );
}

function SettingsPanel({
  onClose,
  settings,
  update,
}: {
  onClose: () => void;
  settings: ReturnType<typeof useSettings>[0];
  update: ReturnType<typeof useSettings>[1];
}) {
  return (
    <div className={styles.panelWrap} onClick={onClose}>
      <div className={styles.panel} role="dialog" aria-label="Reading settings" onClick={(e) => e.stopPropagation()}>
        <div className={styles.panelGrip} />
        <h3>Reading settings</h3>
        <div className={styles.row}>
          <span>Text size</span>
          <div className={styles.stepper}>
            <button onClick={() => update({ textScale: Math.max(0.85, +(settings.textScale - 0.1).toFixed(2)) })} aria-label="Smaller text">
              A
            </button>
            <button onClick={() => update({ textScale: Math.min(1.5, +(settings.textScale + 0.1).toFixed(2)) })} aria-label="Larger text">
              A
            </button>
          </div>
        </div>
        <label className={styles.row}>
          <span>
            Read-along highlighting
            <small>Lights up each word as it’s read, for early readers.</small>
          </span>
          <input type="checkbox" checked={settings.readAlong} onChange={(e) => update({ readAlong: e.target.checked })} />
        </label>
        <VoicePicker voiceURI={settings.voiceURI} onChange={(voiceURI) => update({ voiceURI })} />
        <label className={styles.row}>
          <span>
            Sleepy mode
            <small>Warmer, dimmer colours, a slower, softer voice as the story ends, and no next story.</small>
          </span>
          <input type="checkbox" checked={settings.sleepy} onChange={(e) => update({ sleepy: e.target.checked })} />
        </label>
        <div className={styles.row}>
          <span>
            Sleep sounds
            <small>Plays in sleepy mode and keeps going for 10 minutes after the end.</small>
          </span>
        </div>
        <div className={styles.segmented}>
          {(['off', 'rain', 'waves', 'hush'] as const).map((k) => (
            <button key={k} aria-pressed={settings.ambient === k} onClick={() => update({ ambient: k })}>
              {k === 'off' ? 'Off' : k === 'rain' ? 'Rain' : k === 'waves' ? 'Waves' : 'Hush'}
            </button>
          ))}
        </div>
        <button
          className="btn btn-ghost btn-block"
          onClick={() => {
            const d = document as any;
            if (!d.fullscreenElement) d.documentElement.requestFullscreen?.().catch(() => {});
            else d.exitFullscreen?.();
            onClose();
          }}
        >
          Full screen
        </button>
      </div>
    </div>
  );
}

function EndScreen({
  title,
  sleepy,
  backHref,
  ambientOn,
  onAgain,
  actions,
}: {
  title: string;
  sleepy: boolean;
  backHref: string;
  ambientOn: boolean;
  onAgain: () => void;
  actions?: ReactNode;
}) {
  const [locked, setLocked] = useState(sleepy);
  const [holding, setHolding] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (sleepy && locked) {
    // Lights out: nothing tappable except a deliberate press-and-hold, so a
    // sleepy hand can't start another story.
    return (
      <div className={styles.lightsOut}>
        <div className={styles.moon} />
        <p className={styles.goodnight}>Goodnight</p>
        {ambientOn && <p className={styles.quiet}>Sleep sounds will fade away by themselves.</p>}
        <button
          className={styles.holdBtn}
          data-holding={holding || undefined}
          onPointerDown={() => {
            setHolding(true);
            hold.current = setTimeout(() => setLocked(false), 1500);
          }}
          onPointerUp={() => {
            setHolding(false);
            if (hold.current) clearTimeout(hold.current);
          }}
          onPointerLeave={() => {
            setHolding(false);
            if (hold.current) clearTimeout(hold.current);
          }}
        >
          Hold to wake the app
        </button>
      </div>
    );
  }

  return (
    <div className={styles.end}>
      <p className="eyebrow">The end</p>
      <h2>{title}</h2>
      <p className={styles.endNote}>Sweet dreams.</p>
      <div className={styles.endActions}>
        {actions}
        <button className="btn btn-ghost btn-block" onClick={onAgain}>
          Read it again
        </button>
        <Link className="btn btn-ghost btn-block" href={backHref}>
          Back to the library
        </Link>
      </div>
    </div>
  );
}

/** Choose among the device's English voices. Quality varies a lot by phone. */
function VoicePicker({ voiceURI, onChange }: { voiceURI: string; onChange: (uri: string) => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    loadVoices().then((all) => {
      const en = all.filter((v) => v.lang.toLowerCase().startsWith('en'));
      // British voices first, then the rest of English.
      en.sort((a, b) => Number(/GB/i.test(b.lang)) - Number(/GB/i.test(a.lang)) || a.name.localeCompare(b.name));
      setVoices(en);
    });
  }, []);
  if (!voices.length) return null;
  const current = bestVoice(voices, voiceURI);
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad/i.test(navigator.userAgent);
  return (
    <div className={styles.voice}>
      <span className={styles.voiceLabel}>Reading voice</span>
      <div className={styles.voiceRow}>
        <select value={current?.voiceURI ?? ''} onChange={(e) => onChange(e.target.value)}>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name.replace(/^(Microsoft|Google)\s+/, '').replace(/\s*-\s*English.*$/, '')} ({v.lang.replace('en-', '')})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            const u = new SpeechSynthesisUtterance('Once there was a sleepy dragon who could not find his pillow.');
            if (current) u.voice = current;
            u.rate = 0.92;
            speechSynthesis.cancel();
            speechSynthesis.speak(u);
          }}
        >
          Hear it
        </button>
      </div>
      <small>
        {isIOS
          ? 'Tip: for much nicer voices, go to Settings → Accessibility → Read & Speak (Spoken Content) → Voices → English, and download an “Enhanced” or “Premium” voice.'
          : 'Voices come from this device. Recorded narration is coming soon.'}
      </small>
    </div>
  );
}
