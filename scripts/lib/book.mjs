// Shared helpers for the offline asset pipeline: repo paths, book JSON IO,
// CLI page lists and dry-run payload printing.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { patchJsonText } from './json-patch.mjs';

export const REPO_ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const BOOKS_DIR = path.join(REPO_ROOT, 'content', 'books');
// PIPELINE_ASSET_ROOT redirects asset output (used by the offline tests).
export const PUBLIC_BOOKS_DIR = process.env.PIPELINE_ASSET_ROOT ? path.resolve(process.env.PIPELINE_ASSET_ROOT) : path.join(REPO_ROOT, 'public', 'books');

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

export function assertSlug(slug) {
  if (!slug || !SLUG_RE.test(slug)) {
    throw new Error(`Invalid slug ${JSON.stringify(slug)} (expected lowercase letters, digits and hyphens)`);
  }
  return slug;
}

/** Resolve the book JSON path: --book <file> override, else content/books/<slug>.json. */
export function bookJsonPath(slug, override) {
  if (override) return path.resolve(override);
  return path.join(BOOKS_DIR, `${slug}.json`);
}

export function readBook(file) {
  if (!existsSync(file)) throw new Error(`Book JSON not found: ${path.relative(REPO_ROOT, file)}`);
  let book;
  try {
    book = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`Could not parse ${path.relative(REPO_ROOT, file)}: ${e.message}`);
  }
  validateBook(book, file);
  return book;
}

/** Light structural validation against lib/types.ts `Book`. Throws with every problem found. */
export function validateBook(book, file = 'book') {
  const errs = [];
  const isStr = (v) => typeof v === 'string';
  if (!book || typeof book !== 'object') errs.push('root is not an object');
  else {
    if (!isStr(book.slug)) errs.push('slug missing');
    if (!isStr(book.title)) errs.push('title missing');
    if (!Array.isArray(book.pages) || book.pages.length === 0) errs.push('pages[] missing or empty');
    if (!Array.isArray(book.cast)) errs.push('cast[] missing');
    else book.cast.forEach((c, i) => {
      if (!isStr(c?.id) || !SLUG_RE.test(c.id)) errs.push(`cast[${i}].id missing or not filename-safe`);
      if (!isStr(c?.look) || !c.look.trim()) errs.push(`cast[${i}].look missing`);
    });
    (book.pages ?? []).forEach((p, i) => {
      if (!isStr(p?.text)) errs.push(`pages[${i}].text missing`);
    });
  }
  if (errs.length) throw new Error(`Invalid book ${path.basename(String(file))}:\n  - ${errs.join('\n  - ')}`);
}

/**
 * Re-read the book JSON from disk, apply `mutate`, and write it back atomically.
 * Re-reading right before writing keeps concurrent edits to other fields (e.g.
 * an editor tweaking text) instead of clobbering them with a stale copy.
 * Formatting is preserved: only the changed values are spliced into the file.
 * @param {string} file
 * @param {(book: any) => void} mutate
 * @returns {boolean} whether the file changed
 */
export function patchBook(file, mutate) {
  const raw = readFileSync(file, 'utf8');
  const { text, changed } = patchJsonText(raw, mutate);
  if (!changed) return false;
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, text, 'utf8');
  renameSync(tmp, file);
  return true;
}

export function assetDir(slug) {
  return path.join(PUBLIC_BOOKS_DIR, slug);
}

/** Public URL path for a file inside public/books/<slug>/ */
export function publicPath(slug, name) {
  return `/books/${slug}/${name}`;
}

export const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Parse "1,2,5" / "3-6" / "1,4-5" into sorted 1-based page numbers.
 * @param {string|undefined} spec
 * @param {number} total
 * @returns {number[]|null} null when no spec was given (meaning all pages)
 */
export function parsePageList(spec, total) {
  if (spec === undefined || spec === null || spec === '' || spec === true) return null;
  const set = new Set();
  for (const part of String(spec).split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`Bad --pages entry "${part}" (use e.g. 1,2,5 or 3-6)`);
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b < a || b > total) throw new Error(`--pages "${part}" is out of range 1-${total}`);
    for (let n = a; n <= b; n++) set.add(n);
  }
  return [...set].sort((x, y) => x - y);
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

/** Write a file atomically (tmp + rename) so a crash never leaves half a file. */
export function writeFileAtomic(file, data) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, file);
}

/**
 * Deep-copy a request payload for printing, truncating long base64 strings.
 * @param {unknown} value
 */
export function redactPayload(value) {
  return JSON.parse(
    JSON.stringify(value, (key, v) => {
      const looksBase64 = typeof v === 'string' && v.length > 120 && /^[A-Za-z0-9+/=_-]+$/.test(v.slice(0, 400));
      if (looksBase64 || (typeof v === 'string' && v.length > 120 && (key === 'data' || key === 'audio_base64'))) {
        return `${v.slice(0, 48)}...<base64 truncated, ${v.length.toLocaleString('en-GB')} chars>`;
      }
      return v;
    }),
  );
}

export function printRequest({ method = 'POST', url, headers = {}, body }) {
  const safeHeaders = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k, /key|auth|token/i.test(k) ? '<redacted>' : v]),
  );
  console.log(`  ${method} ${url}`);
  for (const [k, v] of Object.entries(safeHeaders)) console.log(`  ${k}: ${v}`);
  console.log(
    JSON.stringify(redactPayload(body), null, 2)
      .split('\n')
      .map((l) => '  ' + l)
      .join('\n'),
  );
}

export const rel = (p) => path.relative(REPO_ROOT, p).split(path.sep).join('/');

export function fmtUSD(n) {
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
}

// ---- pipeline manifest ----------------------------------------------------
// public/books/<slug>/pipeline-manifest.json records provenance for every asset
// the pipeline made (model, settings, fingerprints of the inputs). It contains
// no secrets. Both scripts update it with re-read + merge + atomic write so
// they can run at the same time without losing each other's entries.

export const MANIFEST_NAME = 'pipeline-manifest.json';

export function readManifest(slug) {
  const f = path.join(assetDir(slug), MANIFEST_NAME);
  if (!existsSync(f)) return { version: 1, assets: {} };
  try {
    const m = JSON.parse(readFileSync(f, 'utf8'));
    return { version: 1, ...m, assets: m.assets ?? {} };
  } catch {
    console.warn(`  ! ${rel(f)} is unreadable; ignoring it`);
    return { version: 1, assets: {} };
  }
}

/** Merge one asset record into the manifest on disk and return the merged manifest. */
export function updateManifest(slug, key, record) {
  const m = readManifest(slug);
  m.assets[key] = record;
  m.updatedAt = new Date().toISOString();
  writeFileAtomic(path.join(assetDir(slug), MANIFEST_NAME), JSON.stringify(m, null, 2) + '\n');
  return m;
}
