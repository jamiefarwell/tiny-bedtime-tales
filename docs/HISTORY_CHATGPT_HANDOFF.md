# Tiny Bedtime Tales — Claude Handoff Pack

## Start here

This repository is the current working source for **Tiny Bedtime Tales**, a mobile-first personalised bedtime-story app/prototype.

Live site:
https://tiny-bedtime-tales.vercel.app

Repository:
https://github.com/jamiefarwell/tiny-bedtime-tales

Current stack:
- Next.js / React
- Vercel
- Supabase schema prepared but the production Supabase project was not provisioned during the original build
- Vercel AI Gateway integration scaffolded, with a safe deterministic fallback when gateway auth is unavailable
- Stripe intentionally NOT wired yet

The owner wants Claude to take over development from this point. Do not restart from scratch unless there is a compelling technical reason. Preserve what works, but feel free to refactor weak prototype code.

---

## Product vision

Tiny Bedtime Tales should feel like an **inviting mobile app**, not an AI prompt form.

Core proposition:
- Parent-owned account
- Child becomes the hero in personalised bedtime stories
- Stories adapt to broad interests, age/story level, pets/friends first names, preferred tone, story length and things to avoid
- No child-photo upload
- No surname, exact DOB, address, school, phone or other unnecessary child identifiers
- First story free during testing
- Story library
- Regenerate stories
- Continue existing adventures
- Ready-to-Read subscriber library with hundreds/thousands of non-personalised books later
- Audio and illustrations generated once and stored, not regenerated on playback

Positioning:
**A bedtime world that remembers.**

Strong lines already explored:
- Their name. Their imagination. Their adventure.
- Don't buy your child another story. Give them a world of their own.
- Keep bedtime exciting.

---

## Explicit product decisions already made

1. **Mobile first.** Desktop should still look good, but design decisions should start from one-handed phone use.
2. **No child photos.**
3. Use only broad/minimal child profile information.
4. Age/story level should be inclusive:
   - Newborn–1
   - 2–3
   - 4–5
   - 6–7
   - 8–9
   - 10–12
   - Older kids
   The wording intentionally allows parents of ASN children to choose the story level that suits the child rather than treating chronological age as a hard rule.
5. “Favourite things” was removed from the profile because it overlapped with interests and was muddying story prompts.
6. Current story worlds:
   - Dinosaur
   - Dragon
   - Space
   - Pirates
   - Princesses
   - Animals
   - Superheroes
   - Underwater
   - Other
   If Other is selected, the parent supplies the custom world.
7. “Moon” was deliberately removed as a selectable world. It may remain a visual motif, but it is not considered a meaningful child interest.
8. Privacy is a product requirement, not a homepage marketing hook. Keep sensible guidance beside inputs, but do not make “privacy-light” a sales section.
9. Stripe/checkout was deliberately left out for now. Keep the entitlement boundary, but no payment handoff yet.
10. Existing completed stories should ultimately remain in the family library after cancellation; cancellation should stop future delivery rather than erase books.

---

## Current app structure

The current app has:
- Home screen
- Create flow
- Ready to Read area
- Personal story library
- Profile screen
- Story reader
- Privacy page
- Server story API
- Health endpoint
- Supabase schema/migrations
- Architecture/product/competitor/cost notes in /docs
- GitHub Actions production smoke test

The create flow is meant to be:
**Hero → Tonight’s need → World → Read / Listen / Illustrated → Make the magic**

The bottom-nav mobile pattern was introduced to make it feel like an app.

---

## Current AI/story direction

The earlier prototype story writing was judged too generic. Do not use the deterministic fallback as the quality bar.

Recommended orchestration direction:
- Strong creative-writing model for the actual story
- Separate structural/continuity/safety validation
- Separate illustration engine
- Separate narration engine
- Store all final media

The owner explicitly compared OpenAI / Claude / Gemini and wants significantly better storytelling than generic:
“problem → collect three magical objects → restore thing → cosy moral ending”.

The story-writing brief should push for:
- strong hook
- memorable character wants/flaws
- real choices
- natural humour
- emotional warmth
- surprise
- meaningful payoff
- recurring details that matter later
- no explicit moral-of-the-story ending
- no “once upon a time in a magical...” filler
- avoid overusing sparkling/glowing/twinkling language
- avoid repetitive AI sentence patterns
- avoid obvious retrieval quests as default plot structure

---

## Ready to Read direction

The owner wants a large subscriber library eventually containing hundreds or thousands of complete non-personalised books.

Each book should have:
- title
- target age
- reading time
- genre/tags
- cover/tile art
- about 10 pages for a 10-minute read
- roughly half-page text per page, leaving room for illustration
- page-specific narration
- page-specific illustration
- strong character consistency
- read-only and narrated experiences
- full-screen mobile reading
- swipe left/right to change page
- auto-page advance while narrated
- progress/time
- resume later

Production asset model should be roughly:

book/
- cover.webp
- page-01.webp … page-10.webp
- page-01.mp3 … page-10.mp3
- book.json

Do NOT generate text or controls inside AI artwork. Generate clean artwork only; the app owns typography and controls.

---

## Visual/art direction

The owner likes:
- premium colourful 3D/cinematic children’s storybook art
- rich but cosy environments
- expressive rounded characters
- strong bedtime warmth
- image occupying roughly the top half of the mobile reader
- warm paper/cream story-text section beneath
- polished pink narration controls
- art that looks good enough for somebody pitching the product to test users

Character consistency matters more than making each isolated image spectacular.

Correct illustration workflow:
1. Finish story.
2. Create visual bible.
3. Generate/approve master character reference.
4. Lock clothing, face, proportions, colours, companion design.
5. Create world bible.
6. Select 10 deliberate cinematic scenes.
7. Generate each page from the same reference/bible.
8. App adds text/UI separately.
9. Narration generated only after text is final.

The previous ad-hoc “give Gemini each page and ask it for a picture” workflow was rejected because it produced inconsistent books.

---

## Backend target

Parent account
  → child profile
  → story brief
  → privacy/minimisation
  → story generation
  → quality/safety check
  → save story/version
  → optional illustration jobs
  → optional narration jobs
  → library
  → compact series/world memory

Prepared database concepts:
- parent_profiles
- child_profiles
- stories
- story_series
- story_versions
- story_jobs
- media_assets
- story_feedback
- entitlements
- generation_events / generation configs

Important behaviour:
- regeneration should create a new version rather than destructively overwrite the old one
- image/audio generation should be async jobs in production
- save narration/images once and replay them
- private storage + signed URLs
- RLS scoped to parent

See:
- docs/ARCHITECTURE.md
- docs/BACKEND_MAP.md
- docs/COMPETITOR_REVIEW.md
- docs/ENGINE_COSTS.md
- docs/PRODUCT_DIRECTION.md
- supabase/migrations/

---

## Known infrastructure state from the original build

GitHub:
- repository write access worked
- production is connected to Vercel

Vercel:
- project: tiny-bedtime-tales
- production URL: https://tiny-bedtime-tales.vercel.app
- production deploys were working through GitHub
- AI Gateway auth had been under investigation; the health endpoint was modified to expose whether gateway auth was present
- do not assume AI Gateway is working: check current env/project state

Supabase:
- schema and migrations exist
- at the time of the build the user's Supabase organisation existed but there was not yet a production project provisioned
- do not assume that is still true; check current state

Stripe:
- intentionally not connected to the app yet

Do not put secrets into source control.

---

## Competitor learnings already captured

The original research looked at:
- Oscar Stories
- Scarlett Panda
- PerfectTales
- BedtimeStory.ai
- StoryBee
- Once Upon a Bot

Useful takeaways:
- get to “tonight’s story” fast
- examples before signup
- reuse child profile, do not ask the same things each time
- short tap-based choices instead of giant forms
- continuing worlds/chapters
- clear story length
- completed stories behave as reusable family assets
- five illustrations is a sensible normal illustrated-story benchmark

See docs/COMPETITOR_REVIEW.md.

---

## Current code quality warning

This began as a fast prototype and parts of app/page.js and app/globals.css became large/monolithic.

When taking over:
- preserve functionality first
- then split components/data/services cleanly
- move Ready-to-Read book content out of the giant page component
- isolate generated-story reader from Ready-to-Read reader
- move storage/data access behind a service layer
- keep provider selection server-side

Do not spend days refactoring before the visible product improves.

---

## Immediate recommended next work

### Phase 1 — Stabilise the product
1. Run the current app locally.
2. Check the current live production behaviour.
3. Verify the GitHub/Vercel deployment chain.
4. Verify AI Gateway auth/model IDs using current Vercel docs rather than old assumptions.
5. Confirm whether Supabase project now exists.

### Phase 2 — Improve story quality
1. Create a proper story-generation service.
2. Benchmark Claude against OpenAI/Gemini on the same blind story briefs.
3. Use a story-planning pass before prose when it actually improves quality.
4. Add structural/age/continuity checks.
5. Track generation model/prompt version/cost.

### Phase 3 — Make one Ready-to-Read book excellent
Do ONE finished book end-to-end before bulk generation:
- final manuscript
- fixed character bible
- cover
- 10 clean illustrations
- narration
- page timings
- swipe/full-screen reader
- autoplay page advance
- resume state

Only then scale to 10 books, then hundreds.

### Phase 4 — Cloud backend
- parent auth
- cloud child profiles
- cloud story library
- series memory
- media storage
- entitlements

---

## Tone/working preference from the owner

Do not repeatedly stop for tiny confirmations.

Use judgement and keep progressing until something genuinely requires:
- account connection
- payment/cost approval
- legal/commercial decision
- irreversible action
- missing product information that cannot be reasonably inferred

When blocked, batch questions together.

The owner expects finished working output more than long planning conversations.

---

## Suggested first message to Claude

“I’m handing you an existing Next.js project for Tiny Bedtime Tales. Read CLAUDE_HANDOFF.md and the docs folder first, then inspect the actual code before proposing changes. Treat the existing live app as a prototype to improve, not a spec to blindly preserve. Mobile first. Do not add child photo uploads. Do not connect payments yet. Your first job is to run/audit the app, confirm the current deployment/backend state, and then make one polished Ready-to-Read story experience genuinely production-quality. Keep working without asking me small implementation questions; batch any genuine blockers.”
