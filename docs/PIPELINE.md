# Offline asset pipeline: illustrations and narration

Two Node scripts turn a finished book (`content/books/<slug>.json`, typed by `Book` in `lib/types.ts`) into
production assets under `public/books/<slug>/`, and write the asset paths back into the book JSON.

| Script | Provider | Produces | Writes into the JSON |
|---|---|---|---|
| `scripts/illustrate-book.mjs` | Google Gemini image generation ("Nano Banana") | `refs/<castId>.webp`, `page-NN.webp`, `cover.webp` | `pages[].image`, `cover`, `artStatus` |
| `scripts/narrate-book.mjs` | ElevenLabs TTS with timestamps | `page-NN.mp3` | `pages[].audio`, `pages[].timings` |

Both are plain ESM (`.mjs`) for Node 24. They use only built-in `fetch` and no SDKs. Run them from the repo root.
Use them offline, by hand: they are not part of `next build`, and the app never calls them at runtime.

---

## 1. Keys and setup

Put keys in `.env.local` at the repo root. It is already gitignored. The scripts read keys from the process
environment first, then `.env.local`, then `.env`, using a small built-in parser, so there is no `dotenv` dependency.
They never print, log or write a key. Dry-run output shows `<redacted>` in place of each key.

```dotenv
# .env.local
GEMINI_API_KEY=...            # illustrations
ELEVENLABS_API_KEY=...        # narration
NARRATOR_VOICE_ID=...         # default ElevenLabs voice, used when book.narrator.voice is empty
```

| Key | Where to get it | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio → **Get API key** (https://aistudio.google.com/apikey) | Turn on billing for the project (paid tier). On the free tier, prompts can be used to improve Google products, and the image models are rate-limited hard. |
| `ELEVENLABS_API_KEY` | ElevenLabs dashboard → **Developers → API keys** | Create a key restricted to **Text to Speech** only, with a character quota. |
| `NARRATOR_VOICE_ID` | ElevenLabs → **Voices** → pick a voice → **Copy voice ID** | You can also set it per book in `narrator.voice`, or per run with `--voice`. |

Optional settings (all have defaults):

| Variable | Default | Meaning |
|---|---|---|
| `ILLUSTRATION_MODEL` | `gemini-nano-banana-2.1` | Gemini image model id |
| `ILLUSTRATION_SIZE` | `1K` | `1K` / `2K` / `4K` (and `512px` on `gemini-3.1-flash-image`) |
| `ILLUSTRATION_ASPECT` / `ILLUSTRATION_COVER_ASPECT` | `4:5` / `3:4` | Page and cover aspect ratios |
| `GEMINI_IMAGE_API` | `interactions` | Set to `generateContent` to use the older endpoint |
| `ILLUSTRATION_PRICE_PER_IMAGE` | from the price table | Overrides the price used for the cost estimate |
| `NARRATION_MODEL` | `eleven_multilingual_v2` | ElevenLabs model id |
| `NARRATION_STABILITY` / `_SIMILARITY` / `_STYLE` / `_SPEED` | `0.55` / `0.75` / `0.15` / `0.90` | Bedtime delivery |
| `NARRATION_OUTPUT_FORMAT` | `mp3_44100_64` (speech; half the size of 128) | Any `mp3_*` format |
| `NARRATION_PRICE_PER_1K` | from the price table | Overrides the price used for the cost estimate |
| `GEMINI_API_BASE` / `ELEVENLABS_API_BASE` | official hosts | Point the scripts at a proxy, an ElevenLabs regional host, or the tests' mock server |
| `PIPELINE_ASSET_ROOT` | `public/books` | Redirects asset output to another folder (used by the tests) |

**Dependencies.** The only one is `sharp` (a direct dependency, also used by the app's picture route), which converts
Gemini's JPEG output to WebP. If `sharp` can't be loaded, the script saves the PNG or JPEG that Gemini returns and points the
JSON at that file instead. Nothing else is needed.

---

## 2. Illustrations: the consistency workflow

An earlier approach handed Gemini each page with no shared context, and the characters drifted from page to page.
This pipeline instead locks the characters first and attaches them to every request:

1. **Visual bible.** This lives in the book JSON: `style` (rendering), `world` (setting) and each `cast[].look`
   (a locked, verbatim description). Write these first, and make each `look` specific: colours, clothing,
   proportions, markings.
2. **Reference sheets.** The script makes one per cast member: full body, neutral pose, plain warm background,
   no text. They're saved to `public/books/<slug>/refs/<castId>.webp`. The first sheet is attached to the later
   ones as a *style anchor*, so the whole cast shares one rendering style.
   ```bash
   node scripts/illustrate-book.mjs <slug> --refs-only
   ```
3. **Human review of the refs.** Open `public/books/<slug>/refs/` and check each sheet. This is the cheapest point
   to fix a design. To redo one character, edit its `look` if needed, then run:
   ```bash
   node scripts/illustrate-book.mjs <slug> --refs-only --cast pip --force
   ```
4. **Pages.** Each page is generated from `page.art.prompt` + `page.art.shot` + the verbatim looks of the characters
   in the shot + `style` + `world`. The request also attaches **as image inputs** the reference sheet for each
   character in the shot (detected by name in the art direction, or listed explicitly in `art.cast` as cast ids;
   `"cast": []` means a scene with nobody in it) and the **previous page**, for continuity. Every
   image gets a numbered text label ("Image 2: reference sheet for Pip…"). The prompt asks for: no text, letters,
   numbers, signs or UI of any kind; a single full-bleed portrait frame; and a calm, low-detail bottom ~15% so the
   app's fade into the text panel looks clean.
   ```bash
   node scripts/illustrate-book.mjs <slug>            # refs (if missing) -> all pages -> cover
   ```
5. **Cover.** A hero composition of the main cast with the **top 30% left calm** for the app's title overlay.
   Interior pages 1 and the middle page are attached as style references. Saved to `cover.webp`.
6. **Human review of the pages.** Look through the pages in order. Check that the characters match their refs and
   that no lettering has crept in (on clocks, books or signs). Regenerate any page that fails:
   ```bash
   node scripts/illustrate-book.mjs <slug> --pages 4,7 --force
   node scripts/illustrate-book.mjs <slug> --cover --force
   ```
   When a page is regenerated, it is conditioned on the page before it as that page exists now.
7. **Done.** The script sets `artStatus` to `"final"` once every page and the cover exist **and** were made by this
   pipeline. If a book already has hand-supplied art (for example the `interim` art in
   `lily-and-the-lantern-feather`), use `--force` to replace it, or `--mark-final` to accept it as it is.

Other behaviour:

- **Idempotent.** Existing files are skipped unless you pass `--force`, so if a run fails partway, re-run the same
  command. Reference sheets are only regenerated with `--force-refs`, or with `--refs-only --force`. Regenerating a
  ref invalidates the pages drawn from it, and the script warns about that.
- **Provenance and staleness.** `public/books/<slug>/pipeline-manifest.json` records the model, size, aspect ratio
  and input fingerprints for every asset. On each run the script warns when a page's `art` changed after it was
  drawn, when a ref it used has since changed, or when a `look` changed after its ref was made.
- **Per-page JSON updates.** Each successful page is written into the book JSON straight away. The JSON is
  re-read and replaced atomically, so concurrent edits to other fields aren't lost. The book files are
  hand-formatted, so `scripts/lib/json-patch.mjs` splices only the changed values into the original text instead
  of re-serialising the whole file. Every other line stays byte-identical.
- **Retries.** Network errors, 408, 429 and 5xx responses are retried with exponential backoff and jitter, honouring
  `Retry-After`, up to 5 times. A response that contains no image is retried up to 3 times. Safety blocks are
  reported and not retried. Failures are listed at the end, and the script exits with code 1.
- **`--dry-run`** prints the exact request for every image the run would generate (URL, headers with the key
  redacted, and the JSON body with base64 truncated), plus the cost estimate. It makes no API calls, writes no
  files and needs no key.

All flags: `node scripts/illustrate-book.mjs --help`.

### Model and request shape (verified 2026-10-20)

- **Default model `gemini-nano-banana-2.1`** ("Nano Banana 2.1"). Google lists it as stable and calls it the
  primary model for image generation and editing, recommended for all new projects. It accepts up to **14 reference
  images**, keeps **up to 4 characters** consistent, and outputs 1K (the default), 2K or 4K.
  Sources: https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1 and
  https://ai.google.dev/gemini-api/docs/image-generation
- Other ids you can set with `ILLUSTRATION_MODEL`: `gemini-3.1-flash-image` (Nano Banana 2),
  `gemini-3.1-flash-lite-image`, `gemini-3-pro-image` (Nano Banana Pro). `gemini-2.5-flash-image` is deprecated,
  and the pricing page lists its shutdown as 2 Oct 2026.
- **Endpoint (default).** This is the Interactions API, which Google recommends for new projects:
  ```
  POST https://generativelanguage.googleapis.com/v1beta/interactions
  x-goog-api-key: $GEMINI_API_KEY
  {
    "model": "gemini-nano-banana-2.1",
    "input": [
      {"type": "text", "text": "<prompt>"},
      {"type": "text", "text": "Image 1: reference sheet for Nell..."},
      {"type": "image", "mime_type": "image/webp", "data": "<base64>"},
      ...
    ],
    "response_format": {"type": "image", "mime_type": "image/png", "aspect_ratio": "4:5", "image_size": "1K"},
    "store": false
  }
  ```
  The response image is the last `{"type":"image","data":...}` block inside `steps[]` with
  `type: "model_output"`. Interim "thought" images are skipped. `store: false` stops Google from keeping prompts
  and reference art (the default is to store them, for 55 days on the paid tier).
  Sources: https://ai.google.dev/api/interactions-api and https://ai.google.dev/gemini-api/docs/interactions
- **Fallback endpoint.** Set `GEMINI_IMAGE_API=generateContent` to use
  `POST /v1beta/models/{model}:generateContent`, with `contents[].parts[]` (`text` / `inline_data`) and
  `generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio, imageSize } }`. The response
  image is in `candidates[].content.parts[].inlineData`. Google says this API "remains fully supported".

---

## 3. Narration with word timings

```bash
node scripts/narrate-book.mjs <slug> --voice <voiceId>        # all pages
node scripts/narrate-book.mjs <slug> --pages 3 --force        # redo one page
node scripts/narrate-book.mjs <slug> --dry-run                # print payloads and cost only
```

- **Only `page.text` is spoken.** Headings are not. The text is sent exactly as written, so ElevenLabs'
  character alignment refers to the same string the app renders.
- **Read-along timings.** ElevenLabs returns character-level `alignment` (characters plus start and end seconds).
  `scripts/lib/alignment.mjs` maps that alignment back onto the page text. It tolerates small differences such as
  normalised quotes, expanded numbers and dropped characters, and turns them into
  `WordTiming[] = [{ w, start, end }]`. Here `w` indexes `tokenise(page.text)`, `start` is the first spoken
  character of the word and `end` is the last. Words with no matching audio are interpolated between their
  neighbours, and timings are kept in order.
- **The tokeniser is the contract with the app.** `scripts/lib/tokenise.mjs` exports `tokenise(text)`. It returns
  `{ word, start, end }` for each maximal run of non-whitespace characters, using UTF-16 offsets with `end`
  exclusive. Punctuation stays attached to its word, and paragraph breaks count as whitespace. The app must use
  the identical function, which is one regex: `/\S+/gu`. The file has no dependencies, so it can be imported or
  copied as it is.
- **Continuous tone across pages.** Every request sends `previous_text` (the previous page) and `next_text` (the
  next page). Pages generated in the same run are also chained with `previous_request_ids` (request stitching):
  the last 3 consecutive pages, and only while each id is less than 2 hours old. When you regenerate a single
  page, stitching isn't available, so the neighbouring text alone carries the tone.
- **Bedtime delivery.** The defaults are stability 0.55 (calm and even), similarity 0.75, style 0.15 (warm, not
  theatrical) and speed 0.90 (slightly slow). The last page and pages with `mood: "sleepy"` are read about 0.05
  slower still; `--no-wind-down` turns this off. A seed derived from the slug makes re-runs similar on a
  best-effort basis. Change the settings with the `--stability`, `--similarity`, `--style` and `--speed` flags or
  the matching `NARRATION_*` variables. `book.narrator.notes` is printed as direction for choosing a voice. It is
  not sent to the API, because adding audio tags to the text would break the alignment.
- **Idempotent.** A page is skipped when `page-NN.mp3` exists **and** its `timings` length matches the current
  word count **and** the text hasn't changed since it was narrated (checked against the manifest). An edited page
  is regenerated automatically, because its old timings would highlight the wrong words.
- **Output.** `public/books/<slug>/page-NN.mp3` (`mp3_44100_64`). `pages[].audio` and `pages[].timings` are
  written into the book JSON after each page. The provenance entry in `pipeline-manifest.json` records voice,
  model, settings, alignment coverage and duration.

### Model and endpoint (verified 2026-10-20)

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_64
xi-api-key: $ELEVENLABS_API_KEY
{ "text", "model_id", "voice_settings": { "stability", "similarity_boost", "style", "speed", "use_speaker_boost" },
  "previous_text", "next_text", "previous_request_ids" (max 3), "seed", "apply_text_normalization": "auto" }
-> { "audio_base64", "alignment": { "characters", "character_start_times_seconds", "character_end_times_seconds" },
     "normalized_alignment": {...} }   + response header `request-id`
```

- **Default model `eleven_multilingual_v2`.** It is the endpoint's own default and the model ElevenLabs describes
  as the most stable for long-form narration. It supports `style`, `speed` and request stitching, with a limit of
  10,000 characters per request.
- **Higher-quality option: `NARRATION_MODEL=eleven_v4`.** ElevenLabs positions it as its highest-quality model and
  shows it with request stitching. It has **no Style or Speed controls**, so the script leaves them out; to slow
  the delivery, choose a slower voice. `eleven_v3` does **not** support request stitching (it falls back to
  previous/next text), and the script snaps its stability to 0, 0.5 or 1.
- Sources: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps,
  https://elevenlabs.io/docs/developers/guides/cookbooks/text-to-speech/request-stitching,
  https://elevenlabs.io/docs/models and
  https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4

### Why not OpenAI TTS

`--provider openai` is rejected on purpose. OpenAI's `/v1/audio/speech` (`gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`)
returns audio only, with no word or character timestamps, so it can't drive read-along highlighting. Those models
are also deprecated, with shutdown on 6 Jan 2027, and the suggested replacement is the Realtime API, which
doesn't serve this endpoint (https://developers.openai.com/api/docs/guides/text-to-speech). **ElevenLabs is
required for narrated read-along.** One possible future fallback is to synthesize with any TTS, run a
transcription model that returns word timestamps, and map those words onto `tokenise()`. That would be forced
alignment, with more failure modes, and it isn't implemented.

---

## 4. Cost per 10-page book

Prices are standard pay-as-you-go API rates, checked 2026-10-20. Each script prints its own estimate at the end
of a run.

**Illustrations (`gemini-nano-banana-2.1`)**: $0.0336 per 1K image, $0.0504 per 2K, $0.113 per 4K. Input costs
$1.50 per 1M tokens. The Batch API is 50% cheaper but can take up to 24 hours, and these scripts don't use it.
Source: https://ai.google.dev/gemini-api/docs/pricing

| Item | Images | 1K | 2K |
|---|---|---|---|
| Reference sheets (2–4 cast) | 4 | $0.134 | $0.202 |
| Pages | 10 | $0.336 | $0.504 |
| Cover | 1 | $0.034 | $0.050 |
| Input (prompts plus 2–6 reference images per call, ~60k tokens) | | ~$0.09 | ~$0.09 |
| **First pass** | **15** | **~$0.59** | **~$0.85** |
| With ~30% regenerations after review | | ~$0.75 | ~$1.10 |

**Narration.** A 10-page book is about 6,600 characters (`grandads-runaway-snore` has 6,651). Source:
https://elevenlabs.io/pricing/api

| Model | $/1K chars | One pass | With one page redone |
|---|---|---|---|
| `eleven_multilingual_v2` (default), `eleven_v4`, `eleven_v3` | $0.08 | ~$0.53 | ~$0.59 |
| `eleven_v4_turbo`, `eleven_flash_v2_5` | $0.04 | ~$0.27 | ~$0.30 |

**Total per 10-page book (1K art + default narration): about $1.10 for a first pass, and about $1.35 with
typical regenerations.** Both kinds of asset are generated once and stored. Playback never regenerates them
(see `docs/ENGINE_COSTS.md`).

Uncertain figures in these estimates:

- Google doesn't publish an input-token count per reference image for every model. The estimate assumes about
  1,120 tokens per attached image and uses the real `usage` figures whenever the API returns them.
- Nano Banana 2.1 always thinks, and its thinking can't be turned off. The script reports thinking tokens when
  they're returned but leaves them out of the estimate.
- The ElevenLabs model-id-to-price mapping comes from product names on the pricing page. Subscription plans
  include a character allowance that can make the effective price lower. The figures assume `previous_text` and
  `next_text` aren't billed.

---

## 5. Files

```
scripts/
  illustrate-book.mjs        CLI: refs -> pages -> cover, JSON update
  narrate-book.mjs           CLI: per-page TTS + WordTiming[], JSON update
  lib/tokenise.mjs           tokenise(text): the canonical word tokeniser (mirror it in the app)
  lib/alignment.mjs          character alignment -> WordTiming[]
  lib/art-prompts.mjs        prompt builders (ref sheet / page / cover), cast detection
  lib/gemini-image.mjs       Gemini REST client, price table, response parsing
  lib/elevenlabs.mjs         ElevenLabs REST client, model table
  lib/book.mjs               paths, book JSON IO (atomic patch), manifest, dry-run printing
  lib/json-patch.mjs         format-preserving JSON edits (keeps hand-formatted book files tidy)
  lib/env.mjs                .env.local / .env loader
  lib/http.mjs               fetch with timeout, retries and backoff
  fixtures/tiny-test-book.json
  test/pipeline.test.mjs     offline tests: node --test scripts/test/pipeline.test.mjs
```

The tests cover: the tokeniser, alignment (including normalised quotes, expanded numbers and dropped characters),
the env parser, page lists, prompts, request and response shapes for both providers, format-preserving JSON
edits on every real book, and both dry-runs. They also run a **full end-to-end test against a local mock of both
APIs**. That test checks one retried 503, the WebP output, JSON and manifest updates, `artStatus` → `final`,
stitching ids, the wind-down speed, that a second run skips everything, and that editing one page's text
invalidates only that page's narration.

Check the scripts without keys:

```bash
node --test scripts/test/pipeline.test.mjs
node scripts/illustrate-book.mjs tiny-test-book --book scripts/fixtures/tiny-test-book.json --dry-run
node scripts/narrate-book.mjs tiny-test-book --book scripts/fixtures/tiny-test-book.json --voice TEST --dry-run
```

## Production notes (21 Oct 2026, first real runs)
- **Image format:** `gemini-nano-banana-2.1` only returns JPEG (`response_format.mime_type` must be `image/jpeg`). The script now requests JPEG and converts it to WebP.
- **Run order:**
  1. Make the reference sheets first and look at them: `--refs-only`, then `--refs-only --cast <id>` to redo just one.
  2. Then run the full book.
  3. A 10-page book with 4 characters took about 4 minutes and cost about $0.56.
- **Narrator:**
  - **Auditions:** `node scripts/audition-voices.mjs --list` lists the account's voices. `node scripts/audition-voices.mjs <slug> --voices id1,id2 --out ../voice-samples` records short samples (about 400 characters each).
  - **House voice:** "Lily" (`pFZP5JQG7iQjIQuC4Bku`), `--style 0.25 --speed 0.92`.
- **Audio size:** narration now defaults to `mp3_44100_64` (64 kbps), about 350 KB per page. To re-encode older 128k files without re-buying them: `ffmpeg -i in.mp3 -ac 1 -b:a 64k out.mp3`. Durations, and so word timings, are unchanged.
- **Reader:** fetches the next page's picture and audio while the current page is read, and plays all narration through one shared audio element. Phones allow auto page-turns that way.
