# Backlog

Agreed items to revisit, newest first. Move to done with a date when shipped.

## Reader
- **Page turn should feel like turning a page (21 Oct 2026).** Turns are now faster:
  - the next page's picture and audio are preloaded
  - a single shared player
  - a 0.8 s pause
  - a slide-over animation

  The owner says it still doesn't *feel* like a page turn. Options to explore:
  - a real page-curl, using a CSS 3D fold or a WebGL page-flip library
  - a soft paper-rustle sound
  - the text fading out before the art moves
  - a short swipe-to-turn hint on the first page

  Test on a real phone in portrait and landscape.

## Library
- **Proper art for *Lily and the Lantern Feather*.** It still uses the earlier test images (`artStatus: interim`). It needs a cast bible and per-page `art` directions, then the pipeline (about 45p).
- **More books:**
  - 10 starter titles (5 for ages 2–4, 5 for ages 5–8), written in-house.
  - Illustrations cost about 45p per book.
  - Narration costs about 6,000 ElevenLabs credits per book; the Starter plan includes 30,000 a month.

## Going live
- Supabase project + Stripe (see `GOING_LIVE.md`). Demo payments stand in until then.
- Merge `claude/rebuild` to `main` (production) once Greg and the owner are happy.
- Set an Anthropic monthly spend limit before sharing widely.

## Product
- Illustrated personalised stories, using the hero-look reference bank (`lib/heroLook.ts`, `COST_OPTIMISATION.md`).
- Recorded narration for personalised stories (ElevenLabs Flash), cached per family.
- Installable app (PWA), plus offline reading of downloaded books.
- Blind quality test: Opus vs Sonnet for continuations (`COST_OPTIMISATION.md`).
