'use client';

import Link from 'next/link';
import { useState } from 'react';
import { openBilling, useWallet } from '@/lib/account';
import { FAMILY_PLAN, PACKS, canBuy, totalTokens, type BillingItem } from '@/lib/plans';
import { Icon } from '@/components/reader/icons';
import ui from '../pages.module.css';
import styles from './plans.module.css';

export default function PlansPage() {
  const wallet = useWallet();
  const [yearly, setYearly] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const ready = canBuy(wallet);
  const signedIn = Boolean(wallet?.signedIn);
  const onPlan = Boolean(wallet?.plan && ['active', 'trialing', 'past_due'].includes(wallet.plan.status));

  async function buy(item: BillingItem) {
    if (!signedIn) {
      window.location.href = `/account?next=/plans`;
      return;
    }
    setBusy(item);
    setError('');
    const message = await openBilling({ action: 'checkout', item });
    if (message) setError(message);
    setBusy(null);
  }

  return (
    <main className={styles.page}>
      <header className={ui.pageHead}>
        <p className="eyebrow">Plans</p>
        <h1>Simple, fair, bedtime-sized</h1>
        <p>One token makes one personalised book. The library is always unlimited.</p>
      </header>

      {wallet?.signedIn && (
        <div className={styles.balance}>
          <span className={styles.big}>{totalTokens(wallet)}</span>
          <span>
            story {totalTokens(wallet) === 1 ? 'token' : 'tokens'} left
            <small>
              {wallet.planTokens} from your plan · {wallet.extraTokens} extra (never expire)
            </small>
          </span>
        </div>
      )}

      <section className={styles.plan}>
        <div className={styles.planTop}>
          <div>
            <p className="eyebrow">{FAMILY_PLAN.name} plan</p>
            <h2>
              {yearly ? FAMILY_PLAN.yearly.perMonth : FAMILY_PLAN.monthly.price}
              <small>/month</small>
            </h2>
            <p className={styles.billed}>
              {yearly ? `${FAMILY_PLAN.yearly.price} billed once a year: two months free` : 'Billed monthly, cancel any time'}
            </p>
          </div>
          <div className={styles.toggle} role="group" aria-label="Billing period">
            <button aria-pressed={!yearly} onClick={() => setYearly(false)}>
              Monthly
            </button>
            <button aria-pressed={yearly} onClick={() => setYearly(true)}>
              Yearly
            </button>
          </div>
        </div>
        <ul className={styles.includes}>
          {FAMILY_PLAN.includes.map((x) => (
            <li key={x}>
              <Icon name="check" size={18} />
              {x}
            </li>
          ))}
        </ul>
        {onPlan ? (
          <button className="btn btn-ghost btn-block" onClick={() => openBilling({ action: 'portal' }).then((m) => m && setError(m))}>
            Manage your plan
          </button>
        ) : (
          <button className="btn btn-primary btn-block" disabled={!ready || busy !== null} onClick={() => buy(yearly ? 'family_yearly' : 'family_monthly')}>
            {busy?.startsWith('family') ? 'Opening secure checkout…' : signedIn ? 'Start the Family plan' : 'Sign in to start'}
          </button>
        )}
      </section>

      <section className={ui.section}>
        <div className={ui.sectionHead}>
          <h2>Need more books?</h2>
        </div>
        <div className={styles.packs}>
          {PACKS.map((p) => (
            <button key={p.code} className={styles.pack} disabled={!ready || busy !== null} onClick={() => buy(p.code)}>
              <span className={styles.packTokens}>
                <span className={styles.coin}>✦</span> {p.tokens} tokens
              </span>
              <strong>{p.price}</strong>
              <small>{busy === p.code ? 'Opening…' : p.note}</small>
            </button>
          ))}
        </div>
        <p className={styles.fine}>Extra tokens never expire, and work with or without a plan.</p>
      </section>

      {error && <p className={styles.error}>{error}</p>}
      {wallet?.demo && (
        <p className={styles.notice}>Demo payments: buttons open a pretend checkout. Nothing is charged, and tokens are kept on this device.</p>
      )}
      {wallet && !ready && <p className={styles.notice}>Payments switch on at launch. Your free story is waiting.</p>}

      <section className={ui.section}>
        <div className={ui.sectionHead}>
          <h2>Our promises</h2>
        </div>
        <dl className={styles.faq}>
          <dt>What is a token?</dt>
          <dd>One token makes one brand-new personalised book: any length, any world, including next chapters. That’s it. No maths.</dd>
          <dt>What if a story isn’t right?</dt>
          <dd>Ask for a different one within 24 hours and the first redo is free. If a story fails to write, your token comes straight back.</dd>
          <dt>Do unused tokens disappear?</dt>
          <dd>Plan tokens roll over for a month (up to {FAMILY_PLAN.rolloverCap}). Tokens you buy never expire.</dd>
          <dt>What if I cancel?</dt>
          <dd>Cancel in one tap from your account. Every story you’ve made stays on your shelf for good.</dd>
          <dt>Is the library included?</dt>
          <dd>Yes. Every Ready-to-Read book, as often as you like, on any plan.</dd>
        </dl>
      </section>

      <p className={styles.back}>
        <Link href="/account">Your account</Link>
      </p>
    </main>
  );
}
