'use client';

import Link from 'next/link';
import { useWallet } from '@/lib/account';
import { totalTokens } from '@/lib/plans';
import styles from './WalletChip.module.css';

/** Small "how many books can I make" indicator. Links to plans. */
export function WalletChip({ className, plain = false }: { className?: string; plain?: boolean }) {
  const wallet = useWallet();
  // `plain` renders a non-interactive chip for use inside another link.
  const Tag = (plain ? 'span' : Link) as typeof Link;
  if (!wallet) return <span className={`${styles.chip} ${styles.loading} ${className ?? ''}`} aria-hidden />;
  if (!wallet.cloud) {
    return (
      <span className={`${styles.chip} ${styles.preview} ${className ?? ''}`} title="While we test, personalised stories are free">
        Preview · stories free
      </span>
    );
  }
  if (!wallet.signedIn) {
    return (
      <Tag href="/account" className={`${styles.chip} ${className ?? ''}`}>
        Sign in
      </Tag>
    );
  }
  const n = totalTokens(wallet);
  return (
    <Tag href="/plans" className={`${styles.chip} ${n === 0 ? styles.empty : ''} ${className ?? ''}`} aria-label={`${n} story tokens. 1 token makes 1 book.`}>
      <span className={styles.coin} aria-hidden>
        ✦
      </span>
      {n} {n === 1 ? 'token' : 'tokens'}
    </Tag>
  );
}
