'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { worldTile, type World } from '@/app/(app)/create/options';
import styles from './WorldTile.module.css';

/** Illustrated world card. A link when `href` is given, otherwise a toggle button. */
export function WorldTile({
  world,
  href,
  pressed,
  onSelect,
  size = 'm',
  badge,
}: {
  world: World;
  href?: string;
  pressed?: boolean;
  onSelect?: () => void;
  size?: 'm' | 'l';
  badge?: ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  const body = (
    <>
      {!broken && <img src={worldTile(world.id)} alt="" loading="lazy" onError={() => setBroken(true)} />}
      <span className={styles.label}>{world.label}</span>
      {badge && <span className={styles.badge}>{badge}</span>}
    </>
  );
  const className = `${styles.tile} ${styles[size]}`;
  const style = { '--tint': world.tint } as React.CSSProperties;
  return href ? (
    <Link href={href} className={className} style={style}>
      {body}
    </Link>
  ) : (
    <button type="button" className={className} style={style} aria-pressed={pressed} onClick={onSelect}>
      {body}
    </button>
  );
}
