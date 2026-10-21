import type { WordTiming } from '@/lib/types';
import { tokenAt, type Token } from '@/lib/tokenise';

export interface NarrateOptions {
  text: string;
  tokens: Token[];
  audio: string | null;
  timings: WordTiming[] | null;
  /** 1 = normal storytelling pace. */
  rate: number;
  volume: number;
  voiceURI?: string;
  /** Start part-way through the page (resume). */
  fromWord?: number;
  onWord: (index: number) => void;
  onProgress: (fraction: number) => void;
  onEnd: () => void;
  /** Playback was refused (e.g. needs a tap first). */
  onBlocked?: () => void;
}

export interface Narration {
  stop(): void;
  /** Word the narrator had reached, for resuming later. */
  position(): number;
}

/** Rough read-aloud duration in seconds, used when there is no audio file. */
export function estimateSeconds(wordCount: number, rate = 1): number {
  return (wordCount / (150 * rate)) * 60 + 1.5;
}

export function narrate(opts: NarrateOptions): Narration {
  return opts.audio ? narrateAudio(opts) : narrateSpeech(opts);
}

// Recorded narration plays through ONE shared audio element: phones only let
// a page start sound after a tap, and that permission belongs to the element,
// so reusing it keeps auto page-turns working. Upcoming pages are fetched
// ahead into memory, so turning a page never waits on the network.
let player: HTMLAudioElement | null = null;
function sharedPlayer(): HTMLAudioElement {
  if (!player) {
    player = new Audio();
    player.preload = 'auto';
  }
  return player;
}

const fetched = new Map<string, Promise<string>>();
/** Start downloading a page's narration; resolves to a playable local URL. */
export function preloadAudio(url: string): Promise<string> {
  let p = fetched.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => URL.createObjectURL(b))
      .catch(() => url); // fall back to streaming it directly
    fetched.set(url, p);
  }
  return p;
}

function narrateAudio(o: NarrateOptions): Narration {
  const el = sharedPlayer();
  let raf = 0;
  let current = o.fromWord ?? 0;
  let stopped = false;
  const timings = o.timings ?? [];

  const tick = () => {
    if (stopped) return;
    const t = el.currentTime;
    if (el.duration) o.onProgress(t / el.duration);
    // Timings are ordered, so walk forward from the current word.
    while (current + 1 < timings.length && timings[current + 1].start <= t) current++;
    if (timings[current]) o.onWord(timings[current].w);
    raf = requestAnimationFrame(tick);
  };
  const onEnded = () => {
    if (stopped) return;
    cancelAnimationFrame(raf);
    o.onProgress(1);
    o.onEnd();
  };

  preloadAudio(o.audio!).then((src) => {
    if (stopped) return;
    el.onended = onEnded;
    if (el.src !== src) el.src = src;
    el.volume = o.volume;
    el.playbackRate = Math.max(0.75, Math.min(1.1, o.rate));
    el.currentTime = o.fromWord && timings[o.fromWord] ? timings[o.fromWord].start : 0;
    el.play().then(
      () => (raf = requestAnimationFrame(tick)),
      // The browser refused to play without a tap: pause rather than skip pages.
      () => !stopped && (o.onBlocked ? o.onBlocked() : o.onEnd()),
    );
  });

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      if (el.onended === onEnded) el.onended = null;
      el.pause();
    },
    position: () => (timings[current] ? timings[current].w : 0),
  };
}

// --- Device voice -----------------------------------------------------------

// Ranked by how natural they sound reading to children in British English.
const PREFERRED = [
  /Libby.*Natural/i,
  /Sonia.*Natural/i,
  /Maisie.*Natural/i,
  /Natural.*en-GB|en-GB.*Natural/i,
  /Google UK English Female/i,
  /Serena|Kate|Stephanie|Martha/i,
  /Hazel|Susan/i,
  /Daniel|Arthur|George/i,
];

export function bestVoice(voices: SpeechSynthesisVoice[], uri?: string): SpeechSynthesisVoice | null {
  if (uri) {
    const chosen = voices.find((v) => v.voiceURI === uri);
    if (chosen) return chosen;
  }
  const gb = voices.filter((v) => /en[-_]GB/i.test(v.lang));
  for (const re of PREFERRED) {
    const hit = gb.find((v) => re.test(v.name)) ?? voices.find((v) => re.test(v.name));
    if (hit) return hit;
  }
  return gb[0] ?? voices.find((v) => v.lang.startsWith('en')) ?? null;
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve([]);
  const now = window.speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1200);
  });
}

function narrateSpeech(o: NarrateOptions): Narration {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  if (!synth) {
    // No voice at all: behave like a silent narrator so auto-turn still works.
    const total = estimateSeconds(o.tokens.length, o.rate) * 1000;
    const started = Date.now();
    const timer = setInterval(() => {
      const f = Math.min(1, (Date.now() - started) / total);
      o.onProgress(f);
      if (f >= 1) {
        clearInterval(timer);
        o.onEnd();
      }
    }, 200);
    return { stop: () => clearInterval(timer), position: () => 0 };
  }

  // Chrome silently stops long utterances, so speak one paragraph-sized chunk
  // at a time. Each chunk knows its character offset into the page text.
  const startChar = o.tokens[o.fromWord ?? 0]?.start ?? 0;
  const chunks: { text: string; offset: number }[] = [];
  const re = /[^\n]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(o.text))) {
    const end = m.index + m[0].length;
    if (end <= startChar) continue;
    const from = Math.max(m.index, startChar);
    chunks.push({ text: o.text.slice(from, end), offset: from });
  }

  let stopped = false;
  let word = o.fromWord ?? 0;
  let ticker = 0 as unknown as ReturnType<typeof setInterval>;
  const totalChars = o.text.length || 1;
  // Many phone voices (notably on iOS) never fire word-boundary events. Then
  // we estimate the word from elapsed time and recalibrate the speaking pace
  // after every paragraph, so highlighting and scrolling still follow along.
  let boundaries = false;
  let wordsPerSecond = 2.4 * o.rate;
  let chunkStartedAt = 0;
  let chunkFirst = word;
  let chunkLast = word;

  synth.cancel();
  loadVoices().then((voices) => {
    if (stopped) return;
    const voice = bestVoice(voices, o.voiceURI);
    let i = 0;
    const speakNext = () => {
      if (stopped) return;
      if (i >= chunks.length) {
        clearInterval(ticker);
        o.onProgress(1);
        o.onEnd();
        return;
      }
      const chunk = chunks[i++];
      const u = new SpeechSynthesisUtterance(speakable(chunk.text));
      if (voice) u.voice = voice;
      u.lang = voice?.lang || 'en-GB';
      u.rate = 0.92 * o.rate;
      u.pitch = 1.02;
      u.volume = o.volume;
      chunkFirst = tokenAt(o.tokens, chunk.offset);
      chunkLast = tokenAt(o.tokens, chunk.offset + chunk.text.length - 1);
      chunkStartedAt = 0;
      u.onstart = () => {
        chunkStartedAt = Date.now();
        word = chunkFirst;
        o.onWord(word);
      };
      u.onboundary = (e) => {
        if (stopped || (e.name && e.name !== 'word')) return;
        boundaries = true;
        word = tokenAt(o.tokens, chunk.offset + e.charIndex);
        o.onWord(word);
        o.onProgress(Math.min(0.99, (chunk.offset + e.charIndex) / totalChars));
      };
      u.onend = () => {
        if (!boundaries && chunkStartedAt) {
          const secs = (Date.now() - chunkStartedAt) / 1000;
          const measured = (chunkLast - chunkFirst + 1) / Math.max(0.5, secs);
          wordsPerSecond = wordsPerSecond * 0.4 + measured * 0.6;
        }
        setTimeout(speakNext, 260);
      };
      u.onerror = () => setTimeout(speakNext, 60);
      synth.speak(u);
    };
    ticker = setInterval(() => {
      if (stopped || boundaries || !chunkStartedAt) return;
      const elapsed = (Date.now() - chunkStartedAt) / 1000;
      const estimate = Math.min(chunkLast, chunkFirst + Math.floor(elapsed * wordsPerSecond));
      if (estimate !== word) {
        word = estimate;
        o.onWord(word);
        o.onProgress(Math.min(0.99, (o.tokens[word]?.start ?? 0) / totalChars));
      }
    }, 120);
    speakNext();
  });

  return {
    stop() {
      stopped = true;
      clearInterval(ticker);
      synth.cancel();
    },
    position: () => word,
  };
}

/** Make sound-effect words read naturally rather than spelled out. */
function speakable(text: string): string {
  return text
    .replace(/…/g, ',')
    .replace(/\b([A-Z]{4,})\b/g, (w) => w.charAt(0) + w.slice(1).toLowerCase());
}
