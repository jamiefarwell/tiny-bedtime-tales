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
- **More books:** 8 titles now, across four age shelves (0–2, 2–5, 4–7, 7–9). Next: fill the thin shelves (one book each for babies and bigger kids).
  - Illustrations cost about 45p per book.
  - Narration costs about 6,000 ElevenLabs credits per book; the Starter plan includes 30,000 a month.

## Going live
- Supabase project + Stripe (see `GOING_LIVE.md`). Demo payments stand in until then.
- Merge `claude/rebuild` to `main` (production) once Greg and the owner are happy.
- Set an Anthropic monthly spend limit before sharing widely.

## Product
- Shared hero-sheet bank in cloud storage, so each look is drawn once for everyone (today each device draws its own).
- Pyjama colour per child, so siblings with similar looks are easy to tell apart.
- Recorded narration for personalised stories (ElevenLabs Flash), cached per family.
- Installable app (PWA), plus offline reading of downloaded books.
- Blind quality test: Opus vs Sonnet for continuations (`COST_OPTIMISATION.md`).

## Done
- **24 Oct 2026:** Pictures starring the child in personalised stories (see `ARCHITECTURE.md`).
- **24 Oct 2026:** Five new library books, one per age band, with age shelves in the library: *Shh, Says the Snow* (0–2), *One More, Says Dot* (2–4), *The Moon Has the Hiccups* (3–5), *The Lost Property Dragon* (5–7), *The Secret Night Bakers* (7–9). About $2.10 of art and 17,500 narration credits.
