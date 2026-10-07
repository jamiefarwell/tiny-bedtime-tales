# Tiny Bedtime Tales — AI Engine & Unit Cost Plan (Oct 2026)

## Recommended production stack

### Story text
Primary: OpenAI GPT-6 Luna via Vercel AI Gateway
- Model ID: `openai/gpt-6-luna`
- Current Gateway price: $0.10 / 1M input tokens, $0.50 / 1M output tokens.
- Purpose: default high-volume story writing.

Fallback 1: Anthropic Claude Sonnet 5.5
- Model ID: `anthropic/claude-sonnet-5.5`
- $2 / 1M input, $10 / 1M output.
- Purpose: high-quality provider fallback.

Fallback 2: Google Gemini 3.8 Flash
- Model ID: `google/gemini-3.8-flash`
- Current promotional Gateway pricing from $0.75 / 1M input, $3.75 / 1M output.
- Purpose: provider diversity.

Vercel AI Gateway currently adds no token markup.

### Illustrations
Primary candidate: Google Gemini Nano Banana 2.1
- Model ID: `google/gemini-nano-banana-2.1`
- Better character consistency than the previous Flash Image generation.
- 1K image: about $0.0336
- 2K image: about $0.0504
- Generate once, store permanently.

Recommended standard illustrated story:
- cover + 4 scene illustrations = 5 images
- 1K standard generation cost: about $0.168 total
- 2K standard generation cost: about $0.252 total

Start with 1K. It is more than enough for phone/tablet reading and keeps the story fast.

### Narration
Primary candidate: Google Gemini 3.8 Flash-Lite TTS
- Model ID: `google/gemini-3.8-flash-lite-tts`
- Current promotional price through Dec 2026: equivalent to about $0.0015 per 10 seconds of audio.
- Around 100+ languages.
- Generate once, store the audio file.

For a 7 minute story:
- approx 420 seconds
- approx $0.063 audio generation cost

Premium audio benchmark: ElevenLabs Flash/Turbo
- approx $0.05 / 1,000 characters
- a typical ~6,600 character bedtime story would cost around $0.33
- keep ElevenLabs as a quality benchmark, not the default until listening tests prove the uplift is worth ~5x the cost.

## Example story text cost

Working assumption:
- 1,500 input tokens: profile, world memory, safety rules and prompt
- 2,500 output tokens: title, pages, scene descriptions and continuity memory

Approx API cost per story:

- GPT-6 Luna: $0.0014
- Gemini 3.8 Flash: $0.0105
- Claude Sonnet 5.5: $0.028
- GPT-5.6 Sol (old primary): $0.056

At the 7 Oct 2026 USD/GBP rate of roughly $1 = £0.755:
- GPT-6 Luna: roughly 0.11p
- Gemini 3.8 Flash: roughly 0.79p
- Claude Sonnet 5.5: roughly 2.12p
- GPT-5.6 Sol: roughly 4.23p

Text generation is therefore almost irrelevant to the unit economics. Images and audio dominate.

## Approx variable AI cost by product

### Read-only story
GPT-6 Luna text:
- around £0.001 per story
- effectively a fraction of a penny.

### Read + narration
GPT-6 Luna + Gemini Flash-Lite TTS:
- text around £0.001
- 7 min audio around £0.048
- total around 5p

### Illustrated + narration
GPT-6 Luna + 5 Nano Banana 2.1 1K images + 7 min Gemini Flash-Lite TTS:
- text around £0.001
- images around £0.127
- audio around £0.048
- total around £0.176, roughly 18p

Six images rather than five:
- images about £0.152
- full text + audio + six images about £0.20

These are generation costs only and exclude storage, bandwidth, payment fees, taxes and normal hosting.

## Cost design rules

1. Never regenerate audio when somebody presses Play. Store it once.
2. Never regenerate illustrations when somebody opens a story. Store them once.
3. Regeneration should create a new story version and incur a new generation cost.
4. Use five images for the standard illustrated tier to balance quality and margin.
5. 1K images are the standard. Offer 2K only if print/export later needs it.
6. Cache reusable system prompt content where worthwhile, although text cost is already tiny.
7. Record model, token counts and provider-reported cost for every generation event.
8. Keep model selection server-side so price/quality changes do not require an app update.

## Pricing references

- https://vercel.com/ai-gateway/models/gpt-6-luna
- https://vercel.com/ai-gateway/models/claude-sonnet-5.5
- https://vercel.com/ai-gateway/models/gemini-nano-banana-2.1
- https://vercel.com/ai-gateway/models/gemini-3.8-flash-lite-tts
- https://ai.google.dev/gemini-api/docs/pricing
- https://elevenlabs.io/pricing/api
