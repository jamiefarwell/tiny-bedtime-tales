import type { BillingItem } from '@/lib/plans';
import { paymentsEnabled } from '@/lib/server/config';
import { createCheckout, createPortal } from '@/lib/server/billing';
import { currentUser } from '@/lib/server/supabase';

export const runtime = 'nodejs';

const ITEMS: BillingItem[] = ['family_monthly', 'family_yearly', 'pack3', 'pack10'];

// POST { action: 'checkout', item } → { url } for Stripe Checkout
// POST { action: 'portal' }         → { url } for the Stripe billing portal
export async function POST(request: Request) {
  if (!paymentsEnabled()) {
    return Response.json({ error: 'payments_off', message: 'Payments aren’t switched on yet.' }, { status: 503 });
  }
  const user = await currentUser();
  if (!user) return Response.json({ error: 'sign_in', message: 'Please sign in first.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { action?: string; item?: BillingItem };
  try {
    if (body.action === 'portal') return Response.json({ url: await createPortal(user.id) });
    if (body.action === 'checkout' && body.item && ITEMS.includes(body.item)) {
      return Response.json({ url: await createCheckout(user.id, user.email, body.item) });
    }
    return Response.json({ error: 'bad_request', message: 'Unknown billing action.' }, { status: 400 });
  } catch (error) {
    console.error('billing failed', body.action, String(error));
    return Response.json({ error: 'billing_failed', message: 'We couldn’t open the payment page. Please try again.' }, { status: 502 });
  }
}
