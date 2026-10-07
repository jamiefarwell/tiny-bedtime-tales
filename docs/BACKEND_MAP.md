# Tiny Bedtime Tales — Backend Map

## Product rule
The parent owns the account. Children do not have accounts. Store only the storytelling detail we need: first name/nickname, age band, broad interests, optional pets/friends first names, preferences and things to avoid. Do not collect child photos, surnames, exact DOB, school, home address or phone number.

## Architecture

```
Mobile web / PWA / future native app
        |
        v
Next.js app on Vercel
        |
        +-- Parent auth/session --------------------+
        |                                          |
        +-- Story API / orchestration               |
        |      |                                   |
        |      +-- input minimisation & safety     |
        |      +-- story brief builder             |
        |      +-- Vercel AI Gateway               |
        |      |      +-- GPT-6 Luna               |
        |      |      +-- Gemini 3 Flash fallback  |
        |      |      +-- Claude Sonnet 5 fallback |
        |      |                                   |
        |      +-- post-generation quality/safety  |
        |      +-- illustration jobs (future)      |
        |      +-- narration jobs (future)         |
        |                                          |
        v                                          v
Supabase Postgres                          Supabase Storage
        |                                          |
        +-- parent_profiles                        +-- illustrations/
        +-- child_profiles                         +-- audio/
        +-- story_series
        +-- stories
        +-- story_versions
        +-- story_jobs
        +-- media_assets
        +-- story_feedback
        +-- entitlements
        +-- generation_events
        +-- generation_configs
```

## Story generation lifecycle

1. Parent chooses the child profile, tonight's intent, theme and optional request.
2. Server strips/minimises accidental identifiers and checks the input.
3. Fetch the child's profile plus compact series/world memory if continuing a story.
4. Build a structured story brief.
5. Generate the story text through AI Gateway.
6. Validate schema, age fit, safety, repetition and minimum quality.
7. Save the accepted story and a generation event.
8. If illustrated, create an asynchronous illustration job from page scene descriptions.
9. If narrated, create an asynchronous narration job from the accepted final text.
10. Store finished media once; replaying a story does not call an AI model again.
11. Update compact series memory after a continuing chapter.
12. Mark the story ready and surface it in the parent's library.

## Database additions to the initial schema

### story_versions
Keeps previous generations when a parent taps Regenerate rather than deleting history.

### story_jobs
Tracks `queued -> writing -> checking -> illustrating -> narrating -> ready / failed`. This allows the mobile UI to show honest progress and recover from interrupted requests.

### media_assets
One row per image/audio asset: story/page, provider/model, storage path, generation status and estimated cost.

### story_feedback
Simple parent feedback such as loved it, too scary, too old/young, regenerate reason. This becomes useful quality data without profiling a child.

### generation_configs
Versioned prompt/model configuration so we know how any story was produced and can change engines without changing the app.

## Auth

Start with passwordless parent email. Add Google/Apple sign-in later. Auth gates cloud profile/library syncing, not the first product demo. Child profiles are always subordinate to an adult account.

## Storage and access

Use private Supabase Storage buckets and signed URLs for generated illustration/audio assets. RLS keeps profile, story and series rows scoped to the authenticated parent. Completed paid stories should remain in the parent's library if future delivery is cancelled.

## Story engine routing

Standard story:
`GPT-6 Luna -> Gemini 3 Flash -> Claude Sonnet 5 -> deterministic safe fallback`

Gentle/support story:
`GPT-6.1 Sol -> Claude Sonnet 5 -> GPT-6 Luna -> deterministic safe fallback`

The app talks only to our Story Service. Provider/model choices stay server-side and can be swapped without rewriting the client.

## Media direction

Illustrations: benchmark Nano Banana 2.1 and Nano Banana 2 Lite for consistent storybook scenes, cost and latency. Generate once and save.

Narration: benchmark Gemini Flash/Flash Lite TTS against an audiobook specialist before committing. Generate once and save.

## Payment boundary

Keep entitlements in the backend now, but do not connect checkout yet. Later Stripe/App Store/Play Store webhooks can update entitlements without changing story/library architecture.
