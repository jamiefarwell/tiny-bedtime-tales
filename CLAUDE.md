# Working on Tiny Bedtime Tales

Read `docs/STRATEGY.md` and `docs/ARCHITECTURE.md` before changing anything substantial.

## Owner preferences
- Keep moving without asking about small implementation details; batch real blockers (accounts, keys, costs, legal or commercial calls).
- Mobile-first, one-handed phone use first. Desktop must still look good.
- The owner judges results on a phone. Check every UI change at about 390×844.

## Hard rules
- No child photo uploads. First name or nickname only; never surnames, schools, addresses or dates of birth.
- Payments are tokens: 1 token = 1 personalised book, never priced per feature. Balances change only via the SQL functions in migration 0004 (server-side). Keep `npm run test:db` passing.
- Hero look is a palette, never a photo, and never goes into story-text prompts.
- Illustrations never contain text or UI. The app sets all typography.
- Characters must look identical on every page: use the pipeline's reference sheets, never ad-hoc per-page prompts.
- Story quality bar is a published modern picture book. No "collect three magic things", no stated morals, nothing on the banned-phrase list in `lib/engine/prompt.ts`.
- Bedtime safety: all tension resolved by about 75%; calm final pages; respect the avoid list absolutely.
- No silent template fallback for personalised stories. If the engine is unavailable, say so.
- Don't promise features in UI copy that aren't built.

## Conventions
- Next.js 16 App Router: `params` and `searchParams` are Promises. Check `node_modules/next/dist/docs` before relying on older patterns.
- CSS modules plus tokens in `app/globals.css`. Night theme by default; nothing pure white.
- Family data goes only through `lib/store.ts` (the swap point for Supabase).
- Book content lives in `content/books/*.json` and assets in `public/books/<slug>/`. Word timings index `tokenise()` order (`lib/tokenise.ts` must equal `scripts/lib/tokenise.mjs`).
- Story model defaults to `claude-opus-5-5`; override with `STORY_MODEL`.
