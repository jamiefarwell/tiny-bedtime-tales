# Tiny Bedtime Tales — Strategy (rebuild, 20 Oct 2026)

## 1. What was wrong with the prototype

| Area | Problem | What the rebuild does |
|---|---|---|
| Story engine | AI Gateway was never authenticated, so **every live story was the hard-coded template** ("three paths… a feather that glowed when someone was kind"). | Direct Anthropic SDK, Claude Opus 5.5, one streamed call with a craft-focused system prompt; pages appear as they're written. No silent fallback: if the key is missing the app says so and points to the library. |
| Code | One 51 KB `page.js` with every screen, a 41 KB stylesheet and hand-drawn SVG "art". No routes, so no links, no back button, no sharing. | Next.js 16 App Router + TypeScript. Real routes: `/`, `/library`, `/library/[slug]`, `/read/[slug]`, `/read/mine/[id]`, `/create`, `/stories`, `/family`. CSS modules and a token system. |
| Art | Emoji orbs and SVG doodles. | Real illustrated book (cropped from the approved Lily/Pip tests, with a new story written for them), designed interim covers for the other two, and a pipeline to generate consistent art for any book. |
| Reader | Web Speech with no sync, no resume, no wind-down. | A purpose-built reader: swipe/arrow/tap page turns, auto page-turn on narration end, **word-by-word read-along highlighting**, resume where you left off, wake-lock, sleepy mode, sleep sounds, lights-out lock. |
| Story quality | Generic "problem → collect magic thing → cosy moral". | System prompt built around want/flaw, costly choices, planted details that pay off, character humour, a banned-phrase list, a bedtime landing, and series memory. Three showcase books written to that standard. |
| Profile | Free-text fields, no pronouns. | Tap-based chips, pronouns, companions with roles, a "keep out of stories" list, inclusive story levels. |

## 2. The market (full research: `COMPETITOR_REVIEW.md`)

There are two camps and nobody bridges them:

- **Sleep/content incumbents** (Calm, Moshi, Yoto, Tonies, Epic, CBeebies Storytime) have huge audiences, no personalisation, and are hated for billing traps.
- **AI personalisers** (Oscar, Scarlett Panda, PerfectTales, Fable, StoryBee…) have almost no traction. Oscar, the best known, has 5 UK App Store ratings. Their complaints: faces drift between pages, stories feel generic, coins and tokens confuse people, generation is slow.

The top complaints across the category:
1. Trial traps and cancelling problems.
2. Paywall shock.
3. Coins and tokens.
4. Content repeating.
5. Narrators changing or sounding wrong.
6. Scary content at bedtime.
7. Failing at bedtime itself.
8. Weak bedtime controls.
9. No family sharing.
10. AI that feels soulless.

## 3. How we win

1. **A world that remembers.** Every story is a chapter with a memory, so characters, places and running jokes return. Nobody with traction does this. *(Built: series memory and the next-chapter flow.)*
2. **Real sleep craft, not just stories.** *(Built.)*
   - The voice slows and softens as the story ends, and the screen warms and dims page by page.
   - Synthesised sleep sounds carry on for 10 minutes, then fade out.
   - A lights-out lock stops "just one more".
3. **Read-along that actually syncs.** Words light up as they're spoken, with per-page audio and word timings. The AI apps bolt on an "audiobook"; we teach reading. *(Built for device voice; recorded narration is ready via the pipeline.)*
4. **Books that look like books.**
   - Locked character sheets feed every page.
   - Text and controls are never baked into the art.
   - A human-curated Ready-to-Read library sits alongside personalised stories.
5. **Writing quality as the moat.** Claude Opus 5.5 writes to a published-picture-book brief. Showcase titles are written and edited by us, not generated in bulk.
6. **Honest by design.**
   - No coins or weekly plans, a reminder before any trial ends, and one-tap cancel.
   - Siblings on one plan, and stories stay yours if you cancel.
   - A first name only, no photos.
   - Clear labelling of what AI does.
7. **UK-native.** British English, UK voices, GBP pricing, and ICO Children's Code alignment.

## 4. Pricing recommendation (not built — payments stay off)

| Plan | Price | Includes |
|---|---|---|
| Free | £0 | 3 personalised stories, 2 library books, device narration |
| Family | **£6.99/mo or £49.99/yr** | Unlimited personalised read-aloud stories, the full library, series memory, all children |
| Family Plus | **£9.99/mo or £79.99/yr** | Plus illustrated personalised stories and recorded narration |
| Keepsake | **£24.99** | A printed hardback of a child's series (later) |

The UK anchors are Moshi £49.99–59.99/yr, Headspace Family £74.99 and Epic £79.99. The AI-only apps at £3.99 have neither a library nor sleep craft.

## 5. Unit costs (details: `ENGINE_COSTS.md`)

| Item | Cost |
|---|---|
| Personalised story text (Opus 5.5) | ≈ 8–10p |
| 5 illustrations (Nano Banana 2.1, 1K) | ≈ 13p |
| Recorded narration via ElevenLabs | ≈ 40p per 10-minute story |
| A finished 10-page library book | ≈ £1 one-off; replays cost nothing |

Recorded narration of personalised stories is the expensive part, so it belongs in the Plus tier (or use ElevenLabs Flash at half price). Device narration is free.

## 6. Roadmap

**Now (this branch)**
- Rebuilt app, reader, create flow, engine, pipeline scripts and docs.

**Next, once keys are connected**
1. Turn on the storyteller (`ANTHROPIC_API_KEY` in Vercel) and run 20 test stories across every age band. Tune the prompt using the banned-phrase log and parent read-throughs.
2. Generate art and narration for *Grandad's Runaway Snore* and *Maya and the Midnight Sock Train* (`npm run illustrate`, `npm run narrate`). Review, and regenerate single pages where needed.
3. Re-narrate *Lily and the Lantern Feather* with a recorded voice.

**Then**
4. Supabase project:
   - parent magic-link auth
   - sync profiles, stories and progress (migration `0003` is ready)
   - private storage for media
5. A "hero look" builder: skin tone, hair, glasses, freckles, no photos. It locks how the child appears in illustrated personalised stories, so the same face appears every night.
6. Illustrated personalised stories as background jobs (5 scenes), shown when ready.
7. A PWA install prompt and offline caching of downloaded books, which fixes bedtime reliability.
8. Grow the library to 10, then 50 books, editorially written and pipeline-illustrated.
9. Payments (Stripe), built to the honest-billing rules above.
