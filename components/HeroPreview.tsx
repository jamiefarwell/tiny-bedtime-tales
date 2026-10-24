'use client';

import { useState } from 'react';
import type { ChildProfile } from '@/lib/types';
import { ensureHero, heroKey, usePicture, usePicturesAvailable } from '@/lib/pictures';
import styles from './HeroPreview.module.css';

/**
 * The child drawn as their storybook character, from their look. Shows the
 * saved drawing when there is one; otherwise offers to draw it (once per look).
 */
export function HeroPreview({ child, size = 'm', auto = false }: { child: Pick<ChildProfile, 'name' | 'look' | 'ageBand' | 'pronouns'>; size?: 's' | 'm'; auto?: boolean }) {
  const available = usePicturesAvailable();
  const key = heroKey(child);
  const url = usePicture(key);
  const [state, setState] = useState<{ key: string; status: 'drawing' | 'failed' } | null>(null);
  const status = state?.key === key ? state.status : null;
  const name = child.name || 'them';

  const draw = () => {
    setState({ key, status: 'drawing' });
    ensureHero(child).then((blob) => setState(blob ? null : { key, status: 'failed' }));
  };

  if (!key || (!available && !url)) return null;
  if (url) {
    return (
      <figure className={`${styles.hero} ${styles[size]}`}>
        <img src={url} alt={`${name} as a storybook character`} />
        {size === 'm' && <figcaption>{name} in every illustrated story</figcaption>}
      </figure>
    );
  }
  if (auto) {
    return (
      <figure className={`${styles.hero} ${styles[size]} ${styles.pending}`} aria-label={`Drawing ${name}`}>
        <span />
      </figure>
    );
  }
  return (
    <button type="button" className={styles.draw} onClick={draw} disabled={status === 'drawing'}>
      {status === 'drawing' ? `Drawing ${name}… (about 20 seconds)` : status === 'failed' ? 'That didn’t work. Try again?' : `See ${name} drawn`}
    </button>
  );
}
