import { config, paymentsEnabled } from '@/lib/server/config';
import { handleStripeEvent, stripe } from '@/lib/server/billing';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!paymentsEnabled()) return new Response('Payments not configured', { status: 404 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  let event;
  try {
    // The raw body is required for signature verification.
    event = stripe().webhooks.constructEvent(await request.text(), signature, config.stripeWebhookSecret);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    console.error('stripe webhook failed', event.type, event.id, String(error));
    // 500 makes Stripe retry; every grant is idempotent so retries are safe.
    return new Response('Webhook handler failed', { status: 500 });
  }
  return Response.json({ received: true });
}
