const PATHS = {
  close: 'M6 6l12 12M18 6L6 18',
  settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6',
  prev: 'M7 5v14M19 6l-9 6 9 6z',
  next: 'M17 5v14M5 6l9 6-9 6z',
  play: 'M8 5.5v13l11-6.5z',
  pause: 'M8 5h3v14H8zM13 5h3v14h-3z',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  back: 'M15 5l-7 7 7 7',
  book: 'M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4zM9 16h9',
  headphones: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H4zM17 15h3v5h-3z',
  sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  plus: 'M12 5v14M5 12h14',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  shelf: 'M5 4v16M10 4v16M15 5l4 15M3 20h18',
  stories: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  family: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a2.5 2.5 0 1 0 0-5M16 14a5 5 0 0 1 5 6',
  check: 'M5 12l5 5L20 7',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  const filled = name === 'play' || name === 'pause' || name === 'prev' || name === 'next' || name === 'sparkle' || name === 'moon';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} strokeWidth={name === 'prev' || name === 'next' ? 2.4 : undefined} stroke={name === 'prev' || name === 'next' ? 'currentColor' : undefined} />
    </svg>
  );
}
