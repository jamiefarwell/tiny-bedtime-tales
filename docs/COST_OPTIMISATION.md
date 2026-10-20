# Cost optimisation (21 Oct 2026)

**The aim:** cut the variable cost of a personalised illustrated and narrated book without making it worse. Prices were checked on 21 Oct 2026 and converted at $1 = £0.76, as in `ENGINE_COSTS.md`. ⚠ marks a figure I couldn't confirm on the vendor's own page.

## TL;DR

1. **Narration is the biggest lever.** It is 43% of today's cost per book. Two changes need almost no work:
   - ElevenLabs Flash v2.5 or v4 Turbo halves it.
   - Azure Dragon HD Omni en-GB voices cut it by about 70% and return word timings natively.
   
   Both need a blind listening test before either replaces Multilingual v2.
2. **Images: stop paying for references on every book.** Use a shared bank of "hero look" sheets plus per-family companion sheets. Make a book 5 scenes plus a cover. Put library books and any book that can wait through Batch, at half price.
3. **Text: keep Opus 5.5 at low effort.** It is about 7p, or 7% of today's cost per book (14% after these changes), and it is the moat. Use Haiku 5.5 for helper calls. Move continuations to Sonnet 5.5 only if it passes the blind test below.
4. **Result.** A book falls from about **93p to 48p** (safe stack) or **32p** (stretch stack). Margin on £6.99 goes from **£1.74 to £3.51–£4.14** per subscriber per month. Today's stack would **lose money on the £49.99 annual plan**.

---

## 1. Narration: alternatives that support read-along

A 10-minute story is about 6,600 characters, or about 600 s of audio. A 4–5 story is nearer 3,600 characters, so its costs scale down to about 55% of the figures below.

| Rank | Option | Word timings | en-GB | Per story | Quality for bedtime |
|---|---|---|---|---|---|
| 1 | **ElevenLabs Flash v2.5 / v4 Turbo** ($0.04/1k) | Yes, from the same `/with-timestamps` endpoint, so no code changes. ⚠ Check that v4 Turbo returns `alignment` with one test call. | Yes (voice library) | **$0.26 / 20p** | Same voices. Turbo is "most expressive real-time", Flash is "fast, affordable". Possibly less warmth than v2/v4, so test it blind. |
| 2 | **Azure Dragon HD Omni**, e.g. `en-GB-Sonia:DragonHDOmniLatestNeural` (Neural HD meter $22/M) | Yes. WordBoundary events give the audio offset plus the text offset. | Yes. ⚠ Confirm each en-GB persona has an Omni version. | **$0.145 / 11p** | Strong long-form quality. It has `calm`, `quiet` and `slow` style tags, but no `<prosody>` (rate) control. Real-time only, through the Speech SDK. |
| 3 | **Gemini 3.8 Flash TTS** (preview) + forced alignment | No (the docs don't mention it), so it needs alignment (+$0.037) | Via accent prompting or the voice library | **$0.17 / 13p** now; **$0.31** from 1 Jan 2027 (the price doubles) | Very steerable ("read like a sleepy bedtime story"). It is a preview model, and generative TTS can skip or invent words; the alignment score catches that. |
| 4 | **Inworld TTS-2** ($25/M on demand, $15/M on the $300/mo plan) | Yes (WORD and CHARACTER) | ⚠ Not verified | $0.165, or $0.10 on a plan | Promising; needs a listening test. |
| 5 | **Google Chirp 3 HD** ($30/M; the first 1M characters a month are free, about 150 stories) | No. `<mark>` is not in its supported SSML, so it needs alignment. | Yes | $0.235 / 18p (free while volume is low) | Good. Pauses are controlled with `[pause]` markup and `speaking_rate`. |
| 6 | **Cartesia Sonic 3.6** (1 credit per character; overage $38–65/M ⚠) | Yes (word and phoneme, over WebSocket) | Yes | $0.25–0.43 | Tuned for low-latency agents, with no clear gain for narration. |
| 7 | **Amazon Polly** | Generative voices (Amy and Brian, $30/M) have **no speech marks**. Neural voices ($16/M) do, but their quality is dated. | Yes | $0.20 + alignment / $0.11 | Not recommended. |
| — | ElevenLabs Multilingual v2 / v4 (today) | Yes | Yes | $0.53 / 40p | The quality bar. Keep it for library books, which are paid for once. |
| ✗ | OpenAI TTS | No (audio only) | — | — | Excluded: deprecated, shutting down 6 Jan 2027. |

**ElevenLabs plans compared with the API.** Every API tier, from $6 to $990 a month, works out at the same $0.08/1k for v2/v4 and $0.04 for Flash/Turbo. A plan only pre-pays characters, so it gives no volume discount. The consumer plan page lists different credit allowances (for example, Pro at 600k credits), so budget from the API page. Below Enterprise there is nothing to negotiate.

**Forced alignment adds timings to any TTS.** The ElevenLabs Forced Alignment API takes audio plus text and returns per-character and per-word times and a `loss` (confidence) score. It costs the same as speech-to-text, $0.22 an hour (⚠ that rate is confirmed only by third parties), so **about $0.037 for 10 minutes**. Its per-character output fits `scripts/lib/alignment.mjs` almost unchanged. The `loss` score also works as automatic QA: it flags pages where the TTS skipped or invented words. A self-hosted MMS or WhisperX aligner would cost almost nothing per story but needs a container outside Vercel, so it isn't worth running until volume is high.

**Recommendation**
- Run the blind TTS test (§6) with these engines: v2 (control), Flash v2.5, v4 Turbo, Azure HD Omni en-GB and Gemini 3.8 Flash TTS + alignment.
- Ship the cheapest engine that ties with v2.
- Plan on ElevenLabs Flash or Turbo (20p) and treat Azure (11p) as the stretch option.
- Don't build on Gemini TTS pricing, which doubles in January.

## 2. Story text

| Model | Price per MTok (in / out) | 10-page story at about 4,400 output tokens | Note |
|---|---|---|---|
| Opus 5.5, `low` | $4 / $20 (cache read $0.20) | **$0.090 / 6.8p** (measured) | Current model; the quality reference |
| Sonnet 5.5, `low` | $2 / $10 (cache read $0.20) | ≈ $0.048 / 3.6p | Its effort levels are calibrated differently, so test both `low` and `medium` |
| Haiku 5.5 | $0.10 / $0.50 | ≈ $0.003 / 0.2p | Very cheap. Test it for helper tasks, not for stories. |
| Batch API (any model) | 50% off | Opus: $0.045 | Results arrive within 24 hours. Use it for library drafts and pre-generated next chapters. |

- **Caching won't save much more.** About 95% of the text cost is output, including thinking. The cached system prompt already saves about 0.4p per story.
- **Low traffic can make caching cost more.** At under one story every 5 minutes, each call pays the 1.25× cache-write premium, which is still only about 0.75p. Use the 1-hour TTL only once traffic is steady.
- **Model choice and effort are the only real text levers.** The minimum cacheable prefix on the 5.5 models is 512 tokens, so the current prompt does qualify.

**Routing proposal (untested until the blind test is run)**

| Route | Model |
|---|---|
| New personalised stories | Opus 5.5 `low` (no change) |
| Series continuations | Sonnet 5.5, *only if* it is non-inferior in the blind test. Continuations lean on memory and established voice, so they are the easiest case for a cheaper model. |
| Library first drafts | Opus through Batch |
| Helper calls | Haiku 5.5: art-direction JSON, series-memory summaries, titles and premise lines |

Saving: about 1.6p per book when half of all books are continuations. It is worth having only if quality doesn't drop.

## 3. Images

| Lever | Finding | Per-book effect |
|---|---|---|
| Model | Nano Banana 2.1 1K costs $0.0336. Flash Lite Image costs **the same per output** ($0.0336) and saves only on input ($0.25 vs $1.50 per M), and third parties rate it below 2.1. Nano Banana 2 at 512px costs $0.045, more than 2.1 at 1K. | **Stay on 2.1.** |
| Size | 2.1 offers 1K, 2K and 4K, with no 512px. 1K (about 900 px wide at 4:5) suits a 390-pt phone at about 2–3× pixel density. | Keep personalised books at 1K. Use 2K only for library covers. |
| Batch | $0.0168 per 1K image (50% off), with input at half price too. 2.1 supports Batch. | Library book $0.59 → $0.30. Personalised books that can wait: −50%. |
| Images per book | 10 pages + cover = 11 images; 5 scenes + cover = 6. Each scene covers two text pages, picture-book style, with a slow pan in the reader. The story engine writes one art direction per pair of pages, so the text never describes something missing from the picture. | −45% on page images. **This is a product choice: test it with parents.** |
| Thinking level | 2.1 supports `minimal`, `medium` (default) and `high`. ⚠ Whether thinking tokens are billed isn't documented. | Log `usage` and test `minimal` on page renders. |

## 4. Reuse and recycling

| # | Idea | How it works | Saving | Quality | Privacy |
|---|---|---|---|---|---|
| R1 | **Global hero-look bank** | One generic reference sheet per look combination, generated lazily the first time anyone picks it and reused by every family after that. **Sizing:** 8 skin tones × 7 hair colours × 10 hair styles (including afro puffs, braids, locs, headscarf) × glasses (2) × freckles (2) = **2,240 looks**, × 3 age-band body shapes = **6,720**. Each sheet with QA retries is about $0.055, so **building every one costs about $370 ($185 through Batch)**. Lazy generation will probably cover 80% of children with a few hundred sheets. Generate 2–3 variants per look, and let the parent pick one in the hero-look builder. | Removes a reference call from every first book, about $0.04–0.06 per child, and the reference-generation step from first-book latency | **Better.** Each sheet is QA'd once and reused, and a bad sheet is fixed for everyone. | No photos. A sheet is generic and shared, so it identifies no one. A skin-tone choice may count as data revealing ethnic origin (special category). Store it only on the child profile, never in analytics, and keep the bank keyed by combination with **no link back to the family**. |
| R2 | **Per-child outfit layer** | One image edit of the bank sheet to set pyjama colours, so two children with the same look aren't identical | $0.034, once per child | Better (distinct children, twins) | Family-private storage, deleted with the account |
| R3 | **Companion sheets** (pets, toys) | Generated once when the companion is added and reused in every story | $0.04 per companion per book, compared with drawing it fresh each time | Better (Biscuit the dog looks the same every night) | Description only. Never accept photos of pets either, because photos carry metadata and backgrounds. |
| R4 | **Series location sheets** | One sheet for the recurring place (the treehouse, Grandad's shed) at chapter 1, attached to every later chapter | $0.04 once per series; adds about $0.002 of input per page | Better continuity, which is a "world that remembers" selling point | Family-private |
| R5 | **Stock world kits** | 3–5 curated background and style plates for each create-flow world, used as style anchors | About £2 one-off for 12 worlds. Fewer re-rolls (my estimate: retries 20% → 10%) and shorter prompts. | Better | None (stock art) |
| R6 | **Library cameos** | Library cast (Pip, Tumble, the Sock Train) can appear in personalised stories using their existing sheets | $0 per cameo | Neutral to better; cross-sells the library | None |
| R7 | **Narration cache by hash** | Key: `sha256(model + voice + settings + page text)`. Replays never re-synthesise (already a rule). An edit or regeneration re-narrates only the changed pages, as the pipeline already does for library books. | Prevents up to 100% duplicate spend on edits | None | Scope the cache **per family**: page text contains the child's name, so never deduplicate across families. |
| R8 | **Narrate on first play** | Synthesise only when someone first taps "recorded voice", starting with page 1 and staying a page ahead | Saves all narration on books parents read aloud; measure that share | None, as long as page 1 is ready in a few seconds | — |
| R9 | **Goodnight end-plate** (optional) | One per-child "asleep with companion" picture, reused as the last page of every book as a ritual | 1 image per book (−$0.04) | It's a ritual, but it risks the "content repeating" complaint. Test it. | Family-private |
| R10 | **Multi-panel generation** | One 2K image with 4 scenes in a 2×2 grid, split into 4 panels of about 1K: $0.0126 per scene, compared with $0.0336 (−62%) | Big | **High risk.** It conflicts with the no-frames/no-panels rule, characters can bleed between panels, there are 4 characters to keep consistent in one image, it loses previous-page continuity, and one bad panel means redoing all four. | — |

**R10 verdict:** test it only for thumbnails and "story so far" recaps, not for book pages.

## 5. Recommended stack

| | Before (today's defaults on a 10-page personalised book) | After, safe | After, stretch (conditional on the tests) |
|---|---|---|---|
| Text | Opus `low`: $0.090 | Opus `low`: $0.090 | Opus for new stories, Sonnet for continuations, roughly 50/50: $0.069 |
| Images | 2 per-book references + 10 pages + cover (13 images), input, +15% retries: **$0.60** | Bank, companion and world references; 5 scenes + cover; +10% retries: **$0.28** | As safe, with half of books Batched: **$0.21** |
| Narration | Multilingual v2: **$0.53** | Flash v2.5 / v4 Turbo: **$0.26** | Azure HD Omni en-GB: **$0.145** |
| **Per book** | **$1.22 ≈ 93p** | **$0.63 ≈ 48p** | **$0.43 ≈ 32p** |

**Library usage.** Production is a fixed cost: about £1 a book, or about 50p with Batch images. Streaming a book uses about 12 MB, made up of 64 kbps mono audio (good enough for speech, half of today's 128 kbps) and about 3 MB of WebP images. At 20 reads a month that's about 250 MB per subscriber. That fits inside Vercel Pro's 1 TB until about 4,000 subscribers, and after that costs about 3p per subscriber at $0.15/GB. Cloudflare R2 egress is free.

**Per subscriber per month** (4 personalised books + library; £6.99 includes VAT)

| | Before | Safe | Stretch |
|---|---|---|---|
| 4 books + library | £3.73 | £1.96 | £1.33 |
| £6.99 − VAT (£1.17) = £5.83 | | | |
| − Stripe (1.5% + 20p, plus Billing at 0.7%) = £0.35 → net £5.47 | | | |
| **Contribution per month** | **£1.74 (30%)** | **£3.51 (60%)** | **£4.14 (71%)** |
| Annual plan at £49.99 (£3.36 a month net) | **−£0.37** | +£1.40 | +£2.03 |

Premium cards cost 2.8% + 20p, about 9p more per payment. Not included: Supabase, the Vercel base fee, free-tier stories (3 read-aloud stories ≈ 21p per sign-up), and heavy use of read-aloud-only stories (7p each). **Recommendation:** cap or meter illustrated and narrated books (the "about 4 a month" in the plan), but keep read-aloud stories unlimited.

## 6. Blind tests before anything changes

**Text (about $5 of API spend)**
1. Write 40 briefs: every age band, a mix of moods and shapes, and 15 of them series continuations with real memory.
2. Generate each brief with Opus `low` (control), Sonnet `low`, Sonnet `medium` and Haiku `medium`, using the same `PROMPT_VERSION`.
3. Automatic gates for each story:
   - `readability.ts` pass rate
   - hits from the banned-phrase list
   - violations of the avoid list
   - tension resolved by about 75%
4. Show pairs to 5–8 parents, the owner and one children's-book editor, with models hidden and order randomised. Ask "Which would you rather read tonight?", then 1–5 scores for humour and voice, payoff, age fit, bedtime landing and (for continuations) memory.
5. **Rule:** a route switches to a cheaper model only if:
   - its preference share is at least 45% (non-inferior) over about 200 judgements
   - it has **zero** avoid or safety violations
   - its gate pass rate is within 2 points of Opus

**Narration**
1. Pick 6 pages: the opening, dialogue, a funny page, a tense page, the sleepy final page, and a page with names.
2. Render them with each engine using its best en-GB voice. Parents listen on a phone speaker at bedtime volume, and rate preference plus "would this help my child settle?"
3. Also measure timing: the share of words whose highlight is more than 150 ms early or late, and the alignment `loss`.
4. **Rule:** same non-inferiority rule as for text.

## Sources

**Text**
- Claude pricing, Batch and caching: `claude-api` skill reference (models table cached 2026-10-06) and https://docs.anthropic.com/en/docs/about-claude/pricing

**Images**
- Gemini image and TTS prices, including Batch: https://ai.google.dev/gemini-api/docs/pricing
- Nano Banana 2.1 model page: https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1
- Flash Lite Image quality (third-party): https://www.kittl.com/blogs/kittl-review-nano-banana-2-lite/ and https://vercel.com/ai-gateway/models/gemini-3.1-flash-lite-image

**Narration**
- Gemini TTS models (no timestamps mentioned): https://ai.google.dev/gemini-api/docs/speech-generation
- Google Cloud TTS prices, 25 audio tokens per second, `<mark>` not billed: https://cloud.google.com/text-to-speech/pricing
- Chirp 3 HD supported SSML: https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd
- Google SSML timepoints: https://docs.cloud.google.com/text-to-speech/docs/ssml
- ElevenLabs API pricing: https://elevenlabs.io/pricing/api
- ElevenLabs plans: https://elevenlabs.io/pricing
- ElevenLabs models: https://elevenlabs.io/docs/models
- ElevenLabs forced alignment: https://elevenlabs.io/docs/api-reference/forced-alignment/create and https://elevenlabs.io/docs/overview/capabilities/forced-alignment
- Forced alignment at $0.22/h (third-party): https://fal.ai/models/fal-ai/elevenlabs/forced-alignment/llms.txt
- Azure HD voices, Omni word boundaries: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/high-definition-voices
- Azure prices (UK South retail meters: Neural $15/M, Neural HD $22/M): https://prices.azure.com/api/retail/prices (the public pricing page shows "$-" placeholders)
- Amazon Polly prices: https://aws.amazon.com/polly/pricing/
- Polly generative voices (no speech marks): https://docs.aws.amazon.com/polly/latest/dg/generative-voices.html
- Cartesia timestamps: https://docs.cartesia.ai/api-reference/tts/websocket
- Cartesia plans: https://www.cartesia.ai/pricing (overage figures from https://www.cartesia.ai/learn/elevenlabs-pricing, ⚠)
- Inworld prices: https://inworld.ai/pricing
- Inworld timestamps: https://docs.inworld.ai/tts/capabilities/timestamps
- OpenAI TTS deprecation: https://developers.openai.com/api/docs/guides/text-to-speech

**Payments and delivery**
- Stripe UK fees: https://stripe.com/gb/pricing
- Vercel pricing: https://vercel.com/pricing
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
