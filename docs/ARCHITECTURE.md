# Architecture

## Stack
- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript.
- **Styling:** CSS modules plus design tokens in `app/globals.css`.
- **Fonts:** Fraunces (display), Nunito (UI) and Andika (story text, chosen for early readers).
- **Story engine:** `@anthropic-ai/sdk`, Claude Opus 5.5.
- **Hosting:** Vercel. Supabase comes next for accounts, sync and media.

## Layout
```
app/
  (app)/            tabbed app with bottom nav
    page.tsx        Tonight (home)
    library/        Ready-to-Read shelf + book detail
    create/         4-step create flow + streaming "writing" screen
    stories/        family shelf, grouped into series
    family/         child profiles
    privacy/
  read/[slug]       full-screen reader for library books
  read/mine/[id]    full-screen reader for personal stories
  api/story         streaming story engine (NDJSON)
  api/health
components/
  reader/           Reader, narration (audio+timings / Web Speech), ambient sounds, icons
  BookCover, BookTile, Scene (art-pending placeholder), ChildForm, BottomNav
lib/
  types.ts          shared Book / Page / ChildProfile / PersonalStory model
  books.ts          catalogue (static JSON today)
  store.ts          family state (localStorage today; single swap point for Supabase)
  tokenise.ts       word tokeniser shared with the narration pipeline
  engine/           prompt, streaming parser, input sanitising
content/books/      one JSON per book: cast bible, style, pages, art direction, timings
public/books/       artwork, covers, narration audio
scripts/            offline asset pipeline (see PIPELINE.md)
supabase/migrations
```

## Story engine
1. The client posts a structured request: the child (first name, pronouns, story level, loves, companions, avoid list), mood, world, length, today's detail, and series memory for a continuation.
2. `lib/engine/sanitise.ts` drops anything that looks like contact or location data and rejects unsafe requests.
3. `lib/engine/prompt.ts` builds a stable, cached system prompt (craft rules, banned phrases, bedtime shape, safety) plus a per-request user message with level-specific page and word targets.
4. A single streamed `client.beta.messages.stream` call goes out with `fallbacks: "default"` for refusal routing.
5. `lib/engine/parse.ts` parses the plain-text format incrementally and emits `meta`, `page`, `memory` and `done` events as NDJSON.
6. The client shows pages as they arrive, then saves the story with its memory, series id and chapter number.
7. Server logs record model, latency, token usage and a banned-phrase count for prompt tuning.

If `ANTHROPIC_API_KEY` is absent the route returns `503 not_connected`. The UI explains this and sends people to the library. There is no template fallback.

## Reader
- **Pages and turning:** one page = art (top) + paper (bottom); on wide screens it becomes a side-by-side spread. Swipe with drag-follow, arrows, keyboard and segment taps all turn pages.
- **Narration:** `narration.ts` plays `page.audio` with `page.timings` when present, and otherwise the best en-GB device voice, spoken a paragraph at a time with word-boundary events. Both drive the same word highlight and progress.
- **Auto-turn:** turns the page 1.4 s after the narration ends; the end screen offers the next chapter for series.
- **Sleepy mode:** amber-on-brown palette, art dimming and desaturating with progress, voice rate and volume easing down, synthesised rain, waves or hush, and a lights-out lock on the end screen.
- **Device behaviour:** progress is saved per book or story, and a wake lock is held while narrating.

## Data
- **Today:** `lib/store.ts` keeps everything in one versioned localStorage key, exposed through `useSyncExternalStore`.
- **Next:** Supabase tables (`supabase/migrations/0001–0003`) mirror the same shapes: `child_profiles`, `stories` (chapters and series), `books`, `reading_progress`, `family_settings`, plus jobs, media and generation events. RLS is scoped to the parent.
