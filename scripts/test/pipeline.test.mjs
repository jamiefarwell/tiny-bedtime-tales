// Offline tests for the asset pipeline. Run: node --test scripts/test/
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { alignmentToWordTimings } from '../lib/alignment.mjs';
import { castForPage, pagePrompt, NO_TEXT_RULE } from '../lib/art-prompts.mjs';
import { parsePageList, redactPayload, validateBook } from '../lib/book.mjs';
import { buildTtsRequest } from '../lib/elevenlabs.mjs';
import { parseEnv } from '../lib/env.mjs';
import { buildImageRequest, extractImage } from '../lib/gemini-image.mjs';
import { tokenise } from '../lib/tokenise.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, '..', 'fixtures', 'tiny-test-book.json');
const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'));

/** Fake ElevenLabs alignment: one entry per character, 50 ms each. */
function fakeAlignment(spoken) {
  const characters = [...spoken];
  return {
    characters,
    character_start_times_seconds: characters.map((_, i) => i * 0.05),
    character_end_times_seconds: characters.map((_, i) => (i + 1) * 0.05),
  };
}

test('tokenise: maximal non-whitespace runs with exact offsets', () => {
  const text = '“Psst,” whispered someone.\n\nOtto looked up…  and up.';
  const t = tokenise(text);
  assert.deepEqual(t.map((x) => x.word), ['“Psst,”', 'whispered', 'someone.', 'Otto', 'looked', 'up…', 'and', 'up.']);
  for (const w of t) assert.equal(text.slice(w.start, w.end), w.word);
  assert.deepEqual(tokenise(''), []);
  assert.deepEqual(tokenise('   \n\n '), []);
  assert.deepEqual(tokenise(' a '), [{ word: 'a', start: 1, end: 2 }]);
});

test('alignment: exact 1:1 alignment gives one timing per word, in order', () => {
  const text = fixture.pages[1].text;
  const { timings, matched, total } = alignmentToWordTimings(text, fakeAlignment(text));
  const words = tokenise(text);
  assert.equal(timings.length, words.length);
  assert.equal(matched, total);
  timings.forEach((t, i) => {
    assert.equal(t.w, i);
    assert.ok(t.end >= t.start);
    // first char start / last char end of the word
    assert.equal(t.start, Math.round(words[i].start * 0.05 * 1000) / 1000);
    assert.equal(t.end, Math.round(words[i].end * 0.05 * 1000) / 1000);
    if (i) assert.ok(t.start >= timings[i - 1].start);
  });
});

test('alignment: survives normalised quotes, expanded numbers and dropped characters', () => {
  const text = fixture.pages[0].text;
  const spoken = text
    .replace(/[“”]/g, '"')
    .replace(/’/g, "'")
    .replace('…', '')
    .replace('9', 'nine');
  const { timings, matched, total } = alignmentToWordTimings(text, fakeAlignment(spoken));
  const words = tokenise(text);
  assert.equal(timings.length, words.length);
  assert.ok(matched / total > 0.9, `coverage ${matched}/${total}`);
  for (let i = 1; i < timings.length; i++) assert.ok(timings[i].start >= timings[i - 1].start);
  // "9" was spoken as "nine": its timing must sit between its neighbours.
  const nine = words.findIndex((w) => w.word === '9');
  assert.ok(timings[nine].start >= timings[nine - 1].end - 1e-9);
  assert.ok(timings[nine].end <= timings[nine + 1].start + 1e-9);
});

test('alignment: rejects empty alignment', () => {
  assert.throws(() => alignmentToWordTimings('hi', null));
});

test('env parser', () => {
  const env = parseEnv('# c\nA=1\nexport B = two # note\nC="x\\ny"\nD=\'lit $x\'\nBAD LINE\n=nokey\n');
  assert.deepEqual(env, { A: '1', B: 'two', C: 'x\ny', D: 'lit $x' });
});

test('page lists', () => {
  assert.equal(parsePageList(undefined, 10), null);
  assert.deepEqual(parsePageList('5,1,2', 10), [1, 2, 5]);
  assert.deepEqual(parsePageList('3-5,4', 10), [3, 4, 5]);
  assert.throws(() => parsePageList('11', 10));
  assert.throws(() => parsePageList('x', 10));
});

test('fixture validates; cast detection uses art direction', () => {
  validateBook(fixture);
  const { chosen } = castForPage(fixture, fixture.pages[0]);
  assert.deepEqual(chosen.map((c) => c.id), ['otto', 'moon']);
});

test('page prompt locks cast looks, forbids text, keeps the bottom calm', () => {
  const page = fixture.pages[0];
  const prompt = pagePrompt({
    book: fixture, page, pageNumber: 1, members: fixture.cast,
    refIndexByCastId: new Map([['otto', 1], ['moon', 2]]), previousImageIndex: null, aspectRatio: '4:5',
  });
  for (const c of fixture.cast) assert.ok(prompt.includes(c.look));
  assert.ok(prompt.includes(fixture.style));
  assert.ok(prompt.includes(NO_TEXT_RULE));
  assert.ok(prompt.includes('bottom 15%'));
  assert.ok(prompt.includes('[reference sheet: image 1]'));
});

test('Gemini request shapes (interactions + generateContent) and response parsing', () => {
  const parts = [{ kind: 'text', text: 'hi' }, { kind: 'image', mimeType: 'image/webp', data: 'AAAA' }];
  const a = buildImageRequest({ model: 'm', parts, aspectRatio: '4:5', imageSize: '1K' });
  assert.equal(a.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.deepEqual(a.body.input[1], { type: 'image', mime_type: 'image/webp', data: 'AAAA' });
  assert.deepEqual(a.body.response_format, { type: 'image', mime_type: 'image/png', aspect_ratio: '4:5', image_size: '1K' });
  assert.equal(a.body.store, false);
  const g = buildImageRequest({ api: 'generateContent', model: 'm', parts, aspectRatio: '4:5', imageSize: '1K' });
  assert.match(g.url, /models\/m:generateContent$/);
  assert.deepEqual(g.body.generationConfig.imageConfig, { aspectRatio: '4:5', imageSize: '1K' });

  const i = extractImage({
    status: 'completed',
    steps: [
      { type: 'thought', content: [{ type: 'image', data: 'DRAFT' }] },
      { type: 'model_output', content: [{ type: 'text', text: 'ok' }, { type: 'image', mime_type: 'image/png', data: 'FINAL' }] },
    ],
    usage: { total_input_tokens: 10, total_output_tokens: 20 },
  });
  assert.equal(i.image.data, 'FINAL');
  assert.equal(i.usage.inputTokens, 10);
  const gc = extractImage({ candidates: [{ content: { parts: [{ thought: true, inlineData: { data: 'T' } }, { inlineData: { mimeType: 'image/jpeg', data: 'J' } }] } }] });
  assert.deepEqual(gc.image, { mimeType: 'image/jpeg', data: 'J' });
});

test('ElevenLabs request shape', () => {
  const r = buildTtsRequest({
    voiceId: 'v1', model: 'eleven_multilingual_v2', text: 'Hello there.',
    voiceSettings: { stability: 0.5, similarity_boost: 0.75, style: 0.1, speed: 0.9, use_speaker_boost: true },
    previousText: 'Before.', nextText: 'After.', previousRequestIds: ['a', 'b', 'c', 'd'], seed: 7,
  });
  assert.equal(r.url, 'https://api.elevenlabs.io/v1/text-to-speech/v1/with-timestamps?output_format=mp3_44100_128');
  assert.deepEqual(r.body.previous_request_ids, ['b', 'c', 'd']);
  assert.equal(r.body.previous_text, 'Before.');
  assert.equal(r.body.next_text, 'After.');
  const v3 = buildTtsRequest({ voiceId: 'v', model: 'eleven_v3', text: 'x', voiceSettings: {}, previousRequestIds: ['a'] });
  assert.equal(v3.body.previous_request_ids, undefined);
});

test('dry-run payload redaction truncates base64 but keeps prompts', () => {
  const long = 'A'.repeat(5000);
  const prompt = 'A sentence, with punctuation. '.repeat(20);
  const r = redactPayload({ input: [{ type: 'text', text: prompt }, { type: 'image', data: long }] });
  assert.equal(r.input[0].text, prompt);
  assert.match(r.input[1].data, /base64 truncated, 5,000 chars/);
});

function runScript(script, args) {
  const env = { ...process.env };
  delete env.GEMINI_API_KEY;
  delete env.ELEVENLABS_API_KEY;
  return spawnSync(process.execPath, [path.join(here, '..', script), ...args], { encoding: 'utf8', env });
}

test('illustrate-book --dry-run on the fixture: no key, no writes', () => {
  const before = readFileSync(FIXTURE, 'utf8');
  const r = runScript('illustrate-book.mjs', ['tiny-test-book', '--book', FIXTURE, '--dry-run']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /would generate 5 image\(s\)/); // 2 refs + 2 pages + cover
  assert.match(r.stdout, /x-goog-api-key: <redacted>/);
  assert.match(r.stdout, /estimated cost: \$/);
  assert.equal(readFileSync(FIXTURE, 'utf8'), before);
  assert.equal(existsSync(path.join(here, '..', '..', 'public', 'books', 'tiny-test-book')), false);
});

test('narrate-book --dry-run on the fixture: no key, no writes; openai rejected', () => {
  const before = readFileSync(FIXTURE, 'utf8');
  const r = runScript('narrate-book.mjs', ['tiny-test-book', '--book', FIXTURE, '--dry-run', '--voice', 'TESTVOICE']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /would narrate 2 page\(s\)/);
  assert.match(r.stdout, /xi-api-key: <redacted>/);
  assert.match(r.stdout, /with-timestamps\?output_format=mp3_44100_128/);
  assert.equal(readFileSync(FIXTURE, 'utf8'), before);
  const o = runScript('narrate-book.mjs', ['tiny-test-book', '--book', FIXTURE, '--dry-run', '--provider', 'openai']);
  assert.equal(o.status, 1);
  assert.match(o.stderr, /ElevenLabs is required/);
});

test('json-patch: preserves hand formatting, only changed values move', async () => {
  const { patchJsonText } = await import('../lib/json-patch.mjs');
  const src = readFileSync(FIXTURE, 'utf8');
  assert.equal(patchJsonText(src, () => {}).text, src); // no-op is byte-identical
  const { text, changed } = patchJsonText(src, (b) => {
    b.pages[0].image = '/books/tiny-test-book/page-01.webp';
    b.pages[0].timings = [{ w: 0, start: 0, end: 0.4 }, { w: 1, start: 0.4, end: 0.9 }];
    b.artStatus = 'final';
    b.palette.extra = '#000000'; // insert into an inline object
    b.cast[0].newKey = { nested: [1, 2] }; // insert into a multi-line object
  });
  assert.ok(changed);
  const parsed = JSON.parse(text);
  assert.equal(parsed.pages[0].image, '/books/tiny-test-book/page-01.webp');
  assert.equal(parsed.palette.extra, '#000000');
  assert.deepEqual(parsed.cast[0].newKey, { nested: [1, 2] });
  assert.ok(text.includes('"tags": ["test"],')); // untouched inline formatting survives
  assert.ok(text.includes('      "timings": [\n        {"w":0,"start":0,"end":0.4},\n'));
});

test('json-patch: round-trips every real book in content/books', async () => {
  const { patchJsonText } = await import('../lib/json-patch.mjs');
  const { readdirSync } = await import('node:fs');
  const dir = path.join(here, '..', '..', 'content', 'books');
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const src = readFileSync(path.join(dir, f), 'utf8');
    const { text } = patchJsonText(src, (b) => {
      b.pages.forEach((p, i) => { p.audio = `/books/${b.slug}/page-${String(i + 1).padStart(2, '0')}.mp3`; p.timings = [{ w: 0, start: 0, end: 1 }]; });
      b.cover = `/books/${b.slug}/cover.webp`;
    });
    const a = src.split('\n');
    const b = text.split('\n');
    // Everything outside the patched fields is identical line-for-line.
    const untouched = a.filter((l) => !/"(audio|timings|cover)":/.test(l));
    for (const l of untouched) assert.ok(b.includes(l), `${f}: lost line ${l.slice(0, 80)}`);
  }
});

// ---- end-to-end against a local mock of both APIs -------------------------

async function runAsync(script, args, extraEnv) {
  const { spawn } = await import('node:child_process');
  const env = { ...process.env, ...extraEnv };
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(here, '..', script), ...args], { env });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

test('end-to-end with mocked Gemini + ElevenLabs: files, JSON, manifest, stitching, idempotency', async (t) => {
  const http = await import('node:http');
  const os = await import('node:os');
  const fs = await import('node:fs');
  let sharp;
  try { sharp = (await import('sharp')).default; } catch { t.skip('sharp not installed'); return; }
  const png = (await sharp({ create: { width: 64, height: 80, channels: 3, background: '#336699' } }).png().toBuffer()).toString('base64');

  const calls = { gemini: [], eleven: [] };
  let n = 0;
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const c of req) body += c;
    const json = JSON.parse(body || '{}');
    if (req.url.startsWith('/v1beta/interactions')) {
      calls.gemini.push({ key: req.headers['x-goog-api-key'], body: json });
      // First call: simulate a transient 503 to exercise retry.
      if (calls.gemini.length === 1) { res.writeHead(503, { 'retry-after': '0' }); res.end('{"error":{"message":"busy"}}'); return; }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'image', mime_type: 'image/png', data: png }] }], usage: { total_input_tokens: 1000 } }));
      return;
    }
    if (req.url.startsWith('/v1/text-to-speech/')) {
      calls.eleven.push({ key: req.headers['xi-api-key'], url: req.url, body: json });
      const chars = [...json.text];
      res.writeHead(200, { 'content-type': 'application/json', 'request-id': `req-${++n}` });
      res.end(JSON.stringify({
        audio_base64: Buffer.from('ID3fake-mp3').toString('base64'),
        alignment: { characters: chars, character_start_times_seconds: chars.map((_, i) => i * 0.05), character_end_times_seconds: chars.map((_, i) => (i + 1) * 0.05) },
      }));
      return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tbt-pipeline-'));
  const bookFile = path.join(tmp, 'book.json');
  fs.copyFileSync(FIXTURE, bookFile);
  const env = {
    GEMINI_API_KEY: 'test-gemini-key', ELEVENLABS_API_KEY: 'test-eleven-key',
    GEMINI_API_BASE: `http://127.0.0.1:${port}/v1beta`, ELEVENLABS_API_BASE: `http://127.0.0.1:${port}`,
    PIPELINE_ASSET_ROOT: path.join(tmp, 'public'),
  };
  try {
    const ill = await runAsync('illustrate-book.mjs', ['tiny-test-book', '--book', bookFile], env);
    assert.equal(ill.status, 0, ill.stderr + ill.stdout);
    assert.ok(!ill.stdout.includes('test-gemini-key') && !ill.stderr.includes('test-gemini-key'));
    const assets = path.join(tmp, 'public', 'tiny-test-book');
    for (const f of ['refs/otto.webp', 'refs/moon.webp', 'page-01.webp', 'page-02.webp', 'cover.webp', 'pipeline-manifest.json']) {
      assert.ok(fs.existsSync(path.join(assets, f)), `missing ${f}`);
    }
    assert.equal(calls.gemini.length, 6); // 1 retried + 5 images
    // Page 2 carries both refs + page 1 as image inputs.
    const page2 = calls.gemini.find((c) => c.body.input[0].text.startsWith('Illustration for page 2'));
    assert.equal(page2.body.input.filter((x) => x.type === 'image').length, 3);
    let book = JSON.parse(fs.readFileSync(bookFile, 'utf8'));
    assert.equal(book.artStatus, 'final');
    assert.equal(book.cover, '/books/tiny-test-book/cover.webp');
    assert.equal(book.pages[1].image, '/books/tiny-test-book/page-02.webp');

    const again = await runAsync('illustrate-book.mjs', ['tiny-test-book', '--book', bookFile], env);
    assert.equal(again.status, 0);
    assert.equal(calls.gemini.length, 6, 'second run must skip everything');

    const nar = await runAsync('narrate-book.mjs', ['tiny-test-book', '--book', bookFile, '--voice', 'VOICE1'], env);
    assert.equal(nar.status, 0, nar.stderr + nar.stdout);
    assert.equal(calls.eleven.length, 2);
    assert.equal(calls.eleven[0].body.next_text, book.pages[1].text);
    assert.deepEqual(calls.eleven[1].body.previous_request_ids, ['req-1']);
    assert.equal(calls.eleven[1].body.voice_settings.speed, 0.85); // last page winds down
    book = JSON.parse(fs.readFileSync(bookFile, 'utf8'));
    for (const p of book.pages) {
      assert.equal(p.timings.length, tokenise(p.text).length);
      assert.match(p.audio, /^\/books\/tiny-test-book\/page-0\d\.mp3$/);
    }
    const nar2 = await runAsync('narrate-book.mjs', ['tiny-test-book', '--book', bookFile, '--voice', 'VOICE1'], env);
    assert.equal(nar2.status, 0);
    assert.equal(calls.eleven.length, 2, 'second narration run must skip');
    // Editing a page's text invalidates just that page.
    const raw = fs.readFileSync(bookFile, 'utf8').replace('slow, slow song', 'slow, slow, sleepy song');
    fs.writeFileSync(bookFile, raw);
    const nar3 = await runAsync('narrate-book.mjs', ['tiny-test-book', '--book', bookFile, '--voice', 'VOICE1'], env);
    assert.equal(nar3.status, 0);
    assert.equal(calls.eleven.length, 3);
    assert.match(nar3.stdout, /page-02: page text changed|page-02: timings missing/);
  } finally {
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
