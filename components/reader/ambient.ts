// Soft sleep sounds synthesised in the browser: no audio files to download,
// and they can loop forever without a seam.

export type AmbientKind = 'rain' | 'waves' | 'hush';

export interface Ambient {
  setVolume(v: number, seconds?: number): void;
  /** Fade out over `seconds` and release the audio context. */
  stop(seconds?: number): void;
}

export function startAmbient(kind: AmbientKind, volume = 0.35): Ambient | null {
  const Ctx = typeof window !== 'undefined' ? window.AudioContext || (window as any).webkitAudioContext : null;
  if (!Ctx) return null;
  const ctx: AudioContext = new Ctx();

  // Brown noise: integrated white noise, warm and low.
  const seconds = 4;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = kind === 'rain' ? 2400 : kind === 'waves' ? 700 : 420;
  filter.Q.value = 0.4;

  const gain = ctx.createGain();
  gain.gain.value = 0;

  source.connect(filter).connect(gain).connect(ctx.destination);

  if (kind === 'waves') {
    // A slow swell, roughly the rhythm of a calm sea (and of sleepy breathing).
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 0.09;
    depth.gain.value = 420;
    lfo.connect(depth).connect(filter.frequency);
    lfo.start();
  }

  source.start();
  const ramp = (v: number, s: number) => {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(v, now + s);
  };
  ramp(volume, 3);

  return {
    setVolume: (v, s = 2) => ramp(v, s),
    stop(s = 2) {
      ramp(0, s);
      setTimeout(() => ctx.close().catch(() => {}), s * 1000 + 200);
    },
  };
}
