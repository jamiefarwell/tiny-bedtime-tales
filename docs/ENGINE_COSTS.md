# Engines and unit costs (Oct 2026)

All prices are pay-as-you-go list prices; GBP at about $1 = £0.76.

## Story text: Claude Opus 5.5 (`claude-opus-5-5`)
- **Price:** $4 / 1M input, $20 / 1M output, cache reads $0.20 / 1M.
- **Input:** the system prompt is about 1.5k tokens and is cached; the request is about 400 tokens.
- **Output:** about 1,800 tokens of story, plus thinking at `medium` effort (about 2–3k tokens).
- **Cost:** about **$0.10–0.13 (8–10p) per 10-minute story**.
- **Cheaper option:** set `STORY_MODEL=claude-sonnet-5-5` for about 4p per story. Measure quality before switching; the stories are the product.

## Illustrations: Gemini Nano Banana 2.1
- **Price:** $0.0336 per 1K image, $0.0504 per 2K.
- **Personalised illustrated story:** 5 scenes at 1K ≈ $0.17 (≈ 13p).
- **10-page library book:** about 4 reference sheets + 10 pages + 1 cover, with reruns, ≈ $0.60–0.85.

## Narration: ElevenLabs, with timestamps for read-along
- **Price:** `eleven_multilingual_v2` costs $0.08 per 1k characters; Flash v2.5 costs $0.04.
- **Library book:** about 6,600 characters ≈ $0.53, paid once.
- **Personalised story:** ≈ $0.40–0.55, or about half that with Flash. Keep it for the paid Plus tier; device narration is free.

## Per-product variable cost
| Product | Cost |
|---|---|
| Read-aloud personalised story, device voice | ≈ 9p |
| Personalised story + recorded narration (Flash) | ≈ 30p |
| Illustrated personalised story + recorded narration | ≈ 45p |
| Finished library book | ≈ £1 once; every replay is free |

## Rules
1. Generate once, store, and replay; never regenerate on playback.
2. Regenerating a story makes a new story, at a new cost, and keeps the old one.
3. Log model, tokens and cost for every generation (the `generation_events` columns are in migration 0003).
