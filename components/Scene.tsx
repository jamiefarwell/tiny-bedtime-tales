import type { Page } from '@/lib/types';

// Art-pending placeholder: a quiet night landscape tinted by the page's mood,
// so a book without final illustrations still reads as a designed object.

const MOODS: Record<NonNullable<Page['mood']>, [string, string, string]> = {
  warm: ['#3b2f6b', '#a2577a', '#f2a65a'],
  curious: ['#1f3a6b', '#3d6fa8', '#8fd0d6'],
  funny: ['#3a2c72', '#7e4fb0', '#ffb56b'],
  tense: ['#141a3d', '#2a3570', '#5967a8'],
  wonder: ['#2b2468', '#6a4bb5', '#ffd27a'],
  sleepy: ['#0f1230', '#1d2350', '#3b4380'],
};

function rand(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function Scene({
  mood = 'wonder',
  seed = 1,
  glow = '#ffc46b',
  className,
  label,
}: {
  mood?: Page['mood'];
  seed?: number;
  glow?: string;
  className?: string;
  label?: string;
}) {
  const [top, mid, low] = MOODS[mood ?? 'wonder'];
  const r = rand(seed * 97 + 13);
  const stars = Array.from({ length: 38 }, () => ({ x: r() * 400, y: r() * 230, s: 0.6 + r() * 1.8, o: 0.3 + r() * 0.7 }));
  const orbX = 70 + r() * 260;
  const id = `s${seed}`;
  return (
    <svg
      className={className}
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="0.6" stopColor={mid} />
          <stop offset="1" stopColor={low} />
        </linearGradient>
        <radialGradient id={`${id}orb`}>
          <stop offset="0" stopColor="#fff6dc" />
          <stop offset="0.25" stopColor={glow} stopOpacity="0.9" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.16 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width="400" height="500" fill={`url(#${id}sky)`} />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff7e2" opacity={s.o} />
      ))}
      <circle cx={orbX} cy="150" r="120" fill={`url(#${id}orb)`} opacity="0.75" />
      <circle cx={orbX} cy="150" r="20" fill="#fff3d4" opacity="0.95" />
      <path d="M0 330 C80 280 150 300 220 320 S340 290 400 300 V500 H0Z" fill="#000" opacity="0.18" />
      <path d="M0 370 C90 330 170 360 250 350 S350 330 400 345 V500 H0Z" fill="#000" opacity="0.28" />
      <path d="M0 420 C110 390 200 420 290 405 S370 395 400 400 V500 H0Z" fill="#000" opacity="0.38" />
      <rect width="400" height="500" filter={`url(#${id}grain)`} opacity="0.6" />
    </svg>
  );
}
