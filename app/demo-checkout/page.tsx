'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { demoPurchase } from '@/lib/demoWallet';
import { FAMILY_PLAN, PACKS, type BillingItem } from '@/lib/plans';
import styles from './checkout.module.css';

const ITEMS: Record<BillingItem, { name: string; price: string; detail: string }> = {
  family_monthly: { name: 'Family plan (monthly)', price: FAMILY_PLAN.monthly.price, detail: `${FAMILY_PLAN.tokensPerMonth} story tokens every month` },
  family_yearly: { name: 'Family plan (yearly)', price: FAMILY_PLAN.yearly.price, detail: `${FAMILY_PLAN.tokensPerMonth} story tokens every month, billed yearly` },
  pack3: { name: '3 story tokens', price: PACKS[0].price, detail: 'Never expire' },
  pack10: { name: '10 story tokens', price: PACKS[1].price, detail: 'Never expire' },
};

// Stand-in for Stripe Checkout while the app is being tested. No card
// details are ever asked for; completing it only adds demo tokens on this
// device.
function Checkout() {
  const q = useSearchParams();
  const item = q.get('item') as BillingItem | null;
  const product = item ? ITEMS[item] : null;
  const [done, setDone] = useState(false);

  if (!item || !product) {
    return (
      <main className={styles.page}>
        <p>Unknown item.</p>
        <Link href="/plans">Back to plans</Link>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.ribbon}>TEST MODE · no real payment is taken</div>
      <div className={styles.card}>
        <p className={styles.merchant}>Tiny Bedtime Tales</p>
        <h1>{product.name}</h1>
        <p className={styles.price}>{product.price}</p>
        <p className={styles.detail}>{product.detail}</p>
        <hr />
        {done ? (
          <div className={styles.success}>
            <p>✓ Test purchase complete</p>
            <Link href="/account?checkout=success" className={styles.pay}>
              Back to Tiny Bedtime Tales
            </Link>
          </div>
        ) : (
          <>
            <p className={styles.explain}>
              This is a pretend checkout for testing. When the app launches, this step will be Stripe’s secure payment page.
            </p>
            <button
              className={styles.pay}
              onClick={() => {
                demoPurchase(item);
                setDone(true);
              }}
            >
              Complete test purchase
            </button>
            <Link href="/plans" className={styles.cancel}>
              Cancel
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function DemoCheckoutPage() {
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  );
}
