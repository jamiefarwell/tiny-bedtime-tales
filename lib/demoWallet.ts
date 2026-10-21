'use client';

// Demo payments: the full token experience with no money and no accounts.
// Mirrors the real wallet rules in supabase/migrations/0004 (welcome token,
// plan tokens first, monthly refill with roll-over cap, packs that never
// expire, one free redo within 24h, refunds on failure) but lives on the
// device, so testers can try every flow. Used whenever accounts aren't
// configured. Never trust it for anything real: it is a prototype tool.

import { FAMILY_PLAN, PACKS, type BillingItem } from './plans';
import { family } from './store';
import { DEMO_WALLET_DEFAULT, type DemoWallet } from './demoWalletState';

export type { DemoWallet };

const MONTH = 30 * 24 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export class DemoNoTokens extends Error {}

function get(): DemoWallet {
  return family.get().demoWallet;
}
function save(w: DemoWallet) {
  family.setDemoWallet({ ...w, ledger: w.ledger.slice(-100) });
}
function log(w: DemoWallet, delta: number, bucket: 'plan' | 'extra', kind: string, ref: string): DemoWallet {
  return { ...w, ledger: [...w.ledger, { at: Date.now(), delta, bucket, kind, ref }] };
}

/** Apply any monthly plan refills that are due. */
export function demoRefill(now = Date.now()): DemoWallet {
  let w = get();
  while (w.plan && w.plan.status === 'active' && w.plan.nextRefillAt <= now) {
    const before = w.planTokens;
    const planTokens = Math.min(before + FAMILY_PLAN.tokensPerMonth, FAMILY_PLAN.rolloverCap);
    w = log({ ...w, planTokens, plan: { ...w.plan, nextRefillAt: w.plan.nextRefillAt + MONTH } }, planTokens - before, 'plan', 'plan_refill', String(w.plan.nextRefillAt));
  }
  save(w);
  return w;
}

/** Take one token for a story. Returns whether it was a free redo. */
export function demoSpend(storyId: string, redoOf?: string): { free: boolean } {
  let w = demoRefill();
  if (redoOf) {
    const original = w.ledger.find((l) => l.kind === 'spend_story' && l.ref === redoOf);
    const alreadyRedone = w.ledger.some((l) => l.kind === 'free_redo' && l.ref === redoOf);
    if (original && !alreadyRedone && Date.now() - original.at < DAY) {
      save(log(w, 0, 'plan', 'free_redo', redoOf));
      return { free: true };
    }
  }
  if (w.planTokens > 0) w = log({ ...w, planTokens: w.planTokens - 1 }, -1, 'plan', 'spend_story', storyId);
  else if (w.extraTokens > 0) w = log({ ...w, extraTokens: w.extraTokens - 1 }, -1, 'extra', 'spend_story', storyId);
  else throw new DemoNoTokens();
  save(w);
  return { free: false };
}

/** Give a token back for a story that failed. */
export function demoRefund(storyId: string) {
  const w = get();
  const spent = w.ledger.find((l) => l.kind === 'spend_story' && l.ref === storyId);
  if (!spent || w.ledger.some((l) => l.kind === 'refund_story' && l.ref === storyId)) return;
  const next = spent.bucket === 'plan' ? { ...w, planTokens: w.planTokens + 1 } : { ...w, extraTokens: w.extraTokens + 1 };
  save(log(next, 1, spent.bucket, 'refund_story', storyId));
}

/** The pretend checkout completing. */
export function demoPurchase(item: BillingItem) {
  const w = get();
  const pack = PACKS.find((p) => p.code === item);
  if (pack) {
    save(log({ ...w, extraTokens: w.extraTokens + pack.tokens }, pack.tokens, 'extra', 'pack_purchase', `demo-${Date.now()}`));
    return;
  }
  const cycle = item === 'family_yearly' ? 'yearly' : 'monthly';
  const now = Date.now();
  save({
    ...w,
    plan: {
      cycle,
      status: 'active',
      startedAt: now,
      nextRefillAt: now, // first month's tokens arrive straight away
      renewsAt: now + (cycle === 'yearly' ? 12 : 1) * MONTH,
      cancelAtPeriodEnd: false,
    },
  });
  demoRefill(now);
}

/** Pretend a month has passed: the next refill lands now. */
export function demoNextMonth() {
  const w = get();
  if (!w.plan || w.plan.status !== 'active') return;
  save({ ...w, plan: { ...w.plan, nextRefillAt: Date.now() } });
  demoRefill();
}

export function demoCancelPlan() {
  const w = get();
  if (!w.plan) return;
  save({ ...w, plan: { ...w.plan, status: 'canceled', cancelAtPeriodEnd: true } });
}

export function demoReset() {
  save({ ...DEMO_WALLET_DEFAULT, ledger: [{ ...DEMO_WALLET_DEFAULT.ledger[0], at: Date.now() }] });
}
