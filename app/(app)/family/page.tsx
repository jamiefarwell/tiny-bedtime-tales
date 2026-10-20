'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ChildProfile } from '@/lib/types';
import { family, useFamily, useHydrated } from '@/lib/store';
import { ChildForm, blankChild } from '@/components/ChildForm';
import { Icon } from '@/components/reader/icons';
import { WalletChip } from '@/components/WalletChip';
import ui from '../pages.module.css';
import styles from './family.module.css';

export default function FamilyPage() {
  const hydrated = useHydrated();
  const children = useFamily((s) => s.children);
  const activeId = useFamily((s) => s.activeChildId);
  const [editing, setEditing] = useState<ChildProfile | null>(null);

  if (editing) {
    return (
      <main className={styles.page}>
        <button className={styles.back} onClick={() => setEditing(null)}>
          <Icon name="back" size={20} /> Family
        </button>
        <header className={ui.pageHead}>
          <h1>{editing.name ? editing.name : 'Add a child'}</h1>
          <p>Everything here shapes their stories. Change it whenever they find a new favourite thing.</p>
        </header>
        <ChildForm
          initial={editing}
          onSave={(c) => {
            family.saveChild(c);
            setEditing(null);
          }}
        />
        {children.some((c) => c.id === editing.id) && (
          <button
            className={styles.remove}
            onClick={() => {
              if (confirm(`Remove ${editing.name}? Their stories stay on your shelf.`)) {
                family.removeChild(editing.id);
                setEditing(null);
              }
            }}
          >
            Remove {editing.name}
          </button>
        )}
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={ui.pageHead}>
        <p className="eyebrow">Family</p>
        <h1>Our heroes</h1>
        <p>One account for the whole family. Each child gets their own stories and their own world.</p>
      </header>

      <Link href="/account" className={styles.account}>
        <span>
          <strong>Account &amp; plan</strong>
          <small>Sign in, tokens and sync across devices</small>
        </span>
        <WalletChip plain />
      </Link>

      <div className={styles.kids}>
        {hydrated &&
          children.map((c) => (
            <button key={c.id} className={styles.kid} onClick={() => setEditing(c)}>
              <span className={styles.avatar}>{c.name.charAt(0).toUpperCase()}</span>
              <span className={styles.kidBody}>
                <strong>
                  {c.name}
                  {c.id === activeId && children.length > 1 && <em>Tonight’s hero</em>}
                </strong>
                <small>
                  {c.ageBand === 'Newborn–1' ? 'Baby' : `Story level ${c.ageBand}`}
                  {c.loves.length ? ` · loves ${c.loves.slice(0, 3).join(', ').toLowerCase()}` : ''}
                </small>
              </span>
              <span className={styles.edit}>Edit</span>
            </button>
          ))}
        <button className={styles.addKid} onClick={() => setEditing(blankChild())}>
          <Icon name="plus" size={20} /> Add a child
        </button>
      </div>

      <section className={ui.section}>
        <div className={`${ui.card} ${styles.promise}`}>
          <h2>Our bedtime promise</h2>
          <ul>
            <li>Simple pricing: 1 token makes 1 book, a reminder before any trial ends, and one-tap cancelling.</li>
            <li>Stories you’ve made stay on your shelf, even if you stop subscribing.</li>
            <li>We only ask for a first name. No photos, no surnames, no schools.</li>
            <li>Every story is written to strict bedtime rules: calm endings, nothing frightening, nothing from your keep-out list.</li>
          </ul>
          <Link href="/privacy">How we look after your family’s information</Link>
        </div>
      </section>
    </main>
  );
}
