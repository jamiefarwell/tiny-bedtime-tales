// Plans and token packs. Safe to import on the client: no secrets here.
// Stripe price ids live in env vars (see lib/server/stripe.ts); change prices
// in Stripe and the display values here together.
//
// Pricing rules we hold ourselves to (see docs/STRATEGY.md):
// - 1 token = 1 personalised book, always. No per-feature token maths.
// - The library is unlimited on any plan.
// - No weekly plans, no surprise renewals, one-tap cancel via the Stripe portal.
// - Bought tokens never expire; plan tokens roll over for one month.

export interface Plan {
  code: 'family';
  name: string;
  tokensPerMonth: number;
  rolloverCap: number;
  monthly: { price: string; env: string };
  yearly: { price: string; perMonth: string; env: string };
  includes: string[];
}

export interface Pack {
  code: 'pack3' | 'pack10';
  tokens: number;
  price: string;
  note: string;
  env: string;
}

export const FAMILY_PLAN: Plan = {
  code: 'family',
  name: 'Family',
  tokensPerMonth: 4,
  rolloverCap: 8,
  monthly: { price: '£6.99', env: 'STRIPE_PRICE_FAMILY_MONTHLY' },
  yearly: { price: '£59.99', perMonth: '£5.00', env: 'STRIPE_PRICE_FAMILY_YEARLY' },
  includes: [
    '4 personalised books a month: one for every week',
    'Unused tokens roll over to next month',
    'The whole Ready-to-Read library, unlimited',
    'Every child in the family, one price',
    'Next chapters that remember last time',
    'Sleepy mode, read-along words and sleep sounds',
  ],
};

export const PACKS: Pack[] = [
  { code: 'pack3', tokens: 3, price: '£2.99', note: 'Three extra books', env: 'STRIPE_PRICE_PACK_3' },
  { code: 'pack10', tokens: 10, price: '£7.99', note: 'Best value: 80p a book', env: 'STRIPE_PRICE_PACK_10' },
];

export const WELCOME_TOKENS = 1;

export type BillingItem = 'family_monthly' | 'family_yearly' | Pack['code'];

export interface WalletView {
  /** Accounts and billing are switched on for this deployment. */
  cloud: boolean;
  payments: boolean;
  signedIn: boolean;
  email?: string;
  planTokens: number;
  extraTokens: number;
  plan: { code: string; status: string; renewsAt: string | null; cancelAtPeriodEnd: boolean } | null;
}

export function totalTokens(w: Pick<WalletView, 'planTokens' | 'extraTokens'>): number {
  return w.planTokens + w.extraTokens;
}
