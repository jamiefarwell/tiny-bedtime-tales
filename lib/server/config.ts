import 'server-only';

// Feature switches derived from environment. Each layer turns on by itself
// when its keys are present, so the app runs in "preview mode" until then.

export const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  supabaseServiceKey: process.env.SUPABASE_SECRET_KEY || '',
  stripeSecret: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3123'),
};

/** Parent accounts, cloud sync and server-side token wallets. */
export const cloudEnabled = () => Boolean(config.supabaseUrl && config.supabaseKey && config.supabaseServiceKey);

/** Real money. Requires accounts too: tokens must belong to someone. */
export const paymentsEnabled = () => cloudEnabled() && Boolean(config.stripeSecret && config.stripeWebhookSecret);
