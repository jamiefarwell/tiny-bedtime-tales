# Tiny Bedtime Tales

A production-oriented rebuild of the original prototype: parent-led personalised bedtime stories where a child becomes the hero.

## Working now

- Responsive landing page and development banner
- Privacy-light child story profile
- Standalone stories, continuing adventures, special occasions and gentle support stories
- Read-only / audio / illustrated journey (checkout intentionally disabled)
- Story generation API using Vercel AI Gateway when available
- Safe fallback story engine so creation and regeneration still work if AI is unavailable
- Regenerate story flow
- Continue-this-adventure flow with compact series memory
- Browser read-aloud experience
- Story library and profile persisted locally during preview
- Storybook-style themed illustrations
- Prepared Supabase production schema with row-level security

## Privacy approach

The app deliberately does not request child photographs, surnames, exact dates of birth, addresses, schools or phone numbers. Storytelling inputs are limited to first name/nickname, age band, broad interests, optional pet/friend first names and preferences. Free-text inputs are sanitised server-side before being sent to the story engine.

## Architecture

- Next.js / React
- Vercel hosting and server routes
- Vercel AI Gateway for model abstraction
- Supabase for parent auth, child profiles, library and series memory once a project is provisioned
- Payments deliberately not connected yet

## Environment variables

See `.env.example`.

On Vercel, the story route can authenticate to AI Gateway using the project OIDC token. For local development, an `AI_GATEWAY_API_KEY` can be supplied.

## Supabase

The initial schema is ready at `supabase/migrations/0001_initial_schema.sql`. It has not been applied because the connected Supabase organisation currently has no project and creating one requires explicit cost confirmation.
