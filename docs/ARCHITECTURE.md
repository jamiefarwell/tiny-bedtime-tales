# Architecture

Tiny Bedtime Tales is intentionally split into replaceable layers so the web product can later be wrapped or rebuilt as a native app without replacing the backend.

## Current stack

- **Frontend:** Next.js / React
- **Hosting:** Vercel
- **Story API:** Next.js server route
- **Model routing:** Vercel AI Gateway
- **Story persistence during preview:** browser localStorage
- **Production persistence:** Supabase schema prepared; project provisioning still required
- **Payments:** intentionally deferred

## Story engine

The UI sends a privacy-minimised structured brief to `/api/story`.

The server:
1. trims fields and removes common contact details;
2. applies child-safety rules;
3. rate-limits preview generation;
4. attempts AI Gateway generation using an ordered model list;
5. validates the returned structured story;
6. falls back to a local safe story engine if AI is unavailable.

This keeps the front end independent of any one model provider.

## Model order

1. `openai/gpt-5.6-sol`
2. `anthropic/claude-sonnet-5`
3. local safe fallback

The order can be changed without changing the product UI.

## Future mobile app

A future iOS / Android client can use the same account, database and story APIs. The web interface therefore does not contain business-critical state that would make a later app migration difficult.
