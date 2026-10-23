#!/usr/bin/env node
// One-off artwork (hero images, world tiles, marketing) in the house style.
//
//   node scripts/make-art.mjs --out public/art/hero-a.webp --aspect 9:16 \
//     --prompt "..." [--ref public/books/x/refs/y.webp ...] [--size 1K|2K]
//
// Reads GEMINI_API_KEY from the environment or .env.local. Never prints it.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadEnv, env } from './lib/env.mjs';
import { DEFAULT_ILLUSTRATION_MODEL, generateImage, priceFor } from './lib/gemini-image.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
loadEnv(root);

const args = process.argv.slice(2);
const all = (name) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []));
const one = (name, fallback) => all(name)[0] ?? fallback;

const out = one('out');
const prompt = one('prompt');
if (!out || !prompt) {
  console.error('Usage: node scripts/make-art.mjs --out <file.webp> --prompt "<text>" [--aspect 9:16] [--size 1K] [--ref <image> ...]');
  process.exit(1);
}
const key = env('GEMINI_API_KEY');
if (!key) {
  console.error('GEMINI_API_KEY is not set (.env.local).');
  process.exit(1);
}

const HOUSE_STYLE =
  'Premium contemporary picture-book illustration: soft painterly 3D look, rounded expressive characters, warm lamp-light against deep blue night, gentle film grain, rich but uncluttered composition, cinematic depth of field. Absolutely no text, letters, numbers, logos, signs or captions anywhere in the image.';

const parts = [{ kind: 'text', text: `${prompt}\n\nStyle: ${HOUSE_STYLE}` }];
for (const ref of all('ref')) {
  const buf = await readFile(path.resolve(root, ref));
  const jpeg = await sharp(buf).jpeg({ quality: 90 }).toBuffer();
  parts.push({ kind: 'image', mimeType: 'image/jpeg', data: jpeg.toString('base64') });
}

const size = one('size', '1K');
const model = one('model', process.env.ILLUSTRATION_MODEL || DEFAULT_ILLUSTRATION_MODEL);
const started = Date.now();
const res = await generateImage({
  model,
  parts,
  aspectRatio: one('aspect', '9:16'),
  imageSize: size,
  apiKey: key,
  label: path.basename(out),
  log: (m) => console.log(m),
});
const file = path.resolve(root, out);
await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, await sharp(res.buffer).webp({ quality: 84 }).toBuffer());
console.log(`saved ${out} in ${((Date.now() - started) / 1000).toFixed(1)}s (~$${priceFor(model, size).perImage ?? '?'} per image)`);
