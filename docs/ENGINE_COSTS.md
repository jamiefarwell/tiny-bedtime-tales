# Engines and unit costs (Oct 2026)

All prices are pay-as-you-go list prices; GBP at about $1 = £0.76.

## Story text: Claude Opus 5.5 (`claude-opus-5-5`)
- **Price:** $4 / 1M input, $20 / 1M output, cache reads $0.20 / 1M.
- **Default effort:** `low`. In a side-by-side test on 20 Oct 2026, quality was no worse than `medium` and the first page arrived twice as fast.
- **Measured results (20 Oct 2026):**

| Effort | First page | Total | Output tokens | Cost |
|---|---|---|---|---|
| `medium`, 10 min | 56 s | 76 s | 7,177 | ≈ $0.15 (11p) |
| `low`, 10 min | 26 s | 51 s | 4,430 | ≈ $0.09 (7p) |
| `low`, 5 min, chapter 2 | 20 s | 35 s | — | ≈ 5p |

- **Caching:** the system prompt is cached (about 1.3k tokens read from cache per request), so input cost is negligible.
- **Cheaper option:** set `STORY_MODEL=claude-sonnet-5-5` for about 4p per story. Measure quality first; the stories are the product.

## Illustrations: Gemini Nano Banana 2.1
- **Price:** $0.0336 per 1K image, $0.0504 per 2K.
- **Personalised illustrated story (measured 24 Oct 2026):** 6 scenes + 1 cast sheet at 1K ≈ $0.24 (≈ 18p), plus a one-off hero sheet per look (≈ 3p). Scenes take 20–28 s each, drawn 3 at a time while the story is read; images are 70–90 KB WebP.
- **10-page library book:** about 4 reference sheets + 10 pages + 1 cover, with reruns, ≈ $0.60–0.85.

## Narration: ElevenLabs, with timestamps for read-along
- **Price:** `eleven_multilingual_v2` costs $0.08 per 1k characters; Flash v2.5 costs $0.04.
- **Library book:** about 6,600 characters ≈ $0.53, paid once.
- **Personalised story:** ≈ $0.40–0.55, or about half that with Flash. Keep it for the paid Plus tier; device narration is free.

## Per-product variable cost
| Product | Cost |
|---|---|
| Read-aloud personalised story, device voice | ≈ 7p |
| Personalised story + recorded narration (Flash) | ≈ 30p |
| Illustrated personalised story + recorded narration | ≈ 45p |
| Finished library book | ≈ £1 once; every replay is free |

## Rules
1. Generate once, store, and replay; never regenerate on playback.
2. Regenerating a story makes a new story, at a new cost, and keeps the old one.
3. Log model, tokens and cost for every generation (the `generation_events` columns are in migration 0003).
