'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import type { WalletView } from './plans';
import { family, useFamily } from './store';
import type { DemoWallet } from './demoWalletState';
import type { ChildProfile, PersonalStory } from './types';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let browser: SupabaseClient | null = null;
/** Browser Supabase client, or null in preview mode. */
export function supabaseBrowser(): SupabaseClient | null {
  if (!URL_ || !KEY) return null;
  browser ??= createBrowserClient(URL_, KEY);
  return browser;
}

export const cloudOnClient = () => Boolean(URL_ && KEY);

const PREVIEW_WALLET: WalletView = { cloud: false, payments: false, demo: true, signedIn: true, planTokens: 0, extraTokens: 0, plan: null };

function demoView(d: DemoWallet): WalletView {
  return {
    ...PREVIEW_WALLET,
    planTokens: d.planTokens,
    extraTokens: d.extraTokens,
    plan: d.plan
      ? {
          code: 'family',
          status: d.plan.status,
          renewsAt: new Date(d.plan.renewsAt).toISOString(),
          cancelAtPeriodEnd: d.plan.cancelAtPeriodEnd,
          cycle: d.plan.cycle,
        }
      : null,
  };
}

// One shared fetch so every chip and screen shows the same numbers.
let cached: WalletView | null = null;
let inflight: Promise<WalletView> | null = null;
const listeners = new Set<(w: WalletView) => void>();

export async function refreshWallet(): Promise<WalletView> {
  if (!cloudOnClient()) return PREVIEW_WALLET;
  inflight ??= fetch('/api/wallet', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : PREVIEW_WALLET))
    .catch(() => PREVIEW_WALLET)
    .then((w: WalletView) => {
      cached = w;
      inflight = null;
      listeners.forEach((l) => l(w));
      return w;
    });
  return inflight;
}

/** Current wallet. `null` while loading. Without accounts, the demo wallet. */
export function useWallet(): WalletView | null {
  const demo = useFamily((s) => s.demoWallet);
  const [wallet, setWallet] = useState<WalletView | null>(cloudOnClient() ? cached : null);
  useEffect(() => {
    if (!cloudOnClient()) return;
    listeners.add(setWallet);
    if (!cached) refreshWallet();
    return () => {
      listeners.delete(setWallet);
    };
  }, []);
  return cloudOnClient() ? wallet : demoView(demo);
}

export function useSignIn() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const send = useCallback(async (email: string, next = '/account') => {
    const sb = supabaseBrowser();
    if (!sb) return;
    setState('sending');
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setState(error ? 'error' : 'sent');
  }, []);
  return { state, send };
}

export async function signOut() {
  await supabaseBrowser()?.auth.signOut();
  cached = null;
  await refreshWallet();
}

export async function openBilling(body: { action: 'checkout'; item: string } | { action: 'portal' }): Promise<string | null> {
  if (!cloudOnClient()) {
    // Demo payments: the pretend checkout, or the demo plan controls.
    window.location.href = body.action === 'checkout' ? `/demo-checkout?item=${body.item}` : '/account#demo-plan';
    return null;
  }
  const res = await fetch('/api/billing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (data.url) {
    window.location.href = data.url;
    return null;
  }
  return data.message || 'Something went wrong.';
}

// --- Family sync -------------------------------------------------------------
// The device copy stays the source of truth for instant, offline-friendly use;
// when a parent is signed in, children and stories are mirrored to their
// account so every phone in the family sees the same shelf.

export async function syncFamily(): Promise<'synced' | 'skipped' | 'failed'> {
  const sb = supabaseBrowser();
  if (!sb) return 'skipped';
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) return 'skipped';
  try {
    const local = family.get();
    const [kids, stories] = await Promise.all([
      sb.from('family_children').select('id, data, updated_at'),
      sb.from('family_stories').select('id, data'),
    ]);
    if (kids.error) throw kids.error;
    if (stories.error) throw stories.error;

    // Pull: anything on the account that this device hasn't got.
    const remoteKids = (kids.data ?? []).map((r) => r.data as ChildProfile);
    const remoteStories = (stories.data ?? []).map((r) => r.data as PersonalStory);
    for (const c of remoteKids) if (!local.children.some((x) => x.id === c.id)) family.saveChild(c);
    for (const s of remoteStories) if (!local.stories.some((x) => x.id === s.id)) family.saveStory(s);

    // Push: everything on this device (upserts are idempotent).
    const now = family.get();
    if (now.children.length) {
      const { error } = await sb
        .from('family_children')
        .upsert(now.children.map((c) => ({ id: c.id, user_id: user.id, data: c, updated_at: new Date().toISOString() })));
      if (error) throw error;
    }
    if (now.stories.length) {
      const { error } = await sb.from('family_stories').upsert(
        now.stories.map((s) => ({
          id: s.id,
          user_id: user.id,
          child_id: s.childId,
          data: s,
          created_at: new Date(s.createdAt).toISOString(),
          updated_at: new Date().toISOString(),
        })),
      );
      if (error) throw error;
    }
    return 'synced';
  } catch (error) {
    console.warn('family sync failed', error);
    return 'failed';
  }
}
