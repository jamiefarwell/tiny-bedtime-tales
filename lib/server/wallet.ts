import 'server-only';
import type { WalletView } from '@/lib/plans';
import { cloudEnabled, paymentsEnabled } from './config';
import { currentUser, supabaseAdmin } from './supabase';

export class NoTokensError extends Error {}

interface WalletRow {
  plan_tokens: number;
  extra_tokens: number;
  plan_code: string | null;
  plan_status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

/** Everything the app shows about tokens and plans for the current visitor. */
export async function walletView(): Promise<WalletView> {
  const base: WalletView = {
    cloud: cloudEnabled(),
    payments: paymentsEnabled(),
    demo: false,
    signedIn: false,
    planTokens: 0,
    extraTokens: 0,
    plan: null,
  };
  if (!base.cloud) return base;
  const user = await currentUser();
  if (!user) return base;
  // refill_wallet applies any monthly top-ups that are due, then returns the row.
  const { data, error } = await supabaseAdmin().rpc('refill_wallet', { p_user: user.id });
  if (error) throw error;
  const w = data as WalletRow;
  return {
    ...base,
    signedIn: true,
    email: user.email,
    planTokens: w.plan_tokens,
    extraTokens: w.extra_tokens,
    plan:
      w.plan_code && w.plan_status !== 'none'
        ? { code: w.plan_code, status: w.plan_status, renewsAt: w.current_period_end, cancelAtPeriodEnd: w.cancel_at_period_end }
        : null,
  };
}

/** Take one token for a story (or record a free redo). Throws NoTokensError. */
export async function spendStoryToken(userId: string, storyId: string, redoOf?: string) {
  const { data, error } = await supabaseAdmin().rpc('spend_story_token', {
    p_user: userId,
    p_story: storyId,
    p_redo_of: redoOf ?? null,
  });
  if (error) {
    if (String(error.message).includes('no_tokens')) throw new NoTokensError();
    throw error;
  }
  const row = (Array.isArray(data) ? data[0] : data) as { plan_tokens: number; extra_tokens: number; bucket: string };
  return { planTokens: row.plan_tokens, extraTokens: row.extra_tokens, free: row.bucket === 'free' };
}

export async function refundStoryToken(userId: string, storyId: string) {
  const { error } = await supabaseAdmin().rpc('refund_story_token', { p_user: userId, p_story: storyId });
  if (error) console.error('token refund failed', storyId, error.message);
}
