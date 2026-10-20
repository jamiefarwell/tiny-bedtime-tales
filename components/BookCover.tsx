import { Scene } from './Scene';
import styles from './BookCover.module.css';

function hash(s: string) {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * A book cover. The app always sets the title itself; artwork never contains
 * lettering, so covers stay crisp at every size.
 */
export function BookCover({
  title,
  image,
  alt,
  glow,
  size = 'm',
  priority = false,
  showTitle = true,
}: {
  title: string;
  image: string | null;
  alt: string;
  glow?: string;
  size?: 's' | 'm' | 'l';
  priority?: boolean;
  showTitle?: boolean;
}) {
  return (
    <div className={`${styles.cover} ${styles[size]}`}>
      {image ? (
        <img src={image} alt={alt} loading={priority ? 'eager' : 'lazy'} />
      ) : (
        <Scene mood="wonder" seed={hash(title) % 1000} glow={glow} label={alt} />
      )}
      {showTitle && (
        <div className={styles.titleWrap}>
          <span className={styles.title}>{title}</span>
        </div>
      )}
      <span className={styles.spine} aria-hidden />
    </div>
  );
}
