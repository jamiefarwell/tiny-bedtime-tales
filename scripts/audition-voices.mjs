#!/usr/bin/env node
// Audition narrator voices before recording a whole book.
//
//   node scripts/audition-voices.mjs --list
//       List the account's voices with accent/age/gender/use-case labels.
//   node scripts/audition-voices.mjs <slug> --voices id1,id2,id3 [--page 1] [--chars 320] [--out dir]
//       Record the opening of one page in each voice (costs ~chars credits each).
//
// Reads ELEVENLABS_API_KEY from the environment or .env.local. Never prints it.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, env } from './lib/env.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
loadEnv(root);
const key = env('ELEVENLABS_API_KEY');
if (!key) {
  console.error('ELEVENLABS_API_KEY is not set (.env.local).');
  process.exit(1);
}
const api = (path, init = {}) =>
  fetch(`https://api.elevenlabs.io${path}`, { ...init, headers: { 'xi-api-key': key, ...(init.headers ?? {}) } });

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

if (args.includes('--list')) {
  const res = await api('/v1/voices');
  if (!res.ok) {
    console.error('Could not list voices:', res.status, (await res.text()).slice(0, 200));
    process.exit(1);
  }
  const { voices } = await res.json();
  for (const v of voices) {
    const l = v.labels ?? {};
    console.log([v.voice_id, v.name, l.accent, l.gender, l.age, l.use_case || l['use case'], l.description].filter(Boolean).join(' | '));
  }
  process.exit(0);
}

const slug = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const ids = (flag('voices', '') || '').split(',').filter(Boolean);
if (!slug || !ids.length) {
  console.error('Usage: node scripts/audition-voices.mjs <slug> --voices id1,id2 [--page 1] [--chars 320] [--out dir]');
  process.exit(1);
}
const book = JSON.parse(await readFile(new URL(`../content/books/${slug}.json`, import.meta.url), 'utf8'));
const page = book.pages[Number(flag('page', '1')) - 1];
const max = Number(flag('chars', '320'));
// Cut at a sentence end so samples don't stop mid-word.
let text = page.text.slice(0, max);
const cut = Math.max(text.lastIndexOf('. '), text.lastIndexOf('.\n'), text.lastIndexOf('!'), text.lastIndexOf('?'));
if (cut > max * 0.5) text = text.slice(0, cut + 1);
const out = flag('out', 'voice-samples');
await mkdir(out, { recursive: true });

for (const id of ids) {
  const res = await api(`/v1/text-to-speech/${encodeURIComponent(id)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: flag('model', 'eleven_multilingual_v2'),
      voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.25, speed: 0.92, use_speaker_boost: true },
    }),
  });
  if (!res.ok) {
    console.error(id, 'failed:', res.status, (await res.text()).slice(0, 200));
    continue;
  }
  const file = join(out, `${slug}-${id}.mp3`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  console.log('wrote', file, `(${text.length} chars)`);
}
