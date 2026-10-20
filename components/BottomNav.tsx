'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/reader/icons';
import styles from './BottomNav.module.css';

const ITEMS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: '/', label: 'Tonight', icon: 'moon', match: (p) => p === '/' },
  { href: '/library', label: 'Library', icon: 'shelf', match: (p) => p.startsWith('/library') },
  { href: '/create', label: 'Create', icon: 'sparkle', match: (p) => p.startsWith('/create') },
  { href: '/stories', label: 'Our stories', icon: 'stories', match: (p) => p.startsWith('/stories') },
  { href: '/family', label: 'Family', icon: 'family', match: (p) => p.startsWith('/family') },
];

export function BottomNav() {
  const path = usePathname() || '/';
  return (
    <nav className={styles.nav} aria-label="Main">
      {ITEMS.map((item) => {
        const active = item.match(path);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${item.href === '/create' ? styles.create : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.icon}>
              <Icon name={item.icon} size={22} />
            </span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
