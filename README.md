# Tiny Bedtime Tales

Bedtime stories where your child is the hero, in a world that remembers them, plus a hand-picked library of illustrated, narrated books. Mobile-first web app (PWA), UK-first.

## Run it
```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for personalised stories
npm run dev
```
Without a key, everything except personalised story writing works.

## What's here
- **Tonight** home, **Library** (Ready-to-Read), **Create** (4 taps to a story), **Our stories** (series and chapters), **Family** (child profiles).
- A purpose-built **reader**: swipe or auto page-turn, word-by-word read-along, resume, sleepy mode with wind-down narration, sleep sounds and a lights-out lock.
- A **story engine** on Claude Opus 5.5 that streams pages as they're written.
- An **asset pipeline** (`npm run illustrate`, `npm run narrate`) for consistent illustrations and timed narration. See `docs/PIPELINE.md`.

## Docs
- `docs/STRATEGY.md`: teardown, market, how we win, pricing, roadmap.
- `docs/ARCHITECTURE.md`: code layout, engine and reader internals.
- `docs/COMPETITOR_REVIEW.md`: the October 2026 research.
- `docs/ENGINE_COSTS.md`: per-story unit costs.
- `docs/COST_OPTIMISATION.md`: cheaper engines and character reuse, without losing quality.
- `docs/GOING_LIVE.md`: switching on accounts, tokens and Stripe.
- `docs/PIPELINE.md`: generating art and narration for books.
- `docs/HISTORY_CHATGPT_HANDOFF.md`: decisions from the original prototype.

## Accounts and payments
Preview mode by default. Supabase switches on magic-link accounts, sync and token wallets; Stripe switches on the Family plan and token packs. See `docs/GOING_LIVE.md`.

## Product rules
Mobile first. No child photos. First names only. Art never contains text; the app sets all typography.
