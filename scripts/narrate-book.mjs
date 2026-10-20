#!/usr/bin/env node
// Narrate a Ready-to-Read book page by page, with word-level read-along timings.
//
//   node scripts/narrate-book.mjs <slug> [--voice <id>] [--pages 1,2,5] [--dry-run] [--force]
//
// For each page: ElevenLabs "with timestamps" TTS on page.text only (headings
// are not spoken) -> public/books/<slug>/page-NN.mp3, and the character-level
// alignment is converted into WordTiming[] indexed exactly like
// scripts/lib/tokenise.mjs. page.audio and page.timings are written back into
// content/books/<slug>.json.
//
// Tone continuity: every request carries previous_text / next_text (the
// neighbouring pages), and pages generated in the same run are chained with
// previous_request_ids (request stitching) where the model supports it.
//
// Keys are read from the environment (or .env.local / .env): ELEVENLABS_API_KEY.

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { alignmentToWordTimings } from './lib/alignment.mjs';
import {
  REPO_ROOT, assertSlug, assetDir, bookJsonPath, fmtUSD, pad2, parsePageList, patchBook,
  printRequest, publicPath, readBook, readManifest, rel, updateManifest, writeFileAtomic,
} from './lib/book.mjs';
import { DEFAULT_NARRATION_MODEL, TTS_MODELS, buildTtsRequest, modelInfo, synthesize } from './lib/elevenlabs.mjs';
import { env, envNumber, loadEnv } from './lib/env.mjs';
import { tokenise } from './lib/tokenise.mjs';

const HELP = `
Usage: node scripts/narrate-book.mjs <slug> [options]

  --voice <id>         ElevenLabs voice id. Default: book.narrator.voice, then $NARRATOR_VOICE_ID
  --pages <list>       Only these pages, e.g. 1,2,5 or 3-6 (default: all)
  --force              Regenerate even if page-NN.mp3 and valid timings exist
  --dry-run            Print the exact request payloads; no API calls, no files, no key needed
  --provider <name>    elevenlabs (default). "openai" is rejected: see docs/PIPELINE.md

Delivery (bedtime defaults; env overrides in brackets)
  --model <id>         Default ${DEFAULT_NARRATION_MODEL} [NARRATION_MODEL]
  --stability <0-1>    Default 0.55 [NARRATION_STABILITY]  higher = calmer, more even
  --similarity <0-1>   Default 0.75 [NARRATION_SIMILARITY]
  --style <0-1>        Default 0.15 [NARRATION_STYLE]      lower = less theatrical
  --speed <0.7-1.2>    Default 0.90 [NARRATION_SPEED]      slightly slower than normal
  --no-wind-down       Do not slow the last page and "sleepy" pages a little further
  --seed <n>           Best-effort determinism. Default: derived from the slug
  --language <iso>     ISO 639-1 code (not supported by eleven_multilingual_v2)
  --output-format <f>  Default mp3_44100_128 [NARRATION_OUTPUT_FORMAT]
  --book <file>        Read/write this JSON instead of content/books/<slug>.json
  -h, --help
`;

const log = (...a) => console.log(...a);
const warn = (m) => console.warn(m);
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
// Stitching ids are only valid for ~2 hours (ElevenLabs request-stitching docs).
const STITCH_TTL_MS = 110 * 60 * 1000;

function parseCli() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      voice: { type: 'string' },
      pages: { type: 'string' },
      force: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      provider: { type: 'string', default: 'elevenlabs' },
      model: { type: 'string' },
      stability: { type: 'string' },
      similarity: { type: 'string' },
      style: { type: 'string' },
      speed: { type: 'string' },
      'no-wind-down': { type: 'boolean', default: false },
      seed: { type: 'string' },
      language: { type: 'string' },
      'output-format': { type: 'string' },
      book: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help || positionals.length === 0) {
    console.log(HELP);
    process.exit(values.help ? 0 : 2);
  }
  if (positionals.length > 1) throw new Error(`Unexpected arguments: ${positionals.slice(1).join(' ')}`);
  return { slug: assertSlug(positionals[0]), ...values };
}

function num(cli, envName, fallback, lo, hi, name) {
  const v = cli !== undefined ? Number(cli) : envNumber(envName, fallback);
  if (!Number.isFinite(v) || v < lo || v > hi) throw new Error(`${name} must be between ${lo} and ${hi}`);
  return v;
}

async function main() {
  const loaded = loadEnv(REPO_ROOT);
  const opts = parseCli();
  const dry = opts['dry-run'];

  if (opts.provider !== 'elevenlabs') {
    if (opts.provider === 'openai') {
      throw new Error(
        'OpenAI TTS (/v1/audio/speech: gpt-4o-mini-tts, tts-1, tts-1-hd) returns audio only, with no word or character ' +
          'timestamps, so it cannot drive read-along highlighting. ElevenLabs is required for narrated read-along. ' +
          '(See docs/PIPELINE.md, "Why not OpenAI TTS".)',
      );
    }
    throw new Error(`Unknown --provider "${opts.provider}" (only "elevenlabs" is supported)`);
  }

  const file = bookJsonPath(opts.slug, opts.book);
  const book = readBook(file);
  const total = book.pages.length;
  const model = opts.model ?? env('NARRATION_MODEL', DEFAULT_NARRATION_MODEL);
  const info = modelInfo(model);
  const outputFormat = opts['output-format'] ?? env('NARRATION_OUTPUT_FORMAT', 'mp3_44100_128');
  if (!outputFormat.startsWith('mp3_')) throw new Error('--output-format must be an mp3_* format (files are saved as .mp3)');

  const voiceId = opts.voice || book.narrator?.voice || env('NARRATOR_VOICE_ID');
  const apiKey = env('ELEVENLABS_API_KEY');
  if (!dry) {
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set. Add it to .env.local (see docs/PIPELINE.md) or run with --dry-run.');
    if (!voiceId) throw new Error('No voice: pass --voice <id>, set book.narrator.voice, or set NARRATOR_VOICE_ID.');
  }

  let stability = num(opts.stability, 'NARRATION_STABILITY', 0.55, 0, 1, 'stability');
  const similarity = num(opts.similarity, 'NARRATION_SIMILARITY', 0.75, 0, 1, 'similarity');
  const style = num(opts.style, 'NARRATION_STYLE', 0.15, 0, 1, 'style');
  const baseSpeed = num(opts.speed, 'NARRATION_SPEED', 0.9, 0.7, 1.2, 'speed');
  if (info.discreteStability) {
    const snapped = info.discreteStability.reduce((a, b) => (Math.abs(b - stability) < Math.abs(a - stability) ? b : a));
    if (snapped !== stability) warn(`  ! ${model} only accepts stability ${info.discreteStability.join('/')}; using ${snapped}`);
    stability = snapped;
  }
  const seed = opts.seed !== undefined ? Number(opts.seed) : parseInt(sha(`narration:${opts.slug}`).slice(0, 8), 16);
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('--seed must be an integer 0-4294967295');

  const pageNums = parsePageList(opts.pages, total) ?? book.pages.map((_, i) => i + 1);
  const dir = assetDir(opts.slug);
  const per1k = Number.isFinite(Number(env('NARRATION_PRICE_PER_1K'))) ? Number(env('NARRATION_PRICE_PER_1K')) : info.per1k;

  log(`narrate-book: "${book.title}" (${opts.slug})`);
  log(`  model ${model} | voice ${voiceId ?? '<VOICE_ID>'} | ${outputFormat}${dry ? ' | DRY RUN' : ''}`);
  log(`  settings stability ${stability}, similarity ${similarity}${info.style ? `, style ${style}` : ''}${info.speed ? `, speed ${baseSpeed}` : ''}, seed ${seed}`);
  log(`  book  ${rel(file)}  ->  audio ${rel(dir)}/`);
  if (loaded.length) log(`  env   loaded ${loaded.join(', ')}`);
  if (info.unknown) warn(`  ! "${model}" is not in the known model table (${Object.keys(TTS_MODELS).join(', ')}); assuming no stitching. Set NARRATION_PRICE_PER_1K for costs.`);
  if (!info.style && opts.style !== undefined) warn(`  ! ${model} ignores style; not sent`);
  if (!info.speed && opts.speed !== undefined) warn(`  ! ${model} has no speed control; not sent (use a slower voice instead)`);
  if (!info.stitching) log(`  note  ${model} does not support request stitching; using previous_text/next_text only`);
  if (book.narrator?.notes) log(`  direction (for voice choice; not sent to the API): ${book.narrator.notes}`);
  if (dry && !voiceId) warn('  ! no voice configured yet; payloads show <VOICE_ID>');

  const manifest = readManifest(opts.slug);
  const stats = { pages: 0, chars: 0, skipped: 0, failures: [], lowCoverage: [] };
  /** pageNumber -> { id, at } for request stitching within this run */
  const requestIds = new Map();

  for (const n of pageNums) {
    const page = book.pages[n - 1];
    const base = `page-${pad2(n)}`;
    const mp3 = path.join(dir, `${base}.mp3`);
    const text = page.text;
    const words = tokenise(text);
    if (!text.trim() || words.length === 0) {
      warn(`  ! ${base}: empty text, skipping`);
      continue;
    }
    if (text.length > info.maxChars) {
      stats.failures.push(`${base}: ${text.length} chars exceeds ${model}'s ${info.maxChars}-char request limit`);
      continue;
    }

    const rec = manifest.assets[`audio/${base}`];
    const timingsValid = Array.isArray(page.timings) && page.timings.length === words.length;
    const textChanged = rec?.textSha && rec.textSha !== sha(text);
    if (existsSync(mp3) && !opts.force && timingsValid && !textChanged) {
      log(`  = ${base}: exists (${rel(mp3)}, ${words.length} word timings)`);
      stats.skipped++;
      continue;
    }
    if (existsSync(mp3) && !opts.force) {
      log(`  ~ ${base}: ${textChanged ? 'page text changed since it was narrated' : 'timings missing or out of step with the text'}; regenerating`);
    }

    const windDown = !opts['no-wind-down'] && (n === total || page.mood === 'sleepy');
    const speed = clamp(windDown ? baseSpeed - 0.05 : baseSpeed, 0.7, 1.2);
    const voiceSettings = { stability, similarity_boost: similarity, use_speaker_boost: true };
    if (info.style) voiceSettings.style = style;
    if (info.speed) voiceSettings.speed = Math.round(speed * 100) / 100;

    // Stitch to the immediately preceding pages generated in this run (max 3, < 2h old).
    const previousRequestIds = [];
    for (let k = n - 1; k >= Math.max(1, n - 3); k--) {
      const r = requestIds.get(k);
      if (!r || Date.now() - r.at > STITCH_TTL_MS) break;
      previousRequestIds.unshift(r.id);
    }

    const args = {
      voiceId: voiceId ?? '<VOICE_ID>',
      model,
      text,
      voiceSettings,
      previousText: n > 1 ? book.pages[n - 2].text.slice(-1500) : undefined,
      nextText: n < total ? book.pages[n].text.slice(0, 1500) : undefined,
      previousRequestIds,
      seed,
      languageCode: opts.language,
      outputFormat,
      apiKey,
    };

    if (dry) {
      log(`\n  [dry-run] ${base}: ${text.length} chars, ${words.length} words${windDown ? ', wind-down pace' : ''}`);
      printRequest(buildTtsRequest(args));
      stats.pages++;
      stats.chars += text.length;
      continue;
    }

    log(`  > ${base}: ${text.length} chars, ${words.length} words${windDown ? ' (wind-down pace)' : ''}${previousRequestIds.length ? `, stitched to ${previousRequestIds.length} previous` : ''}`);
    try {
      const t0 = Date.now();
      const out = await synthesize(args, { label: base, log: warn });
      stats.chars += text.length; // billed once audio comes back, even if a later step fails
      const alignment = out.alignment ?? out.normalizedAlignment;
      const { timings, matched, total: totalChars } = alignmentToWordTimings(text, alignment);
      const coverage = totalChars ? matched / totalChars : 1;
      if (coverage < 0.9) stats.lowCoverage.push(`${base} (${Math.round(coverage * 100)}%)`);

      writeFileAtomic(mp3, out.audio);
      patchBook(file, (b) => {
        const p = b.pages[n - 1];
        if (p.text !== text) throw new Error(`${base}: page text changed on disk during narration; re-run`);
        p.audio = publicPath(opts.slug, `${base}.mp3`);
        p.timings = timings;
      });
      updateManifest(opts.slug, `audio/${base}`, {
        file: `${base}.mp3`,
        provider: 'elevenlabs',
        model, voiceId, outputFormat, voiceSettings, seed,
        textSha: sha(text),
        words: words.length,
        alignmentCoverage: Math.round(coverage * 1000) / 1000,
        durationSec: timings.at(-1)?.end ?? null,
        createdAt: new Date().toISOString(),
      });
      if (out.requestId) requestIds.set(n, { id: out.requestId, at: Date.now() });
      stats.pages++;
      log(`    saved ${rel(mp3)} (${(out.audio.length / 1024).toFixed(0)} KB, ~${(timings.at(-1)?.end ?? 0).toFixed(1)}s) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } catch (e) {
      if (e?.fatal) throw e;
      stats.failures.push(`${base}: ${e.message}`);
      warn(`  x ${base}: ${e.message}`);
      requestIds.delete(n);
    }
  }

  log('\nSummary');
  log(`  ${dry ? 'would narrate' : 'narrated'} ${stats.pages} page(s), skipped ${stats.skipped} existing`);
  log(`  characters billed: ${stats.chars.toLocaleString('en-GB')} (page text only; previous/next context is not counted here)`);
  log(`  estimated cost: ${per1k != null ? fmtUSD((stats.chars / 1000) * per1k) : 'unknown'}${per1k != null ? ` at $${per1k}/1K chars (${model}, API pay-as-you-go)` : ''}`);
  log('  prices: https://elevenlabs.io/pricing/api (subscription plans include characters and may be cheaper)');
  if (stats.lowCoverage.length) warn(`  ! low alignment coverage, spot-check highlighting: ${stats.lowCoverage.join(', ')}`);
  if (stats.failures.length) {
    warn(`\n${stats.failures.length} failure(s):\n  - ${stats.failures.join('\n  - ')}`);
    warn('Re-run the same command to retry only what is missing.');
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(`\nnarrate-book: ${e.message}`);
  process.exitCode = 1; // not process.exit(): lets pending fetch sockets close cleanly (libuv assertion on Windows)
});
