import 'server-only';
import Stripe from 'stripe';
import { FAMILY_PLAN, PACKS, type BillingItem } from '@/lib/plans';
import { config } from './config';
import { supabaseAdmin } from './supabase';

let client: Stripe | null = null;
export function stripe(): Stripe {
  client ??= new Stripe(config.stripeSecret);
  return client;
}

function priceFor(item: BillingItem): string {
  const env =
    item === 'family_monthly'
      ? FAMILY_PLAN.monthly.env
      : item === 'family_yearly'
        ? FAMILY_PLAN.yearly.env
        : PACKS.find((p) => p.code === item)?.env;
  const id = env ? process.env[env] : undefined;
  if (!id) throw new Error(`No Stripe price configured for ${item}`);
  return id;
}

async function customerFor(userId: string, email?: string): Promise<string> {
  const db = supabaseAdmin();
  const { data } = await db.from('wallets').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id;
  const customer = await stripe().customers.create({ email, metadata: { user_id: userId } });
  await db.from('wallets').upsert({ user_id: userId, stripe_customer_id: customer.id }, { onConflict: 'user_id' });
  return customer.id;
}

export async function createCheckout(userId: string, email: string | undefined, item: BillingItem): Promise<string> {
  const subscription = item === 'family_monthly' || item === 'family_yearly';
  const session = await stripe().checkout.sessions.create({
    mode: subscription ? 'subscription' : 'payment',
    customer: await customerFor(userId, email),
    client_reference_id: userId,
    line_items: [{ price: priceFor(item), quantity: 1 }],
    metadata: { user_id: userId, item },
    ...(subscription ? { subscription_data: { metadata: { user_id: userId } } } : {}),
    allow_promotion_codes: true,
    success_url: `${config.siteUrl}/account?checkout=success`,
    cancel_url: `${config.siteUrl}/plans?checkout=cancelled`,
  });
  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return session.url;
}

export async function createPortal(userId: string): Promise<string> {
  const { data } = await supabaseAdmin().from('wallets').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
  if (!data?.stripe_customer_id) throw new Error('No billing account yet');
  const session = await stripe().billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${config.siteUrl}/account`,
  });
  return session.url;
}

/** Mirror a Stripe subscription onto the family's wallet. */
async function syncSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata?.user_id;
  if (!userId) return console.warn('subscription without user_id', sub.id);
  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null;
  const status =
    sub.status === 'active' || sub.status === 'trialing'
      ? sub.status
      : sub.status === 'past_due' || sub.status === 'unpaid'
        ? 'past_due'
        : 'canceled';
  const db = supabaseAdmin();
  const { data: existing } = await db.from('wallets').select('plan_status, next_refill_at').eq('user_id', userId).maybeSingle();
  const starting = status === 'active' || status === 'trialing';
  await db.from('wallets').upsert(
    {
      user_id: userId,
      plan_code: FAMILY_PLAN.code,
      plan_status: status,
      tokens_per_month: starting ? FAMILY_PLAN.tokensPerMonth : 0,
      rollover_cap: FAMILY_PLAN.rolloverCap,
      // First activation refills immediately; later updates keep the schedule.
      next_refill_at: starting ? existing?.next_refill_at ?? new Date().toISOString() : null,
      stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      stripe_subscription_id: sub.id,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object;
      const userId = s.client_reference_id || s.metadata?.user_id;
      const pack = PACKS.find((p) => p.code === s.metadata?.item);
      if (s.mode === 'payment' && pack && userId && s.payment_status === 'paid') {
        const { error } = await supabaseAdmin().rpc('grant_pack_tokens', { p_user: userId, p_amount: pack.tokens, p_ref: s.id });
        if (error) throw error;
      }
      if (s.mode === 'subscription' && s.subscription) {
        const id = typeof s.subscription === 'string' ? s.subscription : s.subscription.id;
        await syncSubscription(await stripe().subscriptions.retrieve(id));
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(event.data.object);
      break;
    default:
      break;
  }
}
