'use client';

import { useFamily } from '@/lib/store';
import styles from './book.module.css';

export function ResumeHint({ slug, pages }: { slug: string; pages: number }) {
  const progress = useFamily((s) => s.progress[`book:${slug}`]);
  if (!progress || progress.finished || progress.page === 0) return null;
  return (
    <p className={styles.resume}>
      You stopped on page {progress.page + 1} of {pages}. We’ll open it there.
    </p>
  );
}
