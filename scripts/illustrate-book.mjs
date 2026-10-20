#!/usr/bin/env node
// Illustrate a Ready-to-Read book with consistent characters.
//
//   node scripts/illustrate-book.mjs <slug> [--pages 1,2,5] [--cover] [--refs-only] [--dry-run] [--force]
//
// Workflow (see docs/PIPELINE.md):
//   1. Character reference sheets: public/books/<slug>/refs/<castId>.webp
//   2. Pages, each generated WITH the relevant reference sheets (and the
//      previous page for continuity) as image inputs: page-NN.webp
//   3. Cover with room at the top for the app's title: cover.webp
//   4. content/books/<slug>.json updated in place (image, cover, artStatus)
//
// Keys are read from the environment (or .env.local / .env): GEMINI_API_KEY.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { castForPage, coverPrompt, pagePrompt, refSheetPrompt } from './lib/art-prompts.mjs';
import {
  REPO_ROOT, assertSlug, assetDir, bookJsonPath, ensureDir, fmtUSD, pad2, parsePageList,
  patchBook, printRequest, publicPath, readBook, readManifest, rel, updateManifest, writeFileAtomic,
} from './lib/book.mjs';
import { env, loadEnv } from './lib/env.mjs';
import { withSoftRetry } from './lib/http.mjs';
import {
  DEFAULT_ILLUSTRATION_MODEL, EST_TOKENS_PER_INPUT_IMAGE, IMAGE_PRICING,
  buildImageRequest, generateImage, priceFor,
} from './lib/gemini-image.mjs';

const HELP = `
Usage: node scripts/illustrate-book.mjs <slug> [options]

Targets (default: refs if missing, every page, then the cover)
  --pages <list>       Only these pages, e.g. 1,2,5 or 3-6 (1-based)
  --cover              Only the cover (combine with --pages to do both)
  --refs-only          Only the character reference sheets
  --cast <ids>         With --refs-only: only these cast ids, e.g. lily,pip

Behaviour
  --force              Regenerate the selected targets even if files exist
  --force-refs         Regenerate reference sheets too (invalidates existing pages!)
  --no-continuity      Do not attach the previous page as a continuity image
  --dry-run            Print the exact request payloads (base64 truncated); no
                       API calls, no files written, no key needed
  --mark-final         Set artStatus "final" when every asset exists even if some
                       were not made by this pipeline (e.g. hand-approved art)

Model
  --model <id>         Default: $ILLUSTRATION_MODEL or ${DEFAULT_ILLUSTRATION_MODEL}
  --size <1K|2K|4K>    Output size. Default: $ILLUSTRATION_SIZE or 1K
  --aspect <w:h>       Page aspect. Default 4:5
  --cover-aspect <w:h> Cover aspect. Default 3:4
  --api <name>         interactions (default) | generateContent  ($GEMINI_IMAGE_API)
  --book <file>        Read/write this JSON instead of content/books/<slug>.json
  -h, --help
`;

const ASPECTS = new Set(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']);
const SIZES = new Set(['512px', '1K', '2K', '4K']);
const EXT_MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

const log = (...a) => console.log(...a);
const warn = (m) => console.warn(m);

function parseCli() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      pages: { type: 'string' },
      cover: { type: 'boolean', default: false },
      'refs-only': { type: 'boolean', default: false },
      cast: { type: 'string' },
      force: { type: 'boolean', default: false },
      'force-refs': { type: 'boolean', default: false },
      'no-continuity': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      'mark-final': { type: 'boolean', default: false },
      model: { type: 'string' },
      size: { type: 'string' },
      aspect: { type: 'string' },
      'cover-aspect': { type: 'string' },
      api: { type: 'string' },
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

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);
/** Fingerprint of a page's art direction, to spot pages whose brief changed after drawing. */
const artSha = (page) => sha(JSON.stringify([page.art?.prompt ?? null, page.art?.shot ?? null, page.art ? null : page.imageAlt ?? null]));

/** Find an existing asset regardless of extension. */
function findAsset(dir, base) {
  for (const ext of ['.webp', '.png', '.jpg', '.jpeg']) {
    const f = path.join(dir, base + ext);
    if (existsSync(f)) return f;
  }
  return null;
}

async function loadSharp() {
  try {
    return (await import('sharp')).default;
  } catch {
    return null;
  }
}

async function main() {
  const loaded = loadEnv(REPO_ROOT);
  const opts = parseCli();
  const dry = opts['dry-run'];
  const file = bookJsonPath(opts.slug, opts.book);
  const book = readBook(file);
  if (book.slug !== opts.slug) warn(`  ! book.slug is "${book.slug}" but you asked for "${opts.slug}"; assets go to public/books/${opts.slug}/`);

  const model = opts.model ?? env('ILLUSTRATION_MODEL', DEFAULT_ILLUSTRATION_MODEL);
  const size = opts.size ?? env('ILLUSTRATION_SIZE', '1K');
  const pageAspect = opts.aspect ?? env('ILLUSTRATION_ASPECT', '4:5');
  const coverAspect = opts['cover-aspect'] ?? env('ILLUSTRATION_COVER_ASPECT', '3:4');
  const refAspect = '3:4';
  const api = opts.api ?? env('GEMINI_IMAGE_API', 'interactions');
  if (!SIZES.has(size)) throw new Error(`--size must be one of ${[...SIZES].join(', ')}`);
  for (const a of [pageAspect, coverAspect]) if (!ASPECTS.has(a)) throw new Error(`Unsupported aspect ratio ${a} (use one of ${[...ASPECTS].join(', ')})`);
  if (!['interactions', 'generateContent'].includes(api)) throw new Error('--api must be interactions or generateContent');

  const pricing = priceFor(model, size);
  const modelInfo = IMAGE_PRICING[model] ?? { maxRefs: 14, maxCharacters: 4 };
  const apiKey = env('GEMINI_API_KEY');
  if (!dry && !apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Add it to .env.local (see docs/PIPELINE.md) or run with --dry-run.');
  }

  const sharp = await loadSharp();
  const dir = assetDir(opts.slug);
  const refsDir = path.join(dir, 'refs');
  let manifest = readManifest(opts.slug);

  // ---- targets ---------------------------------------------------------
  const refsOnly = opts['refs-only'];
  const pageList = parsePageList(opts.pages, book.pages.length);
  const doPages = refsOnly ? [] : pageList ?? (opts.cover ? [] : book.pages.map((_, i) => i + 1));
  const doCover = !refsOnly && (opts.cover || pageList === null);

  log(`illustrate-book: "${book.title}" (${opts.slug})`);
  log(`  model ${model} via ${api} | ${size} | pages ${pageAspect}, cover ${coverAspect}${dry ? ' | DRY RUN' : ''}`);
  log(`  book  ${rel(file)}  ->  assets ${rel(dir)}/`);
  if (loaded.length) log(`  env   loaded ${loaded.join(', ')}`);
  if (!pricing.known) warn(`  ! no price table for "${model}"; set ILLUSTRATION_PRICE_PER_IMAGE for an accurate estimate`);
  if (!sharp) warn('  ! sharp is not installed: images will be saved in the format Gemini returns (PNG/JPEG) and the JSON will point at those files. `npm i -D sharp` to get .webp.');
  if (book.artStatus === 'interim' && !opts.force) {
    warn('  ! artStatus is "interim": existing page files are treated as done. Use --force to replace interim art.');
  }

  const stats = { images: 0, inputTokens: 0, estInputTokens: 0, thoughtTokens: 0, skipped: 0, failures: [] };
  const plannedImages = [];

  // Encode and save one generated image. Returns the final path.
  async function save(buffer, mimeType, base, targetDir) {
    ensureDir(targetDir);
    let out;
    let bytes = buffer;
    if (sharp) {
      out = path.join(targetDir, `${base}.webp`);
      const img = sharp(buffer, { failOn: 'error' });
      const meta = await img.metadata();
      bytes = await img.webp({ quality: 88, effort: 5, smartSubsample: true }).toBuffer();
      log(`    ${meta.width}x${meta.height} ${mimeType} -> webp ${(bytes.length / 1024).toFixed(0)} KB`);
    } else {
      const ext = mimeType === 'image/jpeg' ? '.jpg' : mimeType === 'image/webp' ? '.webp' : '.png';
      out = path.join(targetDir, base + ext);
    }
    // Remove stale siblings with other extensions so the JSON path is unambiguous.
    for (const ext of ['.webp', '.png', '.jpg', '.jpeg']) {
      const f = path.join(targetDir, base + ext);
      if (f !== out && existsSync(f)) rmSync(f);
    }
    writeFileAtomic(out, bytes);
    return out;
  }

  /** Image part from a file on disk, or a dry-run placeholder for one that would be generated first. */
  function imagePart(filePath, placeholderLabel) {
    if (filePath && existsSync(filePath)) {
      const mimeType = EXT_MIME[path.extname(filePath).toLowerCase()] ?? 'image/png';
      return { kind: 'image', mimeType, data: readFileSync(filePath).toString('base64'), file: filePath };
    }
    return { kind: 'image', mimeType: 'image/webp', data: `<dry-run: ${placeholderLabel} would be generated earlier in this run>`, file: null };
  }

  async function run(label, parts, aspectRatio, base, targetDir, manifestKey, meta) {
    const imageCount = parts.filter((p) => p.kind === 'image').length;
    const promptChars = parts.filter((p) => p.kind === 'text').reduce((n, p) => n + p.text.length, 0);
    const estTokens = imageCount * EST_TOKENS_PER_INPUT_IMAGE + Math.ceil(promptChars / 4);
    plannedImages.push(label);
    if (dry) {
      log(`\n  [dry-run] ${label}: ${imageCount} image input(s), ~${estTokens.toLocaleString('en-GB')} input tokens`);
      const req = buildImageRequest({ api, model, parts, aspectRatio, imageSize: size });
      printRequest(req);
      stats.estInputTokens += estTokens;
      return path.join(targetDir, `${base}.${sharp ? 'webp' : 'png'}`);
    }
    log(`  > ${label}: generating (${imageCount} image input(s))`);
    const t0 = Date.now();
    const result = await withSoftRetry(
      () => generateImage({ api, model, parts, aspectRatio, imageSize: size, apiKey, label, log: warn }),
      { attempts: 3, label, log: warn },
    );
    const out = await save(result.buffer, result.mimeType, base, targetDir);
    stats.images++;
    if (result.usage.inputTokens != null) stats.inputTokens += result.usage.inputTokens;
    else stats.estInputTokens += estTokens;
    if (result.usage.thoughtTokens) stats.thoughtTokens += result.usage.thoughtTokens;
    log(`    saved ${rel(out)} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    manifest = updateManifest(opts.slug, manifestKey, {
      file: path.basename(out),
      model, api, size, aspectRatio,
      createdAt: new Date().toISOString(),
      sha: sha(readFileSync(out)),
      ...meta,
    });
    return out;
  }

  // ---- 1. character reference sheets ----------------------------------
  const castFilter = opts.cast ? new Set(opts.cast.split(',').map((s) => s.trim()).filter(Boolean)) : null;
  if (castFilter && !refsOnly) warn('  ! --cast only applies with --refs-only; ignoring');
  if (castFilter) for (const id of castFilter) if (!book.cast.some((c) => c.id === id)) throw new Error(`--cast: no cast member "${id}"`);
  const forceRefs = opts['force-refs'] || (refsOnly && opts.force);

  /** castId -> ref file path (existing, generated, or planned in dry-run) */
  const refFiles = new Map();
  log(`\nReference sheets (${book.cast.length})`);
  let styleAnchor = book.cast.map((c) => findAsset(refsDir, c.id)).find(Boolean) ?? null;
  for (const member of book.cast) {
    const existing = findAsset(refsDir, member.id);
    const selected = !castFilter || !refsOnly || castFilter.has(member.id);
    if (existing && !(forceRefs && selected)) {
      log(`  = ${member.id}: exists (${rel(existing)})`);
      refFiles.set(member.id, existing);
      stats.skipped++;
      continue;
    }
    if (!selected) continue;
    if (existing && forceRefs && !dry) warn(`  ! regenerating ${member.id}'s reference sheet: pages already drawn from the old one will no longer match`);
    const anchor = styleAnchor && styleAnchor !== existing ? styleAnchor : null;
    const parts = [{ kind: 'text', text: refSheetPrompt(book, member, { hasStyleAnchor: Boolean(anchor) }) }];
    if (anchor) parts.push(imagePart(anchor, 'style anchor'));
    try {
      const out = await run(`ref ${member.id}`, parts, refAspect, member.id, refsDir, `refs/${member.id}`, {
        lookSha: sha(member.look + '\n' + (book.style ?? '')),
      });
      refFiles.set(member.id, out);
      styleAnchor ??= out;
    } catch (e) {
      if (e?.fatal) throw e;
      stats.failures.push(`ref ${member.id}: ${e.message}`);
      warn(`  x ref ${member.id}: ${e.message}`);
    }
  }
  // Warn when a look changed since its reference sheet was generated.
  for (const m of book.cast) {
    const rec = manifest.assets[`refs/${m.id}`];
    if (rec?.lookSha && rec.lookSha !== sha(m.look + '\n' + (book.style ?? ''))) {
      warn(`  ! ${m.id}: cast look or book style changed since its reference sheet was made. Consider: --refs-only --cast ${m.id} --force`);
    }
  }

  const refSha = (id) => {
    const f = refFiles.get(id);
    return f && existsSync(f) ? sha(readFileSync(f)) : null;
  };

  // ---- 2. pages --------------------------------------------------------
  if (doPages.length) log(`\nPages (${doPages.length} of ${book.pages.length})`);
  for (const n of doPages) {
    const page = book.pages[n - 1];
    const base = `page-${pad2(n)}`;
    const existing = findAsset(dir, base);
    if (existing && !opts.force) {
      log(`  = ${base}: exists (${rel(existing)})`);
      stats.skipped++;
      continue;
    }
    if (!page.art?.prompt) warn(`  ! ${base} has no art.prompt; falling back to imageAlt + story text`);

    const { chosen, dropped, inferred } = castForPage(book, page, modelInfo.maxCharacters ?? 4);
    if (inferred) warn(`  ! ${base}: no cast member named in the art direction; attaching ${chosen.map((c) => c.id).join(', ') || 'none'}`);
    if (dropped.length) warn(`  ! ${base}: model keeps at most ${modelInfo.maxCharacters} characters consistent; not attaching refs for ${dropped.map((c) => c.id).join(', ')}`);

    // Image numbering for the prompt: refs first, then the previous page.
    const imageParts = [];
    const refIndexByCastId = new Map();
    for (const m of chosen) {
      const f = refFiles.get(m.id);
      if (!f) {
        warn(`  ! ${base}: no reference sheet for ${m.id}; consistency will suffer`);
        continue;
      }
      refIndexByCastId.set(m.id, imageParts.length + 1);
      imageParts.push({ label: `Image ${imageParts.length + 1}: reference sheet for ${m.name}. Match this character exactly.`, part: imagePart(f, `ref ${m.id}`) });
    }
    let previousImageIndex = null;
    if (n > 1 && !opts['no-continuity']) {
      const prevBase = `page-${pad2(n - 1)}`;
      const prev = findAsset(dir, prevBase);
      const plannedPrev = dry && doPages.includes(n - 1);
      if (prev || plannedPrev) {
        previousImageIndex = imageParts.length + 1;
        imageParts.push({ label: `Image ${previousImageIndex}: the previous page (page ${n - 1}) for continuity only.`, part: imagePart(prev, prevBase) });
      }
    }
    if (imageParts.length > (modelInfo.maxRefs ?? 14)) throw new Error(`${base}: too many reference images (${imageParts.length})`);

    const prompt = pagePrompt({ book, page, pageNumber: n, members: chosen, refIndexByCastId, previousImageIndex, aspectRatio: pageAspect });
    const parts = [{ kind: 'text', text: prompt }];
    for (const ip of imageParts) parts.push({ kind: 'text', text: ip.label }, ip.part);

    try {
      const out = await run(base, parts, pageAspect, base, dir, base, {
        artSha: artSha(page),
        refs: Object.fromEntries(chosen.map((m) => [m.id, refSha(m.id)])),
      });
      if (!dry) {
        patchBook(file, (b) => {
          b.pages[n - 1].image = publicPath(opts.slug, path.basename(out));
        });
      }
    } catch (e) {
      if (e?.fatal) throw e;
      stats.failures.push(`${base}: ${e.message}`);
      warn(`  x ${base}: ${e.message}`);
    }
  }

  // ---- 3. cover --------------------------------------------------------
  if (doCover) {
    log('\nCover');
    const existing = findAsset(dir, 'cover');
    if (existing && !opts.force) {
      log(`  = cover: exists (${rel(existing)})`);
      stats.skipped++;
    } else {
      const members = book.cast.slice(0, modelInfo.maxCharacters ?? 4);
      const imageParts = [];
      const refIndexByCastId = new Map();
      for (const m of members) {
        const f = refFiles.get(m.id);
        if (!f) continue;
        refIndexByCastId.set(m.id, imageParts.length + 1);
        imageParts.push({ label: `Image ${imageParts.length + 1}: reference sheet for ${m.name}. Match this character exactly.`, part: imagePart(f, `ref ${m.id}`) });
      }
      // Two interior pages as style references: the first and the middle one.
      const styleIdx = [];
      for (const n of [...new Set([1, Math.ceil(book.pages.length / 2)])]) {
        const f = findAsset(dir, `page-${pad2(n)}`);
        if (f || (dry && doPages.includes(n))) {
          styleIdx.push(imageParts.length + 1);
          imageParts.push({ label: `Image ${imageParts.length + 1}: interior page ${n}, for style matching only.`, part: imagePart(f, `page-${pad2(n)}`) });
        }
      }
      const prompt = coverPrompt({ book, members, refIndexByCastId, styleImageIndexes: styleIdx, aspectRatio: coverAspect });
      const parts = [{ kind: 'text', text: prompt }];
      for (const ip of imageParts) parts.push({ kind: 'text', text: ip.label }, ip.part);
      try {
        const out = await run('cover', parts, coverAspect, 'cover', dir, 'cover', {
          refs: Object.fromEntries(members.map((m) => [m.id, refSha(m.id)])),
        });
        if (!dry) patchBook(file, (b) => { b.cover = publicPath(opts.slug, path.basename(out)); });
      } catch (e) {
        if (e?.fatal) throw e;
        stats.failures.push(`cover: ${e.message}`);
        warn(`  x cover: ${e.message}`);
      }
    }
  }

  // ---- 4. sync JSON + status --------------------------------------------
  const pageFiles = book.pages.map((_, i) => findAsset(dir, `page-${pad2(i + 1)}`));
  const coverFile = findAsset(dir, 'cover');
  const allExist = pageFiles.every(Boolean) && Boolean(coverFile);
  const unmanaged = [...pageFiles.map((f, i) => (f ? `page-${pad2(i + 1)}` : null)), coverFile ? 'cover' : null]
    .filter(Boolean)
    .filter((k) => !manifest.assets[k]);
  const stale = [];
  book.pages.forEach((page, i) => {
    const key = `page-${pad2(i + 1)}`;
    const rec = manifest.assets[key];
    if (!rec) return;
    if (rec.artSha && rec.artSha !== artSha(page)) { stale.push(`${key} (art direction changed)`); return; }
    if (!rec.refs) return;
    for (const [id, s] of Object.entries(rec.refs)) {
      if (s && refSha(id) && refSha(id) !== s) { stale.push(`${key} (ref ${id} changed)`); break; }
    }
  });

  let nextStatus = book.artStatus;
  if (allExist && (unmanaged.length === 0 || opts['mark-final'])) nextStatus = 'final';

  if (dry) {
    log('\nJSON changes that a real run would make:');
    log(`  pages[].image -> /books/${opts.slug}/page-NN.${sharp ? 'webp' : 'png'} for each generated page`);
    if (doCover) log(`  cover -> /books/${opts.slug}/cover.${sharp ? 'webp' : 'png'}`);
    log('  artStatus -> "final" once every page and the cover exist (and were made by this pipeline)');
  } else {
    patchBook(file, (b) => {
      b.pages.forEach((p, i) => {
        if (pageFiles[i]) p.image = publicPath(opts.slug, path.basename(pageFiles[i]));
      });
      if (coverFile) b.cover = publicPath(opts.slug, path.basename(coverFile));
      if (nextStatus === 'final') b.artStatus = 'final';
    });
  }

  // ---- summary ---------------------------------------------------------
  const count = dry ? plannedImages.length : stats.images;
  const imgCost = (pricing.perImage ?? 0) * count;
  const inTok = stats.inputTokens + stats.estInputTokens;
  const inCost = ((pricing.inputPerM ?? 0) * inTok) / 1e6;
  log('\nSummary');
  log(`  ${dry ? 'would generate' : 'generated'} ${count} image(s), skipped ${stats.skipped} existing`);
  if (allExist) log(`  all ${book.pages.length} pages + cover present; artStatus "${nextStatus}"`);
  else log(`  missing: ${[...pageFiles.map((f, i) => (f ? null : `page-${pad2(i + 1)}`)), coverFile ? null : 'cover'].filter(Boolean).join(', ') || 'none'}`);
  if (unmanaged.length) log(`  not made by this pipeline (no manifest entry): ${unmanaged.join(', ')}${allExist && !opts['mark-final'] ? ' - artStatus left unchanged; use --force to regenerate or --mark-final to accept' : ''}`);
  if (stale.length) warn(`  ! possibly stale, review and regenerate with --pages N --force: ${stale.join(', ')}`);
  log(
    `  estimated cost: ${fmtUSD(imgCost + inCost)}  (${count} x ${pricing.perImage != null ? fmtUSD(pricing.perImage) : '?'} per ${size} image` +
      ` + ~${inTok.toLocaleString('en-GB')} input tokens at $${pricing.inputPerM ?? '?'}/1M${stats.estInputTokens ? ', partly estimated' : ''})`,
  );
  if (stats.thoughtTokens) log(`  + ${stats.thoughtTokens.toLocaleString('en-GB')} thinking tokens reported (billed as output tokens; not in the estimate)`);
  log('  prices: https://ai.google.dev/gemini-api/docs/pricing (standard tier; Batch API is ~50% cheaper)');
  if (stats.failures.length) {
    warn(`\n${stats.failures.length} failure(s):\n  - ${stats.failures.join('\n  - ')}`);
    warn(`Re-run the same command to retry only what is missing.`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(`\nillustrate-book: ${e.message}`);
  process.exitCode = 1; // not process.exit(): lets pending fetch sockets close cleanly (libuv assertion on Windows)
});
