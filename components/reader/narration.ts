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

function narrateAudio(o: NarrateOptions): Narration {
  const el = new Audio(o.audio!);
  el.preload = 'auto';
  el.volume = o.volume;
  el.playbackRate = Math.max(0.75, Math.min(1.1, o.rate));
  let raf = 0;
  let current = o.fromWord ?? 0;
  let stopped = false;
  const timings = o.timings ?? [];

  if (o.fromWord && timings[o.fromWord]) el.currentTime = timings[o.fromWord].start;

  const tick = () => {
    if (stopped) return;
    const t = el.currentTime;
    if (el.duration) o.onProgress(t / el.duration);
    // Timings are ordered, so walk forward from the current word.
    while (current + 1 < timings.length && timings[current + 1].start <= t) current++;
    if (timings[current]) o.onWord(timings[current].w);
    raf = requestAnimationFrame(tick);
  };
  el.onended = () => {
    if (stopped) return;
    cancelAnimationFrame(raf);
    o.onProgress(1);
    o.onEnd();
  };
  el.play().then(() => (raf = requestAnimationFrame(tick)), () => o.onEnd());

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      el.pause();
      el.src = '';
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
  let progressTimer = 0 as unknown as ReturnType<typeof setInterval>;
  const totalChars = o.text.length || 1;

  synth.cancel();
  loadVoices().then((voices) => {
    if (stopped) return;
    const voice = bestVoice(voices, o.voiceURI);
    let i = 0;
    const speakNext = () => {
      if (stopped) return;
      if (i >= chunks.length) {
        clearInterval(progressTimer);
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
      u.onboundary = (e) => {
        if (stopped || (e.name && e.name !== 'word')) return;
        word = tokenAt(o.tokens, chunk.offset + e.charIndex);
        o.onWord(word);
        o.onProgress(Math.min(0.99, (chunk.offset + e.charIndex) / totalChars));
      };
      u.onend = () => setTimeout(speakNext, 260);
      u.onerror = () => setTimeout(speakNext, 60);
      synth.speak(u);
    };
    // Some voices never fire boundary events; keep progress moving anyway.
    const startedAt = Date.now();
    const estimate = estimateSeconds(o.tokens.length - word, o.rate) * 1000;
    progressTimer = setInterval(() => {
      if (stopped) return;
      o.onProgress(Math.min(0.97, (o.tokens[word]?.start ?? 0) / totalChars + (Date.now() - startedAt) / estimate / 4));
    }, 500);
    speakNext();
  });

  return {
    stop() {
      stopped = true;
      clearInterval(progressTimer);
      synth.cancel();
    },
    position: () => word,
  };
}

/** Make sound-effect words read naturally rather than spelled out. */
function speakable(text: string): string {
  return text
    .replace(/…/g, '... ')
    .replace(/\b([A-Z]{4,})\b/g, (w) => w.charAt(0) + w.slice(1).toLowerCase());
}
