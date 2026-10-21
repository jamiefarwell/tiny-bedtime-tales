# Going live: accounts, tokens and payments

The app runs in **demo payments mode** until these are switched on. Each layer switches itself on when its keys are present in Vercel.

In demo mode, everything is stored on the device, including a pretend token wallet that follows exactly the same rules as the real one (`lib/demoWallet.ts`). Buying opens a clearly marked pretend checkout (`/demo-checkout`) that never asks for card details and only adds demo tokens. The Account page has demo controls: "Simulate next month", "Cancel plan", "Reset demo wallet", plus a token history. Use it to test the whole token journey with real people before any money is involved.

| Layer | Switched on by | What changes |
|---|---|---|
| Storyteller | `ANTHROPIC_API_KEY` (+ `ANTHROPIC_WORKSPACE_ID`) | Personalised stories are written. |
| Accounts + tokens | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Magic-link sign-in. Each story costs 1 token, and new parents get 1 free. Children and stories sync across devices. |
| Payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, 4 × `STRIPE_PRICE_*` | The Plans page sells the Family plan and token packs. The billing portal handles one-tap cancel. |

## 1. Supabase (free tier is fine to start)
1. Create a project at supabase.com (region: **London, eu-west-2**).
2. **SQL editor** → run each file in `supabase/migrations/` in order (0001 → 0004).
3. **Authentication → URL configuration**:
   - Site URL: the live address.
   - Redirect URLs: add `https://<live-domain>/auth/callback` and `https://*-jamiefarwell1-6645.vercel.app/auth/callback` (for previews).
4. **Authentication → Email**: magic links are on by default. Before launch, set a custom SMTP sender (e.g. Resend), because Supabase's built-in email is rate-limited.
5. **Project settings → API keys**: copy the URL, the publishable key and the secret key into Vercel (Preview + Production).

## 2. Stripe
1. Create the products in **test mode** first:
   - "Family plan": two recurring prices, £6.99 monthly and £59.99 yearly.
   - "3 story tokens": a one-off price of £2.99.
   - "10 story tokens": a one-off price of £7.99.
2. Copy the four price ids (`price_…`) into the `STRIPE_PRICE_*` variables.
3. **Developers → Webhooks → Add endpoint**: `https://<domain>/api/stripe/webhook`.
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. **Settings → Billing → Customer portal**: allow cancelling and updating the card, and switch on "cancel at end of period".
5. Add `STRIPE_SECRET_KEY` (test key first), and `NEXT_PUBLIC_SITE_URL` (the live domain).
6. Test with card `4242 4242 4242 4242` on a preview, then repeat steps 1–5 with live keys.

## 3. Check
- `/api/health` reports `storyteller`, `cloud` and `payments`.
- `npm run test:db` runs every migration plus the wallet rules (welcome token, spend order, refills, roll-over cap, refunds, free redo) against an in-memory Postgres.

## How tokens work (product rules)
- **What a token is:** 1 token = 1 personalised book, of any length, including next chapters. Library books never cost tokens.
- **Plans:**
  - The Family plan adds 4 plan tokens each month.
  - Unused plan tokens roll over, up to 8.
  - Monthly top-ups pause if a payment fails.
- **Packs:** pack tokens never expire, and they are used after plan tokens.
- **Redos and failures:**
  - Redoing a story within 24 hours is free once.
  - A story that fails to write refunds its token automatically.
- **Cancelling** stops future top-ups. Every story made stays on the family's shelf.

All of this is enforced in the database (`spend_story_token`, `refill_wallet`, `refund_story_token`, `grant_pack_tokens` in migration 0004). The browser can't change balances.
