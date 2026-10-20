'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { openBilling, refreshWallet, signOut, syncFamily, useSignIn, useWallet } from '@/lib/account';
import { totalTokens } from '@/lib/plans';
import ui from '../pages.module.css';
import styles from './account.module.css';

function Account() {
  const wallet = useWallet();
  const q = useSearchParams();
  const next = q.get('next') || '/account';
  const { state, send } = useSignIn();
  const [email, setEmail] = useState('');
  const [sync, setSync] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle');
  const [error, setError] = useState('');

  // Coming back from Stripe: the webhook may land a moment after the redirect.
  useEffect(() => {
    if (q.get('checkout') !== 'success') return;
    const t = [1500, 4000, 9000].map((ms) => setTimeout(() => refreshWallet(), ms));
    return () => t.forEach(clearTimeout);
  }, [q]);

  useEffect(() => {
    if (!wallet?.signedIn) return;
    setSync('syncing');
    syncFamily().then((r) => setSync(r === 'synced' ? 'synced' : r === 'failed' ? 'failed' : 'idle'));
  }, [wallet?.signedIn]);

  if (!wallet) return <main className={styles.page} />;

  if (!wallet.cloud) {
    return (
      <main className={styles.page}>
        <header className={ui.pageHead}>
          <p className="eyebrow">Account</p>
          <h1>Preview mode</h1>
          <p>Family accounts switch on at launch. Until then, everything is saved on this device and personalised stories are free.</p>
        </header>
        <div className={`${ui.card} ${styles.stack}`}>
          <p>When accounts arrive you’ll be able to:</p>
          <ul className={styles.list}>
            <li>Sign in with just your email: no password to remember</li>
            <li>See the same stories and children on every phone and tablet</li>
            <li>Choose a plan, or top up tokens whenever you need them</li>
          </ul>
          <Link href="/plans" className="btn btn-ghost btn-block">
            See the plans
          </Link>
        </div>
      </main>
    );
  }

  if (!wallet.signedIn) {
    return (
      <main className={styles.page}>
        <header className={ui.pageHead}>
          <p className="eyebrow">Account</p>
          <h1>Sign in</h1>
          <p>We’ll email you a magic link. No password, and your first personalised story is free.</p>
        </header>
        {q.get('signin') === 'failed' && <p className={styles.error}>That link had expired. Send a fresh one below.</p>}
        {state === 'sent' ? (
          <div className={`${ui.card} ${styles.stack}`}>
            <h2>Check your email</h2>
            <p>We’ve sent a sign-in link to {email}. Open it on this device to carry on.</p>
          </div>
        ) : (
          <form
            className={styles.stack}
            onSubmit={(e) => {
              e.preventDefault();
              if (email.includes('@')) send(email.trim(), next);
            }}
          >
            <label className={styles.field}>
              <span>Your email</span>
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <button className="btn btn-primary btn-block" disabled={state === 'sending'}>
              {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            {state === 'error' && <p className={styles.error}>We couldn’t send that. Check the address and try again.</p>}
          </form>
        )}
      </main>
    );
  }

  const tokens = totalTokens(wallet);
  return (
    <main className={styles.page}>
      <header className={ui.pageHead}>
        <p className="eyebrow">Account</p>
        <h1>Your family</h1>
        <p>{wallet.email}</p>
      </header>

      {q.get('checkout') === 'success' && <p className={styles.success}>Thank you! Your tokens will appear here in a moment.</p>}

      <section className={styles.tokens}>
        <span className={styles.big}>{tokens}</span>
        <div>
          <strong>story {tokens === 1 ? 'token' : 'tokens'}</strong>
          <small>1 token makes 1 personalised book</small>
        </div>
        <Link href="/plans" className="btn btn-primary">
          Get more
        </Link>
      </section>

      <section className={`${ui.card} ${styles.stack}`}>
        <h2>Plan</h2>
        {wallet.plan ? (
          <>
            <p>
              Family plan · <span className={styles.status}>{wallet.plan.status.replace('_', ' ')}</span>
            </p>
            {wallet.plan.renewsAt && (
              <p className={styles.muted}>
                {wallet.plan.cancelAtPeriodEnd ? 'Ends' : 'Renews'} on{' '}
                {new Date(wallet.plan.renewsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {wallet.plan.status === 'past_due' && (
              <p className={styles.error}>Your last payment didn’t go through, so monthly tokens are paused. Update your card below.</p>
            )}
            <button className="btn btn-ghost btn-block" onClick={() => openBilling({ action: 'portal' }).then((m) => m && setError(m))}>
              Manage plan, card or cancel
            </button>
          </>
        ) : (
          <>
            <p className={styles.muted}>No plan yet. You can still buy tokens whenever you need them.</p>
            <Link href="/plans" className="btn btn-ghost btn-block">
              See plans
            </Link>
          </>
        )}
      </section>

      <section className={`${ui.card} ${styles.stack}`}>
        <h2>Your stories, everywhere</h2>
        <p className={styles.muted}>
          {sync === 'syncing'
            ? 'Syncing your children and stories…'
            : sync === 'synced'
              ? 'Children and stories are saved to your account and on this device.'
              : sync === 'failed'
                ? 'We couldn’t sync just now. Your stories are safe on this device.'
                : 'Children and stories are saved on this device.'}
        </p>
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.signOut} onClick={() => signOut()}>
        Sign out
      </button>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense>
      <Account />
    </Suspense>
  );
}
